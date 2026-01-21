import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'pathe';

const QUICK_ACTIONS = [
  {
    id: 1,
    name: "Smart Commit",
    nameZh: "\u667A\u80FD\u63D0\u4EA4",
    icon: "\u{1F4DD}",
    description: "Auto-generate commit message",
    descriptionZh: "\u81EA\u52A8\u751F\u6210 commit \u6D88\u606F",
    command: "/commit",
    autoActivate: true,
    triggers: ["commit", "git", "push", "save", "\u63D0\u4EA4", "\u4FDD\u5B58"]
  },
  {
    id: 2,
    name: "Code Review",
    nameZh: "\u4EE3\u7801\u5BA1\u67E5",
    icon: "\u{1F50D}",
    description: "Deep two-stage code review",
    descriptionZh: "\u6DF1\u5EA6\u4E24\u9636\u6BB5\u4EE3\u7801\u5BA1\u67E5",
    command: "/review",
    autoActivate: true,
    triggers: ["review", "check", "pr", "merge", "\u5BA1\u67E5", "\u68C0\u67E5", "\u5408\u5E76"]
  },
  {
    id: 3,
    name: "Write Tests",
    nameZh: "\u7F16\u5199\u6D4B\u8BD5",
    icon: "\u{1F9EA}",
    description: "TDD workflow",
    descriptionZh: "TDD \u5DE5\u4F5C\u6D41",
    command: "/tdd",
    autoActivate: true,
    triggers: ["test", "tdd", "unit", "spec", "\u6D4B\u8BD5", "\u5355\u5143\u6D4B\u8BD5"]
  },
  {
    id: 4,
    name: "Plan Feature",
    nameZh: "\u89C4\u5212\u529F\u80FD",
    icon: "\u{1F4CB}",
    description: "6-step development workflow",
    descriptionZh: "6\u6B65\u5F00\u53D1\u6D41\u7A0B",
    command: "/workflow",
    autoActivate: true,
    triggers: ["plan", "feature", "implement", "build", "create", "\u89C4\u5212", "\u529F\u80FD", "\u5B9E\u73B0", "\u521B\u5EFA"]
  },
  {
    id: 5,
    name: "Debug Issue",
    nameZh: "\u8C03\u8BD5\u95EE\u9898",
    icon: "\u{1F41B}",
    description: "Systematic debugging",
    descriptionZh: "\u7CFB\u7EDF\u6027\u8C03\u8BD5",
    command: "/debug",
    autoActivate: true,
    triggers: ["debug", "bug", "error", "fix", "issue", "problem", "\u8C03\u8BD5", "\u9519\u8BEF", "\u4FEE\u590D", "\u95EE\u9898"]
  },
  {
    id: 6,
    name: "Brainstorm",
    nameZh: "\u5934\u8111\u98CE\u66B4",
    icon: "\u{1F4A1}",
    description: "Explore ideas and solutions",
    descriptionZh: "\u63A2\u7D22\u60F3\u6CD5\u548C\u65B9\u6848",
    command: "/brainstorm",
    autoActivate: true,
    triggers: ["brainstorm", "idea", "design", "think", "explore", "\u5934\u8111\u98CE\u66B4", "\u60F3\u6CD5", "\u8BBE\u8BA1", "\u63A2\u7D22"]
  },
  {
    id: 7,
    name: "Verify Code",
    nameZh: "\u9A8C\u8BC1\u4EE3\u7801",
    icon: "\u2705",
    description: "Quality verification",
    descriptionZh: "\u8D28\u91CF\u9A8C\u8BC1",
    command: "/verify",
    autoActivate: true,
    triggers: ["verify", "validate", "quality", "deploy", "\u9A8C\u8BC1", "\u8D28\u91CF", "\u90E8\u7F72"]
  },
  {
    id: 8,
    name: "Write Docs",
    nameZh: "\u5199\u6587\u6863",
    icon: "\u{1F4D6}",
    description: "Generate documentation",
    descriptionZh: "\u751F\u6210\u6587\u6863",
    command: "/docs",
    autoActivate: false,
    triggers: ["doc", "docs", "readme", "documentation", "\u6587\u6863", "\u8BF4\u660E"]
  }
];
function generateQuickActionsPanel(lang = "en") {
  const isZh = lang === "zh-CN";
  const title = isZh ? "\u{1F4A1} \u5FEB\u6377\u64CD\u4F5C\uFF08\u8F93\u5165\u6570\u5B57\u6267\u884C\uFF09\uFF1A" : "\u{1F4A1} Quick Actions (type number to execute):";
  const lines = [
    title,
    "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"
  ];
  for (const action of QUICK_ACTIONS) {
    const name = isZh ? action.nameZh : action.name;
    const desc = isZh ? action.descriptionZh : action.description;
    const line = `\u2502  ${action.id}. ${action.icon} ${name.padEnd(10)} - ${desc.padEnd(16)} \u2502`;
    lines.push(line);
  }
  lines.push("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");
  lines.push(isZh ? "\u8F93\u5165\u6570\u5B57 (1-8) \u6216\u63CF\u8FF0\u4F60\u7684\u4EFB\u52A1..." : "Type number (1-8) or describe your task...");
  return lines.join("\n");
}
function generateSkillReferenceCard(lang = "en") {
  const isZh = lang === "zh-CN";
  const header = isZh ? "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551                    CCJK \u6280\u80FD\u901F\u67E5\u5361                            \u2551\n\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563" : "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551                    CCJK Skills Reference                      \u2551\n\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563";
  const lines = [header];
  for (const action of QUICK_ACTIONS) {
    const name = isZh ? action.nameZh : action.name;
    const line = `\u2551  ${action.icon} ${name.padEnd(10)}    ${isZh ? "\u8F93\u5165" : "Type"}: ${action.id} ${isZh ? "\u6216" : "or"} ${action.command.padEnd(12)}            \u2551`;
    lines.push(line);
  }
  lines.push("\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563");
  lines.push(isZh ? "\u2551  \u{1F4A1} \u63D0\u793A: \u76F4\u63A5\u8F93\u5165\u6570\u5B57\uFF0CClaude \u4F1A\u81EA\u52A8\u6267\u884C\u5BF9\u5E94\u64CD\u4F5C              \u2551" : "\u2551  \u{1F4A1} Tip: Just type a number, Claude will execute automatically \u2551");
  lines.push("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
  return lines.join("\n");
}
function generateSmartGuideDirective(lang = "en") {
  const isZh = lang === "zh-CN";
  const directive = isZh ? `
## \u{1F3AF} CCJK \u667A\u80FD\u52A9\u624B\u6A21\u5F0F

### \u5BF9\u8BDD\u5F00\u59CB\u65F6
\u5728\u6BCF\u6B21\u5BF9\u8BDD\u5F00\u59CB\u65F6\uFF0C\u663E\u793A\u5FEB\u6377\u64CD\u4F5C\u9762\u677F\uFF1A

\`\`\`
${generateQuickActionsPanel("zh-CN")}
\`\`\`

### \u6570\u5B57\u8F93\u5165\u5904\u7406
\u5F53\u7528\u6237\u8F93\u5165\u5355\u4E2A\u6570\u5B57 (1-8) \u65F6\uFF0C\u81EA\u52A8\u6267\u884C\u5BF9\u5E94\u6280\u80FD\uFF1A
${QUICK_ACTIONS.map((a) => `- **${a.id}** \u2192 \u6267\u884C ${a.command} (${a.nameZh})`).join("\n")}

### \u667A\u80FD\u573A\u666F\u611F\u77E5
\u6839\u636E\u7528\u6237\u8F93\u5165\u81EA\u52A8\u63A8\u8350\uFF1A
- \u63D0\u5230"\u63D0\u4EA4/commit/push" \u2192 \u63A8\u8350\u8F93\u5165 **1**
- \u63D0\u5230"\u5BA1\u67E5/review/\u68C0\u67E5" \u2192 \u63A8\u8350\u8F93\u5165 **2**
- \u63D0\u5230"\u6D4B\u8BD5/test/tdd" \u2192 \u63A8\u8350\u8F93\u5165 **3**
- \u63D0\u5230"\u529F\u80FD/feature/\u5B9E\u73B0" \u2192 \u63A8\u8350\u8F93\u5165 **4**
- \u63D0\u5230"bug/\u9519\u8BEF/\u4FEE\u590D" \u2192 \u63A8\u8350\u8F93\u5165 **5**
- \u63D0\u5230"\u60F3\u6CD5/\u8BBE\u8BA1/\u65B9\u6848" \u2192 \u63A8\u8350\u8F93\u5165 **6**

### \u5E2E\u52A9\u547D\u4EE4
- \u7528\u6237\u8BF4"\u66F4\u591A"\u6216"\u5E2E\u52A9" \u2192 \u663E\u793A\u5B8C\u6574\u6280\u80FD\u5217\u8868
- \u7528\u6237\u8BF4"?" \u2192 \u663E\u793A\u5FEB\u6377\u64CD\u4F5C\u9762\u677F
` : `
## \u{1F3AF} CCJK Smart Assistant Mode

### At Conversation Start
Display quick actions panel at the start of each conversation:

\`\`\`
${generateQuickActionsPanel("en")}
\`\`\`

### Number Input Handling
When user types a single number (1-8), automatically execute the corresponding skill:
${QUICK_ACTIONS.map((a) => `- **${a.id}** \u2192 Execute ${a.command} (${a.name})`).join("\n")}

### Intelligent Context Detection
Auto-suggest based on user input:
- Mentions "commit/push/save" \u2192 Suggest typing **1**
- Mentions "review/check/pr" \u2192 Suggest typing **2**
- Mentions "test/tdd/spec" \u2192 Suggest typing **3**
- Mentions "feature/implement/build" \u2192 Suggest typing **4**
- Mentions "bug/error/fix" \u2192 Suggest typing **5**
- Mentions "idea/design/explore" \u2192 Suggest typing **6**

### Help Commands
- User says "more" or "help" \u2192 Show full skill list
- User says "?" \u2192 Show quick actions panel
`;
  return directive;
}
function getClaudeMdPath() {
  return join(homedir(), ".claude", "CLAUDE.md");
}
async function injectSmartGuide(lang = "en") {
  const claudeMdPath = getClaudeMdPath();
  try {
    let content = "";
    if (existsSync(claudeMdPath)) {
      content = await readFile(claudeMdPath, "utf-8");
      if (content.includes("CCJK \u667A\u80FD\u52A9\u624B\u6A21\u5F0F") || content.includes("CCJK Smart Assistant Mode")) {
        content = content.replace(/\n## 🎯 CCJK (智能助手模式|Smart Assistant Mode)[\s\S]*?(?=\n## |$)/g, "");
      }
    }
    const directive = generateSmartGuideDirective(lang);
    content = `${content.trim()}
${directive}`;
    await writeFile(claudeMdPath, content, "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to inject smart guide:", error);
    return false;
  }
}
async function removeSmartGuide() {
  const claudeMdPath = getClaudeMdPath();
  try {
    if (!existsSync(claudeMdPath)) {
      return true;
    }
    let content = await readFile(claudeMdPath, "utf-8");
    content = content.replace(/\n## 🎯 CCJK (智能助手模式|Smart Assistant Mode)[\s\S]*?(?=\n## |$)/g, "");
    await writeFile(claudeMdPath, content.trim(), "utf-8");
    return true;
  } catch {
    return false;
  }
}
async function isSmartGuideInstalled() {
  const claudeMdPath = getClaudeMdPath();
  try {
    if (!existsSync(claudeMdPath)) {
      return false;
    }
    const content = await readFile(claudeMdPath, "utf-8");
    return content.includes("CCJK \u667A\u80FD\u52A9\u624B\u6A21\u5F0F") || content.includes("CCJK Smart Assistant Mode");
  } catch {
    return false;
  }
}

export { QUICK_ACTIONS, generateQuickActionsPanel, generateSkillReferenceCard, generateSmartGuideDirective, injectSmartGuide, isSmartGuideInstalled, removeSmartGuide };
