import * as fs from 'node:fs';
import { homedir } from 'node:os';
import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import ora from 'ora';
import { join } from 'pathe';
import { exec } from 'tinyexec';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { updateClaudeCode } from './auto-updater.mjs';
import { exists } from './fs-operations.mjs';
import { f as findCommandPath, g as getPlatform, a as getHomebrewCommandPaths, i as isTermux, b as getTermuxPrefix, c as isWSL, d as getWSLInfo, w as wrapCommandWithSudo, e as commandExists, h as getRecommendedInstallMethods } from './platform.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import '../shared/ccjk.DHbrGcgg.mjs';
import 'inquirer-toggle';
import './version-checker.mjs';
import 'node:child_process';
import 'node:path';
import 'node:util';
import 'semver';
import 'node:crypto';
import 'node:fs/promises';

async function isClaudeCodeInstalled() {
  return await commandExists("claude");
}
async function installClaudeCode(skipMethodSelection = false) {
  ensureI18nInitialized();
  const codeType = "claude-code";
  const installed = await isClaudeCodeInstalled();
  if (installed) {
    console.log(ansis.green(`\u2714 ${i18n.t("installation:alreadyInstalled")}`));
    const version = await detectInstalledVersion(codeType);
    if (version) {
      console.log(ansis.gray(`  ${i18n.t("installation:detectedVersion", { version })}`));
    }
    const verification = await verifyInstallation(codeType);
    if (verification.symlinkCreated) {
      displayVerificationResult(verification, codeType);
    }
    await updateClaudeCode();
    return;
  }
  if (isTermux()) {
    console.log(ansis.yellow(`\u2139 ${i18n.t("installation:termuxDetected")}`));
    const termuxPrefix = getTermuxPrefix();
    console.log(ansis.gray(i18n.t("installation:termuxPathInfo", { path: termuxPrefix })));
    console.log(ansis.gray(`Node.js: ${termuxPrefix}/bin/node`));
    console.log(ansis.gray(`npm: ${termuxPrefix}/bin/npm`));
  }
  if (isWSL()) {
    const wslInfo = getWSLInfo();
    if (wslInfo?.distro) {
      console.log(ansis.yellow(`\u2139 ${i18n.t("installation:wslDetected", { distro: wslInfo.distro })}`));
    } else {
      console.log(ansis.yellow(`\u2139 ${i18n.t("installation:wslDetectedGeneric")}`));
    }
    console.log(ansis.gray(i18n.t("installation:wslPathInfo", { path: `${homedir()}/.claude/` })));
  }
  if (skipMethodSelection) {
    console.log(i18n.t("installation:installing"));
    try {
      const { command, args, usedSudo } = wrapCommandWithSudo("npm", ["install", "-g", "@anthropic-ai/claude-code", "--force"]);
      if (usedSudo) {
        console.log(ansis.yellow(`\u2139 ${i18n.t("installation:usingSudo")}`));
      }
      await exec(command, args);
      console.log(`\u2714 ${i18n.t("installation:installSuccess")}`);
      await setInstallMethod("npm");
      const verification = await verifyInstallation(codeType);
      displayVerificationResult(verification, codeType);
      if (isTermux()) {
        console.log(ansis.gray(`
Claude Code installed to: ${getTermuxPrefix()}/bin/claude`));
      }
      if (isWSL()) {
        console.log(ansis.gray(`
${i18n.t("installation:wslInstallSuccess")}`));
      }
    } catch (error) {
      console.error(`\u2716 ${i18n.t("installation:installFailed")}`);
      if (isTermux()) {
        console.error(ansis.yellow(`
${i18n.t("installation:termuxInstallHint")}
`));
      }
      throw error;
    }
    return;
  }
  const method = await selectInstallMethod(codeType);
  if (!method) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  const success = await executeInstallMethod(method, codeType);
  if (!success) {
    const retrySuccess = await handleInstallFailure(codeType, [method]);
    if (!retrySuccess) {
      console.error(ansis.red(`\u2716 ${i18n.t("installation:installFailed")}`));
      throw new Error(i18n.t("installation:installFailed"));
    }
  }
  if (isTermux()) {
    console.log(ansis.gray(`
Claude Code installed to: ${getTermuxPrefix()}/bin/claude`));
  }
  if (isWSL()) {
    console.log(ansis.gray(`
${i18n.t("installation:wslInstallSuccess")}`));
  }
}
async function isCodexInstalled() {
  return await commandExists("codex");
}
async function installCodex(skipMethodSelection = false) {
  ensureI18nInitialized();
  const codeType = "codex";
  const codeTypeName = i18n.t("common:codex");
  const installed = await isCodexInstalled();
  if (installed) {
    console.log(ansis.green(`\u2714 ${codeTypeName} ${i18n.t("installation:alreadyInstalled")}`));
    const version = await detectInstalledVersion(codeType);
    if (version) {
      console.log(ansis.gray(`  ${i18n.t("installation:detectedVersion", { version })}`));
    }
    return;
  }
  if (skipMethodSelection) {
    console.log(i18n.t("installation:installingWith", { method: "npm", codeType: codeTypeName }));
    try {
      const { command, args, usedSudo } = wrapCommandWithSudo("npm", ["install", "-g", "@openai/codex", "--force"]);
      if (usedSudo) {
        console.log(ansis.yellow(`\u2139 ${i18n.t("installation:usingSudo")}`));
      }
      await exec(command, args);
      console.log(ansis.green(`\u2714 ${codeTypeName} ${i18n.t("installation:installSuccess")}`));
      const verification = await verifyInstallation(codeType);
      displayVerificationResult(verification, codeType);
    } catch (error) {
      console.error(ansis.red(`\u2716 ${codeTypeName} ${i18n.t("installation:installFailed")}`));
      throw error;
    }
    return;
  }
  const method = await selectInstallMethod(codeType);
  if (!method) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  const success = await executeInstallMethod(method, codeType);
  if (!success) {
    const retrySuccess = await handleInstallFailure(codeType, [method]);
    if (!retrySuccess) {
      console.error(ansis.red(`\u2716 ${codeTypeName} ${i18n.t("installation:installFailed")}`));
      throw new Error(i18n.t("installation:installFailed"));
    }
  }
}
async function getInstallationStatus() {
  const hasGlobal = await isClaudeCodeInstalled();
  return {
    hasGlobal,
    // Local installation was never implemented - these are kept for backward compatibility
    hasLocal: false,
    localPath: ""
  };
}
async function getInstallMethodFromConfig(codeType) {
  try {
    if (codeType === "claude-code") {
      const { readMcpConfig } = await import('./claude-config.mjs').then(function (n) { return n.e; });
      const config = readMcpConfig();
      return config?.installMethod || null;
    }
  } catch {
  }
  return null;
}
async function uninstallCodeTool(codeType) {
  ensureI18nInitialized();
  const codeTypeName = codeType === "claude-code" ? i18n.t("common:claudeCode") : i18n.t("common:codex");
  let method = await getInstallMethodFromConfig(codeType);
  if (!method) {
    if (codeType === "claude-code") {
      try {
        const result = await exec("brew", ["list", "--cask", "claude-code"]);
        if (result.exitCode === 0) {
          method = "homebrew";
        }
      } catch {
      }
    } else if (codeType === "codex") {
      try {
        const result = await exec("brew", ["list", "--cask", "codex"]);
        if (result.exitCode === 0) {
          method = "homebrew";
        }
      } catch {
      }
    }
    if (!method) {
      method = "npm";
    }
  }
  if (method === "native") {
    const platform = getPlatform();
    if (platform === "macos" || platform === "linux") {
      try {
        const testResult = codeType === "claude-code" ? await exec("brew", ["list", "--cask", "claude-code"]) : await exec("brew", ["list", "--cask", "codex"]);
        if (testResult.exitCode === 0) {
          method = "homebrew";
        }
      } catch {
        method = "manual";
      }
    } else {
      method = "manual";
    }
  }
  const spinner = ora(i18n.t("installation:uninstallingWith", { method, codeType: codeTypeName })).start();
  try {
    switch (method) {
      case "npm":
      case "npm-global": {
        const packageName = codeType === "claude-code" ? "@anthropic-ai/claude-code" : "@openai/codex";
        const { command, args, usedSudo } = wrapCommandWithSudo("npm", ["uninstall", "-g", packageName]);
        if (usedSudo) {
          spinner.info(i18n.t("installation:usingSudo"));
          spinner.start();
        }
        await exec(command, args);
        break;
      }
      case "homebrew": {
        if (codeType === "claude-code") {
          await exec("brew", ["uninstall", "--cask", "claude-code"]);
        } else {
          await exec("brew", ["uninstall", "--cask", "codex"]);
        }
        break;
      }
      case "manual":
      default: {
        spinner.warn(i18n.t("installation:manualUninstallRequired", { codeType: codeTypeName }));
        const command = codeType === "claude-code" ? "claude" : "codex";
        try {
          const whichCmd = getPlatform() === "windows" ? "where" : "which";
          const result = await exec(whichCmd, [command]);
          if (result.stdout) {
            const binaryPath = result.stdout.trim().split("\n")[0];
            spinner.info(i18n.t("installation:binaryLocation", { path: binaryPath }));
            const platform = getPlatform();
            if (platform === "windows") {
              const quotedBinaryPath = `"${binaryPath}"`;
              await exec("cmd", ["/c", "del", "/f", "/q", quotedBinaryPath]);
            } else {
              const { command: rmCmd, args: rmArgs } = wrapCommandWithSudo("rm", ["-f", binaryPath]);
              if (rmCmd === "sudo") {
                spinner.info(i18n.t("installation:usingSudo"));
                spinner.start();
              }
              await exec(rmCmd, rmArgs);
            }
          }
        } catch {
          spinner.fail(i18n.t("installation:failedToLocateBinary", { command }));
          return false;
        }
        break;
      }
    }
    spinner.succeed(i18n.t("installation:uninstallSuccess", { method, codeType: codeTypeName }));
    return true;
  } catch (error) {
    spinner.fail(i18n.t("installation:uninstallFailed", { method, codeType: codeTypeName }));
    if (error instanceof Error) {
      console.error(ansis.gray(error.message));
    }
    return false;
  }
}
async function setInstallMethod(method, codeType = "claude-code") {
  try {
    if (codeType === "claude-code") {
      const { readMcpConfig, writeMcpConfig } = await import('./claude-config.mjs').then(function (n) { return n.e; });
      let config = readMcpConfig();
      if (!config) {
        config = { mcpServers: {} };
      }
      config.installMethod = method === "npm" ? "npm-global" : method;
      writeMcpConfig(config);
    }
  } catch (error) {
    console.error("Failed to set installMethod:", error);
  }
}
async function detectInstalledVersion(codeType) {
  try {
    const command = codeType === "claude-code" ? "claude" : "codex";
    const result = await exec(command, ["--version"]);
    if (result.exitCode === 0 && result.stdout) {
      const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : result.stdout.trim();
    }
  } catch {
  }
  return null;
}
function getInstallMethodLabel(method) {
  switch (method) {
    case "npm":
      return i18n.t("installation:installMethodNpm");
    case "homebrew":
      return i18n.t("installation:installMethodHomebrew");
    case "curl":
      return i18n.t("installation:installMethodCurl");
    case "powershell":
      return i18n.t("installation:installMethodPowershell");
    case "cmd":
      return i18n.t("installation:installMethodCmd");
    default:
      return method;
  }
}
function getInstallMethodOptions(codeType, recommendedMethods) {
  const allMethods = ["npm", "homebrew", "curl", "powershell", "cmd"];
  const platform = getPlatform();
  const availableMethods = allMethods.filter((method) => {
    if (codeType === "codex" && !["npm", "homebrew"].includes(method)) {
      return false;
    }
    if (method === "homebrew")
      return platform === "macos" || platform === "linux";
    if (method === "curl")
      return platform !== "windows" || isWSL();
    if (method === "powershell" || method === "cmd")
      return platform === "windows";
    return true;
  });
  const topRecommended = recommendedMethods.length > 0 ? recommendedMethods[0] : null;
  return availableMethods.map((method) => {
    const isTopRecommended = method === topRecommended;
    const methodLabel = getInstallMethodLabel(method);
    const title = isTopRecommended ? `${methodLabel} ${ansis.green(`[${i18n.t("installation:recommendedMethod")}]`)}` : methodLabel;
    return {
      title,
      value: method
    };
  });
}
async function selectInstallMethod(codeType, excludeMethods = []) {
  ensureI18nInitialized();
  const codeTypeName = codeType === "claude-code" ? i18n.t("common:claudeCode") : i18n.t("common:codex");
  const recommendedMethods = getRecommendedInstallMethods(codeType);
  const methodOptions = getInstallMethodOptions(codeType, recommendedMethods).filter((option) => !excludeMethods.includes(option.value));
  if (methodOptions.length === 0) {
    console.log(ansis.yellow(i18n.t("installation:noMoreMethods")));
    return null;
  }
  const response = await inquirer.prompt({
    type: "list",
    name: "method",
    message: i18n.t("installation:selectInstallMethod", { codeType: codeTypeName }),
    choices: methodOptions.map((opt) => ({
      name: opt.title,
      value: opt.value
    }))
  });
  return response.method || null;
}
async function executeInstallMethod(method, codeType) {
  ensureI18nInitialized();
  const codeTypeName = codeType === "claude-code" ? i18n.t("common:claudeCode") : i18n.t("common:codex");
  const spinner = ora(i18n.t("installation:installingWith", { method, codeType: codeTypeName })).start();
  try {
    switch (method) {
      case "npm": {
        const packageName = codeType === "claude-code" ? "@anthropic-ai/claude-code" : "@openai/codex";
        const { command, args, usedSudo } = wrapCommandWithSudo("npm", ["install", "-g", packageName, "--force"]);
        if (usedSudo) {
          spinner.info(i18n.t("installation:usingSudo"));
          spinner.start();
        }
        await exec(command, args);
        await setInstallMethod("npm", codeType);
        break;
      }
      case "homebrew": {
        if (codeType === "claude-code") {
          await exec("brew", ["install", "--cask", "claude-code"]);
        } else {
          await exec("brew", ["install", "--cask", "codex"]);
        }
        await setInstallMethod("homebrew", codeType);
        break;
      }
      case "curl": {
        if (codeType === "claude-code") {
          await exec("bash", ["-c", "curl -fsSL https://claude.ai/install.sh | bash"]);
        } else {
          spinner.stop();
          return await executeInstallMethod("npm", codeType);
        }
        await setInstallMethod("curl", codeType);
        break;
      }
      case "powershell": {
        if (codeType === "claude-code") {
          await exec("powershell", ["-Command", "irm https://claude.ai/install.ps1 | iex"]);
        } else {
          spinner.stop();
          return await executeInstallMethod("npm", codeType);
        }
        await setInstallMethod("powershell", codeType);
        break;
      }
      case "cmd": {
        if (codeType === "claude-code") {
          await exec("cmd", ["/c", "curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd"]);
        } else {
          spinner.stop();
          return await executeInstallMethod("npm", codeType);
        }
        await setInstallMethod("cmd", codeType);
        break;
      }
      default:
        throw new Error(`Unsupported install method: ${method}`);
    }
    spinner.succeed(i18n.t("installation:installMethodSuccess", { method }));
    const verification = await verifyInstallation(codeType);
    displayVerificationResult(verification, codeType);
    return true;
  } catch (error) {
    spinner.fail(i18n.t("installation:installMethodFailed", { method }));
    if (error instanceof Error) {
      console.error(ansis.gray(error.message));
    }
    return false;
  }
}
async function handleInstallFailure(codeType, failedMethods) {
  ensureI18nInitialized();
  const response = await inquirer.prompt({
    type: "confirm",
    name: "retry",
    message: i18n.t("installation:tryAnotherMethod"),
    default: true
  });
  if (!response.retry) {
    return false;
  }
  const newMethod = await selectInstallMethod(codeType, failedMethods);
  if (!newMethod) {
    return false;
  }
  const success = await executeInstallMethod(newMethod, codeType);
  if (success) {
    return true;
  }
  return await handleInstallFailure(codeType, [...failedMethods, newMethod]);
}
async function isCommandInPath(command) {
  try {
    const cmd = getPlatform() === "windows" ? "where" : "which";
    const res = await exec(cmd, [command]);
    return res.exitCode === 0;
  } catch {
    return false;
  }
}
async function verifyInstallation(codeType) {
  const command = codeType === "claude-code" ? "claude" : "codex";
  const commandInPath = await isCommandInPath(command);
  if (commandInPath) {
    const version = await detectInstalledVersion(codeType);
    return {
      success: true,
      commandPath: await findCommandPath(command),
      version,
      needsSymlink: false,
      symlinkCreated: false
    };
  }
  if (getPlatform() === "macos") {
    const homebrewPaths = await getHomebrewCommandPaths(command);
    let foundPath = null;
    for (const path of homebrewPaths) {
      if (exists(path)) {
        foundPath = path;
        break;
      }
    }
    if (foundPath) {
      const symlinkResult = await createHomebrewSymlink(command, foundPath);
      if (symlinkResult.success) {
        const version = await detectInstalledVersion(codeType);
        return {
          success: true,
          commandPath: symlinkResult.symlinkPath,
          version,
          needsSymlink: true,
          symlinkCreated: true
        };
      }
      return {
        success: false,
        commandPath: foundPath,
        version: null,
        needsSymlink: true,
        symlinkCreated: false,
        error: symlinkResult.error
      };
    }
  }
  if (isTermux()) {
    const termuxPrefix = getTermuxPrefix();
    const termuxPaths = [
      `${termuxPrefix}/bin/${command}`,
      `${termuxPrefix}/usr/bin/${command}`
    ];
    for (const path of termuxPaths) {
      if (exists(path)) {
        const version = await detectInstalledVersion(codeType);
        return {
          success: true,
          commandPath: path,
          version,
          needsSymlink: false,
          symlinkCreated: false
        };
      }
    }
  }
  if (getPlatform() === "linux") {
    const home = homedir();
    const linuxPaths = [
      `${home}/.local/bin/${command}`,
      // Standard XDG user bin (curl install default)
      `${home}/.claude/bin/${command}`,
      // Claude-specific bin directory
      `/usr/local/bin/${command}`,
      // System-wide installation
      `/usr/bin/${command}`
      // System package manager
    ];
    for (const path of linuxPaths) {
      if (exists(path)) {
        const version = await detectInstalledVersion(codeType);
        const needsPathUpdate = path.includes(".local/bin") && !process__default.env.PATH?.includes(".local/bin");
        return {
          success: true,
          commandPath: path,
          version,
          needsSymlink: false,
          symlinkCreated: false,
          error: needsPathUpdate ? "PATH_UPDATE_NEEDED" : void 0
        };
      }
    }
  }
  return {
    success: false,
    commandPath: null,
    version: null,
    needsSymlink: false,
    symlinkCreated: false,
    error: "Command not found in any known location"
  };
}
async function createHomebrewSymlink(command, sourcePath) {
  const homebrewBinPaths = [
    "/opt/homebrew/bin",
    // Apple Silicon (M1/M2)
    "/usr/local/bin"
    // Intel Mac
  ];
  let targetDir = null;
  for (const binPath of homebrewBinPaths) {
    if (fs.existsSync(binPath)) {
      targetDir = binPath;
      break;
    }
  }
  if (!targetDir) {
    return {
      success: false,
      symlinkPath: null,
      error: "No suitable Homebrew bin directory found"
    };
  }
  const symlinkPath = join(targetDir, command);
  try {
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink()) {
      const existingTarget = fs.readlinkSync(symlinkPath);
      if (existingTarget === sourcePath) {
        return {
          success: true,
          symlinkPath
        };
      }
      fs.unlinkSync(symlinkPath);
    } else {
      return {
        success: false,
        symlinkPath: null,
        error: `File already exists at ${symlinkPath} and is not a symlink`
      };
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      return {
        success: false,
        symlinkPath: null,
        error: `Failed to check existing file: ${error}`
      };
    }
  }
  try {
    fs.symlinkSync(sourcePath, symlinkPath);
    return {
      success: true,
      symlinkPath
    };
  } catch (error) {
    if (error.code === "EACCES") {
      return {
        success: false,
        symlinkPath: null,
        error: `Permission denied. Try running: sudo ln -sf ${sourcePath} ${symlinkPath}`
      };
    }
    return {
      success: false,
      symlinkPath: null,
      error: `Failed to create symlink: ${error.message}`
    };
  }
}
function displayVerificationResult(result, codeType) {
  ensureI18nInitialized();
  const codeTypeName = codeType === "claude-code" ? i18n.t("common:claudeCode") : i18n.t("common:codex");
  if (result.success) {
    if (result.symlinkCreated) {
      console.log(ansis.green(`\u2714 ${codeTypeName} ${i18n.t("installation:verificationSuccess")}`));
      console.log(ansis.gray(`  ${i18n.t("installation:symlinkCreated", { path: result.commandPath })}`));
    } else if (result.commandPath) {
      console.log(ansis.green(`\u2714 ${codeTypeName} ${i18n.t("installation:verificationSuccess")}`));
      console.log(ansis.gray(`  ${i18n.t("installation:foundAtPath", { path: result.commandPath })}`));
    }
    if (result.version) {
      console.log(ansis.gray(`  ${i18n.t("installation:detectedVersion", { version: result.version })}`));
    }
    if (result.error === "PATH_UPDATE_NEEDED") {
      console.log(ansis.yellow(`
\u26A0 ${i18n.t("installation:pathUpdateNeeded")}`));
      console.log(ansis.gray(`  ${i18n.t("installation:pathUpdateHint")}`));
      console.log(ansis.green(`  export PATH="$HOME/.local/bin:$PATH"`));
      console.log(ansis.gray(`  ${i18n.t("installation:pathUpdatePermanent")}`));
      console.log(ansis.green(`  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc`));
    }
  } else {
    console.log(ansis.yellow(`\u26A0 ${codeTypeName} ${i18n.t("installation:verificationFailed")}`));
    if (result.commandPath) {
      console.log(ansis.gray(`  ${i18n.t("installation:foundAtPath", { path: result.commandPath })}`));
    }
    if (result.error && result.error !== "PATH_UPDATE_NEEDED") {
      console.log(ansis.gray(`  ${result.error}`));
    }
    if (result.needsSymlink && !result.symlinkCreated) {
      console.log(ansis.yellow(`  ${i18n.t("installation:manualSymlinkHint")}`));
    }
  }
}

export { createHomebrewSymlink, detectInstalledVersion, displayVerificationResult, executeInstallMethod, getInstallationStatus, handleInstallFailure, installClaudeCode, installCodex, isClaudeCodeInstalled, isCodexInstalled, selectInstallMethod, setInstallMethod, uninstallCodeTool, verifyInstallation };
