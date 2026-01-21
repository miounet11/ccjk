import { existsSync, readFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import process__default from 'node:process';
import ansis from 'ansis';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import ora from 'ora';
import { join, basename } from 'pathe';
import { CCJK_CONFIG_DIR } from './constants.mjs';
import { d as detectProject, g as getProjectSummary, a as generateSuggestions } from '../shared/ccjk.CBhIZiPz.mjs';
import { b as boxify, t as theme, S as STATUS } from '../shared/ccjk.BpHTUkb8.mjs';
import { writeFileAtomic } from './fs-operations.mjs';
import 'node:os';
import './index.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import './package.mjs';
import 'node:crypto';
import 'node:fs/promises';

const KNOWLEDGE_BASE_FILE = join(CCJK_CONFIG_DIR, "knowledge-base.json");
function simpleHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
function loadKnowledgeBase() {
  if (existsSync(KNOWLEDGE_BASE_FILE)) {
    try {
      return JSON.parse(readFileSync(KNOWLEDGE_BASE_FILE, "utf-8"));
    } catch {
    }
  }
  return {
    version: "1.0.0",
    lastSync: (/* @__PURE__ */ new Date()).toISOString(),
    entries: [],
    projectContexts: []
  };
}
function saveKnowledgeBase(kb) {
  if (!existsSync(CCJK_CONFIG_DIR)) {
    mkdirSync(CCJK_CONFIG_DIR, { recursive: true });
  }
  kb.lastSync = (/* @__PURE__ */ new Date()).toISOString();
  writeFileAtomic(KNOWLEDGE_BASE_FILE, JSON.stringify(kb, null, 2));
}
function isFileOutdated(filePath, daysThreshold = 30) {
  try {
    const stat = statSync(filePath);
    const daysSinceModified = dayjs().diff(dayjs(stat.mtime), "day");
    return daysSinceModified > daysThreshold;
  } catch {
    return true;
  }
}
function scanClaudeMd(projectDir) {
  const possiblePaths = [
    join(projectDir, "CLAUDE.md"),
    join(projectDir, "claude.md"),
    join(projectDir, ".claude", "CLAUDE.md"),
    join(projectDir, "docs", "CLAUDE.md")
  ];
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8");
      return {
        path,
        content,
        outdated: isFileOutdated(path)
      };
    }
  }
  return null;
}
function scanAgents(projectDir) {
  const agents = [];
  const agentDirs = [
    join(projectDir, ".claude", "agents"),
    join(projectDir, "agents"),
    join(projectDir, ".agents")
  ];
  for (const dir of agentDirs) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir);
        for (const file of files) {
          if (file.endsWith(".md")) {
            const filePath = join(dir, file);
            agents.push({
              path: filePath,
              name: basename(file, ".md"),
              content: readFileSync(filePath, "utf-8")
            });
          }
        }
      } catch {
      }
    }
  }
  return agents;
}
function scanSkills(projectDir) {
  const skills = [];
  const skillDirs = [
    join(projectDir, ".claude", "commands"),
    join(projectDir, ".claude", "skills"),
    join(projectDir, "skills")
  ];
  for (const dir of skillDirs) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir);
        for (const file of files) {
          if (file.endsWith(".md")) {
            const filePath = join(dir, file);
            skills.push({
              path: filePath,
              name: basename(file, ".md"),
              content: readFileSync(filePath, "utf-8")
            });
          }
        }
      } catch {
      }
    }
  }
  return skills;
}
function addToKnowledgeBase(kb, type, name, path, content, projectRoot) {
  const hash = simpleHash(content);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existingIndex = kb.entries.findIndex((e) => e.path === path);
  if (existingIndex >= 0) {
    if (kb.entries[existingIndex].hash !== hash) {
      kb.entries[existingIndex] = {
        ...kb.entries[existingIndex],
        content,
        hash,
        updatedAt: now
      };
    }
  } else {
    kb.entries.push({
      id: `${type}-${Date.now()}`,
      type,
      name,
      path,
      content,
      hash,
      createdAt: now,
      updatedAt: now,
      projectRoot
    });
  }
}
function generateDefaultClaudeMd(project) {
  return `# ${project.name}

## Project Overview

This is a ${project.type} project using ${project.frameworks.join(", ") || "standard tools"}.

## Tech Stack

${project.languages.map((l) => `- ${l}`).join("\n")}
${project.frameworks.map((f) => `- ${f}`).join("\n")}

## Development Guidelines

### Code Style
- Follow existing code conventions
- Use TypeScript strict mode
- Write meaningful commit messages

### Testing
${project.testFrameworks.length > 0 ? `Using: ${project.testFrameworks.join(", ")}` : "- Add tests for new features"}

### Build & Deploy
${project.buildTools.length > 0 ? `Build tools: ${project.buildTools.join(", ")}` : "- Follow standard build process"}

## Important Files

- \`README.md\` - Project documentation
- \`package.json\` - Dependencies and scripts

## AI Assistant Notes

- Prefer concise, actionable responses
- Follow existing patterns in the codebase
- Ask before making breaking changes

---
*Generated by CCJK on ${dayjs().format("YYYY-MM-DD")}*
`;
}
async function runOnboarding(projectDir = process__default.cwd()) {
  console.log(boxify(`
  Welcome to CCJK!

  Let's set up your project for optimal AI-assisted development.
  This will scan your project and create a knowledge base.
`, "double", "\u{1F680} CCJK Setup"));
  const result = {
    success: false,
    projectDetected: false,
    claudeMdFound: false,
    claudeMdUpdated: false,
    agentsFound: 0,
    skillsFound: 0,
    knowledgeEntriesCreated: 0,
    recommendations: []
  };
  const kb = loadKnowledgeBase();
  const spinner = ora("Scanning project...").start();
  const project = detectProject(projectDir);
  spinner.succeed("Project detected");
  result.projectDetected = true;
  console.log("");
  console.log(theme.secondary("\u{1F4C1} Project Info:"));
  console.log(ansis.gray(getProjectSummary(project)));
  console.log("");
  spinner.start("Looking for CLAUDE.md...");
  const claudeMd = scanClaudeMd(projectDir);
  if (claudeMd) {
    spinner.succeed(`Found CLAUDE.md at ${claudeMd.path}`);
    result.claudeMdFound = true;
    if (claudeMd.outdated) {
      console.log(STATUS.warning("CLAUDE.md appears to be outdated (>30 days old)"));
      const { updateClaudeMd } = await inquirer.prompt([
        {
          type: "confirm",
          name: "updateClaudeMd",
          message: "Would you like to refresh it with current project info?",
          default: true
        }
      ]);
      if (updateClaudeMd) {
        const newContent = generateDefaultClaudeMd(project);
        const backupPath = `${claudeMd.path}.backup-${dayjs().format("YYYYMMDD")}`;
        writeFileAtomic(backupPath, claudeMd.content);
        writeFileAtomic(claudeMd.path, newContent);
        console.log(STATUS.success(`Updated! Backup saved to ${backupPath}`));
        result.claudeMdUpdated = true;
        addToKnowledgeBase(kb, "claude-md", "CLAUDE.md", claudeMd.path, newContent, projectDir);
      } else {
        addToKnowledgeBase(kb, "claude-md", "CLAUDE.md", claudeMd.path, claudeMd.content, projectDir);
      }
    } else {
      addToKnowledgeBase(kb, "claude-md", "CLAUDE.md", claudeMd.path, claudeMd.content, projectDir);
    }
    result.knowledgeEntriesCreated++;
  } else {
    spinner.warn("No CLAUDE.md found");
    const { createClaudeMd } = await inquirer.prompt([
      {
        type: "confirm",
        name: "createClaudeMd",
        message: "Would you like to create one? (Recommended for AI assistance)",
        default: true
      }
    ]);
    if (createClaudeMd) {
      const newContent = generateDefaultClaudeMd(project);
      const newPath = join(projectDir, "CLAUDE.md");
      writeFileAtomic(newPath, newContent);
      console.log(STATUS.success(`Created ${newPath}`));
      result.claudeMdFound = true;
      result.claudeMdUpdated = true;
      addToKnowledgeBase(kb, "claude-md", "CLAUDE.md", newPath, newContent, projectDir);
      result.knowledgeEntriesCreated++;
    } else {
      result.recommendations.push("Consider creating a CLAUDE.md file for better AI assistance");
    }
  }
  spinner.start("Scanning for agents...");
  const agents = scanAgents(projectDir);
  spinner.succeed(`Found ${agents.length} agent(s)`);
  result.agentsFound = agents.length;
  for (const agent of agents) {
    addToKnowledgeBase(kb, "agent", agent.name, agent.path, agent.content, projectDir);
    result.knowledgeEntriesCreated++;
  }
  if (agents.length === 0) {
    result.recommendations.push("Add custom agents in .claude/agents/ for specialized assistance");
  }
  spinner.start("Scanning for skills...");
  const skills = scanSkills(projectDir);
  spinner.succeed(`Found ${skills.length} skill(s)`);
  result.skillsFound = skills.length;
  for (const skill of skills) {
    addToKnowledgeBase(kb, "skill", skill.name, skill.path, skill.content, projectDir);
    result.knowledgeEntriesCreated++;
  }
  if (skills.length === 0) {
    result.recommendations.push("Add custom skills in .claude/commands/ for quick actions");
  }
  const suggestions = generateSuggestions(project);
  const existingContextIndex = kb.projectContexts.findIndex((c) => c.rootDir === projectDir);
  const projectContext = {
    rootDir: projectDir,
    name: project.name,
    type: project.type,
    frameworks: project.frameworks,
    lastScanned: (/* @__PURE__ */ new Date()).toISOString(),
    claudeMdHash: claudeMd ? simpleHash(claudeMd.content) : void 0,
    agentsCount: agents.length,
    skillsCount: skills.length
  };
  if (existingContextIndex >= 0) {
    kb.projectContexts[existingContextIndex] = projectContext;
  } else {
    kb.projectContexts.push(projectContext);
  }
  addToKnowledgeBase(
    kb,
    "project-info",
    project.name,
    projectDir,
    JSON.stringify({ project, suggestions }, null, 2),
    projectDir
  );
  result.knowledgeEntriesCreated++;
  saveKnowledgeBase(kb);
  console.log("");
  console.log(theme.primary("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550"));
  console.log(theme.accent("                 Setup Complete!                "));
  console.log(theme.primary("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550"));
  console.log("");
  console.log(`  \u{1F4DA} Knowledge entries: ${result.knowledgeEntriesCreated}`);
  console.log(`  \u{1F4C4} CLAUDE.md: ${result.claudeMdFound ? "\u2713" : "\u2717"}`);
  console.log(`  \u{1F916} Agents: ${result.agentsFound}`);
  console.log(`  \u26A1 Skills: ${result.skillsFound}`);
  console.log("");
  if (result.recommendations.length > 0) {
    console.log(theme.secondary("\u{1F4A1} Recommendations:"));
    for (const rec of result.recommendations) {
      console.log(ansis.gray(`   \u2022 ${rec}`));
    }
    console.log("");
  }
  console.log(theme.secondary("\u{1F4CC} Next Steps:"));
  console.log(ansis.gray("   \u2022 Run `ccjk` to open the main menu"));
  console.log(ansis.gray("   \u2022 Run `ccjk doctor` to check environment"));
  console.log(ansis.gray("   \u2022 Run `ccjk groups enable typescript-dev` for TypeScript support"));
  console.log("");
  result.success = true;
  return result;
}
async function quickSync(projectDir = process__default.cwd()) {
  const spinner = ora("Syncing project knowledge...").start();
  const kb = loadKnowledgeBase();
  detectProject(projectDir);
  const claudeMd = scanClaudeMd(projectDir);
  if (claudeMd) {
    addToKnowledgeBase(kb, "claude-md", "CLAUDE.md", claudeMd.path, claudeMd.content, projectDir);
  }
  const agents = scanAgents(projectDir);
  for (const agent of agents) {
    addToKnowledgeBase(kb, "agent", agent.name, agent.path, agent.content, projectDir);
  }
  const skills = scanSkills(projectDir);
  for (const skill of skills) {
    addToKnowledgeBase(kb, "skill", skill.name, skill.path, skill.content, projectDir);
  }
  saveKnowledgeBase(kb);
  spinner.succeed(`Synced: ${claudeMd ? 1 : 0} CLAUDE.md, ${agents.length} agents, ${skills.length} skills`);
}

export { loadKnowledgeBase, quickSync, runOnboarding, saveKnowledgeBase };
