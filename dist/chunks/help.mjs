import ansis from 'ansis';

const COMMAND_REFERENCE = [
  // Core Commands
  { name: "ccjk", description: "\u4EA4\u4E92\u5F0F\u83DC\u5355\uFF08\u9ED8\u8BA4\uFF09", category: "core", examples: ["ccjk", "ccjk -l zh-CN"] },
  { name: "ccjk init", alias: "i", description: "\u521D\u59CB\u5316\u914D\u7F6E", category: "core", examples: ["ccjk init", "ccjk init -f"] },
  { name: "ccjk update", alias: "u", description: "\u66F4\u65B0\u63D0\u793A\u8BCD\u548C\u5DE5\u4F5C\u6D41", category: "core", examples: ["ccjk update"] },
  { name: "ccjk doctor", description: "\u5065\u5EB7\u68C0\u67E5\u4E0E\u8BCA\u65AD", category: "core", examples: ["ccjk doctor"] },
  // Development Commands
  { name: "ccjk mcp <action>", description: "MCP \u670D\u52A1\u5668\u7BA1\u7406", category: "dev", examples: ["ccjk mcp doctor", "ccjk mcp profile minimal", "ccjk mcp release"] },
  { name: "ccjk interview", alias: "iv", description: "\u8BBF\u8C08\u9A71\u52A8\u5F00\u53D1", category: "dev", examples: ["ccjk interview", "ccjk iv -d quick"] },
  { name: "ccjk commit", description: "\u667A\u80FD Git \u63D0\u4EA4", category: "dev", examples: ["ccjk commit", "ccjk commit -a"] },
  { name: "ccjk config-switch", alias: "cs", description: "\u5207\u6362\u914D\u7F6E", category: "dev", examples: ["ccjk cs", "ccjk cs work"] },
  // Cloud Commands
  { name: "ccjk cloud skills", description: "\u540C\u6B65\u81EA\u5B9A\u4E49\u6280\u80FD", category: "cloud", examples: ["ccjk cloud skills sync", "ccjk cloud skills push"] },
  { name: "ccjk cloud agents", description: "\u540C\u6B65 AI \u4EE3\u7406", category: "cloud", examples: ["ccjk cloud agents", "ccjk agents list"] },
  { name: "ccjk cloud plugins", description: "\u63D2\u4EF6\u5E02\u573A", category: "cloud", examples: ["ccjk cloud plugins"] },
  // System Commands
  { name: "ccjk system setup", description: "\u9996\u6B21\u8BBE\u7F6E\u5411\u5BFC", category: "system", examples: ["ccjk system setup"] },
  { name: "ccjk system upgrade", description: "\u5347\u7EA7\u6240\u6709\u7EC4\u4EF6", category: "system", examples: ["ccjk system upgrade"] },
  { name: "ccjk system versions", description: "\u68C0\u67E5\u7248\u672C", category: "system", examples: ["ccjk system versions"] },
  { name: "ccjk system workspace", description: "\u5DE5\u4F5C\u533A\u8BCA\u65AD", category: "system", examples: ["ccjk system workspace"] },
  // Other Commands
  { name: "ccjk workflows", alias: "wf", description: "\u7BA1\u7406\u5DE5\u4F5C\u6D41", category: "other", examples: ["ccjk wf"] },
  { name: "ccjk ccr", description: "CCR \u4EE3\u7406\u7BA1\u7406", category: "other", examples: ["ccjk ccr"] },
  { name: "ccjk ccu", description: "\u4F7F\u7528\u91CF\u7EDF\u8BA1", category: "other", examples: ["ccjk ccu"] },
  { name: "ccjk uninstall", description: "\u5378\u8F7D\u914D\u7F6E", category: "other", examples: ["ccjk uninstall"] }
];
const HELP_TOPICS = [
  {
    name: "quick",
    title: "\u5FEB\u901F\u547D\u4EE4\u901F\u67E5\u5361",
    content: showQuickReference
  },
  {
    name: "mcp",
    title: "MCP \u670D\u52A1\u5668\u7BA1\u7406",
    content: showMcpHelp
  },
  {
    name: "examples",
    title: "\u5E38\u7528\u793A\u4F8B",
    content: showExamples
  },
  {
    name: "tutorial",
    title: "\u65B0\u624B\u6559\u7A0B",
    content: showTutorial
  },
  {
    name: "faq",
    title: "\u5E38\u89C1\u95EE\u9898",
    content: showFaq
  }
];
async function help(topic) {
  if (!topic) {
    showHelpMenu();
    return;
  }
  const normalizedTopic = topic.toLowerCase();
  const helpTopic = HELP_TOPICS.find((t) => t.name === normalizedTopic);
  if (helpTopic) {
    helpTopic.content();
    return;
  }
  const command = COMMAND_REFERENCE.find(
    (c) => c.name.includes(normalizedTopic) || c.alias === normalizedTopic
  );
  if (command) {
    showCommandHelp(command);
    return;
  }
  console.log(ansis.yellow(`
\u26A0\uFE0F  \u672A\u627E\u5230\u5E2E\u52A9\u4E3B\u9898: ${topic}`));
  console.log(ansis.gray("\u53EF\u7528\u4E3B\u9898: quick, mcp, examples, tutorial, faq"));
  console.log(ansis.gray("\u6216\u8F93\u5165\u547D\u4EE4\u540D\u79F0\u67E5\u770B\u547D\u4EE4\u5E2E\u52A9\n"));
}
function showHelpMenu() {
  console.log("");
  console.log(ansis.green.bold("\u{1F4DA} CCJK \u5E2E\u52A9\u4E2D\u5FC3"));
  console.log(ansis.gray("\u2500".repeat(50)));
  console.log("");
  console.log(ansis.yellow("\u5FEB\u901F\u5165\u95E8:"));
  console.log(`  ${ansis.green("ccjk help quick")}     ${ansis.gray("- \u547D\u4EE4\u901F\u67E5\u5361\uFF08\u63A8\u8350\u65B0\u624B\uFF09")}`);
  console.log(`  ${ansis.green("ccjk help tutorial")}  ${ansis.gray("- \u65B0\u624B\u5165\u95E8\u6559\u7A0B")}`);
  console.log(`  ${ansis.green("ccjk help examples")}  ${ansis.gray("- \u5E38\u7528\u793A\u4F8B")}`);
  console.log("");
  console.log(ansis.yellow("\u4E13\u9898\u5E2E\u52A9:"));
  console.log(`  ${ansis.green("ccjk help mcp")}       ${ansis.gray("- MCP \u670D\u52A1\u5668\u7BA1\u7406")}`);
  console.log(`  ${ansis.green("ccjk help faq")}       ${ansis.gray("- \u5E38\u89C1\u95EE\u9898\u89E3\u7B54")}`);
  console.log("");
  console.log(ansis.yellow("\u547D\u4EE4\u5E2E\u52A9:"));
  console.log(`  ${ansis.green("ccjk help <command>")} ${ansis.gray("- \u67E5\u770B\u7279\u5B9A\u547D\u4EE4\u5E2E\u52A9")}`);
  console.log(`  ${ansis.green("ccjk <command> -h")}   ${ansis.gray("- \u67E5\u770B\u547D\u4EE4\u9009\u9879")}`);
  console.log("");
  console.log(ansis.gray("\u2500".repeat(50)));
  console.log(ansis.gray("\u{1F4A1} \u63D0\u793A: \u5728\u4EFB\u4F55\u83DC\u5355\u4E2D\u6309 ? \u6216 H \u53EF\u67E5\u770B\u4E0A\u4E0B\u6587\u5E2E\u52A9"));
  console.log("");
}
function showQuickReference() {
  console.log("");
  console.log(ansis.green.bold("\u26A1 CCJK \u547D\u4EE4\u901F\u67E5\u5361"));
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log("");
  console.log(ansis.yellow.bold("\u{1F525} \u6700\u5E38\u7528\u547D\u4EE4:"));
  console.log("");
  printCommandBox([
    { cmd: "ccjk", desc: "\u6253\u5F00\u4EA4\u4E92\u5F0F\u83DC\u5355" },
    { cmd: "ccjk init", desc: "\u4E00\u952E\u521D\u59CB\u5316\u6240\u6709\u914D\u7F6E" },
    { cmd: "ccjk doctor", desc: "\u8BCA\u65AD\u5E76\u4FEE\u590D\u95EE\u9898" },
    { cmd: "ccjk mcp doctor", desc: "MCP \u5065\u5EB7\u68C0\u67E5" }
  ]);
  console.log("");
  const categories = [
    { key: "core", title: "\u{1F4E6} \u6838\u5FC3\u547D\u4EE4", emoji: "\u{1F4E6}" },
    { key: "dev", title: "\u{1F6E0}\uFE0F  \u5F00\u53D1\u547D\u4EE4", emoji: "\u{1F6E0}\uFE0F" },
    { key: "cloud", title: "\u2601\uFE0F  \u4E91\u540C\u6B65", emoji: "\u2601\uFE0F" },
    { key: "system", title: "\u{1F527} \u7CFB\u7EDF\u7BA1\u7406", emoji: "\u{1F527}" }
  ];
  for (const cat of categories) {
    const commands = COMMAND_REFERENCE.filter((c) => c.category === cat.key);
    if (commands.length > 0) {
      console.log(ansis.yellow(cat.title));
      for (const cmd of commands) {
        const alias = cmd.alias ? ansis.gray(` (${cmd.alias})`) : "";
        console.log(`  ${ansis.green(cmd.name.padEnd(25))}${alias} ${ansis.gray(cmd.description)}`);
      }
      console.log("");
    }
  }
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log(ansis.gray('\u{1F4A1} \u4F7F\u7528 "ccjk help <\u547D\u4EE4>" \u67E5\u770B\u8BE6\u7EC6\u7528\u6CD5'));
  console.log("");
}
function printCommandBox(commands) {
  const maxCmdLen = Math.max(...commands.map((c) => c.cmd.length));
  const boxWidth = maxCmdLen + 40;
  console.log(ansis.gray(`  \u250C${"\u2500".repeat(boxWidth)}\u2510`));
  for (const { cmd, desc } of commands) {
    const paddedCmd = cmd.padEnd(maxCmdLen);
    console.log(ansis.gray("  \u2502 ") + ansis.green.bold(paddedCmd) + ansis.gray(" \u2192 ") + desc.padEnd(boxWidth - maxCmdLen - 5) + ansis.gray(" \u2502"));
  }
  console.log(ansis.gray(`  \u2514${"\u2500".repeat(boxWidth)}\u2518`));
}
function showMcpHelp() {
  console.log("");
  console.log(ansis.green.bold("\u{1F50C} MCP \u670D\u52A1\u5668\u7BA1\u7406\u5E2E\u52A9"));
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log("");
  console.log(ansis.yellow("\u4EC0\u4E48\u662F MCP?"));
  console.log(ansis.gray("  MCP (Model Context Protocol) \u662F Claude \u7684\u6269\u5C55\u534F\u8BAE\uFF0C"));
  console.log(ansis.gray("  \u5141\u8BB8 AI \u8BBF\u95EE\u5916\u90E8\u5DE5\u5177\u548C\u6570\u636E\u6E90\u3002"));
  console.log("");
  console.log(ansis.yellow("\u5E38\u7528\u547D\u4EE4:"));
  console.log(`  ${ansis.green("ccjk mcp doctor")}          ${ansis.gray("- \u68C0\u67E5 MCP \u5065\u5EB7\u72B6\u6001")}`);
  console.log(`  ${ansis.green("ccjk mcp profile <name>")}  ${ansis.gray("- \u5207\u6362 MCP \u914D\u7F6E\u9884\u8BBE")}`);
  console.log(`  ${ansis.green("ccjk mcp release")}         ${ansis.gray("- \u91CA\u653E\u672A\u4F7F\u7528\u7684 MCP")}`);
  console.log("");
  console.log(ansis.yellow("\u53EF\u7528\u9884\u8BBE (Profile):"));
  console.log(`  ${ansis.green("minimal")}     ${ansis.gray("- \u6700\u5C0F\u914D\u7F6E\uFF0C\u4EC5\u6838\u5FC3 MCP\uFF08\u63A8\u8350\u65E5\u5E38\u4F7F\u7528\uFF09")}`);
  console.log(`  ${ansis.green("development")} ${ansis.gray("- \u5F00\u53D1\u914D\u7F6E\uFF0C\u5305\u542B\u5F00\u53D1\u5DE5\u5177")}`);
  console.log(`  ${ansis.green("testing")}     ${ansis.gray("- \u6D4B\u8BD5\u914D\u7F6E\uFF0C\u5305\u542B\u6D4B\u8BD5\u5DE5\u5177")}`);
  console.log(`  ${ansis.green("research")}    ${ansis.gray("- \u7814\u7A76\u914D\u7F6E\uFF0C\u5305\u542B\u641C\u7D22\u548C\u6587\u6863\u5DE5\u5177")}`);
  console.log(`  ${ansis.green("full")}        ${ansis.gray("- \u5B8C\u6574\u914D\u7F6E\uFF0C\u542F\u7528\u6240\u6709 MCP")}`);
  console.log("");
  console.log(ansis.yellow("\u6027\u80FD\u4F18\u5316\u5EFA\u8BAE:"));
  console.log(ansis.gray("  1. \u65E5\u5E38\u4F7F\u7528\u5EFA\u8BAE\u4F7F\u7528 minimal \u9884\u8BBE"));
  console.log(ansis.gray('  2. \u5B9A\u671F\u8FD0\u884C "ccjk mcp doctor" \u68C0\u67E5\u5065\u5EB7\u72B6\u6001'));
  console.log(ansis.gray('  3. \u4F7F\u7528 "ccjk mcp release" \u91CA\u653E\u4E0D\u9700\u8981\u7684 MCP'));
  console.log(ansis.gray("  4. \u907F\u514D\u540C\u65F6\u542F\u7528\u8D85\u8FC7 5 \u4E2A MCP"));
  console.log("");
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log(ansis.gray("\u{1F4D6} \u66F4\u591A\u4FE1\u606F: https://github.com/anthropics/claude-code"));
  console.log("");
}
function showExamples() {
  console.log("");
  console.log(ansis.green.bold("\u{1F4DD} CCJK \u5E38\u7528\u793A\u4F8B"));
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log("");
  console.log(ansis.yellow("\u{1F680} \u9996\u6B21\u4F7F\u7528:"));
  console.log(ansis.gray("  # \u4E00\u952E\u5B8C\u6210\u6240\u6709\u914D\u7F6E"));
  console.log(`  ${ansis.green("ccjk init")}`);
  console.log("");
  console.log(ansis.yellow("\u{1F527} \u65E5\u5E38\u7EF4\u62A4:"));
  console.log(ansis.gray("  # \u68C0\u67E5\u73AF\u5883\u5065\u5EB7\u72B6\u6001"));
  console.log(`  ${ansis.green("ccjk doctor")}`);
  console.log("");
  console.log(ansis.gray("  # \u66F4\u65B0\u5230\u6700\u65B0\u914D\u7F6E"));
  console.log(`  ${ansis.green("ccjk update")}`);
  console.log("");
  console.log(ansis.yellow("\u26A1 MCP \u6027\u80FD\u4F18\u5316:"));
  console.log(ansis.gray("  # \u68C0\u67E5 MCP \u72B6\u6001"));
  console.log(`  ${ansis.green("ccjk mcp doctor")}`);
  console.log("");
  console.log(ansis.gray("  # \u5207\u6362\u5230\u6700\u5C0F\u914D\u7F6E\uFF08\u63D0\u5347\u6027\u80FD\uFF09"));
  console.log(`  ${ansis.green("ccjk mcp profile minimal")}`);
  console.log("");
  console.log(ansis.gray("  # \u91CA\u653E\u672A\u4F7F\u7528\u7684 MCP"));
  console.log(`  ${ansis.green("ccjk mcp release")}`);
  console.log("");
  console.log(ansis.yellow("\u{1F4BB} \u5F00\u53D1\u5DE5\u4F5C\u6D41:"));
  console.log(ansis.gray("  # \u542F\u52A8\u8BBF\u8C08\u9A71\u52A8\u5F00\u53D1"));
  console.log(`  ${ansis.green("ccjk interview")}`);
  console.log("");
  console.log(ansis.gray("  # \u667A\u80FD Git \u63D0\u4EA4"));
  console.log(`  ${ansis.green("ccjk commit -a")}`);
  console.log("");
  console.log(ansis.yellow("\u{1F504} \u914D\u7F6E\u5207\u6362:"));
  console.log(ansis.gray("  # \u5207\u6362\u5DE5\u4F5C/\u4E2A\u4EBA\u914D\u7F6E"));
  console.log(`  ${ansis.green("ccjk config-switch work")}`);
  console.log(`  ${ansis.green("ccjk config-switch personal")}`);
  console.log("");
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log("");
}
function showTutorial() {
  console.log("");
  console.log(ansis.green.bold("\u{1F393} CCJK \u65B0\u624B\u5165\u95E8\u6559\u7A0B"));
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log("");
  console.log(ansis.yellow.bold("\u7B2C 1 \u6B65: \u521D\u59CB\u5316\u914D\u7F6E"));
  console.log(ansis.gray("  \u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\u5B8C\u6210\u4E00\u952E\u914D\u7F6E:"));
  console.log(`  ${ansis.green.bold("ccjk init")}`);
  console.log(ansis.gray("  \u8FD9\u5C06\u81EA\u52A8\u914D\u7F6E API\u3001\u5DE5\u4F5C\u6D41\u548C MCP \u670D\u52A1\u3002"));
  console.log("");
  console.log(ansis.yellow.bold("\u7B2C 2 \u6B65: \u9A8C\u8BC1\u5B89\u88C5"));
  console.log(ansis.gray("  \u8FD0\u884C\u5065\u5EB7\u68C0\u67E5\u786E\u4FDD\u4E00\u5207\u6B63\u5E38:"));
  console.log(`  ${ansis.green.bold("ccjk doctor")}`);
  console.log(ansis.gray("  \u5982\u679C\u6709\u95EE\u9898\uFF0C\u6309\u7167\u63D0\u793A\u4FEE\u590D\u3002"));
  console.log("");
  console.log(ansis.yellow.bold("\u7B2C 3 \u6B65: \u4F18\u5316\u6027\u80FD\uFF08\u63A8\u8350\uFF09"));
  console.log(ansis.gray("  \u68C0\u67E5\u5E76\u4F18\u5316 MCP \u914D\u7F6E:"));
  console.log(`  ${ansis.green.bold("ccjk mcp doctor")}`);
  console.log(ansis.gray("  \u5982\u679C MCP \u8FC7\u591A\uFF0C\u5207\u6362\u5230\u6700\u5C0F\u914D\u7F6E:"));
  console.log(`  ${ansis.green.bold("ccjk mcp profile minimal")}`);
  console.log("");
  console.log(ansis.yellow.bold("\u7B2C 4 \u6B65: \u5F00\u59CB\u4F7F\u7528"));
  console.log(ansis.gray("  \u6253\u5F00\u4EA4\u4E92\u5F0F\u83DC\u5355\u63A2\u7D22\u66F4\u591A\u529F\u80FD:"));
  console.log(`  ${ansis.green.bold("ccjk")}`);
  console.log("");
  console.log(ansis.green.bold("\u2705 \u606D\u559C\uFF01\u4F60\u5DF2\u7ECF\u5B8C\u6210\u4E86\u57FA\u672C\u8BBE\u7F6E\u3002"));
  console.log("");
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log(ansis.yellow("\u{1F4A1} \u8FDB\u9636\u63D0\u793A:"));
  console.log(ansis.gray('  \u2022 \u4F7F\u7528 "ccjk help quick" \u67E5\u770B\u547D\u4EE4\u901F\u67E5\u5361'));
  console.log(ansis.gray('  \u2022 \u4F7F\u7528 "ccjk help examples" \u67E5\u770B\u66F4\u591A\u793A\u4F8B'));
  console.log(ansis.gray('  \u2022 \u4F7F\u7528 "ccjk help faq" \u67E5\u770B\u5E38\u89C1\u95EE\u9898'));
  console.log("");
}
function showFaq() {
  console.log("");
  console.log(ansis.green.bold("\u2753 \u5E38\u89C1\u95EE\u9898\u89E3\u7B54 (FAQ)"));
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log("");
  const faqs = [
    {
      q: "Claude Code \u7684 /compact \u547D\u4EE4\u5931\u6548\u600E\u4E48\u529E\uFF1F",
      a: [
        "\u8FD9\u901A\u5E38\u662F\u56E0\u4E3A MCP \u670D\u52A1\u8FC7\u591A\u5BFC\u81F4\u4E0A\u4E0B\u6587\u81A8\u80C0\u3002",
        "\u89E3\u51B3\u65B9\u6848:",
        '  1. \u8FD0\u884C "ccjk mcp doctor" \u68C0\u67E5 MCP \u72B6\u6001',
        '  2. \u8FD0\u884C "ccjk mcp profile minimal" \u5207\u6362\u5230\u6700\u5C0F\u914D\u7F6E',
        '  3. \u8FD0\u884C "ccjk mcp release" \u91CA\u653E\u672A\u4F7F\u7528\u7684 MCP'
      ]
    },
    {
      q: "CCJK \u8FD0\u884C\u5F88\u6162\u600E\u4E48\u529E\uFF1F",
      a: [
        "\u53EF\u80FD\u539F\u56E0: MCP \u670D\u52A1\u8FC7\u591A\u3001\u914D\u7F6E\u6587\u4EF6\u8FC7\u5927",
        "\u89E3\u51B3\u65B9\u6848:",
        '  1. \u8FD0\u884C "ccjk doctor" \u8FDB\u884C\u5168\u9762\u8BCA\u65AD',
        "  2. \u51CF\u5C11\u540C\u65F6\u542F\u7528\u7684 MCP \u6570\u91CF\uFF08\u5EFA\u8BAE \u22645 \u4E2A\uFF09",
        '  3. \u5B9A\u671F\u6E05\u7406\u4F1A\u8BDD: "ccjk session cleanup"'
      ]
    },
    {
      q: "\u5982\u4F55\u5207\u6362\u4E2D\u82F1\u6587\u754C\u9762\uFF1F",
      a: [
        '\u65B9\u6CD5 1: \u8FD0\u884C "ccjk -l zh-CN" \u6216 "ccjk -l en"',
        '\u65B9\u6CD5 2: \u5728\u83DC\u5355\u4E2D\u9009\u62E9 "\u66F4\u6539\u663E\u793A\u8BED\u8A00"',
        "\u65B9\u6CD5 3: \u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF CCJK_LANG=zh-CN"
      ]
    },
    {
      q: "\u5982\u4F55\u5B8C\u5168\u5378\u8F7D CCJK\uFF1F",
      a: [
        '\u8FD0\u884C "ccjk uninstall" \u5E76\u9009\u62E9\u5B8C\u5168\u5378\u8F7D\u6A21\u5F0F\u3002',
        "\u8FD9\u5C06\u79FB\u9664\u6240\u6709 CCJK \u76F8\u5173\u914D\u7F6E\u3002"
      ]
    },
    {
      q: "\u5982\u4F55\u66F4\u65B0 CCJK\uFF1F",
      a: [
        '\u65B9\u6CD5 1: \u8FD0\u884C "ccjk system upgrade"',
        '\u65B9\u6CD5 2: \u8FD0\u884C "npm update -g ccjk"',
        '\u65B9\u6CD5 3: \u5728\u83DC\u5355\u4E2D\u9009\u62E9 "\u4E00\u952E\u66F4\u65B0"'
      ]
    }
  ];
  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i];
    console.log(ansis.yellow(`Q${i + 1}: ${faq.q}`));
    for (const line of faq.a) {
      console.log(ansis.gray(`  ${line}`));
    }
    console.log("");
  }
  console.log(ansis.gray("\u2500".repeat(60)));
  console.log(ansis.gray("\u{1F4D6} \u66F4\u591A\u95EE\u9898\u8BF7\u8BBF\u95EE: https://github.com/miounet11/ccjk/issues"));
  console.log("");
}
function showCommandHelp(command) {
  console.log("");
  console.log(ansis.green.bold(`\u{1F4D6} \u547D\u4EE4\u5E2E\u52A9: ${command.name}`));
  console.log(ansis.gray("\u2500".repeat(50)));
  console.log("");
  console.log(ansis.yellow("\u63CF\u8FF0:"));
  console.log(`  ${command.description}`);
  console.log("");
  if (command.alias) {
    console.log(ansis.yellow("\u522B\u540D:"));
    console.log(`  ${command.alias}`);
    console.log("");
  }
  if (command.examples && command.examples.length > 0) {
    console.log(ansis.yellow("\u793A\u4F8B:"));
    for (const example of command.examples) {
      console.log(`  ${ansis.green(example)}`);
    }
    console.log("");
  }
  console.log(ansis.gray("\u2500".repeat(50)));
  console.log(ansis.gray(`\u8FD0\u884C "${command.name.split(" ")[0]} ${command.name.split(" ")[1] || ""} --help" \u67E5\u770B\u6240\u6709\u9009\u9879`));
  console.log("");
}

export { help };
