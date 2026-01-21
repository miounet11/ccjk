import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import process__default from 'node:process';
import { promisify } from 'node:util';
import semver from 'semver';
import { g as getPlatform, f as findCommandPath, a as getHomebrewCommandPaths } from './platform.mjs';
import 'node:os';
import 'pathe';
import 'tinyexec';

function getHome() {
  return process__default.env.HOME || process__default.env.USERPROFILE || "";
}
const INSTALLATION_SOURCES = [
  // ==================== macOS Sources ====================
  {
    type: "homebrew-cask",
    name: "Homebrew Cask",
    priority: 100,
    // Highest priority on macOS
    platforms: ["macos"],
    pathPatterns: [
      /\/Caskroom\/claude-code\//,
      /\/opt\/homebrew\/Caskroom\//,
      /\/usr\/local\/Caskroom\//
    ],
    commonPaths: [
      "/opt/homebrew/Caskroom/claude-code",
      "/usr/local/Caskroom/claude-code"
    ],
    getUpdateCommand: () => ({ command: "brew", args: ["upgrade", "--cask", "claude-code"] }),
    isRecommended: true,
    description: "Official recommended installation method for macOS"
  },
  // ==================== Cross-platform Sources ====================
  {
    type: "curl",
    name: "Official Installer (curl)",
    priority: 90,
    // High priority - official method
    platforms: ["macos", "linux"],
    pathPatterns: [
      // ~/.local/bin/claude (Linux/macOS curl default)
      new RegExp(`${getHome().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\.local/bin/claude`),
      // ~/.claude/bin/claude (alternative location)
      new RegExp(`${getHome().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\.claude/`),
      // Generic patterns
      /\.local\/bin\/claude$/,
      /\.claude\/bin\/claude$/,
      /\.claude\/local\/bin\/claude$/
    ],
    commonPaths: [
      `${getHome()}/.local/bin/claude`,
      `${getHome()}/.claude/bin/claude`,
      `${getHome()}/.claude/local/bin/claude`
    ],
    getUpdateCommand: () => ({
      command: "sh",
      args: ["-c", "curl -fsSL https://claude.ai/install.sh | sh"]
    }),
    isRecommended: true,
    description: "Official curl installer from claude.ai"
  },
  {
    type: "npm",
    name: "npm Global",
    priority: 50,
    // Medium priority
    platforms: ["macos", "linux", "windows"],
    pathPatterns: [
      /\/node_modules\/@anthropic-ai\/claude-code/,
      /\/npm\//,
      /\/fnm_multishells\//,
      /\/\.nvm\//,
      /\/\.volta\//,
      /\/\.asdf\/installs\/nodejs\//,
      /\/\.nodenv\//,
      /\/\.n\/bin\//
    ],
    commonPaths: [
      "/usr/local/bin/claude",
      "/usr/bin/claude",
      `${getHome()}/.npm-global/bin/claude`,
      // Node version manager paths
      `${getHome()}/.nvm/versions/node`,
      `${getHome()}/.fnm/node-versions`,
      `${getHome()}/.volta/bin/claude`,
      `${getHome()}/.asdf/shims/claude`
    ],
    getUpdateCommand: () => ({ command: "npm", args: ["update", "-g", "@anthropic-ai/claude-code"] }),
    isRecommended: false,
    description: "npm global installation"
  },
  {
    type: "npm-homebrew-node",
    name: "npm via Homebrew Node",
    priority: 45,
    // Slightly lower than regular npm
    platforms: ["macos"],
    pathPatterns: [
      /\/Cellar\/node\//,
      /\/opt\/homebrew\/lib\/node_modules\//,
      /\/usr\/local\/lib\/node_modules\//
    ],
    commonPaths: [
      "/opt/homebrew/Cellar/node",
      "/usr/local/Cellar/node",
      "/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code",
      "/usr/local/lib/node_modules/@anthropic-ai/claude-code"
    ],
    getUpdateCommand: () => ({ command: "npm", args: ["update", "-g", "@anthropic-ai/claude-code"] }),
    isRecommended: false,
    description: "npm installation via Homebrew-managed Node.js"
  },
  // ==================== Future Linux Sources ====================
  {
    type: "snap",
    name: "Snap Package",
    priority: 80,
    platforms: ["linux"],
    pathPatterns: [
      /\/snap\/claude-code\//,
      /\/snap\/bin\/claude/
    ],
    commonPaths: [
      "/snap/bin/claude",
      "/snap/claude-code/current/bin/claude"
    ],
    getUpdateCommand: () => ({ command: "snap", args: ["refresh", "claude-code"] }),
    isRecommended: false,
    description: "Snap package (future support)"
  },
  {
    type: "flatpak",
    name: "Flatpak",
    priority: 75,
    platforms: ["linux"],
    pathPatterns: [
      /\/flatpak\//,
      /com\.anthropic\.claude/
    ],
    commonPaths: [
      `${getHome()}/.local/share/flatpak/exports/bin/com.anthropic.claude`,
      "/var/lib/flatpak/exports/bin/com.anthropic.claude"
    ],
    getUpdateCommand: () => ({ command: "flatpak", args: ["update", "com.anthropic.claude"] }),
    isRecommended: false,
    description: "Flatpak package (future support)"
  },
  {
    type: "apt",
    name: "APT Package",
    priority: 85,
    platforms: ["linux"],
    pathPatterns: [
      /\/usr\/bin\/claude$/,
      /\/usr\/local\/bin\/claude$/
    ],
    commonPaths: [
      "/usr/bin/claude",
      "/usr/local/bin/claude"
    ],
    getUpdateCommand: () => ({ command: "apt", args: ["upgrade", "claude-code"] }),
    isRecommended: false,
    description: "APT package (future support)"
  }
];
function detectSourceFromPath(path, platform) {
  const sortedSources = [...INSTALLATION_SOURCES].filter((s) => s.platforms.includes(platform)).sort((a, b) => b.priority - a.priority);
  for (const source of sortedSources) {
    for (const pattern of source.pathPatterns) {
      if (pattern.test(path)) {
        return source;
      }
    }
  }
  return null;
}
function getCommonPathsForPlatform(platform) {
  const paths = [];
  for (const source of INSTALLATION_SOURCES) {
    if (source.platforms.includes(platform)) {
      paths.push(...source.commonPaths);
    }
  }
  return [...new Set(paths)];
}
function findInstallationByCommonPaths(platform) {
  const sortedSources = [...INSTALLATION_SOURCES].filter((s) => s.platforms.includes(platform)).sort((a, b) => b.priority - a.priority);
  for (const source of sortedSources) {
    for (const commonPath of source.commonPaths) {
      if (fs.existsSync(commonPath)) {
        const stats = fs.statSync(commonPath);
        if (stats.isDirectory()) {
          const possibleBinaries = findClaudeBinaryInDirectory(commonPath);
          if (possibleBinaries.length > 0) {
            return { path: possibleBinaries[0], source };
          }
        } else if (stats.isFile()) {
          return { path: commonPath, source };
        }
      }
    }
  }
  return null;
}
function findClaudeBinaryInDirectory(dir, depth = 0) {
  if (depth > 3)
    return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === "claude") {
        results.push(fullPath);
      } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(...findClaudeBinaryInDirectory(fullPath, depth + 1));
      }
    }
  } catch {
  }
  return results;
}

const execAsync = promisify(exec);
async function getInstalledVersion(command, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let stdout;
      try {
        const result = await execAsync(`${command} -v`);
        stdout = result.stdout;
      } catch {
        const result = await execAsync(`${command} --version`);
        stdout = result.stdout;
      }
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/);
      return versionMatch ? versionMatch[1] : null;
    } catch {
      if (attempt === maxRetries) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
  return null;
}
async function getLatestVersion(packageName, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} version`);
      return stdout.trim();
    } catch {
      if (attempt === maxRetries) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  return null;
}
async function getClaudeCodeInstallationSource() {
  const platform = getPlatform();
  let commandPath = await findCommandPath("claude");
  if (!commandPath) {
    const commonPaths = getCommonPathsForPlatform(platform);
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        try {
          const stats = fs.statSync(path);
          if (stats.isFile()) {
            commandPath = path;
            break;
          }
        } catch {
        }
      }
    }
    if (!commandPath) {
      const found = findInstallationByCommonPaths(platform);
      if (found) {
        commandPath = found.path;
      }
    }
  }
  if (!commandPath) {
    return { isHomebrew: false, commandPath: null, source: "not-found" };
  }
  let resolvedPath = commandPath;
  try {
    const { stdout } = await execAsync(
      `readlink -f "${commandPath}" 2>/dev/null || realpath "${commandPath}" 2>/dev/null || echo "${commandPath}"`
    );
    resolvedPath = stdout.trim();
  } catch {
  }
  const detectedSource = detectSourceFromPath(resolvedPath, platform) || detectSourceFromPath(commandPath, platform);
  if (detectedSource) {
    const sourceType = mapSourceType(detectedSource.type);
    return {
      isHomebrew: detectedSource.type === "homebrew-cask",
      commandPath,
      source: sourceType
    };
  }
  return { isHomebrew: false, commandPath, source: "other" };
}
function mapSourceType(type) {
  switch (type) {
    case "homebrew-cask":
      return "homebrew-cask";
    case "npm":
    case "npm-homebrew-node":
      return "npm";
    case "curl":
      return "curl";
    default:
      return "other";
  }
}
function isSymlinkBroken(symlinkPath) {
  try {
    const lstats = fs.lstatSync(symlinkPath);
    if (!lstats.isSymbolicLink()) {
      return false;
    }
    fs.statSync(symlinkPath);
    return false;
  } catch {
    try {
      fs.lstatSync(symlinkPath);
      return true;
    } catch {
      return false;
    }
  }
}
async function fixBrokenNpmSymlink() {
  const platform = getPlatform();
  if (platform !== "macos" && platform !== "linux") {
    return { fixed: false, message: "Symlink fix only supported on macOS and Linux" };
  }
  const symlinkPaths = [
    "/opt/homebrew/bin/claude",
    // macOS Apple Silicon
    "/usr/local/bin/claude"
    // macOS Intel / Linux
  ];
  const npmPackagePaths = [
    "/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js",
    "/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js",
    `${process__default.env.HOME}/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js`
  ];
  let packageCliPath = null;
  for (const path of npmPackagePaths) {
    if (fs.existsSync(path)) {
      packageCliPath = path;
      break;
    }
  }
  if (!packageCliPath) {
    return { fixed: false, message: "Claude Code npm package not found" };
  }
  for (const symlinkPath of symlinkPaths) {
    if (isSymlinkBroken(symlinkPath)) {
      try {
        fs.unlinkSync(symlinkPath);
        fs.symlinkSync(packageCliPath, symlinkPath);
        return {
          fixed: true,
          message: `Fixed broken symlink: ${symlinkPath} -> ${packageCliPath}`
        };
      } catch (error) {
        return {
          fixed: false,
          message: `Failed to fix symlink: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }
  const commandPath = await findCommandPath("claude");
  if (!commandPath) {
    const binDir = fs.existsSync("/opt/homebrew/bin") ? "/opt/homebrew/bin" : "/usr/local/bin";
    const newSymlinkPath = path.join(binDir, "claude");
    try {
      if (!fs.existsSync(newSymlinkPath)) {
        fs.symlinkSync(packageCliPath, newSymlinkPath);
        return {
          fixed: true,
          message: `Created new symlink: ${newSymlinkPath} -> ${packageCliPath}`
        };
      }
    } catch (error) {
      return {
        fixed: false,
        message: `Failed to create symlink: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  return { fixed: false, message: "No broken symlinks found" };
}
async function detectAllClaudeCodeInstallations() {
  const installations = [];
  const checkedPaths = /* @__PURE__ */ new Set();
  const activeCommandPath = await findCommandPath("claude");
  let activeResolvedPath = null;
  if (activeCommandPath) {
    try {
      const { stdout } = await execAsync(`readlink -f "${activeCommandPath}" 2>/dev/null || realpath "${activeCommandPath}" 2>/dev/null || echo "${activeCommandPath}"`);
      activeResolvedPath = stdout.trim();
    } catch {
      activeResolvedPath = activeCommandPath;
    }
  }
  async function getVersionFromPath(path) {
    try {
      const { stdout } = await execAsync(`"${path}" -v 2>/dev/null || "${path}" --version 2>/dev/null`);
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/);
      return versionMatch ? versionMatch[1] : null;
    } catch {
      return null;
    }
  }
  function isActivePath(path) {
    if (!activeResolvedPath)
      return false;
    return path === activeResolvedPath || path === activeCommandPath;
  }
  async function addInstallation(path, source) {
    let resolvedPath = path;
    try {
      const { stdout } = await execAsync(`readlink -f "${path}" 2>/dev/null || realpath "${path}" 2>/dev/null || echo "${path}"`);
      resolvedPath = stdout.trim();
    } catch {
    }
    if (checkedPaths.has(resolvedPath))
      return;
    checkedPaths.add(resolvedPath);
    if (!fs.existsSync(path))
      return;
    const version = await getVersionFromPath(path);
    installations.push({
      source,
      path,
      version,
      isActive: isActivePath(path) || isActivePath(resolvedPath)
    });
  }
  if (activeCommandPath && fs.existsSync(activeCommandPath)) {
    let activeSource = "other";
    if (activeResolvedPath?.includes("/Caskroom/claude-code/")) {
      activeSource = "homebrew-cask";
    } else if (activeResolvedPath?.includes("/node_modules/") || activeResolvedPath?.includes("/npm/") || activeResolvedPath?.includes("/fnm_multishells/") || activeResolvedPath?.includes("/.nvm/") || activeResolvedPath?.includes("/Cellar/node/") || activeCommandPath.includes("/fnm_multishells/") || activeCommandPath.includes("/.nvm/")) {
      activeSource = "npm";
    }
    await addInstallation(activeCommandPath, activeSource);
  }
  if (getPlatform() === "macos") {
    const homebrewPaths = await getHomebrewCommandPaths("claude");
    for (const path of homebrewPaths) {
      if (path.includes("/Caskroom/claude-code/")) {
        await addInstallation(path, "homebrew-cask");
      } else if (path.includes("/Cellar/node/")) {
        await addInstallation(path, "npm-homebrew-node");
      }
    }
    try {
      await execAsync("brew list --cask claude-code");
      const homebrewPrefixes = ["/opt/homebrew", "/usr/local"];
      for (const prefix of homebrewPrefixes) {
        const caskroomPath = `${prefix}/Caskroom/claude-code`;
        if (fs.existsSync(caskroomPath)) {
          const versions = fs.readdirSync(caskroomPath).filter((v) => !v.startsWith("."));
          for (const version of versions) {
            const claudePath = `${caskroomPath}/${version}/claude`;
            await addInstallation(claudePath, "homebrew-cask");
          }
        }
      }
    } catch {
    }
  }
  const npmGlobalPaths = [
    "/usr/local/bin/claude",
    "/usr/bin/claude",
    "/opt/homebrew/bin/claude",
    `${process__default.env.HOME}/.npm-global/bin/claude`,
    `${process__default.env.HOME}/.local/bin/claude`
  ];
  for (const path$1 of npmGlobalPaths) {
    let exists = false;
    let isBrokenSymlink = false;
    try {
      if (fs.existsSync(path$1)) {
        exists = true;
      } else {
        const stats = fs.lstatSync(path$1);
        if (stats.isSymbolicLink()) {
          isBrokenSymlink = true;
        }
      }
    } catch {
    }
    if (exists || isBrokenSymlink) {
      let resolvedPath = path$1;
      try {
        const { stdout } = await execAsync(`readlink -f "${path$1}" 2>/dev/null || realpath "${path$1}" 2>/dev/null || echo "${path$1}"`);
        resolvedPath = stdout.trim();
      } catch {
      }
      if (resolvedPath.includes("/node_modules/") || resolvedPath.includes("/npm/")) {
        await addInstallation(path$1, "npm");
      } else if (resolvedPath.includes("/Caskroom/")) ; else if (isBrokenSymlink) {
        const potentialLibPath = path$1.replace("/bin/claude", "/lib/node_modules/@anthropic-ai/claude-code");
        if (fs.existsSync(potentialLibPath)) {
          try {
            const pkgJsonPath = path.join(potentialLibPath, "package.json");
            if (fs.existsSync(pkgJsonPath)) {
              const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
              installations.push({
                source: "npm",
                path: path$1,
                version: pkg.version,
                isActive: isActivePath(path$1)
              });
              checkedPaths.add(path$1);
            }
          } catch {
          }
        } else {
          await addInstallation(path$1, "other");
        }
      } else {
        await addInstallation(path$1, "other");
      }
    }
  }
  const globalModulesPaths = [
    "/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code",
    "/usr/local/lib/node_modules/@anthropic-ai/claude-code",
    `${process__default.env.HOME}/.npm-global/lib/node_modules/@anthropic-ai/claude-code`
  ];
  for (const libPath of globalModulesPaths) {
    if (fs.existsSync(libPath) && !checkedPaths.has(libPath)) {
      try {
        const pkgJsonPath = path.join(libPath, "package.json");
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
          const binPath = libPath.replace("/lib/node_modules/@anthropic-ai/claude-code", "/bin/claude");
          if (!checkedPaths.has(binPath)) {
            installations.push({
              source: "npm",
              path: fs.existsSync(binPath) ? binPath : libPath,
              // Use bin path if exists, else lib path
              version: pkg.version,
              isActive: false
            });
            checkedPaths.add(libPath);
          }
        }
      } catch {
      }
    }
  }
  if (getPlatform() === "macos") {
    const homebrewPrefixes = ["/opt/homebrew", "/usr/local"];
    for (const prefix of homebrewPrefixes) {
      const cellarNodePath = `${prefix}/Cellar/node`;
      if (fs.existsSync(cellarNodePath)) {
        try {
          const versions = fs.readdirSync(cellarNodePath);
          for (const version of versions) {
            const claudePath = `${cellarNodePath}/${version}/bin/claude`;
            await addInstallation(claudePath, "npm-homebrew-node");
          }
        } catch {
        }
      }
    }
  }
  return installations;
}
async function checkDuplicateInstallations() {
  const installations = await detectAllClaudeCodeInstallations();
  const activeInstallation = installations.find((i) => i.isActive) || null;
  const inactiveInstallations = installations.filter((i) => !i.isActive);
  const homebrewInstallation = installations.find((i) => i.source === "homebrew-cask") || null;
  const npmInstallation = installations.find((i) => i.source === "npm" || i.source === "npm-homebrew-node") || null;
  const hasDuplicates = homebrewInstallation !== null && npmInstallation !== null;
  const recommendation = hasDuplicates ? "remove-npm" : "none";
  return {
    hasDuplicates,
    installations,
    activeInstallation,
    inactiveInstallations,
    homebrewInstallation,
    npmInstallation,
    recommendation
  };
}
function getSourceDisplayName(source, i18n) {
  const sourceMap = {
    "homebrew-cask": i18n.t("installation:sourceHomebrewCask"),
    "npm": i18n.t("installation:sourceNpm"),
    "npm-homebrew-node": i18n.t("installation:sourceNpmHomebrewNode"),
    "curl": i18n.t("installation:sourceCurl"),
    "other": i18n.t("installation:sourceOther")
  };
  return sourceMap[source] || source;
}
async function performNpmRemovalAndActivateHomebrew(_npmInstallation, homebrewInstallation, tinyExec, i18n, ansis) {
  const ora = (await import('ora')).default;
  const spinner = ora(i18n.t("installation:removingDuplicateInstallation")).start();
  try {
    const { wrapCommandWithSudo } = await import('./platform.mjs').then(function (n) { return n.p; });
    const { command, args, usedSudo } = wrapCommandWithSudo("npm", ["uninstall", "-g", "@anthropic-ai/claude-code"]);
    if (usedSudo) {
      spinner.info(i18n.t("installation:usingSudo"));
      spinner.start();
    }
    await tinyExec(command, args);
    spinner.succeed(i18n.t("installation:duplicateRemoved"));
    if (homebrewInstallation && !homebrewInstallation.isActive) {
      console.log("");
      console.log(ansis.green(`\u{1F517} ${i18n.t("installation:activatingHomebrew")}`));
      const { createHomebrewSymlink } = await import('./installer2.mjs');
      const symlinkResult = await createHomebrewSymlink("claude", homebrewInstallation.path);
      if (symlinkResult.success) {
        console.log(ansis.green(`\u2714 ${i18n.t("installation:symlinkCreated", { path: symlinkResult.symlinkPath || "/usr/local/bin/claude" })}`));
      } else {
        console.log(ansis.yellow(`\u26A0 ${i18n.t("installation:manualSymlinkHint")}`));
        if (symlinkResult.error) {
          console.log(ansis.gray(`   ${symlinkResult.error}`));
        } else {
          const homebrewBin = fs.existsSync("/opt/homebrew/bin") ? "/opt/homebrew/bin" : "/usr/local/bin";
          console.log(ansis.gray(`   sudo ln -sf "${homebrewInstallation.path}" ${homebrewBin}/claude`));
        }
      }
    }
    return { hadDuplicates: true, resolved: true, action: "removed-npm" };
  } catch (error) {
    spinner.fail(i18n.t("installation:duplicateRemovalFailed"));
    if (error instanceof Error) {
      console.error(ansis.gray(error.message));
    }
    return { hadDuplicates: true, resolved: false, action: "kept-both" };
  }
}
async function handleDuplicateInstallations(skipPrompt = false) {
  const { ensureI18nInitialized, format, i18n } = await import('./index.mjs');
  const ansis = (await import('ansis')).default;
  ensureI18nInitialized();
  const duplicateInfo = await checkDuplicateInstallations();
  if (!duplicateInfo.hasDuplicates) {
    return { hadDuplicates: false, resolved: true, action: "no-duplicates" };
  }
  const { npmInstallation, homebrewInstallation } = duplicateInfo;
  console.log("");
  console.log(ansis.yellow.bold(i18n.t("installation:duplicateInstallationsDetected")));
  console.log(ansis.gray(i18n.t("installation:duplicateInstallationsWarning")));
  console.log("");
  if (homebrewInstallation) {
    const isActive = homebrewInstallation.isActive;
    const statusIcon = isActive ? "\u2705" : "\u26A0\uFE0F";
    const statusColor = isActive ? ansis.green : ansis.yellow;
    console.log(ansis.green.bold(`\u{1F37A} Homebrew Cask ${i18n.t("installation:recommendedMethod")}:`));
    console.log(ansis.white(`   ${i18n.t("installation:installationSource")}: ${statusColor(getSourceDisplayName(homebrewInstallation.source, i18n))}`));
    console.log(ansis.white(`   ${i18n.t("installation:installationPath")}: ${ansis.gray(homebrewInstallation.path)}`));
    if (homebrewInstallation.version) {
      console.log(ansis.white(`   ${i18n.t("installation:installationVersion")}: ${ansis.green(homebrewInstallation.version)}`));
    }
    console.log(ansis.white(`   ${statusIcon} ${isActive ? i18n.t("installation:currentActiveInstallation") : i18n.t("installation:inactiveInstallations")}`));
    console.log("");
  }
  if (npmInstallation) {
    const isActive = npmInstallation.isActive;
    console.log(ansis.yellow.bold(`\u{1F4E6} npm ${i18n.t("installation:notRecommended")}:`));
    console.log(ansis.white(`   ${i18n.t("installation:installationSource")}: ${ansis.yellow(getSourceDisplayName(npmInstallation.source, i18n))}`));
    console.log(ansis.white(`   ${i18n.t("installation:installationPath")}: ${ansis.gray(npmInstallation.path)}`));
    if (npmInstallation.version) {
      console.log(ansis.white(`   ${i18n.t("installation:installationVersion")}: ${ansis.green(npmInstallation.version)}`));
      if (homebrewInstallation?.version && npmInstallation.version !== homebrewInstallation.version) {
        console.log(ansis.red(`   ${format(i18n.t("installation:versionMismatchWarning"), {
          npmVersion: npmInstallation.version,
          homebrewVersion: homebrewInstallation.version
        })}`));
      }
    }
    if (isActive) {
      console.log(ansis.white(`   \u26A0\uFE0F ${i18n.t("installation:currentActiveInstallation")}`));
    }
    console.log("");
  }
  console.log(ansis.green(`\u{1F4A1} ${i18n.t("installation:recommendRemoveNpm")}`));
  console.log("");
  if (!npmInstallation) {
    return { hadDuplicates: true, resolved: false, action: "kept-both" };
  }
  const { exec: tinyExec } = await import('tinyexec');
  if (skipPrompt) {
    console.log(ansis.green(`\u{1F504} ${i18n.t("installation:autoRemovingNpm")}`));
    return await performNpmRemovalAndActivateHomebrew(
      npmInstallation,
      homebrewInstallation,
      tinyExec,
      i18n,
      ansis
    );
  }
  const inquirer = (await import('inquirer')).default;
  const sourceDisplayName = getSourceDisplayName(npmInstallation.source, i18n);
  const confirmMessage = format(i18n.t("installation:confirmRemoveDuplicate"), { source: sourceDisplayName });
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: confirmMessage,
      choices: [
        {
          name: `\u2705 ${i18n.t("common:yes")} - ${i18n.t("installation:removingDuplicateInstallation")}`,
          value: "remove"
        },
        {
          name: `\u274C ${i18n.t("installation:keepBothInstallations")}`,
          value: "keep"
        }
      ]
    }
  ]);
  if (action === "keep") {
    console.log(ansis.gray(i18n.t("installation:duplicateWarningContinue")));
    return { hadDuplicates: true, resolved: false, action: "kept-both" };
  }
  return await performNpmRemovalAndActivateHomebrew(
    npmInstallation,
    homebrewInstallation,
    tinyExec,
    i18n,
    ansis
  );
}
async function getHomebrewClaudeCodeVersion() {
  try {
    const { stdout } = await execAsync("brew info --cask claude-code --json=v2");
    const info = JSON.parse(stdout);
    if (info.casks && info.casks.length > 0) {
      return info.casks[0].version;
    }
    return null;
  } catch {
    return null;
  }
}
function compareVersions(current, latest) {
  if (!semver.valid(current) || !semver.valid(latest)) {
    return -1;
  }
  return semver.compare(current, latest);
}
function shouldUpdate(current, latest) {
  return compareVersions(current, latest) < 0;
}
async function checkCcrVersion() {
  const currentVersion = await getInstalledVersion("ccr");
  const latestVersion = await getLatestVersion("@musistudio/claude-code-router");
  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false
  };
}
async function checkClaudeCodeVersion() {
  let currentVersion = await getInstalledVersion("claude");
  const initialGetVersionSuccess = currentVersion !== null;
  let installationInfo = await getClaudeCodeInstallationSource();
  if (!currentVersion) {
    const installations = await detectAllClaudeCodeInstallations();
    const bestInstall = installations.find((i) => i.source === "homebrew-cask") || installations.find((i) => i.source === "npm") || installations.find((i) => i.source === "curl") || installations[0];
    if (bestInstall && bestInstall.version) {
      currentVersion = bestInstall.version;
      let mappedSource;
      switch (bestInstall.source) {
        case "homebrew-cask":
          mappedSource = "homebrew-cask";
          break;
        case "npm":
        case "npm-homebrew-node":
          mappedSource = "npm";
          break;
        case "curl":
          mappedSource = "curl";
          break;
        default:
          mappedSource = "other";
      }
      installationInfo = {
        isHomebrew: bestInstall.source === "homebrew-cask",
        commandPath: bestInstall.path,
        source: mappedSource
      };
    }
  }
  const { isHomebrew, commandPath, source: installationSource } = installationInfo;
  let latestVersion;
  if (isHomebrew) {
    latestVersion = await getHomebrewClaudeCodeVersion();
  } else {
    latestVersion = await getLatestVersion("@anthropic-ai/claude-code");
  }
  const needsUpdate = (currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false) || !initialGetVersionSuccess && currentVersion !== null;
  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate,
    isHomebrew,
    commandPath,
    installationSource,
    isBroken: !initialGetVersionSuccess && currentVersion !== null
  };
}
async function checkCometixLineVersion() {
  const currentVersion = await getInstalledVersion("ccline");
  const latestVersion = await getLatestVersion("@cometix/ccline");
  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false
  };
}
async function checkClaudeCodeVersionAndPrompt(skipPrompt = false) {
  try {
    const versionInfo = await checkClaudeCodeVersion();
    if (!versionInfo.needsUpdate) {
      return;
    }
    const { updateClaudeCode } = await import('./auto-updater.mjs');
    await updateClaudeCode(false, skipPrompt);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Claude Code version check failed: ${errorMessage}`);
  }
}

export { checkCcrVersion, checkClaudeCodeVersion, checkClaudeCodeVersionAndPrompt, checkCometixLineVersion, checkDuplicateInstallations, compareVersions, detectAllClaudeCodeInstallations, fixBrokenNpmSymlink, getClaudeCodeInstallationSource, getHomebrewClaudeCodeVersion, getInstalledVersion, getLatestVersion, getSourceDisplayName, handleDuplicateInstallations, shouldUpdate };
