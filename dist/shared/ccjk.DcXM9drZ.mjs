import { createHash } from 'node:crypto';
import { existsSync, createWriteStream } from 'node:fs';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join } from 'pathe';
import { extract } from 'tar';
import { exec } from 'tinyexec';
import { i18n } from '../chunks/index.mjs';
import { writeFileAtomicAsync, exists, readJsonFile } from '../chunks/fs-operations.mjs';

const DEFAULT_REGISTRY_URL = "https://registry.api.claudehome.cn/v1";
const DEFAULT_CACHE_CONFIG = {
  cacheDir: join(homedir(), ".ccjk", "cache"),
  ttl: 3600,
  // 1 hour
  enabled: true
};
const BUILTIN_PACKAGES = [
  // Built-in packages will be added here in future versions
];
function getCacheFilePath(cacheDir) {
  return join(cacheDir, "registry-cache.json");
}
async function isCacheValid(cacheDir, ttl) {
  const cachePath = getCacheFilePath(cacheDir);
  if (!existsSync(cachePath)) {
    return false;
  }
  try {
    const content = await readFile(cachePath, "utf-8");
    const cache = JSON.parse(content);
    const cacheTime = new Date(cache.lastUpdated).getTime();
    const now = Date.now();
    return now - cacheTime < ttl * 1e3;
  } catch {
    return false;
  }
}
async function readCachedRegistry(cacheDir) {
  const cachePath = getCacheFilePath(cacheDir);
  if (!existsSync(cachePath)) {
    return null;
  }
  try {
    const content = await readFile(cachePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
async function writeCacheRegistry(cacheDir, registry) {
  await mkdir(cacheDir, { recursive: true });
  const cachePath = getCacheFilePath(cacheDir);
  await writeFileAtomicAsync(cachePath, JSON.stringify(registry, null, 2));
}
async function fetchRemoteRegistry(registryUrl = DEFAULT_REGISTRY_URL, timeout = 3e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${registryUrl}/registry.json`, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "ccjk-cli"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
async function getRegistry(options = {}) {
  const cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...options.cache };
  const registryUrl = options.registryUrl || DEFAULT_REGISTRY_URL;
  if (cacheConfig.enabled && !options.forceRefresh) {
    const cacheValid = await isCacheValid(cacheConfig.cacheDir, cacheConfig.ttl);
    if (cacheValid) {
      const cached = await readCachedRegistry(cacheConfig.cacheDir);
      if (cached) {
        return cached;
      }
    }
  }
  try {
    const registry = await fetchRemoteRegistry(registryUrl);
    if (cacheConfig.enabled) {
      await writeCacheRegistry(cacheConfig.cacheDir, registry);
    }
    return registry;
  } catch {
    const cached = await readCachedRegistry(cacheConfig.cacheDir);
    if (cached) {
      return cached;
    }
    return {
      version: "1.0.0",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      url: registryUrl,
      packages: BUILTIN_PACKAGES,
      categories: {
        "plugin": 0,
        "skill": 0,
        "workflow": 0,
        "agent": 0,
        "mcp-service": 0,
        "output-style": 0,
        "bundle": 0
      }
    };
  }
}
async function searchPackages(options = {}) {
  const registry = await getRegistry();
  let packages = [...registry.packages];
  if (options.query) {
    const query = options.query.toLowerCase();
    packages = packages.filter(
      (pkg) => pkg.name.toLowerCase().includes(query) || pkg.id.toLowerCase().includes(query) || pkg.keywords.some((k) => k.toLowerCase().includes(query)) || Object.values(pkg.description).some((d) => d.toLowerCase().includes(query))
    );
  }
  if (options.category) {
    packages = packages.filter((pkg) => pkg.category === options.category);
  }
  if (options.author) {
    packages = packages.filter(
      (pkg) => pkg.author.toLowerCase().includes(options.author.toLowerCase())
    );
  }
  if (options.verified) {
    packages = packages.filter((pkg) => pkg.verified === options.verified);
  }
  if (options.keywords?.length) {
    packages = packages.filter(
      (pkg) => options.keywords.some((k) => pkg.keywords.includes(k))
    );
  }
  if (options.minRating) {
    packages = packages.filter((pkg) => pkg.rating >= options.minRating);
  }
  if (options.supportedTool) {
    packages = packages.filter(
      (pkg) => pkg.supportedTools?.includes(options.supportedTool)
    );
  }
  const sortBy = options.sortBy || "downloads";
  const sortDir = options.sortDir || "desc";
  packages.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "downloads":
        comparison = a.downloads - b.downloads;
        break;
      case "rating":
        comparison = a.rating - b.rating;
        break;
      case "updated":
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "created":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
    }
    return sortDir === "desc" ? -comparison : comparison;
  });
  const total = packages.length;
  const offset = options.offset || 0;
  const limit = options.limit || 20;
  packages = packages.slice(offset, offset + limit);
  return {
    packages,
    total,
    offset,
    limit,
    query: options.query,
    filters: options
  };
}
async function getPackage(packageId) {
  const registry = await getRegistry();
  return registry.packages.find((pkg) => pkg.id === packageId) || null;
}

async function resolveDependencies(pkg, visited = /* @__PURE__ */ new Set()) {
  if (visited.has(pkg.id)) {
    return {
      package: pkg,
      dependencies: [],
      totalCount: 0,
      hasCircular: true
    };
  }
  visited.add(pkg.id);
  const dependencies = [];
  let totalCount = 0;
  let hasCircular = false;
  if (pkg.dependencies) {
    for (const [depId, versionRange] of Object.entries(pkg.dependencies)) {
      try {
        const depPkg = await getPackage(depId);
        if (!depPkg) {
          throw new Error(`Dependency not found: ${depId}`);
        }
        if (!isVersionCompatible(depPkg.version, versionRange)) {
          throw new Error(
            `Version mismatch for ${depId}: required ${versionRange}, found ${depPkg.version}`
          );
        }
        const nestedTree = await resolveDependencies(depPkg, new Set(visited));
        const node = {
          package: depPkg,
          versionRange,
          dependencies: nestedTree.dependencies,
          circular: nestedTree.hasCircular
        };
        dependencies.push(node);
        totalCount += 1 + nestedTree.totalCount;
        if (nestedTree.hasCircular) {
          hasCircular = true;
        }
      } catch (error) {
        throw new Error(
          `Failed to resolve dependency ${depId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
  return {
    package: pkg,
    dependencies,
    totalCount,
    hasCircular
  };
}
function isVersionCompatible(version, range) {
  if (range === "*") {
    return true;
  }
  const versionParts = parseVersion(version);
  if (!versionParts) {
    return false;
  }
  if (!range.match(/^[~^><]/)) {
    return version === range;
  }
  if (range.startsWith("^")) {
    const rangeParts = parseVersion(range.slice(1));
    if (!rangeParts) {
      return false;
    }
    return versionParts.major === rangeParts.major && (versionParts.minor > rangeParts.minor || versionParts.minor === rangeParts.minor && versionParts.patch >= rangeParts.patch);
  }
  if (range.startsWith("~")) {
    const rangeParts = parseVersion(range.slice(1));
    if (!rangeParts) {
      return false;
    }
    return versionParts.major === rangeParts.major && versionParts.minor === rangeParts.minor && versionParts.patch >= rangeParts.patch;
  }
  if (range.startsWith(">=")) {
    const rangeParts = parseVersion(range.slice(2));
    if (!rangeParts) {
      return false;
    }
    return compareVersions(versionParts, rangeParts) >= 0;
  }
  if (range.startsWith(">")) {
    const rangeParts = parseVersion(range.slice(1));
    if (!rangeParts) {
      return false;
    }
    return compareVersions(versionParts, rangeParts) > 0;
  }
  if (range.startsWith("<=")) {
    const rangeParts = parseVersion(range.slice(2));
    if (!rangeParts) {
      return false;
    }
    return compareVersions(versionParts, rangeParts) <= 0;
  }
  if (range.startsWith("<")) {
    const rangeParts = parseVersion(range.slice(1));
    if (!rangeParts) {
      return false;
    }
    return compareVersions(versionParts, rangeParts) < 0;
  }
  return false;
}
function parseVersion(version) {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10)
  };
}
function compareVersions(a, b) {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

const DEFAULT_INSTALL_DIR = join(homedir(), ".ccjk", "packages");
const INSTALLED_MANIFEST = join(homedir(), ".ccjk", "installed-packages.json");
const MAX_DOWNLOAD_RETRIES = 3;
const DOWNLOAD_RETRY_DELAY = 2e3;
const DOWNLOAD_TIMEOUT = 3e4;
async function getInstalledPackages() {
  if (!existsSync(INSTALLED_MANIFEST)) {
    return [];
  }
  try {
    const content = await readFile(INSTALLED_MANIFEST, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}
async function saveInstalledPackages(packages) {
  const dir = join(homedir(), ".ccjk");
  await mkdir(dir, { recursive: true });
  await writeFileAtomicAsync(INSTALLED_MANIFEST, JSON.stringify(packages, null, 2));
}
async function isPackageInstalled(packageId) {
  const installed = await getInstalledPackages();
  return installed.some((pkg) => pkg.package.id === packageId);
}
async function downloadPackage(url, destPath, retries = MAX_DOWNLOAD_RETRIES) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mkdir(join(destPath, ".."), { recursive: true });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);
      try {
        const response = await fetch(url, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        if (!response.body) {
          throw new Error("Response body is null");
        }
        const fileStream = createWriteStream(destPath);
        await pipeline(
          Readable.fromWeb(response.body),
          fileStream
        );
        clearTimeout(timeoutId);
        return true;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === "AbortError") {
        throw new Error(`Download timeout after ${DOWNLOAD_TIMEOUT}ms`);
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_RETRY_DELAY * attempt));
      }
    }
  }
  throw new Error(
    `Failed to download package after ${retries} attempts: ${lastError?.message || "Unknown error"}`
  );
}
async function verifyChecksum(filePath, expectedChecksum) {
  try {
    const fileBuffer = await readFile(filePath);
    const hash = createHash("sha256");
    hash.update(fileBuffer);
    const actualChecksum = hash.digest("hex");
    if (actualChecksum !== expectedChecksum) {
      throw new Error(
        `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`
      );
    }
    return true;
  } catch (error) {
    throw new Error(
      `Checksum verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function extractPackage(archivePath, destDir) {
  try {
    await mkdir(destDir, { recursive: true });
    if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
      await extract({
        file: archivePath,
        cwd: destDir,
        strip: 1
        // Strip top-level directory
      });
    } else if (archivePath.endsWith(".zip")) {
      const result = await exec("unzip", ["-q", "-o", archivePath, "-d", destDir]);
      if (result.exitCode !== 0) {
        throw new Error(`Unzip failed: ${result.stderr || "Unknown error"}`);
      }
    } else {
      throw new Error(`Unsupported archive format: ${archivePath}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to extract package: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function runPostInstall(installPath, manifest) {
  if (!manifest.postInstall) {
    return;
  }
  try {
    const scriptPath = join(installPath, manifest.postInstall);
    if (!exists(scriptPath)) {
      throw new Error(`Post-install script not found: ${scriptPath}`);
    }
    const result = await exec("node", [scriptPath], {
      nodeOptions: {
        cwd: installPath
      }
    });
    if (result.exitCode !== 0) {
      throw new Error(`Script exited with code ${result.exitCode}: ${result.stderr || ""}`);
    }
  } catch (error) {
    throw new Error(
      `Post-install script failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function rollbackInstallation(installPath, archivePath) {
  try {
    if (existsSync(installPath)) {
      await rm(installPath, { recursive: true, force: true });
    }
    if (archivePath && existsSync(archivePath)) {
      await rm(archivePath, { force: true });
    }
  } catch (error) {
    console.error("Rollback failed:", error);
  }
}
async function installPackage(packageId, options = {}) {
  const startTime = Date.now();
  let archivePath;
  let installPath;
  try {
    const alreadyInstalled = await isPackageInstalled(packageId);
    if (alreadyInstalled && !options.force) {
      const pkg2 = await getPackage(packageId);
      if (!pkg2) {
        return {
          success: false,
          package: {},
          error: i18n.t("marketplace:packageNotFound", { name: packageId })
        };
      }
      return {
        success: true,
        package: pkg2,
        alreadyInstalled: true,
        durationMs: Date.now() - startTime
      };
    }
    const pkg = await getPackage(packageId);
    if (!pkg) {
      return {
        success: false,
        package: {},
        error: i18n.t("marketplace:packageNotFound", { name: packageId })
      };
    }
    if (!pkg.downloadUrl) {
      return {
        success: false,
        package: pkg,
        error: i18n.t("marketplace:noDownloadUrl", { name: pkg.name })
      };
    }
    const warnings = [];
    if (options.codeToolType && pkg.supportedTools) {
      if (!pkg.supportedTools.includes(options.codeToolType)) {
        warnings.push(
          i18n.t("marketplace:incompatibleTool", {
            tool: options.codeToolType,
            supported: pkg.supportedTools.join(", ")
          })
        );
      }
    }
    const dependencyResults = [];
    if (options.installDependencies !== false && pkg.dependencies) {
      try {
        const dependencyTree = await resolveDependencies(pkg);
        for (const dep of dependencyTree.dependencies) {
          const depResult = await installPackage(dep.package.id, {
            ...options,
            installDependencies: true
            // Recursive dependency installation
          });
          dependencyResults.push(depResult);
          if (!depResult.success) {
            throw new Error(
              `Failed to install dependency ${dep.package.id}: ${depResult.error}`
            );
          }
        }
      } catch (error) {
        return {
          success: false,
          package: pkg,
          error: `Dependency resolution failed: ${error instanceof Error ? error.message : String(error)}`,
          durationMs: Date.now() - startTime
        };
      }
    }
    const targetDir = options.targetDir || DEFAULT_INSTALL_DIR;
    installPath = join(targetDir, pkg.id);
    await mkdir(installPath, { recursive: true });
    const archiveExt = pkg.downloadUrl.endsWith(".zip") ? ".zip" : ".tar.gz";
    archivePath = join(targetDir, `${pkg.id}-${pkg.version}${archiveExt}`);
    try {
      await downloadPackage(pkg.downloadUrl, archivePath);
    } catch (error) {
      throw new Error(
        `Download failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (pkg.checksum && !options.skipChecksum) {
      try {
        await verifyChecksum(archivePath, pkg.checksum);
      } catch (error) {
        throw new Error(
          `Checksum verification failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    try {
      await extractPackage(archivePath, installPath);
    } catch (error) {
      throw new Error(
        `Extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const manifestPath = join(installPath, "ccjk.json");
    let manifest = null;
    if (exists(manifestPath)) {
      try {
        manifest = readJsonFile(manifestPath);
      } catch (error) {
        warnings.push(
          `Failed to read package manifest: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    if (manifest?.postInstall) {
      try {
        await runPostInstall(installPath, manifest);
      } catch (error) {
        warnings.push(
          `Post-install script failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    if (archivePath && existsSync(archivePath)) {
      await rm(archivePath, { force: true });
    }
    const installed = await getInstalledPackages();
    const installedPackage = {
      package: pkg,
      path: installPath,
      installedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: "marketplace",
      enabled: true
    };
    const existingIndex = installed.findIndex((p) => p.package.id === pkg.id);
    if (existingIndex >= 0) {
      installed[existingIndex] = installedPackage;
    } else {
      installed.push(installedPackage);
    }
    await saveInstalledPackages(installed);
    return {
      success: true,
      package: pkg,
      installedPath: installPath,
      dependencies: dependencyResults.length > 0 ? dependencyResults : void 0,
      warnings: warnings.length > 0 ? warnings : void 0,
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    if (installPath) {
      await rollbackInstallation(installPath, archivePath);
    }
    return {
      success: false,
      package: {},
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime
    };
  }
}
async function uninstallPackage(packageId, options = {}) {
  try {
    const installed = await getInstalledPackages();
    const pkg = installed.find((p) => p.package.id === packageId);
    if (!pkg) {
      return {
        success: false,
        packageId,
        error: i18n.t("marketplace:packageNotInstalled", { name: packageId })
      };
    }
    if (!options.force) {
      const dependents = installed.filter(
        (p) => p.package.dependencies && Object.keys(p.package.dependencies).includes(packageId)
      );
      if (dependents.length > 0) {
        return {
          success: false,
          packageId,
          error: i18n.t("marketplace:packageHasDependents", {
            name: packageId,
            dependents: dependents.map((p) => p.package.name).join(", ")
          })
        };
      }
    }
    if (existsSync(pkg.path)) {
      await rm(pkg.path, { recursive: true, force: true });
    }
    const updated = installed.filter((p) => p.package.id !== packageId);
    await saveInstalledPackages(updated);
    return {
      success: true,
      packageId
    };
  } catch (error) {
    return {
      success: false,
      packageId,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function updatePackage(packageId) {
  const uninstallResult = await uninstallPackage(packageId, { keepConfig: true });
  if (!uninstallResult.success) {
    return {
      success: false,
      package: {},
      error: uninstallResult.error
    };
  }
  return await installPackage(packageId, { force: true });
}
async function checkForUpdates() {
  const installed = await getInstalledPackages();
  const updates = [];
  for (const installedPkg of installed) {
    const latestPkg = await getPackage(installedPkg.package.id);
    if (!latestPkg)
      continue;
    if (latestPkg.version !== installedPkg.package.version) {
      updates.push({
        id: installedPkg.package.id,
        currentVersion: installedPkg.package.version,
        latestVersion: latestPkg.version,
        breaking: false,
        // TODO: Implement semver comparison
        changelog: latestPkg.changelog,
        releaseDate: latestPkg.updatedAt
      });
    }
  }
  return updates;
}

export { getInstalledPackages as a, uninstallPackage as b, checkForUpdates as c, installPackage as d, getPackage as g, isPackageInstalled as i, searchPackages as s, updatePackage as u };
