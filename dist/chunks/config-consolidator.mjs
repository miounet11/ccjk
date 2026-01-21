import { existsSync, statSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import process__default from 'node:process';
import ansis from 'ansis';
import dayjs from 'dayjs';
import { join } from 'pathe';
import { SETTINGS_FILE, ClAUDE_CONFIG_FILE, CLAUDE_VSC_CONFIG_FILE } from './constants.mjs';
import { S as STATUS } from '../shared/ccjk.BpHTUkb8.mjs';
import './index.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import './package.mjs';

const CONFIG_LOCATIONS = [
  { path: SETTINGS_FILE, type: "global" },
  { path: ClAUDE_CONFIG_FILE, type: "legacy" },
  { path: CLAUDE_VSC_CONFIG_FILE, type: "global" },
  { path: join(homedir(), ".config", "claude-code", "settings.json"), type: "global" }
];
function detectAllConfigs(projectDir) {
  const locations = [];
  for (const loc of CONFIG_LOCATIONS) {
    const exists = existsSync(loc.path);
    const location = {
      path: loc.path,
      type: loc.type,
      exists
    };
    if (exists) {
      try {
        const stat = statSync(loc.path);
        location.size = stat.size;
        location.modifiedAt = stat.mtime;
        const content = readFileSync(loc.path, "utf-8");
        location.content = JSON.parse(content);
      } catch {
      }
    }
    locations.push(location);
  }
  if (projectDir) {
    const projectConfigs = [
      join(projectDir, ".claude", "settings.json"),
      join(projectDir, "claude.json"),
      join(projectDir, ".claude.json")
    ];
    for (const path of projectConfigs) {
      const exists = existsSync(path);
      const location = {
        path,
        type: "project",
        exists
      };
      if (exists) {
        try {
          const stat = statSync(path);
          location.size = stat.size;
          location.modifiedAt = stat.mtime;
          const content = readFileSync(path, "utf-8");
          location.content = JSON.parse(content);
        } catch {
        }
      }
      locations.push(location);
    }
  }
  const customPath = process__default.env.CLAUDE_CONFIG_PATH;
  if (customPath && !locations.some((l) => l.path === customPath)) {
    const exists = existsSync(customPath);
    const location = {
      path: customPath,
      type: "custom",
      exists
    };
    if (exists) {
      try {
        const stat = statSync(customPath);
        location.size = stat.size;
        location.modifiedAt = stat.mtime;
        const content = readFileSync(customPath, "utf-8");
        location.content = JSON.parse(content);
      } catch {
      }
    }
    locations.push(location);
  }
  return locations;
}
function compareConfigs(configs) {
  const existingConfigs = configs.filter((c) => c.exists && c.content);
  if (existingConfigs.length < 2)
    return [];
  const allKeys = /* @__PURE__ */ new Set();
  const keyValues = {};
  for (const config of existingConfigs) {
    if (!config.content)
      continue;
    const flattenObject = (obj, prefix = "") => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          flattenObject(value, fullKey);
        } else {
          allKeys.add(fullKey);
          if (!keyValues[fullKey]) {
            keyValues[fullKey] = {};
          }
          keyValues[fullKey][config.path] = value;
        }
      }
    };
    flattenObject(config.content);
  }
  const diffs = [];
  for (const key of allKeys) {
    const values = keyValues[key];
    const files = Object.keys(values);
    if (files.length < 2)
      continue;
    const uniqueValues = new Set(files.map((f) => JSON.stringify(values[f])));
    if (uniqueValues.size > 1) {
      diffs.push({
        key,
        files,
        values,
        conflicting: true
      });
    }
  }
  return diffs;
}
function displayConfigScan(configs) {
  const existingConfigs = configs.filter((c) => c.exists);
  console.log(ansis.green("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 Config Files Detected \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n"));
  if (existingConfigs.length === 0) {
    console.log(STATUS.info("No config files found"));
    return;
  }
  for (const config of configs) {
    if (!config.exists) {
      console.log(STATUS.pending(`${config.path} (not found)`));
      continue;
    }
    const sizeKB = config.size ? (config.size / 1024).toFixed(1) : "?";
    const modified = config.modifiedAt ? dayjs(config.modifiedAt).format("YYYY-MM-DD HH:mm") : "unknown";
    const typeLabel = config.type === "global" ? "primary" : config.type;
    if (config.type === "global" && config.path === SETTINGS_FILE) {
      console.log(STATUS.success(`${config.path}`));
      console.log(ansis.gray(`     (${typeLabel}, ${sizeKB}KB, modified ${modified})`));
    } else if (config.type === "legacy") {
      console.log(STATUS.warning(`${config.path}`));
      console.log(ansis.gray(`     (${typeLabel}, ${sizeKB}KB, modified ${modified})`));
    } else {
      console.log(STATUS.info(`${config.path}`));
      console.log(ansis.gray(`     (${typeLabel}, ${sizeKB}KB, modified ${modified})`));
    }
  }
  const conflicts = compareConfigs(configs);
  if (conflicts.length > 0) {
    console.log(ansis.yellow(`
Conflicts found: ${conflicts.length}`));
    for (const conflict of conflicts.slice(0, 5)) {
      console.log(ansis.yellow(`  - ${conflict.key}: differs in ${conflict.files.length} files`));
    }
    if (conflicts.length > 5) {
      console.log(ansis.gray(`  ... and ${conflicts.length - 5} more`));
    }
  }
  console.log("");
}

export { compareConfigs, detectAllConfigs, displayConfigScan };
