import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { resolve, join, dirname } from 'pathe';
import { getApiProviderPresets } from './api-providers.mjs';
import { SETTINGS_FILE, CLAUDE_DIR } from './constants.mjs';
import { i18n } from './index.mjs';
import { g as getPermissionManager } from '../shared/ccjk.pi0nsyn3.mjs';
import { e as commandExists } from './platform.mjs';
import { P as ProviderHealthMonitor } from '../shared/ccjk.J8YiPsOw.mjs';
import { platform, userInfo, homedir } from 'node:os';
import ora from 'ora';
import { exec } from 'tinyexec';
import { S as STATUS } from '../shared/ccjk.BpHTUkb8.mjs';
import { writeFileAtomic } from './fs-operations.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import './package.mjs';
import 'node:crypto';
import 'node:fs/promises';

const t = i18n.t.bind(i18n);
function getClaudeSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch {
  }
  return null;
}
function saveClaudeSettings(settings) {
  try {
    if (!existsSync(CLAUDE_DIR)) {
      mkdirSync(CLAUDE_DIR, { recursive: true });
    }
    writeFileAtomic(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch {
    return false;
  }
}
async function checkWorkingDirectory(cwd) {
  try {
    if (!existsSync(cwd)) {
      return {
        name: t("workspace:checks.cwdExists"),
        status: "fail",
        message: t("workspace:status.notExists"),
        details: cwd,
        fixDescription: t("workspace:fixes.createDirectory"),
        fix: async () => {
          try {
            mkdirSync(cwd, { recursive: true });
            return true;
          } catch {
            return false;
          }
        }
      };
    }
    const stat = statSync(cwd);
    if (!stat.isDirectory()) {
      return {
        name: t("workspace:checks.cwdExists"),
        status: "fail",
        message: t("workspace:status.notDirectory"),
        details: cwd
      };
    }
    return {
      name: t("workspace:checks.cwdExists"),
      status: "pass",
      message: cwd
    };
  } catch (error) {
    return {
      name: t("workspace:checks.cwdExists"),
      status: "fail",
      message: t("workspace:status.accessError"),
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkWritePermission(cwd) {
  const testFile = join(cwd, `.ccjk-write-test-${Date.now()}.tmp`);
  try {
    writeFileSync(testFile, "test", { mode: 420 });
    const content = readFileSync(testFile, "utf-8");
    if (content !== "test") {
      throw new Error("Content mismatch");
    }
    const { unlinkSync } = await import('node:fs');
    unlinkSync(testFile);
    return {
      name: t("workspace:checks.writePermission"),
      status: "pass",
      message: t("workspace:status.writable")
    };
  } catch (error) {
    try {
      const { unlinkSync } = await import('node:fs');
      if (existsSync(testFile)) {
        unlinkSync(testFile);
      }
    } catch {
    }
    const isPermissionError = error instanceof Error && (error.message.includes("EACCES") || error.message.includes("EPERM"));
    if (isPermissionError) {
      return {
        name: t("workspace:checks.writePermission"),
        status: "fail",
        message: t("workspace:status.noWritePermission"),
        details: error instanceof Error ? error.message : String(error),
        fixDescription: t("workspace:fixes.fixPermission"),
        fix: async () => {
          try {
            if (platform() !== "win32") {
              await exec("chmod", ["-R", "u+w", cwd], { throwOnError: true });
              return true;
            }
            return false;
          } catch {
            return false;
          }
        }
      };
    }
    return {
      name: t("workspace:checks.writePermission"),
      status: "fail",
      message: t("workspace:status.writeTestFailed"),
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkDirectoryOwnership(cwd) {
  if (platform() === "win32") {
    return {
      name: t("workspace:checks.ownership"),
      status: "info",
      message: t("workspace:status.skippedWindows")
    };
  }
  try {
    const stat = statSync(cwd);
    const currentUid = process__default.getuid?.() ?? -1;
    if (currentUid === -1) {
      return {
        name: t("workspace:checks.ownership"),
        status: "info",
        message: t("workspace:status.cannotCheck")
      };
    }
    if (stat.uid !== currentUid) {
      const user = userInfo();
      return {
        name: t("workspace:checks.ownership"),
        status: "warn",
        message: t("workspace:status.differentOwner"),
        details: t("workspace:details.ownerMismatch", { currentUser: user.username, dirUid: stat.uid }),
        fixDescription: t("workspace:fixes.changeOwner"),
        fix: async () => {
          try {
            await exec("sudo", ["chown", "-R", `${currentUid}:${process__default.getgid?.() ?? currentUid}`, cwd], { throwOnError: true });
            return true;
          } catch {
            return false;
          }
        }
      };
    }
    return {
      name: t("workspace:checks.ownership"),
      status: "pass",
      message: t("workspace:status.correctOwner")
    };
  } catch (error) {
    return {
      name: t("workspace:checks.ownership"),
      status: "info",
      message: t("workspace:status.checkFailed"),
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkTrustedDirectories(cwd) {
  const settings = getClaudeSettings();
  if (!settings) {
    return {
      name: t("workspace:checks.trustedDirs"),
      status: "info",
      message: t("workspace:status.noSettings"),
      fixDescription: t("workspace:fixes.createSettings"),
      fix: async () => {
        return saveClaudeSettings({
          allowedDirectories: [cwd]
        });
      }
    };
  }
  const allowedDirs = settings.allowedDirectories || [];
  const isTrusted = allowedDirs.some((dir) => {
    const normalizedDir = resolve(dir);
    const normalizedCwd = resolve(cwd);
    return normalizedCwd === normalizedDir || normalizedCwd.startsWith(`${normalizedDir}/`);
  });
  if (!isTrusted) {
    return {
      name: t("workspace:checks.trustedDirs"),
      status: "warn",
      message: t("workspace:status.notTrusted"),
      details: t("workspace:details.trustedList", { dirs: allowedDirs.join(", ") || t("workspace:status.none") }),
      fixDescription: t("workspace:fixes.addToTrusted"),
      fix: async () => {
        const newSettings = { ...settings };
        const dirs = newSettings.allowedDirectories || [];
        dirs.push(cwd);
        newSettings.allowedDirectories = dirs;
        return saveClaudeSettings(newSettings);
      }
    };
  }
  return {
    name: t("workspace:checks.trustedDirs"),
    status: "pass",
    message: t("workspace:status.trusted")
  };
}
async function checkPathCharacters(cwd) {
  const problematicChars = /[<>:"|?*\x00-\x1F]/;
  const hasSpaces = cwd.includes(" ");
  const hasUnicode = /[^\x00-\x7F]/.test(cwd);
  if (problematicChars.test(cwd)) {
    return {
      name: t("workspace:checks.pathChars"),
      status: "fail",
      message: t("workspace:status.invalidChars"),
      details: t("workspace:details.avoidChars")
    };
  }
  if (hasSpaces || hasUnicode) {
    return {
      name: t("workspace:checks.pathChars"),
      status: "warn",
      message: hasSpaces ? t("workspace:status.hasSpaces") : t("workspace:status.hasUnicode"),
      details: t("workspace:details.mayHaveIssues")
    };
  }
  return {
    name: t("workspace:checks.pathChars"),
    status: "pass",
    message: t("workspace:status.pathOk")
  };
}
async function checkHomeDirectory(cwd) {
  const home = homedir();
  const normalizedCwd = resolve(cwd);
  const normalizedHome = resolve(home);
  const isInHome = normalizedCwd.startsWith(normalizedHome);
  if (!isInHome) {
    const systemDirs = ["/usr", "/bin", "/sbin", "/etc", "/var", "/tmp", "/root"];
    const isSystemDir = systemDirs.some((dir) => normalizedCwd.startsWith(dir));
    if (isSystemDir) {
      return {
        name: t("workspace:checks.homeDir"),
        status: "fail",
        message: t("workspace:status.systemDir"),
        details: t("workspace:details.dontUseSystemDir")
      };
    }
    return {
      name: t("workspace:checks.homeDir"),
      status: "warn",
      message: t("workspace:status.outsideHome"),
      details: t("workspace:details.recommendHome", { home })
    };
  }
  return {
    name: t("workspace:checks.homeDir"),
    status: "pass",
    message: t("workspace:status.insideHome")
  };
}
async function checkDiskSpace(cwd) {
  if (platform() === "win32") {
    return {
      name: t("workspace:checks.diskSpace"),
      status: "info",
      message: t("workspace:status.skippedWindows")
    };
  }
  try {
    const result = await exec("df", ["-h", cwd], { throwOnError: false });
    const lines = result.stdout.trim().split("\n");
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      const available = parts[3];
      const usePercent = Number.parseInt(parts[4]);
      if (usePercent > 95) {
        return {
          name: t("workspace:checks.diskSpace"),
          status: "fail",
          message: t("workspace:status.diskFull", { percent: usePercent }),
          details: t("workspace:details.available", { space: available })
        };
      }
      if (usePercent > 90) {
        return {
          name: t("workspace:checks.diskSpace"),
          status: "warn",
          message: t("workspace:status.diskLow", { percent: usePercent }),
          details: t("workspace:details.available", { space: available })
        };
      }
      return {
        name: t("workspace:checks.diskSpace"),
        status: "pass",
        message: t("workspace:details.available", { space: available })
      };
    }
    return {
      name: t("workspace:checks.diskSpace"),
      status: "info",
      message: t("workspace:status.cannotCheck")
    };
  } catch {
    return {
      name: t("workspace:checks.diskSpace"),
      status: "info",
      message: t("workspace:status.checkFailed")
    };
  }
}
async function checkParentDirectory(cwd) {
  const parent = dirname(cwd);
  if (parent === cwd) {
    return {
      name: t("workspace:checks.parentDir"),
      status: "info",
      message: t("workspace:status.rootDir")
    };
  }
  try {
    const stat = statSync(parent);
    if (!stat.isDirectory()) {
      return {
        name: t("workspace:checks.parentDir"),
        status: "fail",
        message: t("workspace:status.parentNotDir")
      };
    }
    const { readdirSync } = await import('node:fs');
    readdirSync(parent);
    return {
      name: t("workspace:checks.parentDir"),
      status: "pass",
      message: t("workspace:status.parentOk")
    };
  } catch (error) {
    return {
      name: t("workspace:checks.parentDir"),
      status: "warn",
      message: t("workspace:status.parentAccessIssue"),
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkEnvironment() {
  const isWSL = existsSync("/proc/version") && readFileSync("/proc/version", "utf-8").toLowerCase().includes("microsoft");
  const isDocker = existsSync("/.dockerenv") || existsSync("/proc/1/cgroup") && readFileSync("/proc/1/cgroup", "utf-8").includes("docker");
  if (isWSL) {
    return {
      name: t("workspace:checks.environment"),
      status: "info",
      message: t("workspace:status.wslDetected"),
      details: t("workspace:details.wslTips")
    };
  }
  if (isDocker) {
    return {
      name: t("workspace:checks.environment"),
      status: "info",
      message: t("workspace:status.dockerDetected"),
      details: t("workspace:details.dockerTips")
    };
  }
  return {
    name: t("workspace:checks.environment"),
    status: "pass",
    message: t("workspace:status.nativeEnv")
  };
}
async function runWorkspaceCheck(targetDir) {
  const cwd = targetDir ? resolve(targetDir) : process__default.cwd();
  const spinner = ora(t("workspace:checking")).start();
  const checks = [];
  spinner.text = t("workspace:checkingCwd");
  checks.push(await checkWorkingDirectory(cwd));
  spinner.text = t("workspace:checkingWrite");
  checks.push(await checkWritePermission(cwd));
  spinner.text = t("workspace:checkingOwnership");
  checks.push(await checkDirectoryOwnership(cwd));
  spinner.text = t("workspace:checkingTrusted");
  checks.push(await checkTrustedDirectories(cwd));
  spinner.text = t("workspace:checkingPath");
  checks.push(await checkPathCharacters(cwd));
  spinner.text = t("workspace:checkingHome");
  checks.push(await checkHomeDirectory(cwd));
  spinner.text = t("workspace:checkingDisk");
  checks.push(await checkDiskSpace(cwd));
  spinner.text = t("workspace:checkingParent");
  checks.push(await checkParentDirectory(cwd));
  spinner.text = t("workspace:checkingEnv");
  checks.push(await checkEnvironment());
  spinner.stop();
  const recommendations = [];
  const hasFailures = checks.some((c) => c.status === "fail");
  const hasWarnings = checks.some((c) => c.status === "warn");
  if (hasFailures) {
    recommendations.push(t("workspace:recommendations.fixFailures"));
  }
  if (hasWarnings) {
    recommendations.push(t("workspace:recommendations.reviewWarnings"));
  }
  const trustedCheck = checks.find((c) => c.name === t("workspace:checks.trustedDirs"));
  if (trustedCheck && trustedCheck.status !== "pass") {
    recommendations.push(t("workspace:recommendations.trustDir", { cmd: `claude config add trustedDirectories "${cwd}"` }));
  }
  return {
    cwd,
    isValid: !hasFailures,
    checks,
    recommendations
  };
}
function displayWorkspaceReport(report) {
  console.log(ansis.green(`
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 ${t("workspace:title")} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
`));
  console.log(ansis.white.bold(`${t("workspace:currentDir")}: ${ansis.yellow(report.cwd)}
`));
  for (const check of report.checks) {
    let icon;
    let color;
    switch (check.status) {
      case "pass":
        icon = "\u2705";
        color = ansis.green;
        break;
      case "warn":
        icon = "\u26A0\uFE0F";
        color = ansis.yellow;
        break;
      case "fail":
        icon = "\u274C";
        color = ansis.red;
        break;
      case "info":
      default:
        icon = "\u2139\uFE0F";
        color = ansis.gray;
        break;
    }
    console.log(`${icon} ${ansis.bold(check.name.padEnd(20))} ${color(check.message)}`);
    if (check.details) {
      console.log(ansis.gray(`   ${check.details}`));
    }
    if (check.fixDescription && (check.status === "fail" || check.status === "warn")) {
      console.log(ansis.dim(`   \u{1F4A1} ${check.fixDescription}`));
    }
  }
  console.log("");
  console.log(ansis.dim("\u2500".repeat(50)));
  if (report.isValid) {
    console.log(STATUS.success(t("workspace:summary.valid")));
  } else {
    console.log(STATUS.error(t("workspace:summary.invalid")));
  }
  if (report.recommendations.length > 0) {
    console.log(ansis.yellow(`
${t("workspace:recommendations.title")}:`));
    for (const rec of report.recommendations) {
      console.log(ansis.yellow(`  \u2022 ${rec}`));
    }
  }
  console.log("");
}
async function runWorkspaceWizard(targetDir) {
  const report = await runWorkspaceCheck(targetDir);
  displayWorkspaceReport(report);
  const fixableChecks = report.checks.filter(
    (c) => c.fix && (c.status === "fail" || c.status === "warn")
  );
  if (fixableChecks.length === 0) {
    if (report.isValid) {
      console.log(STATUS.success(t("workspace:wizard.allGood")));
    } else {
      console.log(STATUS.warning(t("workspace:wizard.manualFix")));
    }
    return;
  }
  console.log("");
  console.log(ansis.green(t("workspace:wizard.autoFixing", { count: fixableChecks.length })));
  for (const check of fixableChecks) {
    const spinner = ora(`${t("workspace:wizard.fixing")} ${check.name}...`).start();
    try {
      const success = await check.fix();
      if (success) {
        spinner.succeed(`${check.name} ${t("workspace:wizard.fixed")}`);
      } else {
        spinner.fail(`${check.name} ${t("workspace:wizard.fixFailed")}`);
      }
    } catch (error) {
      spinner.fail(`${check.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log("");
  console.log(ansis.green(t("workspace:wizard.verifying")));
  const newReport = await runWorkspaceCheck(targetDir);
  if (newReport.isValid) {
    console.log(STATUS.success(t("workspace:wizard.allFixed")));
  } else {
    console.log(STATUS.warning(t("workspace:wizard.someRemain")));
    displayWorkspaceReport(newReport);
  }
}

async function checkClaudeCode() {
  const hasCommand = await commandExists("claude");
  if (hasCommand) {
    return { name: "Claude Code", status: "ok", message: "Installed" };
  }
  return {
    name: "Claude Code",
    status: "error",
    message: "Not installed",
    fix: "Run: npm install -g @anthropic-ai/claude-code"
  };
}
async function checkClaudeDir() {
  if (existsSync(CLAUDE_DIR)) {
    return { name: "Config Directory", status: "ok", message: CLAUDE_DIR };
  }
  return {
    name: "Config Directory",
    status: "error",
    message: "Does not exist",
    fix: "Run: npx ccjk init"
  };
}
async function checkSettings() {
  if (existsSync(SETTINGS_FILE)) {
    return { name: "settings.json", status: "ok", message: "Configured" };
  }
  return {
    name: "settings.json",
    status: "warning",
    message: "Not found",
    fix: "Run: npx ccjk init"
  };
}
async function checkWorkflows() {
  const commandsDir = join(CLAUDE_DIR, "commands");
  if (existsSync(commandsDir)) {
    try {
      const files = readdirSync(commandsDir, { recursive: true });
      const mdFiles = files.filter((f) => String(f).endsWith(".md"));
      return {
        name: "Workflows",
        status: "ok",
        message: `${mdFiles.length} commands installed`
      };
    } catch {
      return { name: "Workflows", status: "warning", message: "Cannot read directory" };
    }
  }
  return {
    name: "Workflows",
    status: "warning",
    message: "Not installed",
    fix: "Run: npx ccjk update"
  };
}
async function checkMcp() {
  const mcpConfigPath = join(CLAUDE_DIR, "mcp.json");
  const settingsPath = SETTINGS_FILE;
  if (existsSync(settingsPath)) {
    try {
      const { readFileSync } = await import('node:fs');
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (settings.mcpServers && Object.keys(settings.mcpServers).length > 0) {
        const count = Object.keys(settings.mcpServers).length;
        return { name: "MCP Services", status: "ok", message: `${count} services configured` };
      }
    } catch {
    }
  }
  if (existsSync(mcpConfigPath)) {
    return { name: "MCP Services", status: "ok", message: "Configured" };
  }
  return {
    name: "MCP Services",
    status: "warning",
    message: "Not configured",
    fix: "Run: npx ccjk init and select MCP services"
  };
}
async function checkCcr() {
  const hasCcr = await commandExists("ccr");
  if (hasCcr) {
    return { name: "CCR Proxy", status: "ok", message: "Installed" };
  }
  return {
    name: "CCR Proxy",
    status: "warning",
    message: "Not installed (optional)",
    fix: "Run: npx ccjk ccr to install"
  };
}
async function checkOutputStyles() {
  const stylesDir = join(CLAUDE_DIR, "output-styles");
  if (existsSync(stylesDir)) {
    try {
      const files = readdirSync(stylesDir).filter((f) => f.endsWith(".md"));
      return {
        name: "Output Styles",
        status: "ok",
        message: `${files.length} styles available`
      };
    } catch {
      return { name: "Output Styles", status: "warning", message: "Cannot read directory" };
    }
  }
  return {
    name: "Output Styles",
    status: "warning",
    message: "Not installed",
    fix: "Run: npx ccjk init"
  };
}
async function checkProviders(codeType = "claude-code") {
  try {
    const providers = await getApiProviderPresets(codeType);
    if (providers.length === 0) {
      return {
        name: "API Providers",
        status: "warning",
        message: "No providers available"
      };
    }
    const monitor = new ProviderHealthMonitor({
      timeout: 3e3,
      degradedLatencyThreshold: 1e3,
      unhealthyLatencyThreshold: 3e3
    });
    monitor.setProviders(providers);
    const results = await Promise.race([
      Promise.all(
        providers.map(async (provider) => {
          const result = await monitor.checkHealth(provider);
          return { provider, result };
        })
      ),
      new Promise((resolve2) => {
        setTimeout(() => resolve2(null), 5e3);
      })
    ]);
    if (!results) {
      return {
        name: "API Providers",
        status: "warning",
        message: "Health check timeout"
      };
    }
    const healthyCount = results.filter((r) => r.result.success).length;
    if (healthyCount === 0) {
      return {
        name: "API Providers",
        status: "error",
        message: "All providers unavailable",
        fix: "Check your network connection"
      };
    }
    if (healthyCount < providers.length) {
      return {
        name: "API Providers",
        status: "warning",
        message: `${healthyCount}/${providers.length} providers healthy`
      };
    }
    return {
      name: "API Providers",
      status: "ok",
      message: `${healthyCount} providers healthy`
    };
  } catch {
    return {
      name: "API Providers",
      status: "warning",
      message: "Health check failed"
    };
  }
}
async function checkPermissionRules() {
  const isZh = i18n.language === "zh-CN";
  try {
    const permissionManager = getPermissionManager();
    const unreachableRules = permissionManager.getUnreachableRules();
    const allDiagnostics = permissionManager.getAllDiagnostics();
    const shadowedRules = allDiagnostics.filter((d) => d.shadowedBy.length > 0);
    const conflictedRules = allDiagnostics.filter((d) => d.conflicts.length > 0);
    const problemCount = unreachableRules.length + shadowedRules.length + conflictedRules.length;
    if (problemCount === 0) {
      const stats = permissionManager.getStats();
      return {
        name: "Permission Rules",
        status: "ok",
        message: `${stats.total} rules configured`
      };
    }
    const details = [];
    if (unreachableRules.length > 0) {
      details.push(isZh ? `${unreachableRules.length} unreachable rule(s)` : `${unreachableRules.length} unreachable rule(s)`);
      for (const rule of unreachableRules.slice(0, 3)) {
        details.push(`  - ${ansis.dim(rule.pattern)}`);
      }
      if (unreachableRules.length > 3) {
        details.push(`  ... ${isZh ? "and" : "and"} ${unreachableRules.length - 3} ${isZh ? "more" : "more"}`);
      }
    }
    if (shadowedRules.length > 0) {
      details.push(isZh ? `${shadowedRules.length} shadowed rule(s)` : `${shadowedRules.length} shadowed rule(s)`);
      for (const diag of shadowedRules.slice(0, 2)) {
        details.push(`  - ${ansis.dim(diag.rule.pattern)} ${ansis.dim(isZh ? "shadowed by" : "shadowed by")} ${diag.shadowedBy[0].pattern}`);
      }
    }
    if (conflictedRules.length > 0) {
      details.push(isZh ? `${conflictedRules.length} conflicted rule(s)` : `${conflictedRules.length} conflicted rule(s)`);
    }
    return {
      name: "Permission Rules",
      status: "warning",
      message: `${problemCount} ${isZh ? "problematic" : "problematic"} ${isZh ? "rule(s)" : "rule(s)"}`,
      fix: isZh ? "Run: ccjk permissions diagnose" : "Run: ccjk permissions diagnose",
      details
    };
  } catch {
    return {
      name: "Permission Rules",
      status: "warning",
      message: "Unable to check"
    };
  }
}
async function doctor(options = {}) {
  const isZh = i18n.language === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan("\u{1F50D} CCJK Health Check"));
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log("");
  const checks = [
    checkClaudeCode,
    checkClaudeDir,
    checkSettings,
    checkWorkflows,
    checkMcp,
    checkPermissionRules,
    checkCcr,
    checkOutputStyles
  ];
  if (options.checkProviders) {
    checks.push(() => checkProviders(options.codeType));
  }
  let hasErrors = false;
  let hasWarnings = false;
  for (const check of checks) {
    const result = await check();
    const statusIcon = result.status === "ok" ? ansis.green("\u2705") : result.status === "warning" ? ansis.yellow("\u26A0\uFE0F") : ansis.red("\u274C");
    const statusColor = result.status === "ok" ? ansis.green : result.status === "warning" ? ansis.yellow : ansis.red;
    console.log(`${statusIcon} ${ansis.bold(result.name)}: ${statusColor(result.message)}`);
    if (result.fix) {
      console.log(ansis.dim(`   \u{1F4A1} Fix: ${result.fix}`));
    }
    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(ansis.dim(`   ${detail}`));
      }
    }
    if (result.status === "error")
      hasErrors = true;
    if (result.status === "warning")
      hasWarnings = true;
  }
  console.log("");
  console.log(ansis.dim("\u2500".repeat(50)));
  if (hasErrors) {
    console.log(ansis.red("\u274C Issues found - please follow the suggestions above"));
  } else if (hasWarnings) {
    console.log(ansis.yellow("\u26A0\uFE0F Configuration is functional, but some features may be limited"));
  } else {
    console.log(ansis.green("\u2705 All checks passed - CCJK is properly configured!"));
  }
  console.log("");
  if (!options.checkProviders) {
    const { checkProvidersNow } = await inquirer.prompt({
      type: "confirm",
      name: "checkProvidersNow",
      message: isZh ? "\u662F\u5426\u68C0\u67E5 API \u4F9B\u5E94\u5546\u5065\u5EB7\u72B6\u6001\uFF1F" : "Check API provider health status?",
      default: false
    });
    if (checkProvidersNow) {
      console.log("");
      console.log(ansis.dim(isZh ? "\u6B63\u5728\u68C0\u67E5\u4F9B\u5E94\u5546..." : "Checking providers..."));
      const providerResult = await checkProviders(options.codeType);
      const statusIcon = providerResult.status === "ok" ? ansis.green("\u2705") : providerResult.status === "warning" ? ansis.yellow("\u26A0\uFE0F") : ansis.red("\u274C");
      const statusColor = providerResult.status === "ok" ? ansis.green : providerResult.status === "warning" ? ansis.yellow : ansis.red;
      console.log(`${statusIcon} ${ansis.bold(providerResult.name)}: ${statusColor(providerResult.message)}`);
      if (providerResult.fix) {
        console.log(ansis.dim(`   \u{1F4A1} Fix: ${providerResult.fix}`));
      }
      console.log("");
    }
  }
  const { runWorkspace } = await inquirer.prompt({
    type: "confirm",
    name: "runWorkspace",
    message: isZh ? "\u662F\u5426\u68C0\u67E5\u5F53\u524D\u5DE5\u4F5C\u76EE\u5F55\u7684\u6587\u4EF6\u5199\u5165\u6743\u9650\uFF1F" : "Check file write permissions for current directory?",
    default: false
  });
  if (runWorkspace) {
    console.log("");
    const report = await runWorkspaceCheck(process__default.cwd());
    displayWorkspaceReport(report);
  }
}
async function workspaceDiagnostics(targetDir) {
  const dir = targetDir ? resolve(targetDir) : process__default.cwd();
  await runWorkspaceWizard(dir);
}

export { doctor, workspaceDiagnostics };
