import ansis from 'ansis';
import inquirer from 'inquirer';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import process__default from 'node:process';
import { join } from 'pathe';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';

const DEFAULT_VIM_CONFIG = {
  enabled: false,
  showModeIndicator: true,
  autoIndent: true,
  expandTab: true,
  tabWidth: 2,
  smartCase: true,
  lang: "en"
};
class VimModeManager {
  state;
  config;
  configPath;
  constructor(configPath) {
    this.configPath = configPath || join(homedir(), ".ccjk", "vim-mode.json");
    this.state = this.initializeState();
    this.config = { ...DEFAULT_VIM_CONFIG };
    this.loadConfig();
  }
  initializeState() {
    return {
      mode: "normal",
      position: { line: 0, column: 0 },
      lastCommand: null,
      lastSearchedChar: null,
      registers: /* @__PURE__ */ new Map(),
      marks: /* @__PURE__ */ new Map(),
      visualStart: null
    };
  }
  // ========================================================================
  // Configuration Management
  // ========================================================================
  async loadConfig() {
    try {
      if (existsSync(this.configPath)) {
        const content = await readFile(this.configPath, "utf-8");
        const saved = JSON.parse(content);
        this.config = { ...DEFAULT_VIM_CONFIG, ...saved };
      }
    } catch {
    }
  }
  async saveConfig() {
    try {
      const dir = join(this.configPath, "..");
      await mkdir(dir, { recursive: true });
      await writeFile(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
    } catch (error) {
      console.error(ansis.red(`Failed to save vim config: ${error}`));
    }
  }
  getConfig() {
    return { ...this.config };
  }
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }
  // ========================================================================
  // State Management
  // ========================================================================
  getState() {
    return { ...this.state };
  }
  setMode(mode) {
    this.state.mode = mode;
    if (mode === "normal") {
      this.state.visualStart = null;
    }
  }
  getMode() {
    return this.state.mode;
  }
  setPosition(position) {
    this.state.position = position;
  }
  getPosition() {
    return { ...this.state.position };
  }
  // ========================================================================
  // Register Operations (Yank/Paste)
  // ========================================================================
  yankToRegister(register, text) {
    const reg = register || '"';
    this.state.registers.set(reg, text);
    if (reg !== '"') {
      this.state.registers.set('"', text);
    }
  }
  getYankText(register) {
    const reg = register || '"';
    return this.state.registers.get(reg) || "";
  }
  pasteAfter(register) {
    const text = this.getYankText(register);
    return text;
  }
  pasteBefore(register) {
    const text = this.getYankText(register);
    return text;
  }
  // ========================================================================
  // Mark Operations
  // ========================================================================
  setMark(mark, position) {
    this.state.marks.set(mark, position);
  }
  getMark(mark) {
    return this.state.marks.get(mark);
  }
  // ========================================================================
  // Last Searched Character (for f/F/t/T repetition with ;/,)
  // ========================================================================
  setLastSearchedChar(char, forward) {
    this.state.lastSearchedChar = { char, forward };
  }
  getLastSearchedChar() {
    return this.state.lastSearchedChar;
  }
  // ========================================================================
  // Visual Mode
  // ========================================================================
  startVisualMode(startPos) {
    this.state.mode = "visual";
    this.state.visualStart = startPos;
  }
  endVisualMode() {
    this.state.mode = "normal";
    this.state.visualStart = null;
  }
  getVisualRange() {
    if (!this.state.visualStart) {
      return null;
    }
    return {
      start: this.state.visualStart,
      end: this.state.position
    };
  }
}
function parseVimCommand(input) {
  if (!input) {
    return null;
  }
  let remaining = input;
  let count = 0;
  const countMatch = remaining.match(/^(\d+)/);
  if (countMatch) {
    count = Number.parseInt(countMatch[1], 10);
    remaining = remaining.slice(countMatch[1].length);
  }
  if (!remaining) {
    return null;
  }
  const command = {};
  if (count > 0) {
    command.count = count;
  }
  const operator = remaining[0];
  if (["d", "c", "y", ">", "<", "J"].includes(operator)) {
    command.operator = operator;
    remaining = remaining.slice(1);
    if (operator === "y" && remaining === "y") {
      command.motion = "yy";
      return command;
    }
    if (operator === "y" && remaining === "") {
      command.motion = "yy";
      return command;
    }
    if (operator === ">" && remaining === ">") {
      command.motion = ">>";
      return command;
    }
    if (operator === "<" && remaining === "<") {
      command.motion = "<<";
      return command;
    }
    if (operator === "J") {
      return command;
    }
  } else if (operator === "p" || operator === "P") {
    command.operator = operator;
    return command;
  }
  if (remaining.length >= 2) {
    const scope = remaining[0];
    const type = remaining[1];
    if (scope === "i" || scope === "a") {
      let textObject;
      switch (type) {
        case "w":
          textObject = { type: "word", inclusive: scope === "a" };
          break;
        case "W":
          textObject = { type: "WORD", inclusive: scope === "a" };
          break;
        case '"':
        case "'":
          textObject = { type: "quote", inclusive: scope === "a", character: type };
          break;
        case "(":
        case ")":
          textObject = { type: "paren", inclusive: scope === "a", character: "(" };
          break;
        case "[":
        case "]":
          textObject = { type: "bracket", inclusive: scope === "a", character: "[" };
          break;
        case "{":
        case "}":
          textObject = { type: "brace", inclusive: scope === "a", character: "{" };
          break;
      }
      if (textObject) {
        command.textObject = textObject;
        if (!command.operator) {
          command.operator = "d";
        }
        return command;
      }
    }
  }
  if (remaining && !command.textObject) {
    command.motion = remaining;
  }
  return command;
}
function generateVimKeybindings() {
  return [
    // Motion repetition
    { sequence: "\\C-;", action: "repeatFind", description: "Repeat last character search (same direction)" },
    { sequence: "\\C-,", action: "repeatFindReverse", description: "Repeat last character search (reverse direction)" },
    // Yank operations
    { sequence: "\\C-y\\C-y", action: "yankLine", description: "Yank current line" },
    { sequence: "\\C-Y", action: "yankLine", description: "Yank current line (alias)" },
    // Paste operations
    { sequence: "\\C-p", action: "pasteAfter", description: "Paste after cursor" },
    { sequence: "\\C-P", action: "pasteBefore", description: "Paste before cursor" },
    // Text object deletion
    { sequence: "\\C-c\\C-i\\C-w", action: "changeInnerWord", description: "Change inner word" },
    { sequence: "\\C-c\\C-a\\C-w", action: "changeAroundWord", description: "Change around word" },
    { sequence: "\\C-d\\C-i\\C-w", action: "deleteInnerWord", description: "Delete inner word" },
    { sequence: "\\C-d\\C-a\\C-w", action: "deleteAroundWord", description: "Delete around word" },
    // Indent operations
    { sequence: "\\C-\\>", action: "indentLine", description: "Indent current line" },
    { sequence: "\\C-<", action: "dedentLine", description: "Dedent current line" },
    // Join lines
    { sequence: "\\C-j", action: "joinLines", description: "Join with next line" }
  ];
}
function generateInputrcConfig(config = {}) {
  const actualConfig = { ...DEFAULT_VIM_CONFIG, ...config };
  let content = `# CCJK Vim Mode Keybindings
# Generated by CCJK v3.8.0
# These keybindings enhance the readline experience with Vim-like motions

$if CCJK_VIM_MODE
`;
  if (actualConfig.showModeIndicator) {
    content += `
# Show mode indicator in prompt
set show-mode-in-prompt on
set vi-cmd-mode-string "(cmd)"
set vi-ins-mode-string "(ins)"
`;
  }
  content += `
# Vim editing mode
set editing-mode vi

# Key bindings for enhanced Vim motions
`;
  const keybindings = generateVimKeybindings();
  for (const kb of keybindings) {
    content += `# ${kb.description}
`;
    content += `"${kb.sequence}": "${kb.action}"

`;
  }
  content += `
$endif
`;
  return content;
}
function getInputrcPath() {
  const envInputrc = process__default.env.INPUTRC;
  if (envInputrc) {
    return envInputrc;
  }
  return join(homedir(), ".inputrc");
}
async function installVimKeybindings(config = {}) {
  try {
    const inputrcPath = getInputrcPath();
    let existingContent = "";
    if (existsSync(inputrcPath)) {
      existingContent = await readFile(inputrcPath, "utf-8");
    }
    const markerStart = "# CCJK Vim Mode Keybindings";
    const regex = new RegExp(`\\n${markerStart}[\\s\\S]*?\\$endif\\n`, "g");
    let newContent = existingContent.replace(regex, "\n");
    const vimConfig = generateInputrcConfig(config);
    newContent = `${newContent.trimEnd()}

${vimConfig}`;
    await writeFile(inputrcPath, newContent, "utf-8");
    return true;
  } catch (error) {
    console.error(ansis.red(`Failed to install vim keybindings: ${error}`));
    return false;
  }
}
async function uninstallVimKeybindings() {
  try {
    const inputrcPath = getInputrcPath();
    if (!existsSync(inputrcPath)) {
      return true;
    }
    const existingContent = await readFile(inputrcPath, "utf-8");
    const markerStart = "# CCJK Vim Mode Keybindings";
    const regex = new RegExp(`\\n${markerStart}[\\s\\S]*?\\$endif\\n`, "g");
    const newContent = existingContent.replace(regex, "\n");
    await writeFile(inputrcPath, `${newContent.trimEnd()}
`, "utf-8");
    return true;
  } catch (error) {
    console.error(ansis.red(`Failed to uninstall vim keybindings: ${error}`));
    return false;
  }
}
function isVimKeybindingsInstalled() {
  try {
    const inputrcPath = getInputrcPath();
    if (!existsSync(inputrcPath)) {
      return false;
    }
    const content = readFileSync(inputrcPath, "utf-8");
    return content.includes("CCJK Vim Mode Keybindings");
  } catch {
    return false;
  }
}
function generateKeybindingReference(lang = "en") {
  const isZh = lang === "zh-CN";
  const header = isZh ? "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551           CCJK Vim \u6A21\u5F0F\u5FEB\u6377\u952E\u53C2\u8003\u5361                          \u2551\n\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563" : "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551           CCJK Vim Mode Keybinding Reference                  \u2551\n\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563";
  const sections = [
    {
      title: isZh ? "\u64CD\u4F5C\u7B26" : "Operators",
      bindings: [
        { key: "yy / Y", desc: isZh ? "\u590D\u5236\u5F53\u524D\u884C" : "Yank current line" },
        { key: "p / P", desc: isZh ? "\u5728\u5149\u6807\u540E/\u524D\u7C98\u8D34" : "Paste after/before cursor" },
        { key: ">> / <<", desc: isZh ? "\u589E\u52A0/\u51CF\u5C11\u7F29\u8FDB" : "Indent/dedent line" },
        { key: "J", desc: isZh ? "\u5408\u5E76\u4E0B\u4E00\u884C" : "Join with next line" }
      ]
    },
    {
      title: isZh ? "\u6587\u672C\u5BF9\u8C61" : "Text Objects",
      bindings: [
        { key: "iw / aw", desc: isZh ? "\u5185\u90E8/\u5468\u56F4\u5355\u8BCD" : "Inner/around word" },
        { key: "iW / aW", desc: isZh ? "\u5185\u90E8/\u5468\u56F4 WORD" : "Inner/around WORD" },
        { key: 'i" / a"', desc: isZh ? "\u5185\u90E8/\u5468\u56F4\u53CC\u5F15\u53F7" : "Inner/around double quotes" },
        { key: "i' / a'", desc: isZh ? "\u5185\u90E8/\u5468\u56F4\u5355\u5F15\u53F7" : "Inner/around single quotes" },
        { key: "i( / a(", desc: isZh ? "\u5185\u90E8/\u5468\u56F4\u62EC\u53F7" : "Inner/around parentheses" },
        { key: "i[ / a[", desc: isZh ? "\u5185\u90E8/\u5468\u56F4\u65B9\u62EC\u53F7" : "Inner/around brackets" },
        { key: "i{ / a{", desc: isZh ? "\u5185\u90E8/\u5468\u56F4\u82B1\u62EC\u53F7" : "Inner/around braces" }
      ]
    },
    {
      title: isZh ? "\u52A8\u4F5C\u91CD\u590D" : "Motion Repetition",
      bindings: [
        { key: ";", desc: isZh ? "\u91CD\u590D\u4E0A\u6B21\u5B57\u7B26\u67E5\u627E\uFF08\u540C\u5411\uFF09" : "Repeat last char search (same dir)" },
        { key: ",", desc: isZh ? "\u91CD\u590D\u4E0A\u6B21\u5B57\u7B26\u67E5\u627E\uFF08\u53CD\u5411\uFF09" : "Repeat last char search (reverse)" },
        { key: "f{char}", desc: isZh ? "\u5411\u524D\u67E5\u627E\u5B57\u7B26" : "Find character forward" },
        { key: "F{char}", desc: isZh ? "\u5411\u540E\u67E5\u627E\u5B57\u7B26" : "Find character backward" },
        { key: "t{char}", desc: isZh ? "\u5411\u524D\u67E5\u627E\u5B57\u7B26\uFF08\u76F4\u5230\uFF09" : "Till character forward" },
        { key: "T{char}", desc: isZh ? "\u5411\u540E\u67E5\u627E\u5B57\u7B26\uFF08\u76F4\u5230\uFF09" : "Till character backward" }
      ]
    },
    {
      title: isZh ? "\u64CD\u4F5C\u7B26\u7EC4\u5408" : "Operator Combinations",
      bindings: [
        { key: "ciw / caw", desc: isZh ? "\u4FEE\u6539\u5185\u90E8/\u5468\u56F4\u5355\u8BCD" : "Change inner/around word" },
        { key: "diw / daw", desc: isZh ? "\u5220\u9664\u5185\u90E8/\u5468\u56F4\u5355\u8BCD" : "Delete inner/around word" },
        { key: 'yi" / ya"', desc: isZh ? "\u590D\u5236\u5F15\u53F7\u5185\u5BB9" : "Yank quoted content" },
        { key: 'ci" / ca"', desc: isZh ? "\u4FEE\u6539\u5F15\u53F7\u5185\u5BB9" : "Change quoted content" },
        { key: 'di" / da"', desc: isZh ? "\u5220\u9664\u5F15\u53F7\u5185\u5BB9" : "Delete quoted content" },
        { key: "ci( / ca(", desc: isZh ? "\u4FEE\u6539\u62EC\u53F7\u5185\u5BB9" : "Change parentheses content" },
        { key: "di( / da(", desc: isZh ? "\u5220\u9664\u62EC\u53F7\u5185\u5BB9" : "Delete parentheses content" },
        { key: "3yy", desc: isZh ? "\u590D\u52363\u884C" : "Yank 3 lines" },
        { key: "3>>", desc: isZh ? "\u7F29\u8FDB3\u884C" : "Indent 3 lines" },
        { key: "3J", desc: isZh ? "\u5408\u5E763\u884C" : "Join 3 lines" }
      ]
    }
  ];
  const lines = [header];
  for (const section of sections) {
    lines.push(`\u2551 ${section.title.padEnd(60)} \u2551`);
    lines.push("\u2560\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2563");
    for (const binding of section.bindings) {
      const key = binding.key.padEnd(12);
      const desc = binding.desc.padEnd(46);
      lines.push(`\u2551  ${key}  ${desc}  \u2551`);
    }
    lines.push("\u2560\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2563");
  }
  lines.push(isZh ? "\u2551 \u{1F4A1} \u63D0\u793A: \u8F93\u5165 /vim toggle \u6765\u542F\u7528/\u7981\u7528 Vim \u6A21\u5F0F               \u2551" : "\u2551 \u{1F4A1} Tip: Type /vim toggle to enable/disable Vim mode                 \u2551");
  lines.push("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
  return lines.join("\n");
}
function createVimModeManager(configPath) {
  return new VimModeManager(configPath);
}

function isValidVimCommand(input) {
  if (!input) {
    return false;
  }
  if (/^[dcy><pPJ]$/.test(input)) {
    return true;
  }
  if (/^\d+[dcy><]$/.test(input)) {
    return true;
  }
  if (/^\d*(?:yy|>>|<<)$/.test(input)) {
    return true;
  }
  if (/^[dcy]?(?:i|a)[wW"'{}[\]]$/.test(input)) {
    return true;
  }
  if (/^[ft][a-z]$/i.test(input)) {
    return true;
  }
  if (/^[;,]$/.test(input)) {
    return true;
  }
  return false;
}
function getCommandType(command) {
  if (!command.operator) {
    return "motion";
  }
  switch (command.operator) {
    case "d":
      return "delete";
    case "c":
      return "change";
    case "y":
      return "yank";
    case "p":
      return "paste";
    case "P":
      return "paste-before";
    case ">":
      return "indent";
    case "<":
      return "dedent";
    case "J":
      return "join";
    default:
      return "unknown";
  }
}
function formatCommand(command, lang = "en") {
  const type = getCommandType(command);
  const translations = {
    "en": {
      "delete": "Delete",
      "change": "Change",
      "yank": "Yank",
      "paste": "Paste",
      "paste-before": "Paste Before",
      "indent": "Indent",
      "dedent": "Dedent",
      "join": "Join",
      "motion": "Motion"
    },
    "zh-CN": {
      "delete": "\u5220\u9664",
      "change": "\u4FEE\u6539",
      "yank": "\u590D\u5236",
      "paste": "\u7C98\u8D34",
      "paste-before": "\u7C98\u8D34\u5230\u524D\u9762",
      "indent": "\u7F29\u8FDB",
      "dedent": "\u51CF\u5C11\u7F29\u8FDB",
      "join": "\u5408\u5E76",
      "motion": "\u79FB\u52A8"
    }
  };
  const langTranslations = translations[lang];
  let result = langTranslations[type] || type;
  if (command.count) {
    result += ` x${command.count}`;
  }
  if (command.motion) {
    result += ` (${command.motion})`;
  }
  if (command.textObject) {
    const scope = command.textObject.inclusive ? "a" : "i";
    const typeChar = command.textObject.type === "WORD" ? "W" : command.textObject.character || command.textObject.type[0];
    result += ` (${scope}${typeChar})`;
  }
  return result;
}

async function showVimStatus(lang = "en") {
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.bold(isZh ? "\u{1F4CA} Vim \u6A21\u5F0F\u72B6\u6001" : "\u{1F4CA} Vim Mode Status"));
  console.log(ansis.dim("\u2500".repeat(50)));
  const manager = createVimModeManager();
  const config = manager.getConfig();
  const isInstalled = isVimKeybindingsInstalled();
  const inputrcPath = getInputrcPath();
  const statusColor = config.enabled ? "green" : "yellow";
  const statusText = config.enabled ? isZh ? "\u5DF2\u542F\u7528" : "Enabled" : isZh ? "\u5DF2\u7981\u7528" : "Disabled";
  console.log(`
${ansis[statusColor].bold("\u25CF")} ${ansis.bold(isZh ? "\u72B6\u6001:" : "Status:")} ${statusText}`);
  const keybindingsColor = isInstalled ? "green" : "yellow";
  const keybindingsText = isInstalled ? isZh ? "\u5DF2\u5B89\u88C5" : "Installed" : isZh ? "\u672A\u5B89\u88C5" : "Not Installed";
  console.log(`${ansis[keybindingsColor].bold("\u25CF")} ${ansis.bold(isZh ? "\u5FEB\u6377\u952E:" : "Keybindings:")} ${keybindingsText}`);
  console.log("");
  console.log(ansis.bold(isZh ? "\u2699\uFE0F \u914D\u7F6E:" : "\u2699\uFE0F Configuration:"));
  console.log(`  ${ansis.dim("\u2500")}`);
  console.log(`  ${ansis.cyan("Mode Indicator:")} ${config.showModeIndicator ? isZh ? "\u5F00\u542F" : "On" : isZh ? "\u5173\u95ED" : "Off"}`);
  console.log(`  ${ansis.cyan("Auto Indent:")} ${config.autoIndent ? isZh ? "\u5F00\u542F" : "On" : isZh ? "\u5173\u95ED" : "Off"}`);
  console.log(`  ${ansis.cyan("Expand Tab:")} ${config.expandTab ? isZh ? "\u5F00\u542F" : "On" : isZh ? "\u5173\u95ED" : "Off"}`);
  console.log(`  ${ansis.cyan("Tab Width:")} ${config.tabWidth}`);
  console.log(`  ${ansis.cyan("Smart Case:")} ${config.smartCase ? isZh ? "\u5F00\u542F" : "On" : isZh ? "\u5173\u95ED" : "Off"}`);
  console.log(`  ${ansis.cyan("Language:")} ${config.lang}`);
  console.log("");
  console.log(ansis.bold(isZh ? "\u{1F4C1} \u6587\u4EF6\u4F4D\u7F6E:" : "\u{1F4C1} File Location:"));
  console.log(`  ${ansis.dim("\u2500")}`);
  console.log(`  ${ansis.cyan("InputRC:")} ${inputrcPath}`);
  if (isInstalled) {
    console.log("");
    console.log(ansis.yellow(isZh ? "\u{1F4A1} \u63D0\u793A: \u4FEE\u6539\u540E\u9700\u8981\u8FD0\u884C `source ~/.inputrc` \u6216\u91CD\u542F\u7EC8\u7AEF" : "\u{1F4A1} Tip: Run `source ~/.inputrc` or restart terminal after changes"));
  }
  console.log("");
}
async function toggleVimMode(lang = "en") {
  const manager = createVimModeManager();
  const config = manager.getConfig();
  config.enabled = !config.enabled;
  await manager.updateConfig(config);
  const isZh = lang === "zh-CN";
  const statusText = config.enabled ? isZh ? "\u5DF2\u542F\u7528" : "enabled" : isZh ? "\u5DF2\u7981\u7528" : "disabled";
  console.log(ansis.green(`\u2713 Vim mode ${statusText}`));
  if (config.enabled && !isVimKeybindingsInstalled()) {
    console.log("");
    console.log(ansis.yellow(isZh ? "\u26A0\uFE0F Vim \u6A21\u5F0F\u5FEB\u6377\u952E\u5C1A\u672A\u5B89\u88C5" : "\u26A0\uFE0F Vim mode keybindings not installed"));
    const { install } = await inquirer.prompt({
      type: "confirm",
      name: "install",
      message: isZh ? "\u662F\u5426\u73B0\u5728\u5B89\u88C5 Vim \u5FEB\u6377\u952E?" : "Install Vim keybindings now?",
      default: true
    });
    if (install) {
      await doInstallKeybindings(lang);
    }
  }
}
async function enableVimMode(lang = "en") {
  const manager = createVimModeManager();
  const config = manager.getConfig();
  if (config.enabled) {
    const isZh2 = lang === "zh-CN";
    console.log(ansis.yellow(isZh2 ? "Vim \u6A21\u5F0F\u5DF2\u7ECF\u662F\u542F\u7528\u72B6\u6001" : "Vim mode is already enabled"));
    return;
  }
  config.enabled = true;
  await manager.updateConfig(config);
  const isZh = lang === "zh-CN";
  console.log(ansis.green(isZh ? "\u2713 Vim \u6A21\u5F0F\u5DF2\u542F\u7528" : "\u2713 Vim mode enabled"));
}
async function disableVimMode(lang = "en") {
  const manager = createVimModeManager();
  const config = manager.getConfig();
  if (!config.enabled) {
    const isZh2 = lang === "zh-CN";
    console.log(ansis.yellow(isZh2 ? "Vim \u6A21\u5F0F\u5DF2\u7ECF\u662F\u7981\u7528\u72B6\u6001" : "Vim mode is already disabled"));
    return;
  }
  config.enabled = false;
  await manager.updateConfig(config);
  const isZh = lang === "zh-CN";
  console.log(ansis.green(isZh ? "\u2713 Vim \u6A21\u5F0F\u5DF2\u7981\u7528" : "\u2713 Vim mode disabled"));
}
async function doInstallKeybindings(lang = "en") {
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.cyan(isZh ? "\u{1F4E6} \u5B89\u88C5 Vim \u5FEB\u6377\u952E\u5230 .inputrc..." : "\u{1F4E6} Installing Vim keybindings to .inputrc..."));
  const manager = createVimModeManager();
  const config = manager.getConfig();
  const success = await installVimKeybindings(config);
  if (success) {
    console.log(ansis.green(isZh ? "\u2713 \u5FEB\u6377\u952E\u5B89\u88C5\u6210\u529F!" : "\u2713 Keybindings installed successfully!"));
    console.log("");
    console.log(ansis.yellow(isZh ? "\u{1F4A1} \u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\u4F7F\u914D\u7F6E\u751F\u6548:" : "\u{1F4A1} Run the following command to apply changes:"));
    console.log(ansis.cyan("  source ~/.inputrc"));
  } else {
    console.log(ansis.red(isZh ? "\u2717 \u5FEB\u6377\u952E\u5B89\u88C5\u5931\u8D25" : "\u2717 Keybindings installation failed"));
  }
}
async function doUninstallKeybindings(lang = "en") {
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.cyan(isZh ? "\u{1F5D1}\uFE0F \u4ECE .inputrc \u5378\u8F7D Vim \u5FEB\u6377\u952E..." : "\u{1F5D1}\uFE0F Uninstalling Vim keybindings from .inputrc..."));
  const success = await uninstallVimKeybindings();
  if (success) {
    console.log(ansis.green(isZh ? "\u2713 \u5FEB\u6377\u952E\u5DF2\u5378\u8F7D" : "\u2713 Keybindings uninstalled"));
  } else {
    console.log(ansis.red(isZh ? "\u2717 \u5FEB\u6377\u952E\u5378\u8F7D\u5931\u8D25" : "\u2717 Keybindings uninstallation failed"));
  }
}
async function showVimConfigMenu(lang = "en") {
  const isZh = lang === "zh-CN";
  const manager = createVimModeManager();
  let config = manager.getConfig();
  while (true) {
    const choices = addNumbersToChoices([
      {
        name: `${config.showModeIndicator ? ansis.green("\u25CF") : ansis.gray("\u25CB")} ${isZh ? "\u663E\u793A\u6A21\u5F0F\u6307\u793A\u5668" : "Show Mode Indicator"}`,
        value: "showModeIndicator",
        short: "Mode Indicator"
      },
      {
        name: `${config.autoIndent ? ansis.green("\u25CF") : ansis.gray("\u25CB")} ${isZh ? "\u81EA\u52A8\u7F29\u8FDB" : "Auto Indent"}`,
        value: "autoIndent",
        short: "Auto Indent"
      },
      {
        name: `${config.expandTab ? ansis.green("\u25CF") : ansis.gray("\u25CB")} ${isZh ? "\u7A7A\u683C\u4EE3\u66FF Tab" : "Expand Tab"}`,
        value: "expandTab",
        short: "Expand Tab"
      },
      {
        name: `   ${isZh ? "Tab \u5BBD\u5EA6" : "Tab Width"}: ${ansis.cyan(config.tabWidth.toString())}`,
        value: "tabWidth",
        short: "Tab Width"
      },
      {
        name: `${config.smartCase ? ansis.green("\u25CF") : ansis.gray("\u25CB")} ${isZh ? "\u667A\u80FD\u5927\u5C0F\u5199" : "Smart Case"}`,
        value: "smartCase",
        short: "Smart Case"
      },
      {
        name: `   ${isZh ? "\u8BED\u8A00" : "Language"}: ${ansis.cyan(config.lang)}`,
        value: "language",
        short: "Language"
      },
      {
        name: ansis.green(isZh ? "\u5E94\u7528\u66F4\u6539" : "Apply Changes"),
        value: "apply",
        short: isZh ? "\u5E94\u7528" : "Apply"
      },
      {
        name: ansis.yellow(isZh ? "\u53D6\u6D88" : "Cancel"),
        value: "cancel",
        short: isZh ? "\u53D6\u6D88" : "Cancel"
      }
    ]);
    const { choice } = await inquirer.prompt({
      type: "list",
      name: "choice",
      message: isZh ? "\u9009\u62E9\u914D\u7F6E\u9879:" : "Select configuration option:",
      choices: [
        ...choices.slice(0, -2),
        new inquirer.Separator(ansis.dim("\u2500".repeat(40))),
        ...choices.slice(-2)
      ]
    });
    if (choice === "cancel") {
      break;
    }
    if (choice === "apply") {
      await manager.updateConfig(config);
      console.log(ansis.green(isZh ? "\u2713 \u914D\u7F6E\u5DF2\u4FDD\u5B58" : "\u2713 Configuration saved"));
      break;
    }
    if (choice === "tabWidth") {
      const { width } = await inquirer.prompt({
        type: "number",
        name: "width",
        message: isZh ? "\u8F93\u5165 Tab \u5BBD\u5EA6:" : "Enter tab width:",
        default: config.tabWidth
      });
      config.tabWidth = width;
    } else if (choice === "language") {
      const { language } = await inquirer.prompt({
        type: "list",
        name: "language",
        message: isZh ? "\u9009\u62E9\u8BED\u8A00:" : "Select language:",
        choices: [
          { name: "English", value: "en" },
          { name: "\u4E2D\u6587", value: "zh-CN" }
        ]
      });
      config.lang = language;
    } else {
      const key = choice;
      config = { ...config, [key]: !config[key] };
    }
  }
}
function testVimCommand(input, lang = "en") {
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.bold(isZh ? "\u{1F9EA} Vim \u547D\u4EE4\u6D4B\u8BD5" : "\u{1F9EA} Vim Command Test"));
  console.log(ansis.dim(`Input: "${input}"`));
  console.log("");
  const valid = isValidVimCommand(input);
  console.log(`${ansis.cyan("Valid:")} ${valid ? ansis.green("Yes") : ansis.red("No")}`);
  if (!valid) {
    console.log(ansis.yellow(isZh ? "\u65E0\u6548\u7684 Vim \u547D\u4EE4" : "Invalid Vim command"));
    return;
  }
  const parsed = parseVimCommand(input);
  if (parsed) {
    console.log("");
    console.log(ansis.bold(isZh ? "\u89E3\u6790\u7ED3\u679C:" : "Parsed Result:"));
    console.log(`  ${ansis.cyan("Operator:")} ${parsed.operator || ansis.dim("none")}`);
    console.log(`  ${ansis.cyan("Motion:")} ${parsed.motion || ansis.dim("none")}`);
    console.log(`  ${ansis.cyan("Count:")} ${parsed.count || ansis.dim("none")}`);
    if (parsed.textObject) {
      console.log(`  ${ansis.cyan("Text Object:")} ${parsed.textObject.inclusive ? "a" : "i"}${parsed.textObject.type}`);
    }
    const formatted = formatCommand(parsed, lang);
    console.log(`  ${ansis.cyan("Description:")} ${formatted}`);
  }
  console.log("");
}
function showKeybindingReference(lang = "en") {
  const reference = generateKeybindingReference(lang);
  console.log("");
  console.log(reference);
  console.log("");
}
async function vimCommand(options = {}) {
  await ensureI18nInitialized();
  const lang = options.lang || i18n.language || "en";
  if (options.test) {
    testVimCommand(options.test, lang);
    return;
  }
  if (options.keys) {
    showKeybindingReference(lang);
    return;
  }
  if (options.status) {
    await showVimStatus(lang);
    return;
  }
  if (options.install) {
    await doInstallKeybindings(lang);
    return;
  }
  if (options.uninstall) {
    await doUninstallKeybindings(lang);
    return;
  }
  if (options.toggle) {
    await toggleVimMode(lang);
    return;
  }
  if (options.enable) {
    await enableVimMode(lang);
    return;
  }
  if (options.disable) {
    await disableVimMode(lang);
    return;
  }
  await showVimMenu(lang);
}
async function showVimMenu(lang = "en") {
  const isZh = lang === "zh-CN";
  const manager = createVimModeManager();
  const config = manager.getConfig();
  while (true) {
    const isEnabled = config.enabled;
    const isInstalled = isVimKeybindingsInstalled();
    console.log("");
    console.log(ansis.bold.cyan(isZh ? "\u2328\uFE0F CCJK Vim \u6A21\u5F0F\u914D\u7F6E" : "\u2328\uFE0F CCJK Vim Mode Configuration"));
    console.log(ansis.dim("\u2500".repeat(50)));
    const statusColor = isEnabled ? "green" : "yellow";
    const statusText = isEnabled ? isZh ? "\u5DF2\u542F\u7528" : "Enabled" : isZh ? "\u5DF2\u7981\u7528" : "Disabled";
    console.log(`  ${ansis[statusColor]("\u25CF")} ${isZh ? "\u72B6\u6001" : "Status"}: ${statusText}`);
    const installedColor = isInstalled ? "green" : "yellow";
    const installedText = isInstalled ? isZh ? "\u5DF2\u5B89\u88C5" : "Installed" : isZh ? "\u672A\u5B89\u88C5" : "Not Installed";
    console.log(`  ${ansis[installedColor]("\u25CF")} ${isZh ? "\u5FEB\u6377\u952E" : "Keybindings"}: ${installedText}`);
    console.log("");
    const choices = addNumbersToChoices([
      {
        name: isEnabled ? ansis.yellow(isZh ? "\u{1F534} \u7981\u7528 Vim \u6A21\u5F0F" : "\u{1F534} Disable Vim Mode") : ansis.green(isZh ? "\u{1F7E2} \u542F\u7528 Vim \u6A21\u5F0F" : "\u{1F7E2} Enable Vim Mode"),
        value: "toggle",
        short: isZh ? "\u5207\u6362" : "Toggle"
      },
      {
        name: isInstalled ? ansis.yellow(isZh ? "\u{1F5D1}\uFE0F \u5378\u8F7D\u5FEB\u6377\u952E" : "\u{1F5D1}\uFE0F Uninstall Keybindings") : ansis.green(isZh ? "\u{1F4E6} \u5B89\u88C5\u5FEB\u6377\u952E" : "\u{1F4E6} Install Keybindings"),
        value: isInstalled ? "uninstall" : "install",
        short: isInstalled ? isZh ? "\u5378\u8F7D" : "Uninstall" : isZh ? "\u5B89\u88C5" : "Install"
      },
      {
        name: ansis.cyan(isZh ? "\u2699\uFE0F \u914D\u7F6E\u9009\u9879" : "\u2699\uFE0F Configure Options"),
        value: "config",
        short: isZh ? "\u914D\u7F6E" : "Configure"
      },
      {
        name: ansis.blue(isZh ? "\u{1F4CB} \u67E5\u770B\u5FEB\u6377\u952E\u53C2\u8003" : "\u{1F4CB} Keybinding Reference"),
        value: "keys",
        short: isZh ? "\u5FEB\u6377\u952E" : "Keys"
      },
      {
        name: ansis.magenta(isZh ? "\u{1F9EA} \u6D4B\u8BD5\u547D\u4EE4" : "\u{1F9EA} Test Command"),
        value: "test",
        short: isZh ? "\u6D4B\u8BD5" : "Test"
      },
      {
        name: ansis.gray(isZh ? "\u21A9\uFE0F \u8FD4\u56DE" : "\u21A9\uFE0F Back"),
        value: "back",
        short: isZh ? "\u8FD4\u56DE" : "Back"
      }
    ]);
    const { choice } = await inquirer.prompt({
      type: "list",
      name: "choice",
      message: isZh ? "\u9009\u62E9\u64CD\u4F5C:" : "Select action:",
      choices
    });
    switch (choice) {
      case "toggle":
        await toggleVimMode(lang);
        break;
      case "install":
        await doInstallKeybindings(lang);
        break;
      case "uninstall":
        await doUninstallKeybindings(lang);
        break;
      case "config":
        await showVimConfigMenu(lang);
        break;
      case "keys":
        showKeybindingReference(lang);
        await pressEnterToContinue(lang);
        break;
      case "test": {
        const { input } = await inquirer.prompt({
          type: "input",
          name: "input",
          message: isZh ? "\u8F93\u5165\u8981\u6D4B\u8BD5\u7684 Vim \u547D\u4EE4:" : "Enter Vim command to test:",
          default: "ciw"
        });
        testVimCommand(input, lang);
        await pressEnterToContinue(lang);
        break;
      }
      case "back":
        return;
    }
    const updatedConfig = manager.getConfig();
    Object.assign(config, updatedConfig);
  }
}
async function pressEnterToContinue(lang) {
  const isZh = lang === "zh-CN";
  const message = isZh ? "\u6309\u56DE\u8F66\u952E\u7EE7\u7EED..." : "Press Enter to continue...";
  await inquirer.prompt({
    type: "input",
    name: "confirm",
    message
  });
}

export { disableVimMode, enableVimMode, showKeybindingReference, showVimConfigMenu, showVimStatus, testVimCommand, toggleVimMode, vimCommand };
