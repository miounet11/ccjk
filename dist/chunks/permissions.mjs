import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import 'tinyexec';
import { i18n } from './index.mjs';
import { g as getPermissionManager } from '../shared/ccjk.pi0nsyn3.mjs';
import 'node:fs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import 'node:os';

const permissionManager = getPermissionManager();
async function listPermissions(options) {
  const format = options.format || "table";
  const verbose = options.verbose || false;
  const category = options.category;
  const type = options.type;
  let rules = permissionManager.getAllRules();
  if (type) {
    rules = rules.filter((r) => r.type === type);
  }
  if (category) {
    rules = rules.filter((r) => r.category === category);
  }
  if (format === "json") {
    console.log(JSON.stringify(rules, null, 2));
    return;
  }
  console.log("");
  console.log(ansis.bold("\u{1F4CB} CCJK Permissions\n"));
  const stats = permissionManager.getStats();
  console.log(ansis.dim(`Total: ${stats.total} | Allow: ${stats.allow} | Deny: ${stats.deny}
`));
  if (rules.length === 0) {
    console.log(ansis.yellow("No permissions configured."));
    return;
  }
  if (format === "list") {
    for (const rule of rules) {
      const typeColor = rule.type === "allow" ? ansis.green : ansis.red;
      console.log(`${typeColor(rule.type.padEnd(6))} ${ansis.cyan(rule.pattern)} (${rule.category})`);
      if (verbose) {
        if (rule.description) {
          console.log(ansis.gray(`    Description: ${rule.description}`));
        }
        console.log(ansis.gray(`    Source: ${rule.source}`));
        if (rule.priority !== void 0) {
          console.log(ansis.gray(`    Priority: ${rule.priority}`));
        }
      }
    }
  } else {
    console.log(
      ansis.bold("Type".padEnd(8)) + ansis.bold("Pattern".padEnd(40)) + ansis.bold("Category".padEnd(12)) + ansis.bold("Source")
    );
    console.log(ansis.dim("\u2500".repeat(80)));
    for (const rule of rules) {
      const typeColor = rule.type === "allow" ? ansis.green : ansis.red;
      const type2 = typeColor(rule.type.padEnd(8));
      const pattern = ansis.cyan(rule.pattern.padEnd(40));
      const category2 = ansis.yellow(rule.category.padEnd(12));
      const source = ansis.dim(rule.source);
      console.log(`${type2}${pattern}${category2}${source}`);
      if (verbose && rule.description) {
        console.log(ansis.gray(`  \u2514\u2500 ${rule.description}`));
      }
    }
  }
  console.log("");
}
async function checkPermission(resource, options) {
  const isZh = i18n.language === "zh-CN";
  if (!resource) {
    console.error(ansis.red(isZh ? "\u9519\u8BEF\uFF1A\u9700\u8981\u6307\u5B9A\u8D44\u6E90" : "Error: Resource is required"));
    console.log(isZh ? "\u7528\u6CD5: ccjk permissions check <resource>" : "Usage: ccjk permissions check <resource>");
    process__default.exit(1);
  }
  const action = options.action || "execute";
  const verbose = options.verbose || false;
  console.log("");
  console.log(ansis.bold(`${ansis.cyan("\u{1F50D}")} ${isZh ? "\u68C0\u67E5\u6743\u9650" : "Checking Permission"}: ${ansis.cyan(resource)}
`));
  const result = await permissionManager.checkPermission(action, resource);
  if (result.allowed) {
    console.log(ansis.green(`\u2713 ${isZh ? "\u5141\u8BB8" : "ALLOWED"}`));
    console.log(`  ${ansis.dim("Reason:")} ${result.reason}`);
    if (verbose && result.matchedRule) {
      console.log(`  ${ansis.dim("Matched rule:")} ${ansis.cyan(result.matchedRule.pattern)}`);
      console.log(`  ${ansis.dim("Rule type:")} ${result.matchedRule.type}`);
      console.log(`  ${ansis.dim("Source:")} ${result.matchedRule.source}`);
    }
  } else {
    console.log(ansis.red(`\u2717 ${isZh ? "\u62D2\u7EDD" : "DENIED"}`));
    console.log(`  ${ansis.dim("Reason:")} ${result.reason}`);
    console.log(ansis.yellow(isZh ? '  \u63D0\u793A\uFF1A\u4F7F\u7528 "ccjk permissions add" \u6DFB\u52A0\u6743\u9650' : '  Tip: Use "ccjk permissions add" to grant permission'));
  }
  console.log("");
}
async function grantPermission(resource, options) {
  const isZh = i18n.language === "zh-CN";
  if (!resource) {
    console.error(ansis.red(isZh ? "\u9519\u8BEF\uFF1A\u9700\u8981\u6307\u5B9A\u8D44\u6E90" : "Error: Resource is required"));
    console.log(isZh ? "\u7528\u6CD5: ccjk permissions grant <pattern>" : "Usage: ccjk permissions grant <pattern>");
    process__default.exit(1);
  }
  const validation = permissionManager.validatePattern(resource);
  if (!validation.valid) {
    console.error(ansis.red(`${isZh ? "\u9519\u8BEF" : "Error"}: ${validation.error}`));
    process__default.exit(1);
  }
  console.log("");
  console.log(ansis.bold(`${ansis.cyan("\u2713")} ${isZh ? "\u6388\u4E88\u6743\u9650" : "Granting Permission"}: ${ansis.cyan(resource)}
`));
  const permission = {
    type: "allow",
    pattern: resource,
    scope: "global",
    description: options.description || "Granted via CLI"
  };
  permissionManager.addPermission(permission);
  console.log(ansis.green(isZh ? "\u6743\u9650\u5DF2\u6210\u529F\u6388\u4E88\uFF01" : "Permission granted successfully!"));
  console.log("");
}
async function revokePermission(resource, _options) {
  const isZh = i18n.language === "zh-CN";
  if (!resource) {
    console.error(ansis.red(isZh ? "\u9519\u8BEF\uFF1A\u9700\u8981\u6307\u5B9A\u8D44\u6E90" : "Error: Resource is required"));
    console.log(isZh ? "\u7528\u6CD5: ccjk permissions revoke <pattern>" : "Usage: ccjk permissions revoke <pattern>");
    process__default.exit(1);
  }
  console.log("");
  console.log(ansis.bold(`${ansis.red("\u2717")} ${isZh ? "\u64A4\u9500\u6743\u9650" : "Revoking Permission"}: ${ansis.cyan(resource)}
`));
  const removed = permissionManager.removePermission(resource);
  if (removed) {
    console.log(ansis.green(isZh ? "\u6743\u9650\u5DF2\u6210\u529F\u64A4\u9500\uFF01" : "Permission revoked successfully!"));
  } else {
    console.log(ansis.yellow(isZh ? "\u672A\u627E\u5230\u5339\u914D\u7684\u6743\u9650\u89C4\u5219" : "No matching permission found"));
  }
  console.log("");
}
async function resetPermissions(_options) {
  const isZh = i18n.language === "zh-CN";
  console.log("");
  console.log(ansis.bold.yellow(`${ansis.yellow("\u26A0\uFE0F")} ${isZh ? "\u91CD\u7F6E\u6240\u6709\u6743\u9650" : "Resetting All Permissions"}
`));
  const { confirm } = await inquirer.prompt({
    type: "confirm",
    name: "confirm",
    message: isZh ? "\u786E\u5B9A\u8981\u6E05\u9664\u6240\u6709\u6743\u9650\u89C4\u5219\u5417\uFF1F" : "Are you sure you want to reset all permissions?",
    default: false
  });
  if (!confirm) {
    console.log(ansis.gray(isZh ? "\u64CD\u4F5C\u5DF2\u53D6\u6D88" : "Operation cancelled"));
    return;
  }
  permissionManager.clearPermissions();
  console.log(ansis.green(isZh ? "\u6240\u6709\u6743\u9650\u5DF2\u6E05\u9664\uFF01" : "All permissions have been reset!"));
  console.log("");
}
async function exportPermissions(filePath, _options) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const outputPath = filePath || path.join(process__default.cwd(), "permissions.json");
  console.log("");
  console.log(ansis.bold(`\u{1F4E4} ${ansis.cyan("Exporting Permissions")} ${ansis.dim("to")} ${ansis.cyan(outputPath)}
`));
  const permissions = permissionManager.exportPermissions();
  await fs.writeFile(outputPath, JSON.stringify(permissions, null, 2), "utf-8");
  const totalCount = (permissions.allow?.length || 0) + (permissions.deny?.length || 0);
  console.log(ansis.green(`\u2713 Exported ${totalCount} permission(s) successfully!`));
  console.log("");
}
async function importPermissions(filePath, options) {
  const isZh = i18n.language === "zh-CN";
  if (!filePath) {
    console.error(ansis.red(isZh ? "\u9519\u8BEF\uFF1A\u9700\u8981\u6307\u5B9A\u6587\u4EF6\u8DEF\u5F84" : "Error: File path is required"));
    console.log(isZh ? "\u7528\u6CD5: ccjk permissions import <file>" : "Usage: ccjk permissions import <file>");
    process__default.exit(1);
  }
  const fs = await import('node:fs/promises');
  console.log("");
  console.log(ansis.bold(`\u{1F4E5} ${ansis.cyan("Importing Permissions")} ${ansis.dim("from")} ${ansis.cyan(filePath)}
`));
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const config = JSON.parse(content);
    if (!config.allow && !config.deny) {
      throw new TypeError(isZh ? "\u65E0\u6548\u7684\u6743\u9650\u6587\u4EF6\u683C\u5F0F\u3002\u671F\u671B { allow: [], deny: [] }" : "Invalid permissions file format. Expected { allow: [], deny: [] }");
    }
    const merge = options.merge ?? false;
    permissionManager.importPermissions(config, merge);
    const totalCount = (config.allow?.length || 0) + (config.deny?.length || 0);
    console.log(ansis.green(`\u2713 Imported ${totalCount} permission(s) successfully!`));
  } catch (error) {
    console.error(ansis.red(`${isZh ? "\u5BFC\u5165\u6743\u9650\u65F6\u51FA\u9519" : "Error importing permissions"}:`), error);
    process__default.exit(1);
  }
  console.log("");
}
function permissionsHelp(_options) {
  const isZh = i18n.language === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(`\u{1F4CB} ${isZh ? "CCJK \u6743\u9650\u7BA1\u7406" : "CCJK Permissions Management"}
`));
  console.log(ansis.bold(isZh ? "\u7528\u6CD5\uFF1A" : "Usage:"));
  console.log("  ccjk permissions [action] [...args]\n");
  console.log(ansis.bold(isZh ? "\u64CD\u4F5C\uFF1A" : "Actions:"));
  console.log(`  list              ${isZh ? "\u5217\u51FA\u6240\u6709\u6743\u9650" : "List all permissions"}`);
  console.log(`  search [query]    ${isZh ? "\u4EA4\u4E92\u5F0F\u641C\u7D22\u6743\u9650" : "Interactive permission search"}`);
  console.log(`  check <resource>  ${isZh ? "\u68C0\u67E5\u8D44\u6E90\u6743\u9650" : "Check permission for a resource"}`);
  console.log(`  grant <pattern>   ${isZh ? "\u6388\u4E88\u6743\u9650" : "Grant permission for a pattern"}`);
  console.log(`  revoke <pattern>  ${isZh ? "\u64A4\u9500\u6743\u9650" : "Revoke permission for a pattern"}`);
  console.log(`  reset             ${isZh ? "\u91CD\u7F6E\u6240\u6709\u6743\u9650" : "Reset all permissions"}`);
  console.log(`  test <pattern>    ${isZh ? "\u6D4B\u8BD5\u6A21\u5F0F\u5339\u914D" : "Test pattern matching"}`);
  console.log(`  diagnose [pattern] ${isZh ? "\u663E\u793A\u89C4\u5219\u8BCA\u65AD" : "Show rule diagnostics"}`);
  console.log(`  examples          ${isZh ? "\u663E\u793A\u6A21\u5F0F\u793A\u4F8B" : "Show pattern examples"}`);
  console.log(`  export [file]     ${isZh ? "\u5BFC\u51FA\u6743\u9650\u5230\u6587\u4EF6" : "Export permissions to a file"}`);
  console.log(`  import <file>     ${isZh ? "\u4ECE\u6587\u4EF6\u5BFC\u5165\u6743\u9650" : "Import permissions from a file"}
`);
  console.log(ansis.bold(isZh ? "\u9009\u9879\uFF1A" : "Options:"));
  console.log(`  --format, -f      ${isZh ? "\u8F93\u51FA\u683C\u5F0F (table|json|list)" : "Output format (table|json|list)"}`);
  console.log(`  --verbose, -v     ${isZh ? "\u8BE6\u7EC6\u8F93\u51FA" : "Verbose output"}`);
  console.log(`  --type, -t        ${isZh ? "\u8FC7\u6EE4\u7C7B\u578B (allow|deny)" : "Filter by type (allow|deny)"}`);
  console.log(`  --category, -c    ${isZh ? "\u8FC7\u6EE4\u5206\u7C7B" : "Filter by category"}`);
  console.log(`  --action, -a      ${isZh ? "\u68C0\u67E5\u7684\u64CD\u4F5C" : "Action to check"}`);
  console.log(`  --description, -d ${isZh ? "\u89C4\u5219\u63CF\u8FF0" : "Rule description"}`);
  console.log(`  --merge           ${isZh ? "\u5408\u5E76\u5BFC\u5165\uFF08\u800C\u4E0D\u662F\u66FF\u6362\uFF09" : "Merge on import (not replace)"}
`);
  console.log(ansis.bold(isZh ? "\u793A\u4F8B\uFF1A" : "Examples:"));
  console.log("  ccjk permissions list");
  console.log("  ccjk permissions search");
  console.log('  ccjk permissions check "Bash(npm install)"');
  console.log('  ccjk permissions grant "Bash(npm *)"');
  console.log('  ccjk permissions test "mcp__server__*"');
  console.log("  ccjk permissions diagnose");
  console.log("  ccjk permissions examples\n");
  console.log(ansis.bold(isZh ? "\u6A21\u5F0F\u683C\u5F0F\uFF1A" : "Pattern Formats:"));
  console.log(`  Bash(npm install)  ${isZh ? "\u7CBE\u786E\u5339\u914D Bash \u547D\u4EE4" : "Exact Bash command match"}`);
  console.log(`  Bash(npm *)        ${isZh ? "\u5339\u914D\u6240\u6709 npm \u547D\u4EE4" : "Match all npm commands"}`);
  console.log(`  Bash(* install)    ${isZh ? '\u5339\u914D\u4EFB\u610F "* install" \u547D\u4EE4' : 'Match any "* install" command'}`);
  console.log(`  mcp__server__*     ${isZh ? "\u5339\u914D MCP \u670D\u52A1\u5668\u5DE5\u5177" : "Match MCP server tools"}`);
  console.log(`  /home/user/*       ${isZh ? "\u5339\u914D\u8DEF\u5F84\u6A21\u5F0F" : "Match path patterns"}`);
  console.log(`  https://api.*      ${isZh ? "\u5339\u914D URL \u6A21\u5F0F" : "Match URL patterns"}
`);
}

export { checkPermission, exportPermissions, grantPermission, importPermissions, listPermissions, permissionsHelp, resetPermissions, revokePermission };
