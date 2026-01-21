import { existsSync, readFileSync } from 'node:fs';
import ansis from 'ansis';
import { join } from 'pathe';
import { SETTINGS_FILE, CCJK_CONFIG_DIR } from './constants.mjs';
import { S as STATUS } from '../shared/ccjk.BpHTUkb8.mjs';
import 'node:os';
import './index.mjs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import './package.mjs';

const PERMISSION_CONFIG_FILE = join(CCJK_CONFIG_DIR, "permissions.json");
const PERMISSION_TEMPLATES = [
  {
    id: "development",
    name: "Development",
    description: "Standard development permissions - file read/write, git, npm, node execution",
    permissions: {
      allowed: ["file-read", "file-write", "git-operations", "npm-commands", "node-execution", "mcp-server"],
      denied: ["system-commands", "network-access", "file-delete"],
      trustedDirectories: [],
      autoApprovePatterns: ["*.ts", "*.js", "*.json", "*.md", "*.css", "*.html"]
    }
  },
  {
    id: "readonly",
    name: "Read Only",
    description: "Read-only access - no file modifications or command execution",
    permissions: {
      allowed: ["file-read"],
      denied: ["file-write", "file-delete", "git-operations", "npm-commands", "node-execution", "system-commands", "network-access"],
      trustedDirectories: [],
      autoApprovePatterns: []
    }
  },
  {
    id: "full-trust",
    name: "Full Trust",
    description: "All operations pre-authorized - use with caution",
    permissions: {
      allowed: ["file-read", "file-write", "file-delete", "git-operations", "npm-commands", "node-execution", "system-commands", "network-access", "mcp-server"],
      denied: [],
      trustedDirectories: [],
      autoApprovePatterns: ["*"]
    }
  },
  {
    id: "restricted",
    name: "Restricted",
    description: "Minimal permissions - all operations require confirmation",
    permissions: {
      allowed: [],
      denied: ["file-read", "file-write", "file-delete", "git-operations", "npm-commands", "node-execution", "system-commands", "network-access"],
      trustedDirectories: [],
      autoApprovePatterns: []
    }
  }
];
function readPermissions() {
  if (existsSync(PERMISSION_CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(PERMISSION_CONFIG_FILE, "utf-8"));
    } catch {
    }
  }
  if (existsSync(SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
      if (settings.permissions) {
        return settings.permissions;
      }
    } catch {
    }
  }
  return PERMISSION_TEMPLATES.find((t) => t.id === "development").permissions;
}
function getCurrentTemplateId() {
  const permissions = readPermissions();
  for (const template of PERMISSION_TEMPLATES) {
    if (JSON.stringify(permissions.allowed.sort()) === JSON.stringify(template.permissions.allowed.sort()) && JSON.stringify(permissions.denied.sort()) === JSON.stringify(template.permissions.denied.sort())) {
      return template.id;
    }
  }
  return null;
}
function displayPermissions() {
  const permissions = readPermissions();
  const templateId = getCurrentTemplateId();
  console.log(ansis.green("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 Claude Code Permissions \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n"));
  console.log(ansis.white.bold("Trusted Directories:"));
  if (permissions.trustedDirectories.length === 0) {
    console.log(ansis.gray("  (none)"));
  } else {
    for (const dir of permissions.trustedDirectories) {
      console.log(STATUS.success(dir));
    }
  }
  console.log("");
  console.log(ansis.white.bold("Pre-authorized Operations:"));
  const allPermissions = [
    "file-read",
    "file-write",
    "file-delete",
    "git-operations",
    "npm-commands",
    "node-execution",
    "system-commands",
    "network-access",
    "mcp-server"
  ];
  for (const perm of allPermissions) {
    const label = perm.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    if (permissions.allowed.includes(perm)) {
      console.log(STATUS.success(label));
    } else if (permissions.denied.includes(perm)) {
      console.log(STATUS.error(`${label} (denied)`));
    } else {
      console.log(STATUS.warning(`${label} (requires confirmation)`));
    }
  }
  console.log("");
  if (templateId) {
    const template = PERMISSION_TEMPLATES.find((t) => t.id === templateId);
    console.log(ansis.gray(`Template: ${ansis.green(template?.name || templateId)}`));
  } else {
    console.log(ansis.gray("Template: custom"));
  }
  console.log("");
}

export { PERMISSION_TEMPLATES, displayPermissions, getCurrentTemplateId, readPermissions };
