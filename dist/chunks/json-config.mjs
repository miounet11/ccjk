import dayjs from 'dayjs';
import { join } from 'pathe';
import { exists, readFile, writeFileAtomic, writeFile, ensureDir, copyFile } from './fs-operations.mjs';
import 'node:crypto';
import 'node:fs';
import 'node:fs/promises';

function readJsonConfig(path, options = {}) {
  const { defaultValue = null, validate, sanitize } = options;
  if (!exists(path)) {
    return defaultValue;
  }
  try {
    const content = readFile(path);
    const data = JSON.parse(content);
    if (validate && !validate(data)) {
      console.log(`Invalid configuration: ${path}`);
      return defaultValue;
    }
    if (sanitize) {
      return sanitize(data);
    }
    return data;
  } catch (error) {
    console.error(`Failed to parse JSON: ${path}`, error);
    return defaultValue;
  }
}
function writeJsonConfig(path, data, options = {}) {
  const { pretty = true, backup = false, backupDir, atomic = true } = options;
  if (backup && exists(path)) {
    backupJsonConfig(path, backupDir);
  }
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  if (atomic) {
    writeFileAtomic(path, content);
  } else {
    writeFile(path, content);
  }
}
function backupJsonConfig(path, backupDir) {
  if (!exists(path)) {
    return null;
  }
  const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  const fileName = path.split("/").pop() || "config.json";
  const baseDir = backupDir || join(path, "..", "backup");
  const backupPath = join(baseDir, `${fileName}.backup_${timestamp}`);
  try {
    ensureDir(baseDir);
    copyFile(path, backupPath);
    return backupPath;
  } catch (error) {
    console.error("Failed to backup config", error);
    return null;
  }
}

export { backupJsonConfig, readJsonConfig, writeJsonConfig };
