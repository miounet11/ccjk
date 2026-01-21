import { randomBytes } from 'node:crypto';
import { writeFileSync, renameSync, existsSync, unlinkSync, readFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, writeFile as writeFile$1, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'pathe';

class FileSystemError extends Error {
  constructor(message, path, cause) {
    super(message);
    this.path = path;
    this.cause = cause;
    this.name = "FileSystemError";
  }
}
function exists(path) {
  return existsSync(path);
}
function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}
function ensureFileDir(filePath) {
  const dir = dirname(filePath);
  ensureDir(dir);
}
function readFile(path, encoding = "utf-8") {
  try {
    return readFileSync(path, encoding);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${path}`,
      path,
      error
    );
  }
}
function writeFile(path, content, encoding = "utf-8") {
  try {
    ensureFileDir(path);
    writeFileSync(path, content, encoding);
  } catch (error) {
    throw new FileSystemError(
      `Failed to write file: ${path}`,
      path,
      error
    );
  }
}
function writeFileAtomic(path, content, options = "utf-8") {
  const dir = dirname(path);
  ensureDir(dir);
  const opts = typeof options === "string" ? { encoding: options } : options;
  const encoding = opts.encoding ?? "utf-8";
  const tempFileName = `.tmp_${randomBytes(8).toString("hex")}_${Date.now()}`;
  const tempPath = join(dir, tempFileName);
  try {
    writeFileSync(tempPath, content, { encoding, mode: opts.mode });
    renameSync(tempPath, path);
  } catch (error) {
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
    }
    throw new FileSystemError(
      `Failed to write file atomically: ${path}`,
      path,
      error
    );
  }
}
async function writeFileAtomicAsync(path, content, options = "utf-8") {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const opts = typeof options === "string" ? { encoding: options } : options;
  const encoding = opts.encoding ?? "utf-8";
  const tempFileName = `.tmp_${randomBytes(8).toString("hex")}_${Date.now()}`;
  const tempPath = join(dir, tempFileName);
  try {
    await writeFile$1(tempPath, content, { encoding, mode: opts.mode });
    await rename(tempPath, path);
  } catch (error) {
    try {
      if (existsSync(tempPath)) {
        await unlink(tempPath);
      }
    } catch {
    }
    throw new FileSystemError(
      `Failed to write file atomically: ${path}`,
      path,
      error
    );
  }
}
function readJsonFile(path) {
  try {
    const content = readFile(path, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read JSON file: ${path}`,
      path,
      error
    );
  }
}
function copyFile(src, dest) {
  try {
    ensureFileDir(dest);
    copyFileSync(src, dest);
  } catch (error) {
    throw new FileSystemError(
      `Failed to copy file from ${src} to ${dest}`,
      src,
      error
    );
  }
}
function readDir(path) {
  try {
    return readdirSync(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read directory: ${path}`,
      path,
      error
    );
  }
}
function getStatsSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}
function removeFile(path) {
  try {
    if (exists(path)) {
      unlinkSync(path);
    }
  } catch (error) {
    throw new FileSystemError(
      `Failed to remove file: ${path}`,
      path,
      error
    );
  }
}
function copyDir(src, dest, options = {}) {
  const { filter, overwrite = true } = options;
  if (!exists(src)) {
    throw new FileSystemError(`Source directory does not exist: ${src}`, src);
  }
  ensureDir(dest);
  const entries = readDir(src);
  for (const entry of entries) {
    const srcPath = `${src}/${entry}`;
    const destPath = `${dest}/${entry}`;
    const stats = getStatsSafe(srcPath);
    if (!stats) {
      continue;
    }
    if (filter && !filter(srcPath, stats)) {
      continue;
    }
    if (stats.isDirectory()) {
      copyDir(srcPath, destPath, options);
    } else {
      if (!overwrite && exists(destPath)) {
        continue;
      }
      copyFile(srcPath, destPath);
    }
  }
}

export { FileSystemError, copyDir, copyFile, ensureDir, ensureFileDir, exists, getStatsSafe, readDir, readFile, readJsonFile, removeFile, writeFile, writeFileAtomic, writeFileAtomicAsync };
