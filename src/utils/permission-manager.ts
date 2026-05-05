import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import process from 'node:process';
import ansis from 'ansis';
import { join } from 'pathe';
import { CCJK_CONFIG_DIR, CLAVUE_DIR, SETTINGS_FILE } from '../constants';
import { STATUS } from './banner';
import { writeFileAtomic } from './fs-operations';

/**
 * Permission types
 */
export type PermissionType
  = | 'file-read'
    | 'file-write'
    | 'file-delete'
    | 'git-operations'
    | 'npm-commands'
    | 'node-execution'
    | 'system-commands'
    | 'network-access'
    | 'mcp-server';

/**
 * Permission set
 */
export interface PermissionSet {
  allowed: PermissionType[];
  denied: PermissionType[];
  trustedDirectories: string[];
  autoApprovePatterns: string[];
}

/**
 * Permission template
 */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: PermissionSet;
}

/**
 * Permission config file path
 */
const PERMISSION_CONFIG_FILE = join(CCJK_CONFIG_DIR, 'permissions.json');

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function permissionArray(value: unknown): PermissionType[] {
  return stringArray(value).filter((item): item is PermissionType =>
    [
      'file-read',
      'file-write',
      'file-delete',
      'git-operations',
      'npm-commands',
      'node-execution',
      'system-commands',
      'network-access',
      'mcp-server',
    ].includes(item as PermissionType),
  );
}

function mapClaudeRuleToPermission(rule: string): PermissionType | null {
  const normalized = rule.toLowerCase();
  if (normalized.startsWith('read(')) {
    return 'file-read';
  }
  if (normalized.startsWith('edit(') || normalized.startsWith('write(') || normalized.startsWith('notebookedit(')) {
    return 'file-write';
  }
  if (normalized.startsWith('bash(')) {
    if (/\b(git|gh)\b/.test(normalized)) {
      return 'git-operations';
    }
    if (/\b(npm|pnpm|yarn|bun)\b/.test(normalized)) {
      return 'npm-commands';
    }
    if (/\b(node|tsx|ts-node)\b/.test(normalized)) {
      return 'node-execution';
    }
    if (/\b(curl|wget|scp|ssh)\b/.test(normalized)) {
      return 'network-access';
    }
    if (/\b(rm|trash|unlink|rmdir|mv)\b/.test(normalized)) {
      return 'file-delete';
    }
    return 'system-commands';
  }
  if (normalized.startsWith('webfetch(') || normalized.startsWith('websearch(')) {
    return 'network-access';
  }
  if (normalized.startsWith('mcp__')) {
    return 'mcp-server';
  }
  return null;
}

function mapClaudeRulesToPermissions(rules: string[]): PermissionType[] {
  return [...new Set(rules.map(mapClaudeRuleToPermission).filter((item): item is PermissionType => Boolean(item)))];
}

function sortedArray<T extends string>(items: T[]): T[] {
  return [...items].sort();
}

export function normalizePermissions(input: unknown): PermissionSet {
  const obj = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};

  return {
    allowed: [
      ...permissionArray(obj.allowed),
      ...mapClaudeRulesToPermissions(stringArray(obj.allow)),
    ].filter((item, index, array) => array.indexOf(item) === index),
    denied: [
      ...permissionArray(obj.denied),
      ...mapClaudeRulesToPermissions(stringArray(obj.deny)),
    ].filter((item, index, array) => array.indexOf(item) === index),
    trustedDirectories: [
      ...stringArray(obj.trustedDirectories),
      ...stringArray(obj.additionalDirectories),
    ].filter((item, index, array) => array.indexOf(item) === index),
    autoApprovePatterns: stringArray(obj.autoApprovePatterns),
  };
}

function getClavueSettingsFile(): string {
  return join(process.env.CLAVUE_CONFIG_DIR || CLAVUE_DIR, 'settings.json');
}

function shouldPreferClavueSettings(): boolean {
  return Boolean(
    process.env.CLAVUE_CONFIG_DIR
    || process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_CONFIG
    || process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_COMMANDS
    || existsSync(getClavueSettingsFile()),
  );
}

function readJsonFile(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
  }
  catch {
    return null;
  }
}

function getPermissionFallbackFiles(): string[] {
  const clavueSettingsFile = getClavueSettingsFile();
  const orderedFiles = shouldPreferClavueSettings()
    ? [clavueSettingsFile, SETTINGS_FILE]
    : [SETTINGS_FILE, clavueSettingsFile];
  return [...new Set(orderedFiles)];
}

/**
 * Predefined permission templates
 */
export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'development',
    name: 'Development',
    description: 'Standard development permissions - file read/write, git, npm, node execution',
    permissions: {
      allowed: ['file-read', 'file-write', 'git-operations', 'npm-commands', 'node-execution', 'mcp-server'],
      denied: ['system-commands', 'network-access', 'file-delete'],
      trustedDirectories: [],
      autoApprovePatterns: ['*.ts', '*.js', '*.json', '*.md', '*.css', '*.html'],
    },
  },
  {
    id: 'readonly',
    name: 'Read Only',
    description: 'Read-only access - no file modifications or command execution',
    permissions: {
      allowed: ['file-read'],
      denied: ['file-write', 'file-delete', 'git-operations', 'npm-commands', 'node-execution', 'system-commands', 'network-access'],
      trustedDirectories: [],
      autoApprovePatterns: [],
    },
  },
  {
    id: 'full-trust',
    name: 'Full Trust',
    description: 'All operations pre-authorized - use with caution',
    permissions: {
      allowed: ['file-read', 'file-write', 'file-delete', 'git-operations', 'npm-commands', 'node-execution', 'system-commands', 'network-access', 'mcp-server'],
      denied: [],
      trustedDirectories: [],
      autoApprovePatterns: ['*'],
    },
  },
  {
    id: 'restricted',
    name: 'Restricted',
    description: 'Minimal permissions - all operations require confirmation',
    permissions: {
      allowed: [],
      denied: ['file-read', 'file-write', 'file-delete', 'git-operations', 'npm-commands', 'node-execution', 'system-commands', 'network-access'],
      trustedDirectories: [],
      autoApprovePatterns: [],
    },
  },
];

/**
 * Read current permissions
 */
export function readPermissions(): PermissionSet {
  // Try CCJK config first
  if (existsSync(PERMISSION_CONFIG_FILE)) {
    const permissions = readJsonFile(PERMISSION_CONFIG_FILE);
    if (permissions) {
      return normalizePermissions(permissions);
    }
  }

  // Try runtime settings, preferring Clavue when its config root is active.
  for (const settingsFile of getPermissionFallbackFiles()) {
    if (existsSync(settingsFile)) {
      const settings = readJsonFile(settingsFile);
      if (settings?.permissions) {
        return normalizePermissions(settings.permissions);
      }
    }
  }

  // Return default (development template)
  return PERMISSION_TEMPLATES.find(t => t.id === 'development')!.permissions;
}

/**
 * Write permissions
 */
export function writePermissions(permissions: PermissionSet): boolean {
  try {
    const normalizedPermissions = normalizePermissions(permissions);
    // Ensure config directory exists
    if (!existsSync(CCJK_CONFIG_DIR)) {
      mkdirSync(CCJK_CONFIG_DIR, { recursive: true });
    }

    // Write to CCJK config
    writeFileAtomic(PERMISSION_CONFIG_FILE, JSON.stringify(normalizedPermissions, null, 2));

    return true;
  }
  catch {
    return false;
  }
}

/**
 * Apply a permission template
 */
export function applyTemplate(templateId: string): boolean {
  const template = PERMISSION_TEMPLATES.find(t => t.id === templateId);
  if (!template)
    return false;

  return writePermissions(template.permissions);
}

/**
 * Trust a directory
 */
export function trustDirectory(path: string): boolean {
  const permissions = readPermissions();

  if (!permissions.trustedDirectories.includes(path)) {
    permissions.trustedDirectories.push(path);
    return writePermissions(permissions);
  }

  return true;
}

/**
 * Untrust a directory
 */
export function untrustDirectory(path: string): boolean {
  const permissions = readPermissions();

  permissions.trustedDirectories = permissions.trustedDirectories.filter(d => d !== path);
  return writePermissions(permissions);
}

/**
 * Check if a permission is allowed
 */
export function isPermissionAllowed(permission: PermissionType): boolean {
  const permissions = readPermissions();
  return permissions.allowed.includes(permission) && !permissions.denied.includes(permission);
}

/**
 * Check if a directory is trusted
 */
export function isDirectoryTrusted(path: string): boolean {
  const permissions = readPermissions();
  return permissions.trustedDirectories.some(d => path.startsWith(d));
}

/**
 * Add auto-approve pattern
 */
export function addAutoApprovePattern(pattern: string): boolean {
  const permissions = readPermissions();

  if (!permissions.autoApprovePatterns.includes(pattern)) {
    permissions.autoApprovePatterns.push(pattern);
    return writePermissions(permissions);
  }

  return true;
}

/**
 * Remove auto-approve pattern
 */
export function removeAutoApprovePattern(pattern: string): boolean {
  const permissions = readPermissions();

  permissions.autoApprovePatterns = permissions.autoApprovePatterns.filter(p => p !== pattern);
  return writePermissions(permissions);
}

/**
 * Reset permissions to default
 */
export function resetPermissions(): boolean {
  return applyTemplate('development');
}

/**
 * Repair CCJK bridge permissions without mutating Claude/Clavue runtime settings.
 */
export function repairPermissions(trustedDirectory: string = process.cwd()): boolean {
  const template = PERMISSION_TEMPLATES.find(t => t.id === 'development')!;
  const permissions = normalizePermissions(template.permissions);
  if (trustedDirectory && !permissions.trustedDirectories.includes(trustedDirectory)) {
    permissions.trustedDirectories.push(trustedDirectory);
  }
  return writePermissions(permissions);
}

/**
 * Export permissions to JSON
 */
export function exportPermissions(): string {
  const permissions = readPermissions();
  return JSON.stringify(permissions, null, 2);
}

/**
 * Import permissions from JSON
 */
export function importPermissions(json: string): boolean {
  try {
    const permissions = JSON.parse(json) as PermissionSet;
    return writePermissions(permissions);
  }
  catch {
    return false;
  }
}

/**
 * Get current template ID (if matching)
 */
export function getCurrentTemplateId(): string | null {
  const permissions = readPermissions();

  for (const template of PERMISSION_TEMPLATES) {
    if (
      JSON.stringify(sortedArray(permissions.allowed)) === JSON.stringify(sortedArray(template.permissions.allowed))
      && JSON.stringify(sortedArray(permissions.denied)) === JSON.stringify(sortedArray(template.permissions.denied))
    ) {
      return template.id;
    }
  }

  return null;
}

/**
 * Display permissions dashboard
 */
export function displayPermissions(): void {
  const permissions = readPermissions();
  const templateId = getCurrentTemplateId();

  console.log(ansis.green('\n═══════════ Claude Code Permissions ═══════════\n'));

  // Trusted directories
  console.log(ansis.white.bold('Trusted Directories:'));
  if (permissions.trustedDirectories.length === 0) {
    console.log(ansis.gray('  (none)'));
  }
  else {
    for (const dir of permissions.trustedDirectories) {
      console.log(STATUS.success(dir));
    }
  }
  console.log('');

  // Pre-authorized operations
  console.log(ansis.white.bold('Pre-authorized Operations:'));
  const allPermissions: PermissionType[] = [
    'file-read',
    'file-write',
    'file-delete',
    'git-operations',
    'npm-commands',
    'node-execution',
    'system-commands',
    'network-access',
    'mcp-server',
  ];

  for (const perm of allPermissions) {
    const label = perm.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (permissions.allowed.includes(perm)) {
      console.log(STATUS.success(label));
    }
    else if (permissions.denied.includes(perm)) {
      console.log(STATUS.error(`${label} (denied)`));
    }
    else {
      console.log(STATUS.warning(`${label} (requires confirmation)`));
    }
  }
  console.log('');

  // Current template
  if (templateId) {
    const template = PERMISSION_TEMPLATES.find(t => t.id === templateId);
    console.log(ansis.gray(`Template: ${ansis.green(template?.name || templateId)}`));
  }
  else {
    console.log(ansis.gray('Template: custom'));
  }

  console.log('');
}
