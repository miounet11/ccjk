import ansis from 'ansis';
import inquirer from 'inquirer';
import { getTranslation } from './index.mjs';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, mkdirSync } from 'node:fs';
import process__default from 'node:process';
import { join } from 'pathe';
import { CCJK_SKILLS_DIR, CCJK_CONFIG_DIR } from './constants.mjs';
import { writeFileAtomic } from './fs-operations.mjs';
import { readFile, stat } from 'node:fs/promises';
import matter from 'gray-matter';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:os';

function parseSkillMd(content, filePath = "unknown") {
  try {
    const parsed = matter(content);
    const metadata = extractMetadata(parsed.data, filePath);
    return {
      metadata,
      content: parsed.content.trim(),
      filePath
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse SKILL.md at ${filePath}: ${errorMessage}`);
  }
}
async function parseSkillMdFile(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    const skill = parseSkillMd(content, filePath);
    try {
      const stats = await stat(filePath);
      skill.modifiedAt = stats.mtime;
    } catch {
    }
    return skill;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read SKILL.md file at ${filePath}: ${errorMessage}`);
  }
}
function extractMetadata(data, filePath) {
  if (!data.name || typeof data.name !== "string") {
    throw new Error(`Missing or invalid 'name' field in ${filePath}`);
  }
  if (!data.description || typeof data.description !== "string") {
    throw new Error(`Missing or invalid 'description' field in ${filePath}`);
  }
  if (!data.version || typeof data.version !== "string") {
    throw new Error(`Missing or invalid 'version' field in ${filePath}`);
  }
  if (!data.category || typeof data.category !== "string") {
    throw new Error(`Missing or invalid 'category' field in ${filePath}`);
  }
  if (!Array.isArray(data.triggers) || data.triggers.length === 0) {
    throw new Error(`Missing or invalid 'triggers' field in ${filePath}`);
  }
  if (!Array.isArray(data.use_when) || data.use_when.length === 0) {
    throw new Error(`Missing or invalid 'use_when' field in ${filePath}`);
  }
  const metadata = {
    name: data.name,
    description: data.description,
    version: data.version,
    category: data.category,
    triggers: data.triggers,
    use_when: data.use_when
  };
  if (data.author && typeof data.author === "string") {
    metadata.author = data.author;
  }
  if (typeof data.auto_activate === "boolean") {
    metadata.auto_activate = data.auto_activate;
  }
  if (typeof data.priority === "number") {
    metadata.priority = data.priority;
  }
  if (Array.isArray(data.agents)) {
    metadata.agents = data.agents;
  }
  if (data.difficulty && typeof data.difficulty === "string") {
    metadata.difficulty = data.difficulty;
  }
  if (Array.isArray(data.related_skills)) {
    metadata.related_skills = data.related_skills;
  }
  if (data.ccjk_version && typeof data.ccjk_version === "string") {
    metadata.ccjk_version = data.ccjk_version;
  }
  if (Array.isArray(data.tags)) {
    metadata.tags = data.tags;
  }
  if (Array.isArray(data.allowed_tools)) {
    metadata.allowed_tools = data.allowed_tools;
  }
  if (data.context && typeof data.context === "string") {
    metadata.context = data.context;
  }
  if (data.agent && typeof data.agent === "string") {
    metadata.agent = data.agent;
  }
  if (typeof data.user_invocable === "boolean") {
    metadata.user_invocable = data.user_invocable;
  }
  if (Array.isArray(data.hooks)) {
    metadata.hooks = data.hooks;
  }
  if (Array.isArray(data.permissions)) {
    metadata.permissions = data.permissions;
  }
  if (typeof data.timeout === "number") {
    metadata.timeout = data.timeout;
  }
  if (Array.isArray(data.outputs)) {
    metadata.outputs = data.outputs;
  }
  return metadata;
}

const CLOUD_API_BASE_URL = process__default.env.CCJK_CLOUD_API_URL || "https://api.api.claudehome.cn/v1";
const SYNC_STATE_FILE = join(CCJK_CONFIG_DIR, "skills-sync-state.json");
const DEFAULT_TIMEOUT = 3e4;
function loadSyncState() {
  if (!existsSync(SYNC_STATE_FILE)) {
    return {
      version: "1.0.0",
      lastGlobalSync: (/* @__PURE__ */ new Date()).toISOString(),
      skills: {}
    };
  }
  try {
    const content = readFileSync(SYNC_STATE_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.warn("Failed to load sync state, using empty state:", error);
    return {
      version: "1.0.0",
      lastGlobalSync: (/* @__PURE__ */ new Date()).toISOString(),
      skills: {}
    };
  }
}
function saveSyncState(state) {
  try {
    if (!existsSync(CCJK_CONFIG_DIR)) {
      mkdirSync(CCJK_CONFIG_DIR, { recursive: true });
    }
    writeFileAtomic(SYNC_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save sync state:", error);
    throw new Error(`Failed to save sync state: ${error}`);
  }
}
function updateSyncState(skillId, localVersion, remoteVersion, localChecksum, remoteChecksum) {
  const state = loadSyncState();
  let status = "synced";
  if (localChecksum === remoteChecksum) {
    status = "synced";
  } else if (!remoteChecksum) {
    status = "local_only";
  } else if (!localChecksum) {
    status = "remote_only";
  } else if (localVersion > remoteVersion) {
    status = "local_ahead";
  } else if (remoteVersion > localVersion) {
    status = "remote_ahead";
  } else {
    status = "conflict";
  }
  state.skills[skillId] = {
    skillId,
    lastSyncTime: (/* @__PURE__ */ new Date()).toISOString(),
    localVersion,
    remoteVersion,
    localChecksum,
    remoteChecksum,
    status
  };
  state.lastGlobalSync = (/* @__PURE__ */ new Date()).toISOString();
  saveSyncState(state);
}
function calculateChecksum(content) {
  return createHash("sha256").update(content).digest("hex");
}
async function getLocalSkills() {
  if (!existsSync(CCJK_SKILLS_DIR)) {
    return [];
  }
  const skills = [];
  const files = readdirSync(CCJK_SKILLS_DIR);
  for (const file of files) {
    if (file.endsWith(".md")) {
      const filePath = join(CCJK_SKILLS_DIR, file);
      try {
        const skill = await parseSkillMdFile(filePath);
        skills.push(skill);
      } catch (error) {
        console.warn(`Failed to parse skill file ${file}:`, error);
      }
    }
  }
  return skills;
}
async function getLocalSkill(skillId) {
  const filePath = join(CCJK_SKILLS_DIR, `${skillId}.md`);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return await parseSkillMdFile(filePath);
  } catch (error) {
    console.error(`Failed to parse skill ${skillId}:`, error);
    return null;
  }
}
function saveLocalSkill(skillId, content) {
  if (!existsSync(CCJK_SKILLS_DIR)) {
    mkdirSync(CCJK_SKILLS_DIR, { recursive: true });
  }
  const filePath = join(CCJK_SKILLS_DIR, `${skillId}.md`);
  writeFileAtomic(filePath, content, "utf-8");
}
function getAuthToken() {
  const tokenFile = join(CCJK_CONFIG_DIR, "cloud-token.json");
  if (!existsSync(tokenFile)) {
    return null;
  }
  try {
    const content = readFileSync(tokenFile, "utf-8");
    const data = JSON.parse(content);
    return data.deviceToken || null;
  } catch {
    return null;
  }
}
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated. Please bind device first using: npx ccjk notification bind");
  }
  const url = `${CLOUD_API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        code: data.code || String(response.status),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    return {
      success: true,
      data,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
async function listCloudSkills(options = {}) {
  const params = new URLSearchParams();
  if (options.privacy)
    params.append("privacy", options.privacy);
  if (options.author)
    params.append("author", options.author);
  if (options.tags)
    params.append("tags", options.tags.join(","));
  if (options.query)
    params.append("query", options.query);
  if (options.page)
    params.append("page", String(options.page));
  if (options.pageSize)
    params.append("pageSize", String(options.pageSize));
  if (options.sortBy)
    params.append("sortBy", options.sortBy);
  if (options.sortDir)
    params.append("sortDir", options.sortDir);
  const queryString = params.toString();
  const endpoint = `/skills${queryString ? `?${queryString}` : ""}`;
  return apiRequest(endpoint, { method: "GET" });
}
async function getCloudSkill(skillId, version) {
  const endpoint = `/skills/${skillId}`;
  return apiRequest(endpoint, { method: "GET" });
}
async function uploadSkill(request) {
  return apiRequest("/skills", {
    method: "POST",
    body: JSON.stringify(request)
  });
}
async function updateCloudSkill(skillId, request) {
  return apiRequest(`/skills/${skillId}`, {
    method: "PUT",
    body: JSON.stringify(request)
  });
}
async function syncSkill(skillId, options = {}) {
  try {
    const localSkill = await getLocalSkill(skillId);
    const localContent = localSkill ? readFileSync(join(CCJK_SKILLS_DIR, `${skillId}.md`), "utf-8") : "";
    const localChecksum = localContent ? calculateChecksum(localContent) : "";
    const localVersion = localSkill?.metadata.version || "";
    const cloudResponse = await getCloudSkill(skillId);
    const cloudSkill = cloudResponse.success ? cloudResponse.data : null;
    const remoteChecksum = cloudSkill?.checksum || "";
    const remoteVersion = cloudSkill?.version || "";
    const syncState = loadSyncState();
    const previousState = syncState.skills[skillId];
    let action = "skipped";
    let newState;
    if (localSkill && cloudSkill) {
      if (localChecksum === remoteChecksum) {
        action = "skipped";
      } else if (options.force) {
        if (!options.dryRun) {
          const uploadRequest = {
            name: localSkill.metadata.name,
            version: localSkill.metadata.version,
            content: localContent,
            metadata: {
              author: localSkill.metadata.author || "unknown",
              description: localSkill.metadata.description,
              tags: localSkill.metadata.tags || [],
              category: localSkill.metadata.category
            },
            privacy: "private",
            checksum: localChecksum
          };
          await updateCloudSkill(skillId, uploadRequest);
        }
        action = "uploaded";
      } else {
        const resolution = options.conflictResolution || "prompt";
        if (resolution === "local") {
          if (!options.dryRun) {
            const uploadRequest = {
              name: localSkill.metadata.name,
              version: localSkill.metadata.version,
              content: localContent,
              metadata: {
                author: localSkill.metadata.author || "unknown",
                description: localSkill.metadata.description,
                tags: localSkill.metadata.tags || [],
                category: localSkill.metadata.category
              },
              privacy: "private",
              checksum: localChecksum
            };
            await updateCloudSkill(skillId, uploadRequest);
          }
          action = "uploaded";
        } else if (resolution === "remote") {
          if (!options.dryRun) {
            saveLocalSkill(skillId, cloudSkill.content);
          }
          action = "downloaded";
        } else if (resolution === "newer") {
          const localTime = localSkill.modifiedAt?.getTime() || 0;
          const remoteTime = new Date(cloudSkill.updatedAt).getTime();
          if (localTime > remoteTime) {
            if (!options.dryRun) {
              const uploadRequest = {
                name: localSkill.metadata.name,
                version: localSkill.metadata.version,
                content: localContent,
                metadata: {
                  author: localSkill.metadata.author || "unknown",
                  description: localSkill.metadata.description,
                  tags: localSkill.metadata.tags || [],
                  category: localSkill.metadata.category
                },
                privacy: "private",
                checksum: localChecksum
              };
              await updateCloudSkill(skillId, uploadRequest);
            }
            action = "uploaded";
          } else {
            if (!options.dryRun) {
              saveLocalSkill(skillId, cloudSkill.content);
            }
            action = "downloaded";
          }
        } else {
          action = "conflict";
        }
      }
    } else if (localSkill && !cloudSkill) {
      if (!options.dryRun) {
        const uploadRequest = {
          name: localSkill.metadata.name,
          version: localSkill.metadata.version,
          content: localContent,
          metadata: {
            author: localSkill.metadata.author || "unknown",
            description: localSkill.metadata.description,
            tags: localSkill.metadata.tags || [],
            category: localSkill.metadata.category
          },
          privacy: "private",
          checksum: localChecksum
        };
        await uploadSkill(uploadRequest);
      }
      action = "uploaded";
    } else if (!localSkill && cloudSkill) {
      if (!options.dryRun) {
        saveLocalSkill(skillId, cloudSkill.content);
      }
      action = "downloaded";
    }
    if (!options.dryRun && action !== "conflict") {
      updateSyncState(skillId, localVersion, remoteVersion, localChecksum, remoteChecksum);
      newState = loadSyncState().skills[skillId];
    }
    return {
      skillId,
      skillName: localSkill?.metadata.name || cloudSkill?.name || skillId,
      success: true,
      action,
      previousState,
      newState
    };
  } catch (error) {
    return {
      skillId,
      skillName: skillId,
      success: false,
      action: "skipped",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function syncAllSkills(options = {}) {
  const startTime = Date.now();
  try {
    const localSkills = await getLocalSkills();
    const localSkillIds = new Set(localSkills.map((s) => s.metadata.name));
    const cloudResponse = await listCloudSkills({ privacy: options.privacy });
    if (!cloudResponse.success) {
      throw new Error(cloudResponse.error || "Failed to list cloud skills");
    }
    const cloudSkills = cloudResponse.data?.skills || [];
    const cloudSkillIds = new Set(cloudSkills.map((s) => s.id));
    const allSkillIds = /* @__PURE__ */ new Set([...localSkillIds, ...cloudSkillIds]);
    let skillIdsToSync = Array.from(allSkillIds);
    if (options.skillIds && options.skillIds.length > 0) {
      skillIdsToSync = skillIdsToSync.filter((id) => options.skillIds.includes(id));
    }
    const results = [];
    for (const skillId of skillIdsToSync) {
      const result = await syncSkill(skillId, options);
      results.push(result);
    }
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const conflicts = results.filter((r) => r.action === "conflict").length;
    const uploaded = results.filter((r) => r.action === "uploaded").length;
    const downloaded = results.filter((r) => r.action === "downloaded").length;
    const skipped = results.filter((r) => r.action === "skipped").length;
    return {
      success: failed === 0,
      total: results.length,
      succeeded,
      failed,
      conflicts,
      uploaded,
      downloaded,
      skipped,
      results,
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime
    };
  }
}
async function pushSkills(skillIds, options = {}) {
  return syncAllSkills({
    ...options,
    skillIds,
    conflictResolution: options.conflictResolution || "local"
  });
}
async function pullSkills(skillIds, options = {}) {
  return syncAllSkills({
    ...options,
    skillIds,
    conflictResolution: options.conflictResolution || "remote"
  });
}

async function syncSkills(options = {}) {
  const t = getTranslation(options.lang);
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${t("skillsSync:title.sync")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    await showSyncStatus(options);
    const { confirm } = await inquirer.prompt({
      type: "confirm",
      name: "confirm",
      message: t("skillsSync:prompt.confirmSync"),
      default: true
    });
    if (!confirm) {
      console.log(ansis.yellow(`
  ${t("skillsSync:message.cancelled")}`));
      return;
    }
    console.log(ansis.dim(`
  ${t("skillsSync:message.syncing")}...
`));
    const syncOptions = {
      conflictResolution: options.conflictResolution || "prompt",
      dryRun: options.dryRun,
      force: options.force,
      skillIds: options.skillIds,
      privacy: options.privacy
    };
    const result = await syncAllSkills(syncOptions);
    displaySyncResult(result, options.lang);
  } catch (error) {
    console.error(ansis.red(`
  ${t("skillsSync:error.syncFailed")}: ${error}`));
    throw error;
  }
}
async function pushSkillsCommand(options = {}) {
  const t = getTranslation(options.lang);
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${t("skillsSync:title.push")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    const localSkills = await getLocalSkills();
    console.log(ansis.dim(`  ${t("skillsSync:message.foundLocalSkills", { count: localSkills.length })}`));
    if (localSkills.length === 0) {
      console.log(ansis.yellow(`
  ${t("skillsSync:message.noLocalSkills")}`));
      return;
    }
    const { confirm } = await inquirer.prompt({
      type: "confirm",
      name: "confirm",
      message: t("skillsSync:prompt.confirmPush"),
      default: true
    });
    if (!confirm) {
      console.log(ansis.yellow(`
  ${t("skillsSync:message.cancelled")}`));
      return;
    }
    console.log(ansis.dim(`
  ${t("skillsSync:message.pushing")}...
`));
    const syncOptions = {
      conflictResolution: "local",
      dryRun: options.dryRun,
      force: options.force,
      skillIds: options.skillIds,
      privacy: options.privacy
    };
    const result = await pushSkills(options.skillIds, syncOptions);
    displaySyncResult(result, options.lang);
  } catch (error) {
    console.error(ansis.red(`
  ${t("skillsSync:error.pushFailed")}: ${error}`));
    throw error;
  }
}
async function pullSkillsCommand(options = {}) {
  const t = getTranslation(options.lang);
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${t("skillsSync:title.pull")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    const cloudResponse = await listCloudSkills({ privacy: options.privacy });
    if (!cloudResponse.success) {
      throw new Error(cloudResponse.error || "Failed to list cloud skills");
    }
    const cloudSkills = cloudResponse.data?.skills || [];
    console.log(ansis.dim(`  ${t("skillsSync:message.foundCloudSkills", { count: cloudSkills.length })}`));
    if (cloudSkills.length === 0) {
      console.log(ansis.yellow(`
  ${t("skillsSync:message.noCloudSkills")}`));
      return;
    }
    const { confirm } = await inquirer.prompt({
      type: "confirm",
      name: "confirm",
      message: t("skillsSync:prompt.confirmPull"),
      default: true
    });
    if (!confirm) {
      console.log(ansis.yellow(`
  ${t("skillsSync:message.cancelled")}`));
      return;
    }
    console.log(ansis.dim(`
  ${t("skillsSync:message.pulling")}...
`));
    const syncOptions = {
      conflictResolution: "remote",
      dryRun: options.dryRun,
      force: options.force,
      skillIds: options.skillIds,
      privacy: options.privacy
    };
    const result = await pullSkills(options.skillIds, syncOptions);
    displaySyncResult(result, options.lang);
  } catch (error) {
    console.error(ansis.red(`
  ${t("skillsSync:error.pullFailed")}: ${error}`));
    throw error;
  }
}
async function listCloudSkillsCommand(options = {}) {
  const t = getTranslation(options.lang);
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${t("skillsSync:title.list")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    const response = await listCloudSkills({ privacy: options.privacy });
    if (!response.success) {
      throw new Error(response.error || "Failed to list cloud skills");
    }
    const skills = response.data?.skills || [];
    if (skills.length === 0) {
      console.log(ansis.yellow(`  ${t("skillsSync:message.noCloudSkills")}`));
      return;
    }
    console.log(ansis.bold.green(`  ${t("skillsSync:message.foundCloudSkills", { count: skills.length })}
`));
    for (const skill of skills) {
      const privacyBadge = getPrivacyBadge(skill.privacy);
      console.log(`${ansis.bold(`  ${skill.name}`) + ansis.dim(` v${skill.version}`)} ${privacyBadge}`);
      console.log(ansis.dim(`    ${skill.metadata.description}`));
      if (skill.metadata.tags && skill.metadata.tags.length > 0) {
        const tags = skill.metadata.tags.map((tag) => ansis.bgGray.white(` ${tag} `)).join(" ");
        console.log(`    ${tags}`);
      }
      console.log(ansis.dim(`    ${t("skillsSync:label.author")}: ${skill.metadata.author}`));
      console.log(ansis.dim(`    ${t("skillsSync:label.updated")}: ${new Date(skill.updatedAt).toLocaleString()}`));
      console.log("");
    }
  } catch (error) {
    console.error(ansis.red(`
  ${t("skillsSync:error.listFailed")}: ${error}`));
    throw error;
  }
}
async function showSyncStatus(options = {}) {
  const t = getTranslation(options.lang);
  try {
    const syncState = loadSyncState();
    const localSkills = await getLocalSkills();
    const cloudResponse = await listCloudSkills({ privacy: options.privacy });
    const cloudSkills = cloudResponse.success ? cloudResponse.data?.skills || [] : [];
    console.log(ansis.bold(`  ${t("skillsSync:label.status")}:`));
    console.log(ansis.dim(`    ${t("skillsSync:label.localSkills")}: ${localSkills.length}`));
    console.log(ansis.dim(`    ${t("skillsSync:label.cloudSkills")}: ${cloudSkills.length}`));
    console.log(ansis.dim(`    ${t("skillsSync:label.lastSync")}: ${new Date(syncState.lastGlobalSync).toLocaleString()}`));
    const states = Object.values(syncState.skills);
    const synced = states.filter((s) => s.status === "synced").length;
    const localAhead = states.filter((s) => s.status === "local_ahead").length;
    const remoteAhead = states.filter((s) => s.status === "remote_ahead").length;
    const conflicts = states.filter((s) => s.status === "conflict").length;
    const localOnly = states.filter((s) => s.status === "local_only").length;
    const remoteOnly = states.filter((s) => s.status === "remote_only").length;
    console.log("");
    console.log(ansis.bold(`  ${t("skillsSync:label.syncStates")}:`));
    if (synced > 0)
      console.log(ansis.green(`    \u2713 ${t("skillsSync:status.synced")}: ${synced}`));
    if (localAhead > 0)
      console.log(ansis.yellow(`    \u2191 ${t("skillsSync:status.localAhead")}: ${localAhead}`));
    if (remoteAhead > 0)
      console.log(ansis.yellow(`    \u2193 ${t("skillsSync:status.remoteAhead")}: ${remoteAhead}`));
    if (conflicts > 0)
      console.log(ansis.red(`    \u26A0 ${t("skillsSync:status.conflict")}: ${conflicts}`));
    if (localOnly > 0)
      console.log(ansis.green(`    \u2295 ${t("skillsSync:status.localOnly")}: ${localOnly}`));
    if (remoteOnly > 0)
      console.log(ansis.green(`    \u2296 ${t("skillsSync:status.remoteOnly")}: ${remoteOnly}`));
    console.log("");
  } catch (error) {
    console.warn(ansis.yellow(`  ${t("skillsSync:warning.statusFailed")}: ${error}`));
  }
}
async function skillsSyncMenu(options = {}) {
  const t = getTranslation(options.lang);
  while (true) {
    console.log("");
    console.log(ansis.bold.cyan("\u2501".repeat(60)));
    console.log(ansis.bold.cyan(`  ${t("skillsSync:menu.title")}`));
    console.log(ansis.bold.cyan("\u2501".repeat(60)));
    console.log("");
    const { action } = await inquirer.prompt({
      type: "list",
      name: "action",
      message: t("skillsSync:menu.prompt"),
      choices: [
        { name: `\u{1F504} ${t("skillsSync:menu.sync")}`, value: "sync" },
        { name: `\u2191 ${t("skillsSync:menu.push")}`, value: "push" },
        { name: `\u2193 ${t("skillsSync:menu.pull")}`, value: "pull" },
        { name: `\u{1F4CB} ${t("skillsSync:menu.list")}`, value: "list" },
        { name: `\u{1F4CA} ${t("skillsSync:menu.status")}`, value: "status" },
        new inquirer.Separator(),
        { name: `\u{1F519} ${t("skillsSync:menu.back")}`, value: "back" }
      ]
    });
    if (action === "back") {
      break;
    }
    try {
      switch (action) {
        case "sync":
          await syncSkills(options);
          break;
        case "push":
          await pushSkillsCommand(options);
          break;
        case "pull":
          await pullSkillsCommand(options);
          break;
        case "list":
          await listCloudSkillsCommand(options);
          break;
        case "status":
          await showSyncStatus(options);
          break;
      }
    } catch (error) {
      console.error(ansis.red(`
  ${t("common.error")}: ${error}`));
    }
    await inquirer.prompt({
      type: "input",
      name: "continue",
      message: t("common.pressEnterToContinue")
    });
  }
}
function displaySyncResult(result, lang) {
  const t = getTranslation();
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${t("skillsSync:result.title")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  if (result.success) {
    console.log(ansis.bold.green(`  \u2713 ${t("skillsSync:result.success")}`));
  } else {
    console.log(ansis.bold.red(`  \u2717 ${t("skillsSync:result.failed")}`));
    if (result.error) {
      console.log(ansis.red(`    ${result.error}`));
    }
  }
  console.log("");
  console.log(ansis.bold(`  ${t("skillsSync:result.statistics")}:`));
  console.log(ansis.dim(`    ${t("skillsSync:result.total")}: ${result.total}`));
  console.log(ansis.green(`    ${t("skillsSync:result.succeeded")}: ${result.succeeded}`));
  if (result.failed > 0) {
    console.log(ansis.red(`    ${t("skillsSync:result.failed")}: ${result.failed}`));
  }
  if (result.conflicts > 0) {
    console.log(ansis.yellow(`    ${t("skillsSync:result.conflicts")}: ${result.conflicts}`));
  }
  console.log(ansis.green(`    ${t("skillsSync:result.uploaded")}: ${result.uploaded}`));
  console.log(ansis.green(`    ${t("skillsSync:result.downloaded")}: ${result.downloaded}`));
  console.log(ansis.dim(`    ${t("skillsSync:result.skipped")}: ${result.skipped}`));
  console.log(ansis.dim(`    ${t("skillsSync:result.duration")}: ${(result.durationMs / 1e3).toFixed(2)}s`));
  if (result.failed > 0 || result.conflicts > 0) {
    console.log("");
    console.log(ansis.bold(`  ${t("skillsSync:result.details")}:`));
    for (const item of result.results) {
      if (!item.success || item.action === "conflict") {
        const icon = item.success ? "\u26A0" : "\u2717";
        const color = item.success ? ansis.yellow : ansis.red;
        console.log(color(`    ${icon} ${item.skillName}`));
        if (item.error) {
          console.log(ansis.dim(`      ${item.error}`));
        }
        if (item.action === "conflict") {
          console.log(ansis.dim(`      ${t("skillsSync:result.conflictHint")}`));
        }
      }
    }
  }
  console.log("");
}
function getPrivacyBadge(privacy) {
  switch (privacy) {
    case "private":
      return ansis.bgRed.white(" PRIVATE ");
    case "team":
      return ansis.bgYellow.black(" TEAM ");
    case "public":
      return ansis.bgGreen.white(" PUBLIC ");
    default:
      return "";
  }
}

export { listCloudSkillsCommand, pullSkillsCommand, pushSkillsCommand, showSyncStatus, skillsSyncMenu, syncSkills };
