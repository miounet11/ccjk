import { existsSync, readdirSync, statSync } from 'node:fs';
import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { join, dirname } from 'pathe';
import { CODE_TOOL_BANNERS, CLAUDE_DIR, isCodeToolType, DEFAULT_CODE_TOOL_TYPE } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { d as displayBannerWithInfo } from '../shared/ccjk.BpHTUkb8.mjs';
import { updateZcfConfig, readZcfConfig } from './ccjk-config.mjs';
import { r as runCodexUpdate, m as runCodexUninstall, n as configureCodexMcp, o as configureCodexApi, p as runCodexWorkflowImportWithLanguageSelection, k as runCodexFullInit } from './codex.mjs';
import { r as resolveCodeType } from '../shared/ccjk.SIo9I8q3.mjs';
import { h as handleExitPromptError, a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
import { changeScriptLanguageFeature, configureCodexAiMemoryFeature, configureCodexDefaultModelFeature, configureEnvPermissionFeature, configureAiMemoryFeature, configureDefaultModelFeature, configureMcpFeature, configureApiFeature } from './features.mjs';
import { c as checkForUpdates, a as getInstalledPackages, s as searchPackages } from '../shared/ccjk.DcXM9drZ.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import { isSmartGuideInstalled, generateSkillReferenceCard, removeSmartGuide, injectSmartGuide, generateQuickActionsPanel, QUICK_ACTIONS } from './smart-guide.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import { executeCcusage } from './ccu.mjs';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { C as COMETIX_COMMAND_NAME, b as COMETIX_COMMANDS, c as installCometixLine, i as isCcrInstalled, a as installCcr, d as init, e as checkSuperpowersInstalled, g as getSuperpowersSkills, u as updateSuperpowers, f as uninstallSuperpowers, h as installSuperpowers, j as installSuperpowersViaGit } from './init.mjs';
import { homedir } from 'node:os';
import { runCcrStop, runCcrStart, runCcrRestart, runCcrStatus, runCcrUi } from './commands.mjs';
import { readCcrConfig, configureCcrFeature } from './config3.mjs';
import { checkUpdates } from './check-updates.mjs';
import { configSwitchCommand } from './config-switch.mjs';
import { readFile, writeFileAtomic, ensureDir, exists, readJsonFile } from './fs-operations.mjs';
import { doctor, workspaceDiagnostics } from './doctor.mjs';
import { a as mcpList, c as mcpUninstall, m as mcpInstall, d as mcpTrending, b as mcpSearch } from '../shared/ccjk.DzcJpOoy.mjs';
import { notificationCommand } from './notification.mjs';
import { uninstall } from './uninstall.mjs';
import { update } from './update.mjs';

const execAsync = promisify(exec);
async function runCometixPrintConfig() {
  ensureI18nInitialized();
  try {
    console.log(ansis.green(`${i18n.t("cometix:printingConfig")}`));
    const { stdout } = await execAsync(COMETIX_COMMANDS.PRINT_CONFIG);
    console.log(stdout);
  } catch (error) {
    if (error.message.includes(`command not found: ${COMETIX_COMMAND_NAME}`)) {
      console.error(ansis.red(`\u2717 ${i18n.t("cometix:commandNotFound")}`));
    } else {
      console.error(ansis.red(`\u2717 ${i18n.t("cometix:printConfigFailed")}: ${error}`));
    }
    throw error;
  }
}
async function runCometixTuiConfig() {
  ensureI18nInitialized();
  return new Promise((resolve, reject) => {
    console.log(ansis.green(`${i18n.t("cometix:enteringTuiConfig")}`));
    const child = spawn(COMETIX_COMMAND_NAME, ["-c"], {
      stdio: "inherit",
      // This allows the TUI to interact directly with the terminal
      shell: true
    });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(ansis.green(`\u2713 ${i18n.t("cometix:tuiConfigSuccess")}`));
        resolve();
      } else {
        const error = new Error(`${COMETIX_COMMAND_NAME} -c exited with code ${code}`);
        console.error(ansis.red(`\u2717 ${i18n.t("cometix:tuiConfigFailed")}: ${error.message}`));
        reject(error);
      }
    });
    child.on("error", (error) => {
      if (error.message.includes(`command not found`) || error.message.includes("ENOENT")) {
        console.error(ansis.red(`\u2717 ${i18n.t("cometix:commandNotFound")}`));
      } else {
        console.error(ansis.red(`\u2717 ${i18n.t("cometix:tuiConfigFailed")}: ${error.message}`));
      }
      reject(error);
    });
  });
}

async function showCometixMenu() {
  try {
    ensureI18nInitialized();
    console.log(`
${ansis.green("\u2550".repeat(50))}`);
    console.log(ansis.bold.cyan(`  ${i18n.t("cometix:cometixMenuTitle")}`));
    console.log(`${ansis.green("\u2550".repeat(50))}
`);
    console.log(`  ${ansis.green("1.")} ${i18n.t("cometix:cometixMenuOptions.installOrUpdate")} ${ansis.gray(`- ${i18n.t("cometix:cometixMenuDescriptions.installOrUpdate")}`)}`);
    console.log(`  ${ansis.green("2.")} ${i18n.t("cometix:cometixMenuOptions.printConfig")} ${ansis.gray(`- ${i18n.t("cometix:cometixMenuDescriptions.printConfig")}`)}`);
    console.log(`  ${ansis.green("3.")} ${i18n.t("cometix:cometixMenuOptions.customConfig")} ${ansis.gray(`- ${i18n.t("cometix:cometixMenuDescriptions.customConfig")}`)}`);
    console.log(`  ${ansis.yellow("0.")} ${i18n.t("cometix:cometixMenuOptions.back")}`);
    console.log("");
    const { choice } = await inquirer.prompt({
      type: "input",
      name: "choice",
      message: i18n.t("common:enterChoice"),
      validate: async (value) => {
        const valid = ["1", "2", "3", "0"];
        return valid.includes(value) || i18n.t("common:invalidChoice");
      }
    });
    switch (choice) {
      case "1":
        await installCometixLine();
        break;
      case "2":
        await runCometixPrintConfig();
        break;
      case "3":
        await runCometixTuiConfig();
        break;
      case "0":
        return false;
    }
    if (choice !== "0") {
      console.log(`
${ansis.dim("\u2500".repeat(50))}
`);
      const continueInCometix = await promptBoolean({
        message: i18n.t("common:returnToMenu"),
        defaultValue: true
      });
      if (continueInCometix) {
        return await showCometixMenu();
      }
    }
    return false;
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
    return false;
  }
}

function isCcrConfigured() {
  const CCR_CONFIG_FILE = join(homedir(), ".claude-code-router", "config.json");
  if (!existsSync(CCR_CONFIG_FILE)) {
    return false;
  }
  const config = readCcrConfig();
  return config !== null;
}
async function showCcrMenu() {
  try {
    ensureI18nInitialized();
    console.log(`
${ansis.green("\u2550".repeat(50))}`);
    console.log(ansis.bold.cyan(`  ${i18n.t("ccr:ccrMenuTitle")}`));
    console.log(`${ansis.green("\u2550".repeat(50))}
`);
    console.log(`  ${ansis.green("1.")} ${i18n.t("ccr:ccrMenuOptions.initCcr")} ${ansis.gray(`- ${i18n.t("ccr:ccrMenuDescriptions.initCcr")}`)}`);
    console.log(`  ${ansis.green("2.")} ${i18n.t("ccr:ccrMenuOptions.startUi")} ${ansis.gray(`- ${i18n.t("ccr:ccrMenuDescriptions.startUi")}`)}`);
    console.log(`  ${ansis.green("3.")} ${i18n.t("ccr:ccrMenuOptions.checkStatus")} ${ansis.gray(`- ${i18n.t("ccr:ccrMenuDescriptions.checkStatus")}`)}`);
    console.log(`  ${ansis.green("4.")} ${i18n.t("ccr:ccrMenuOptions.restart")} ${ansis.gray(`- ${i18n.t("ccr:ccrMenuDescriptions.restart")}`)}`);
    console.log(`  ${ansis.green("5.")} ${i18n.t("ccr:ccrMenuOptions.start")} ${ansis.gray(`- ${i18n.t("ccr:ccrMenuDescriptions.start")}`)}`);
    console.log(`  ${ansis.green("6.")} ${i18n.t("ccr:ccrMenuOptions.stop")} ${ansis.gray(`- ${i18n.t("ccr:ccrMenuDescriptions.stop")}`)}`);
    console.log(`  ${ansis.yellow("0.")} ${i18n.t("ccr:ccrMenuOptions.back")}`);
    console.log("");
    const { choice } = await inquirer.prompt({
      type: "input",
      name: "choice",
      message: i18n.t("common:enterChoice"),
      validate: (value) => {
        const valid = ["1", "2", "3", "4", "5", "6", "0"];
        return valid.includes(value) || i18n.t("common:invalidChoice");
      }
    });
    switch (choice) {
      case "1": {
        const ccrStatus = await isCcrInstalled();
        if (!ccrStatus.hasCorrectPackage) {
          await installCcr();
        } else {
          console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrAlreadyInstalled")}`));
        }
        await configureCcrFeature();
        console.log(ansis.green(`
\u2714 ${i18n.t("ccr:ccrSetupComplete")}`));
        break;
      }
      case "2":
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`
\u26A0\uFE0F  ${i18n.t("ccr:ccrNotConfigured")}`));
          console.log(ansis.green(`   ${i18n.t("ccr:pleaseInitFirst")}
`));
        } else {
          const config = readCcrConfig();
          await runCcrUi(config?.APIKEY);
        }
        break;
      case "3":
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`
\u26A0\uFE0F  ${i18n.t("ccr:ccrNotConfigured")}`));
          console.log(ansis.green(`   ${i18n.t("ccr:pleaseInitFirst")}
`));
        } else {
          await runCcrStatus();
        }
        break;
      case "4":
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`
\u26A0\uFE0F  ${i18n.t("ccr:ccrNotConfigured")}`));
          console.log(ansis.green(`   ${i18n.t("ccr:pleaseInitFirst")}
`));
        } else {
          await runCcrRestart();
        }
        break;
      case "5":
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`
\u26A0\uFE0F  ${i18n.t("ccr:ccrNotConfigured")}`));
          console.log(ansis.green(`   ${i18n.t("ccr:pleaseInitFirst")}
`));
        } else {
          await runCcrStart();
        }
        break;
      case "6":
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`
\u26A0\uFE0F  ${i18n.t("ccr:ccrNotConfigured")}`));
          console.log(ansis.green(`   ${i18n.t("ccr:pleaseInitFirst")}
`));
        } else {
          await runCcrStop();
        }
        break;
      case "0":
        return false;
    }
    if (choice !== "0") {
      console.log(`
${ansis.dim("\u2500".repeat(50))}
`);
      const continueInCcr = await promptBoolean({
        message: i18n.t("common:returnToMenu"),
        defaultValue: true
      });
      if (continueInCcr) {
        return await showCcrMenu();
      }
    }
    return false;
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
    return false;
  }
}

async function runCcusageFeature() {
  ensureI18nInitialized();
  console.log("");
  console.log(ansis.green(i18n.t("menu:menuOptions.ccusage")));
  console.log(ansis.gray(`${i18n.t("tools:ccusageDescription")}`));
  console.log("");
  const choices = [
    { name: i18n.t("tools:ccusageModes.daily"), value: "daily" },
    { name: i18n.t("tools:ccusageModes.monthly"), value: "monthly" },
    { name: i18n.t("tools:ccusageModes.session"), value: "session" },
    { name: i18n.t("tools:ccusageModes.blocks"), value: "blocks" },
    { name: i18n.t("tools:ccusageModes.custom"), value: "custom" },
    { name: i18n.t("common:back"), value: "back" }
  ];
  const { mode } = await inquirer.prompt({
    type: "list",
    name: "mode",
    message: i18n.t("tools:selectAnalysisMode"),
    choices: addNumbersToChoices(choices)
  });
  if (mode === "back") {
    return;
  }
  let args = [];
  if (mode === "custom") {
    const { customArgs } = await inquirer.prompt({
      type: "input",
      name: "customArgs",
      message: i18n.t("tools:enterCustomArgs"),
      default: ""
    });
    if (customArgs === null || customArgs === void 0 || customArgs === "") {
      args = [];
    } else {
      const argsString = String(customArgs).trim();
      if (!argsString) {
        args = [];
      } else {
        const argPattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
        const matches = [];
        let match = argPattern.exec(argsString);
        while (match !== null) {
          const value = match[1] || match[2] || match[3];
          if (value) {
            matches.push(value);
          }
          match = argPattern.exec(argsString);
        }
        args = matches;
      }
    }
  } else {
    args = [mode];
  }
  console.log("");
  await executeCcusage(args);
  console.log("");
  await inquirer.prompt({
    type: "input",
    name: "continue",
    message: ansis.gray(i18n.t("tools:pressEnterToContinue"))
  });
}
async function runCcrMenuFeature() {
  await showCcrMenu();
}
async function runCometixMenuFeature() {
  await showCometixMenu();
}

function detectProjectContext(projectPath = process__default.cwd()) {
  const context = {
    type: "unknown",
    language: "unknown",
    hasTests: false,
    hasDocker: false,
    hasCi: false,
    monorepo: false,
    detectedPatterns: []
  };
  if (!existsSync(projectPath)) {
    return context;
  }
  const files = safeReadDir(projectPath);
  if (files.includes("package.json")) {
    context.type = "nodejs";
    context.language = files.includes("tsconfig.json") ? "typescript" : "javascript";
    context.detectedPatterns.push("package.json");
    if (files.includes("pnpm-lock.yaml")) {
      context.packageManager = "pnpm";
    } else if (files.includes("yarn.lock")) {
      context.packageManager = "yarn";
    } else if (files.includes("bun.lockb")) {
      context.packageManager = "bun";
    } else if (files.includes("package-lock.json")) {
      context.packageManager = "npm";
    }
    const packageJson = readPackageJson(projectPath);
    if (packageJson) {
      context.framework = detectNodeFramework(packageJson);
    }
    if (files.includes("pnpm-workspace.yaml") || files.includes("lerna.json")) {
      context.monorepo = true;
      context.detectedPatterns.push("monorepo");
    }
  }
  if (files.includes("pyproject.toml") || files.includes("setup.py") || files.includes("requirements.txt")) {
    context.type = "python";
    context.language = "python";
    context.detectedPatterns.push(files.includes("pyproject.toml") ? "pyproject.toml" : "requirements.txt");
    if (files.includes("poetry.lock")) {
      context.packageManager = "poetry";
    } else if (files.includes("Pipfile.lock")) {
      context.packageManager = "pipenv";
    } else if (files.includes("uv.lock")) {
      context.packageManager = "uv";
    }
    context.framework = detectPythonFramework(projectPath);
  }
  if (files.includes("Cargo.toml")) {
    context.type = "rust";
    context.language = "rust";
    context.packageManager = "cargo";
    context.detectedPatterns.push("Cargo.toml");
    const cargoContent = readFile(join(projectPath, "Cargo.toml"));
    if (cargoContent?.includes("[workspace]")) {
      context.monorepo = true;
      context.detectedPatterns.push("cargo-workspace");
    }
  }
  if (files.includes("go.mod")) {
    context.type = "go";
    context.language = "go";
    context.packageManager = "go";
    context.detectedPatterns.push("go.mod");
  }
  if (files.includes("pom.xml") || files.includes("build.gradle") || files.includes("build.gradle.kts")) {
    context.type = "java";
    context.language = "java";
    context.packageManager = files.includes("pom.xml") ? "maven" : "gradle";
    context.detectedPatterns.push(files.includes("pom.xml") ? "pom.xml" : "build.gradle");
  }
  if (files.some((f) => f.endsWith(".csproj") || f.endsWith(".fsproj") || f.endsWith(".sln"))) {
    context.type = "dotnet";
    context.language = files.some((f) => f.endsWith(".fsproj")) ? "fsharp" : "csharp";
    context.packageManager = "dotnet";
    context.detectedPatterns.push(".NET project");
  }
  if (files.includes("Gemfile")) {
    context.type = "ruby";
    context.language = "ruby";
    context.packageManager = "bundler";
    context.detectedPatterns.push("Gemfile");
    if (files.includes("config") && existsSync(join(projectPath, "config", "routes.rb"))) {
      context.framework = "rails";
    }
  }
  if (files.includes("composer.json")) {
    context.type = "php";
    context.language = "php";
    context.packageManager = "composer";
    context.detectedPatterns.push("composer.json");
    if (files.includes("artisan")) {
      context.framework = "laravel";
    }
  }
  context.hasDocker = files.includes("Dockerfile") || files.includes("docker-compose.yml") || files.includes("docker-compose.yaml");
  context.hasCi = files.includes(".github") || files.includes(".gitlab-ci.yml") || files.includes(".circleci");
  context.hasTests = files.includes("tests") || files.includes("test") || files.includes("__tests__") || files.includes("spec");
  if (context.hasDocker)
    context.detectedPatterns.push("docker");
  if (context.hasCi)
    context.detectedPatterns.push("ci/cd");
  if (context.hasTests)
    context.detectedPatterns.push("tests");
  return context;
}
function safeReadDir(dirPath) {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}
function readPackageJson(projectPath) {
  try {
    const content = readFile(join(projectPath, "package.json"));
    if (content) {
      return JSON.parse(content);
    }
  } catch {
  }
  return null;
}
function detectNodeFramework(packageJson) {
  const deps = {
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {}
  };
  if (deps.next)
    return "nextjs";
  if (deps.nuxt)
    return "nuxt";
  if (deps["@angular/core"])
    return "angular";
  if (deps.vue)
    return "vue";
  if (deps.react)
    return "react";
  if (deps.svelte)
    return "svelte";
  if (deps.express)
    return "express";
  if (deps.fastify)
    return "fastify";
  if (deps.nestjs || deps["@nestjs/core"])
    return "nestjs";
  if (deps.hono)
    return "hono";
  if (deps.elysia)
    return "elysia";
  return void 0;
}
function detectPythonFramework(projectPath) {
  const files = safeReadDir(projectPath);
  if (files.includes("manage.py"))
    return "django";
  if (files.includes("app.py") || files.includes("main.py")) {
    const content = readFile(join(projectPath, files.includes("app.py") ? "app.py" : "main.py"));
    if (content) {
      if (content.includes("FastAPI"))
        return "fastapi";
      if (content.includes("Flask"))
        return "flask";
    }
  }
  return void 0;
}
function getContextRules() {
  return [
    // Coding Style Rules
    {
      id: "prefer-functional",
      name: "Prefer Functional Style",
      nameZh: "\u4F18\u5148\u51FD\u6570\u5F0F\u98CE\u683C",
      description: "Prefer functional programming patterns over imperative",
      descriptionZh: "\u4F18\u5148\u4F7F\u7528\u51FD\u6570\u5F0F\u7F16\u7A0B\u6A21\u5F0F\u800C\u975E\u547D\u4EE4\u5F0F",
      content: `## Coding Style
- Prefer functional programming patterns (map, filter, reduce) over imperative loops
- Use pure functions where possible
- Avoid side effects in functions`,
      contentZh: `## \u7F16\u7801\u98CE\u683C
- \u4F18\u5148\u4F7F\u7528\u51FD\u6570\u5F0F\u7F16\u7A0B\u6A21\u5F0F\uFF08map\u3001filter\u3001reduce\uFF09\u800C\u975E\u547D\u4EE4\u5F0F\u5FAA\u73AF
- \u5C3D\u53EF\u80FD\u4F7F\u7528\u7EAF\u51FD\u6570
- \u907F\u514D\u51FD\u6570\u4E2D\u7684\u526F\u4F5C\u7528`,
      category: "coding",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    },
    {
      id: "explicit-types",
      name: "Explicit Type Annotations",
      nameZh: "\u663E\u5F0F\u7C7B\u578B\u6CE8\u89E3",
      description: "Always use explicit type annotations",
      descriptionZh: "\u59CB\u7EC8\u4F7F\u7528\u663E\u5F0F\u7C7B\u578B\u6CE8\u89E3",
      content: `## Type Safety
- Always use explicit type annotations for function parameters and return types
- Avoid using 'any' type
- Use strict null checks`,
      contentZh: `## \u7C7B\u578B\u5B89\u5168
- \u59CB\u7EC8\u4E3A\u51FD\u6570\u53C2\u6570\u548C\u8FD4\u56DE\u7C7B\u578B\u4F7F\u7528\u663E\u5F0F\u7C7B\u578B\u6CE8\u89E3
- \u907F\u514D\u4F7F\u7528 'any' \u7C7B\u578B
- \u4F7F\u7528\u4E25\u683C\u7684\u7A7A\u503C\u68C0\u67E5`,
      category: "coding",
      applicableTo: ["nodejs", "python", "rust", "java", "dotnet"]
    },
    {
      id: "error-handling",
      name: "Comprehensive Error Handling",
      nameZh: "\u5168\u9762\u7684\u9519\u8BEF\u5904\u7406",
      description: "Always handle errors explicitly",
      descriptionZh: "\u59CB\u7EC8\u663E\u5F0F\u5904\u7406\u9519\u8BEF",
      content: `## Error Handling
- Always handle errors explicitly, never ignore them
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Log errors with context information`,
      contentZh: `## \u9519\u8BEF\u5904\u7406
- \u59CB\u7EC8\u663E\u5F0F\u5904\u7406\u9519\u8BEF\uFF0C\u4E0D\u8981\u5FFD\u7565
- \u5BF9\u5F02\u6B65\u64CD\u4F5C\u4F7F\u7528 try-catch \u5757
- \u63D0\u4F9B\u6709\u610F\u4E49\u7684\u9519\u8BEF\u6D88\u606F
- \u8BB0\u5F55\u5E26\u6709\u4E0A\u4E0B\u6587\u4FE1\u606F\u7684\u9519\u8BEF`,
      category: "coding",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    },
    // Testing Rules
    {
      id: "test-first",
      name: "Test-First Development",
      nameZh: "\u6D4B\u8BD5\u4F18\u5148\u5F00\u53D1",
      description: "Write tests before implementation",
      descriptionZh: "\u5728\u5B9E\u73B0\u4E4B\u524D\u7F16\u5199\u6D4B\u8BD5",
      content: `## Testing
- Write tests before implementing features (TDD)
- Each function should have corresponding unit tests
- Use descriptive test names that explain the expected behavior`,
      contentZh: `## \u6D4B\u8BD5
- \u5728\u5B9E\u73B0\u529F\u80FD\u4E4B\u524D\u7F16\u5199\u6D4B\u8BD5\uFF08TDD\uFF09
- \u6BCF\u4E2A\u51FD\u6570\u90FD\u5E94\u6709\u5BF9\u5E94\u7684\u5355\u5143\u6D4B\u8BD5
- \u4F7F\u7528\u63CF\u8FF0\u6027\u7684\u6D4B\u8BD5\u540D\u79F0\u6765\u89E3\u91CA\u9884\u671F\u884C\u4E3A`,
      category: "testing",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    },
    {
      id: "high-coverage",
      name: "High Test Coverage",
      nameZh: "\u9AD8\u6D4B\u8BD5\u8986\u76D6\u7387",
      description: "Maintain high test coverage",
      descriptionZh: "\u4FDD\u6301\u9AD8\u6D4B\u8BD5\u8986\u76D6\u7387",
      content: `## Test Coverage
- Maintain at least 80% code coverage
- Cover edge cases and error scenarios
- Include integration tests for critical paths`,
      contentZh: `## \u6D4B\u8BD5\u8986\u76D6\u7387
- \u4FDD\u6301\u81F3\u5C11 80% \u7684\u4EE3\u7801\u8986\u76D6\u7387
- \u8986\u76D6\u8FB9\u754C\u60C5\u51B5\u548C\u9519\u8BEF\u573A\u666F
- \u4E3A\u5173\u952E\u8DEF\u5F84\u5305\u542B\u96C6\u6210\u6D4B\u8BD5`,
      category: "testing",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    },
    // Documentation Rules
    {
      id: "doc-comments",
      name: "Documentation Comments",
      nameZh: "\u6587\u6863\u6CE8\u91CA",
      description: "Add documentation comments to all public APIs",
      descriptionZh: "\u4E3A\u6240\u6709\u516C\u5171 API \u6DFB\u52A0\u6587\u6863\u6CE8\u91CA",
      content: `## Documentation
- Add JSDoc/docstring comments to all public functions and classes
- Include parameter descriptions and return value documentation
- Add usage examples for complex functions`,
      contentZh: `## \u6587\u6863
- \u4E3A\u6240\u6709\u516C\u5171\u51FD\u6570\u548C\u7C7B\u6DFB\u52A0 JSDoc/docstring \u6CE8\u91CA
- \u5305\u542B\u53C2\u6570\u63CF\u8FF0\u548C\u8FD4\u56DE\u503C\u6587\u6863
- \u4E3A\u590D\u6742\u51FD\u6570\u6DFB\u52A0\u4F7F\u7528\u793A\u4F8B`,
      category: "docs",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    },
    // Workflow Rules
    {
      id: "conventional-commits",
      name: "Conventional Commits",
      nameZh: "\u7EA6\u5B9A\u5F0F\u63D0\u4EA4",
      description: "Use conventional commit messages",
      descriptionZh: "\u4F7F\u7528\u7EA6\u5B9A\u5F0F\u63D0\u4EA4\u6D88\u606F",
      content: `## Git Workflow
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep commits atomic and focused`,
      contentZh: `## Git \u5DE5\u4F5C\u6D41
- \u4F7F\u7528\u7EA6\u5B9A\u5F0F\u63D0\u4EA4\u683C\u5F0F\uFF1Atype(scope): description
- \u7C7B\u578B\uFF1Afeat\u3001fix\u3001docs\u3001style\u3001refactor\u3001test\u3001chore
- \u4FDD\u6301\u63D0\u4EA4\u539F\u5B50\u5316\u548C\u4E13\u6CE8`,
      category: "workflow",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    },
    {
      id: "pr-guidelines",
      name: "PR Guidelines",
      nameZh: "PR \u6307\u5357",
      description: "Follow PR best practices",
      descriptionZh: "\u9075\u5FAA PR \u6700\u4F73\u5B9E\u8DF5",
      content: `## Pull Requests
- Keep PRs small and focused (< 400 lines)
- Include clear description of changes
- Add screenshots for UI changes
- Request reviews from relevant team members`,
      contentZh: `## Pull Requests
- \u4FDD\u6301 PR \u5C0F\u800C\u4E13\u6CE8\uFF08< 400 \u884C\uFF09
- \u5305\u542B\u6E05\u6670\u7684\u53D8\u66F4\u63CF\u8FF0
- \u4E3A UI \u53D8\u66F4\u6DFB\u52A0\u622A\u56FE
- \u5411\u76F8\u5173\u56E2\u961F\u6210\u5458\u8BF7\u6C42\u5BA1\u67E5`,
      category: "workflow",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    },
    // Security Rules
    {
      id: "security-basics",
      name: "Security Best Practices",
      nameZh: "\u5B89\u5168\u6700\u4F73\u5B9E\u8DF5",
      description: "Follow security best practices",
      descriptionZh: "\u9075\u5FAA\u5B89\u5168\u6700\u4F73\u5B9E\u8DF5",
      content: `## Security
- Never commit secrets or credentials
- Validate and sanitize all user inputs
- Use parameterized queries for database operations
- Keep dependencies updated`,
      contentZh: `## \u5B89\u5168
- \u6C38\u8FDC\u4E0D\u8981\u63D0\u4EA4\u5BC6\u94A5\u6216\u51ED\u8BC1
- \u9A8C\u8BC1\u548C\u6E05\u7406\u6240\u6709\u7528\u6237\u8F93\u5165
- \u5BF9\u6570\u636E\u5E93\u64CD\u4F5C\u4F7F\u7528\u53C2\u6570\u5316\u67E5\u8BE2
- \u4FDD\u6301\u4F9D\u8D56\u9879\u66F4\u65B0`,
      category: "security",
      applicableTo: ["nodejs", "python", "rust", "go", "java", "dotnet", "ruby", "php", "unknown"]
    }
  ];
}
function getApplicableRules(projectType) {
  return getContextRules().filter(
    (rule) => rule.applicableTo.includes(projectType) || rule.applicableTo.includes("unknown")
  );
}
function getContextFiles(projectPath = process__default.cwd()) {
  const home = homedir();
  const files = [];
  const globalPath = join(home, ".claude", "CLAUDE.md");
  files.push({
    path: globalPath,
    type: "global",
    exists: existsSync(globalPath),
    ...getFileStats(globalPath)
  });
  const projectClaudeMd = join(projectPath, "CLAUDE.md");
  files.push({
    path: projectClaudeMd,
    type: "project",
    exists: existsSync(projectClaudeMd),
    ...getFileStats(projectClaudeMd)
  });
  const localPath = join(projectPath, ".claude", "CLAUDE.md");
  files.push({
    path: localPath,
    type: "local",
    exists: existsSync(localPath),
    ...getFileStats(localPath)
  });
  return files;
}
function getFileStats(filePath) {
  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime
      };
    }
  } catch {
  }
  return {};
}
function readContextFile(filePath) {
  return readFile(filePath);
}
async function writeContextFile(filePath, content) {
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(dir, { recursive: true });
    }
    await writeFileAtomic(filePath, content);
    return true;
  } catch {
    return false;
  }
}
function generateContextContent(context, selectedRules, lang = "en") {
  const isZh = lang === "zh-CN";
  const rules = getContextRules().filter((r) => selectedRules.includes(r.id));
  const lines = [];
  lines.push(isZh ? "# \u9879\u76EE\u89C4\u5219" : "# Project Rules");
  lines.push("");
  lines.push(isZh ? "## \u9879\u76EE\u4FE1\u606F" : "## Project Information");
  lines.push(`- ${isZh ? "\u7C7B\u578B" : "Type"}: ${context.type}`);
  lines.push(`- ${isZh ? "\u8BED\u8A00" : "Language"}: ${context.language}`);
  if (context.framework) {
    lines.push(`- ${isZh ? "\u6846\u67B6" : "Framework"}: ${context.framework}`);
  }
  if (context.packageManager) {
    lines.push(`- ${isZh ? "\u5305\u7BA1\u7406\u5668" : "Package Manager"}: ${context.packageManager}`);
  }
  lines.push("");
  for (const rule of rules) {
    lines.push(isZh ? rule.contentZh : rule.content);
    lines.push("");
  }
  lines.push("---");
  lines.push(isZh ? `*\u7531 CCJK \u81EA\u52A8\u751F\u6210\u4E8E ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}*` : `*Auto-generated by CCJK on ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}*`);
  return lines.join("\n");
}
function getRecommendedRules(context) {
  const recommended = [];
  recommended.push("error-handling", "security-basics");
  if (["nodejs", "python", "rust", "java", "dotnet"].includes(context.type)) {
    if (context.language === "typescript" || context.type === "rust" || context.type === "java") {
      recommended.push("explicit-types");
    }
  }
  if (context.hasTests) {
    recommended.push("test-first", "high-coverage");
  }
  if (context.hasCi) {
    recommended.push("conventional-commits", "pr-guidelines");
  }
  recommended.push("doc-comments");
  return recommended;
}
function mergeContextContent(existingContent, newRules, lang = "en") {
  const isZh = lang === "zh-CN";
  const rules = getContextRules().filter((r) => newRules.includes(r.id));
  const existingRuleIds = [];
  for (const rule of getContextRules()) {
    const marker = isZh ? rule.contentZh.split("\n")[0] : rule.content.split("\n")[0];
    if (existingContent.includes(marker)) {
      existingRuleIds.push(rule.id);
    }
  }
  const newRulesToAdd = rules.filter((r) => !existingRuleIds.includes(r.id));
  if (newRulesToAdd.length === 0) {
    return existingContent;
  }
  const footerMarker = "---";
  const footerIndex = existingContent.lastIndexOf(footerMarker);
  let content = existingContent;
  const newContent = newRulesToAdd.map((r) => isZh ? r.contentZh : r.content).join("\n\n");
  if (footerIndex > 0) {
    content = `${existingContent.slice(0, footerIndex) + newContent}

${existingContent.slice(footerIndex)}`;
  } else {
    content = `${existingContent}

${newContent}`;
  }
  return content;
}
function getProjectTypeLabel(type, lang = "en") {
  const labels = {
    nodejs: { en: "Node.js", zh: "Node.js" },
    python: { en: "Python", zh: "Python" },
    rust: { en: "Rust", zh: "Rust" },
    go: { en: "Go", zh: "Go" },
    java: { en: "Java", zh: "Java" },
    dotnet: { en: ".NET", zh: ".NET" },
    ruby: { en: "Ruby", zh: "Ruby" },
    php: { en: "PHP", zh: "PHP" },
    unknown: { en: "Unknown", zh: "\u672A\u77E5" }
  };
  return lang === "zh-CN" ? labels[type].zh : labels[type].en;
}
function getContextFileTypeLabel(type, lang = "en") {
  const labels = {
    global: { en: "Global", zh: "\u5168\u5C40" },
    project: { en: "Project", zh: "\u9879\u76EE" },
    local: { en: "Local", zh: "\u672C\u5730" }
  };
  return lang === "zh-CN" ? labels[type].zh : labels[type].en;
}
function formatFileSize(bytes) {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function showContextMenu() {
  const lang = i18n.language;
  const isZh = lang === "zh-CN";
  console.log(ansis.green.bold(`
\u{1F4CB} ${isZh ? "\u4E0A\u4E0B\u6587\u7BA1\u7406" : "Context Management"}
`));
  const context = detectProjectContext();
  displayProjectInfo(context, lang);
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: isZh ? "\u9009\u62E9\u64CD\u4F5C" : "Select action",
      choices: [
        {
          name: `\u{1F50D} ${isZh ? "\u67E5\u770B\u4E0A\u4E0B\u6587\u6587\u4EF6" : "View Context Files"}`,
          value: "view"
        },
        {
          name: `\u2728 ${isZh ? "\u81EA\u52A8\u751F\u6210\u89C4\u5219" : "Auto-generate Rules"}`,
          value: "generate"
        },
        {
          name: `\u{1F4DD} ${isZh ? "\u6DFB\u52A0\u89C4\u5219" : "Add Rules"}`,
          value: "add"
        },
        {
          name: `\u{1F4D6} ${isZh ? "\u67E5\u770B\u53EF\u7528\u89C4\u5219" : "Browse Available Rules"}`,
          value: "browse"
        },
        {
          name: `\u{1F519} ${isZh ? "\u8FD4\u56DE" : "Back"}`,
          value: "back"
        }
      ]
    }
  ]);
  switch (action) {
    case "view":
      await viewContextFiles(lang);
      break;
    case "generate":
      await generateContextRules(context, lang);
      break;
    case "add":
      await addRulesToContext(context, lang);
      break;
    case "browse":
      await browseRules(context, lang);
      break;
    case "back":
      return;
  }
  if (action !== "back") {
    await showContextMenu();
  }
}
function displayProjectInfo(context, lang) {
  const isZh = lang === "zh-CN";
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log(ansis.bold(isZh ? "\u68C0\u6D4B\u5230\u7684\u9879\u76EE\u4FE1\u606F\uFF1A" : "Detected Project Info:"));
  const typeLabel = getProjectTypeLabel(context.type, lang);
  console.log(`  ${isZh ? "\u7C7B\u578B" : "Type"}: ${ansis.green(typeLabel)}`);
  console.log(`  ${isZh ? "\u8BED\u8A00" : "Language"}: ${ansis.green(context.language)}`);
  if (context.framework) {
    console.log(`  ${isZh ? "\u6846\u67B6" : "Framework"}: ${ansis.green(context.framework)}`);
  }
  if (context.packageManager) {
    console.log(`  ${isZh ? "\u5305\u7BA1\u7406\u5668" : "Package Manager"}: ${ansis.green(context.packageManager)}`);
  }
  const features = [];
  if (context.hasTests)
    features.push(isZh ? "\u6D4B\u8BD5" : "Tests");
  if (context.hasDocker)
    features.push("Docker");
  if (context.hasCi)
    features.push("CI/CD");
  if (context.monorepo)
    features.push("Monorepo");
  if (features.length > 0) {
    console.log(`  ${isZh ? "\u7279\u6027" : "Features"}: ${ansis.green(features.join(", "))}`);
  }
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log("");
}
function displayContextFile(file, lang) {
  const isZh = lang === "zh-CN";
  const typeLabel = getContextFileTypeLabel(file.type, lang);
  const statusIcon = file.exists ? ansis.green("\u2713") : ansis.dim("\u25CB");
  console.log(`  ${statusIcon} ${ansis.bold(typeLabel)}`);
  console.log(`     ${ansis.dim(file.path)}`);
  if (file.exists && file.size !== void 0) {
    const sizeStr = formatFileSize(file.size);
    const dateStr = file.lastModified ? file.lastModified.toLocaleDateString() : isZh ? "\u672A\u77E5" : "Unknown";
    console.log(`     ${ansis.dim(`${sizeStr} | ${isZh ? "\u4FEE\u6539\u4E8E" : "Modified"}: ${dateStr}`)}`);
  } else if (!file.exists) {
    console.log(`     ${ansis.dim(isZh ? "(\u4E0D\u5B58\u5728)" : "(not exists)")}`);
  }
}
async function viewContextFiles(lang) {
  const isZh = lang === "zh-CN";
  const files = getContextFiles();
  console.log(ansis.green.bold(`
\u{1F4C1} ${isZh ? "\u4E0A\u4E0B\u6587\u6587\u4EF6" : "Context Files"}
`));
  for (const file of files) {
    displayContextFile(file, lang);
    console.log("");
  }
  const existingFiles = files.filter((f) => f.exists);
  if (existingFiles.length > 0) {
    const { viewFile } = await inquirer.prompt([
      {
        type: "list",
        name: "viewFile",
        message: isZh ? "\u67E5\u770B\u6587\u4EF6\u5185\u5BB9\uFF1F" : "View file content?",
        choices: [
          ...existingFiles.map((f) => ({
            name: `${getContextFileTypeLabel(f.type, lang)} - ${f.path}`,
            value: f.path
          })),
          {
            name: isZh ? "\u8DF3\u8FC7" : "Skip",
            value: "skip"
          }
        ]
      }
    ]);
    if (viewFile !== "skip") {
      const content = readContextFile(viewFile);
      if (content) {
        console.log(ansis.dim(`
${"\u2500".repeat(50)}`));
        console.log(content);
        console.log(ansis.dim(`${"\u2500".repeat(50)}
`));
      } else {
        console.log(ansis.yellow(isZh ? "\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6\u5185\u5BB9" : "Unable to read file content"));
      }
    }
  }
}
async function generateContextRules(context, lang) {
  const isZh = lang === "zh-CN";
  console.log(ansis.green.bold(`
\u2728 ${isZh ? "\u81EA\u52A8\u751F\u6210\u89C4\u5219" : "Auto-generate Rules"}
`));
  const recommendedIds = getRecommendedRules(context);
  const applicableRules = getApplicableRules(context.type);
  const { selectedRules } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedRules",
      message: isZh ? "\u9009\u62E9\u8981\u5E94\u7528\u7684\u89C4\u5219\uFF08\u63A8\u8350\u89C4\u5219\u5DF2\u9884\u9009\uFF09" : "Select rules to apply (recommended rules pre-selected)",
      choices: applicableRules.map((rule) => ({
        name: `${recommendedIds.includes(rule.id) ? ansis.green("\u2605") : " "} ${isZh ? rule.nameZh : rule.name} - ${ansis.dim(isZh ? rule.descriptionZh : rule.description)}`,
        value: rule.id,
        checked: recommendedIds.includes(rule.id)
      }))
    }
  ]);
  if (selectedRules.length === 0) {
    console.log(ansis.yellow(isZh ? "\u672A\u9009\u62E9\u4EFB\u4F55\u89C4\u5219" : "No rules selected"));
    return;
  }
  const { location } = await inquirer.prompt([
    {
      type: "list",
      name: "location",
      message: isZh ? "\u4FDD\u5B58\u4F4D\u7F6E" : "Save location",
      choices: [
        {
          name: `${isZh ? "\u9879\u76EE\u6839\u76EE\u5F55" : "Project root"} (CLAUDE.md)`,
          value: "project"
        },
        {
          name: `${isZh ? "\u672C\u5730\u76EE\u5F55" : "Local directory"} (.claude/CLAUDE.md)`,
          value: "local"
        },
        {
          name: `${isZh ? "\u5168\u5C40\u76EE\u5F55" : "Global directory"} (~/.claude/CLAUDE.md)`,
          value: "global"
        }
      ],
      default: "project"
    }
  ]);
  const files = getContextFiles();
  const targetFile = files.find((f) => f.type === location);
  if (!targetFile) {
    console.log(ansis.red(isZh ? "\u65E0\u6CD5\u786E\u5B9A\u76EE\u6807\u8DEF\u5F84" : "Unable to determine target path"));
    return;
  }
  if (targetFile.exists) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "list",
        name: "overwrite",
        message: isZh ? "\u6587\u4EF6\u5DF2\u5B58\u5728\uFF0C\u5982\u4F55\u5904\u7406\uFF1F" : "File exists, how to proceed?",
        choices: [
          {
            name: isZh ? "\u5408\u5E76\uFF08\u6DFB\u52A0\u65B0\u89C4\u5219\uFF09" : "Merge (add new rules)",
            value: "merge"
          },
          {
            name: isZh ? "\u8986\u76D6" : "Overwrite",
            value: "overwrite"
          },
          {
            name: isZh ? "\u53D6\u6D88" : "Cancel",
            value: "cancel"
          }
        ]
      }
    ]);
    if (overwrite === "cancel") {
      return;
    }
    if (overwrite === "merge") {
      const existingContent = readContextFile(targetFile.path);
      if (existingContent) {
        const mergedContent = mergeContextContent(existingContent, selectedRules, lang);
        const success2 = await writeContextFile(targetFile.path, mergedContent);
        if (success2) {
          console.log(ansis.green(`
\u2705 ${isZh ? "\u89C4\u5219\u5DF2\u5408\u5E76\u5230" : "Rules merged to"}: ${targetFile.path}`));
        } else {
          console.log(ansis.red(`
\u274C ${isZh ? "\u5199\u5165\u5931\u8D25" : "Write failed"}`));
        }
        return;
      }
    }
  }
  const content = generateContextContent(context, selectedRules, lang);
  const success = await writeContextFile(targetFile.path, content);
  if (success) {
    console.log(ansis.green(`
\u2705 ${isZh ? "\u5DF2\u751F\u6210" : "Generated"}: ${targetFile.path}`));
  } else {
    console.log(ansis.red(`
\u274C ${isZh ? "\u5199\u5165\u5931\u8D25" : "Write failed"}`));
  }
}
async function addRulesToContext(context, lang) {
  const isZh = lang === "zh-CN";
  console.log(ansis.green.bold(`
\u{1F4DD} ${isZh ? "\u6DFB\u52A0\u89C4\u5219" : "Add Rules"}
`));
  const applicableRules = getApplicableRules(context.type);
  const { selectedRules } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedRules",
      message: isZh ? "\u9009\u62E9\u8981\u6DFB\u52A0\u7684\u89C4\u5219" : "Select rules to add",
      choices: applicableRules.map((rule) => ({
        name: `${isZh ? rule.nameZh : rule.name} - ${ansis.dim(isZh ? rule.descriptionZh : rule.description)}`,
        value: rule.id
      }))
    }
  ]);
  if (selectedRules.length === 0) {
    console.log(ansis.yellow(isZh ? "\u672A\u9009\u62E9\u4EFB\u4F55\u89C4\u5219" : "No rules selected"));
    return;
  }
  const files = getContextFiles();
  const existingFiles = files.filter((f) => f.exists);
  let targetPath;
  if (existingFiles.length > 0) {
    const { target } = await inquirer.prompt([
      {
        type: "list",
        name: "target",
        message: isZh ? "\u6DFB\u52A0\u5230\u54EA\u4E2A\u6587\u4EF6\uFF1F" : "Add to which file?",
        choices: [
          ...existingFiles.map((f) => ({
            name: `${getContextFileTypeLabel(f.type, lang)} - ${f.path}`,
            value: f.path
          })),
          {
            name: isZh ? "\u521B\u5EFA\u65B0\u6587\u4EF6" : "Create new file",
            value: "new"
          }
        ]
      }
    ]);
    if (target === "new") {
      const { location } = await inquirer.prompt([
        {
          type: "list",
          name: "location",
          message: isZh ? "\u4FDD\u5B58\u4F4D\u7F6E" : "Save location",
          choices: [
            { name: `${isZh ? "\u9879\u76EE\u6839\u76EE\u5F55" : "Project root"} (CLAUDE.md)`, value: "project" },
            { name: `${isZh ? "\u672C\u5730\u76EE\u5F55" : "Local directory"} (.claude/CLAUDE.md)`, value: "local" },
            { name: `${isZh ? "\u5168\u5C40\u76EE\u5F55" : "Global directory"} (~/.claude/CLAUDE.md)`, value: "global" }
          ]
        }
      ]);
      targetPath = files.find((f) => f.type === location)?.path || "";
    } else {
      targetPath = target;
    }
  } else {
    const { location } = await inquirer.prompt([
      {
        type: "list",
        name: "location",
        message: isZh ? "\u4FDD\u5B58\u4F4D\u7F6E" : "Save location",
        choices: [
          { name: `${isZh ? "\u9879\u76EE\u6839\u76EE\u5F55" : "Project root"} (CLAUDE.md)`, value: "project" },
          { name: `${isZh ? "\u672C\u5730\u76EE\u5F55" : "Local directory"} (.claude/CLAUDE.md)`, value: "local" },
          { name: `${isZh ? "\u5168\u5C40\u76EE\u5F55" : "Global directory"} (~/.claude/CLAUDE.md)`, value: "global" }
        ]
      }
    ]);
    targetPath = files.find((f) => f.type === location)?.path || "";
  }
  if (!targetPath) {
    console.log(ansis.red(isZh ? "\u65E0\u6CD5\u786E\u5B9A\u76EE\u6807\u8DEF\u5F84" : "Unable to determine target path"));
    return;
  }
  const existingContent = readContextFile(targetPath);
  let finalContent;
  if (existingContent) {
    finalContent = mergeContextContent(existingContent, selectedRules, lang);
  } else {
    finalContent = generateContextContent(context, selectedRules, lang);
  }
  const success = await writeContextFile(targetPath, finalContent);
  if (success) {
    console.log(ansis.green(`
\u2705 ${isZh ? "\u89C4\u5219\u5DF2\u6DFB\u52A0\u5230" : "Rules added to"}: ${targetPath}`));
  } else {
    console.log(ansis.red(`
\u274C ${isZh ? "\u5199\u5165\u5931\u8D25" : "Write failed"}`));
  }
}
async function browseRules(context, lang) {
  const isZh = lang === "zh-CN";
  console.log(ansis.green.bold(`
\u{1F4D6} ${isZh ? "\u53EF\u7528\u89C4\u5219" : "Available Rules"}
`));
  const applicableRules = getApplicableRules(context.type);
  const categories = {};
  for (const rule of applicableRules) {
    if (!categories[rule.category]) {
      categories[rule.category] = [];
    }
    categories[rule.category].push(rule);
  }
  const categoryLabels = {
    coding: { en: "Coding Style", zh: "\u7F16\u7801\u98CE\u683C" },
    testing: { en: "Testing", zh: "\u6D4B\u8BD5" },
    docs: { en: "Documentation", zh: "\u6587\u6863" },
    workflow: { en: "Workflow", zh: "\u5DE5\u4F5C\u6D41" },
    security: { en: "Security", zh: "\u5B89\u5168" }
  };
  for (const [category, rules] of Object.entries(categories)) {
    const label = isZh ? categoryLabels[category]?.zh : categoryLabels[category]?.en;
    console.log(ansis.bold(`
${label || category}:`));
    for (const rule of rules) {
      const name = isZh ? rule.nameZh : rule.name;
      const desc = isZh ? rule.descriptionZh : rule.description;
      console.log(`  ${ansis.green("\u2022")} ${ansis.bold(name)}`);
      console.log(`    ${ansis.dim(desc)}`);
    }
  }
  console.log("");
  const { viewRule } = await inquirer.prompt([
    {
      type: "list",
      name: "viewRule",
      message: isZh ? "\u67E5\u770B\u89C4\u5219\u8BE6\u60C5\uFF1F" : "View rule details?",
      choices: [
        ...applicableRules.map((r) => ({
          name: isZh ? r.nameZh : r.name,
          value: r.id
        })),
        {
          name: isZh ? "\u8DF3\u8FC7" : "Skip",
          value: "skip"
        }
      ]
    }
  ]);
  if (viewRule !== "skip") {
    const rule = applicableRules.find((r) => r.id === viewRule);
    if (rule) {
      console.log(ansis.dim(`
${"\u2500".repeat(50)}`));
      console.log(ansis.bold(isZh ? rule.nameZh : rule.name));
      console.log(ansis.dim(isZh ? rule.descriptionZh : rule.description));
      console.log("");
      console.log(isZh ? rule.contentZh : rule.content);
      console.log(ansis.dim(`${"\u2500".repeat(50)}
`));
    }
  }
}

const templates = [
	{
		id: "auto-format-on-save",
		name: "Auto Format on Save",
		category: "code-quality",
		description: "Automatically format code files when they are saved",
		hook: {
			name: "Auto Format on Save",
			version: "1.0.0",
			trigger: {
				type: "file_change",
				pattern: "**/*.{js,ts,jsx,tsx,vue,css,scss,json,md}"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npx prettier --write {{file}}",
						workingDir: "{{projectRoot}}"
					}
				}
			],
			privacy: "private",
			enabled: true
		},
		variables: [
			"file",
			"projectRoot"
		]
	},
	{
		id: "pre-commit-lint-check",
		name: "Pre-commit Lint Check",
		category: "git",
		description: "Run linting checks before committing code",
		hook: {
			name: "Pre-commit Lint Check",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "pre-tool-use"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npm run lint",
						workingDir: "{{projectRoot}}",
						failOnError: true
					}
				}
			],
			conditions: [
				{
					field: "tool",
					operator: "eq",
					value: "git"
				},
				{
					field: "command",
					operator: "contains",
					value: "commit"
				}
			],
			privacy: "private",
			enabled: true
		},
		variables: [
			"projectRoot"
		]
	},
	{
		id: "auto-generate-tests",
		name: "Auto Generate Tests",
		category: "testing",
		description: "Automatically generate test files for new source files",
		hook: {
			name: "Auto Generate Tests",
			version: "1.0.0",
			trigger: {
				type: "file_change",
				pattern: "src/**/*.{js,ts,jsx,tsx}"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npx jest --init {{file}}",
						workingDir: "{{projectRoot}}"
					}
				},
				{
					type: "notify",
					config: {
						title: "Test Generated",
						message: "Test file created for {{file}}",
						type: "success"
					}
				}
			],
			conditions: [
				{
					field: "fileExists",
					operator: "ne",
					value: "{{testFile}}"
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"file",
			"projectRoot",
			"testFile"
		]
	},
	{
		id: "documentation-update",
		name: "Documentation Update",
		category: "documentation",
		description: "Update documentation when code changes",
		hook: {
			name: "Documentation Update",
			version: "1.0.0",
			trigger: {
				type: "file_change",
				pattern: "src/**/*.{js,ts}"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npx typedoc --out docs {{file}}",
						workingDir: "{{projectRoot}}"
					}
				},
				{
					type: "notify",
					config: {
						title: "Documentation Updated",
						message: "API documentation regenerated",
						type: "info"
					}
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"file",
			"projectRoot"
		]
	},
	{
		id: "dependency-check",
		name: "Dependency Security Check",
		category: "security",
		description: "Check for security vulnerabilities in dependencies",
		hook: {
			name: "Dependency Security Check",
			version: "1.0.0",
			trigger: {
				type: "file_change",
				pattern: "{package.json,package-lock.json,pnpm-lock.yaml,yarn.lock}"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npm audit --audit-level=moderate",
						workingDir: "{{projectRoot}}",
						continueOnError: true
					}
				},
				{
					type: "notify",
					config: {
						title: "Security Audit Complete",
						message: "Dependency security check finished",
						type: "info"
					}
				}
			],
			privacy: "private",
			enabled: true
		},
		variables: [
			"projectRoot"
		]
	},
	{
		id: "security-scan",
		name: "Code Security Scan",
		category: "security",
		description: "Scan code for security vulnerabilities",
		hook: {
			name: "Code Security Scan",
			version: "1.0.0",
			trigger: {
				type: "schedule",
				schedule: "0 0 * * *"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npx eslint --ext .js,.ts --plugin security .",
						workingDir: "{{projectRoot}}",
						continueOnError: true
					}
				},
				{
					type: "call_api",
					config: {
						url: "{{webhookUrl}}",
						method: "POST",
						body: {
							type: "security-scan",
							status: "{{status}}",
							timestamp: "{{timestamp}}"
						}
					}
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"projectRoot",
			"webhookUrl",
			"status",
			"timestamp"
		]
	},
	{
		id: "build-on-push",
		name: "Build on Git Push",
		category: "git",
		description: "Automatically build project when pushing to git",
		hook: {
			name: "Build on Git Push",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "pre-tool-use"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npm run build",
						workingDir: "{{projectRoot}}",
						failOnError: true
					}
				},
				{
					type: "notify",
					config: {
						title: "Build Complete",
						message: "Project built successfully before push",
						type: "success"
					}
				}
			],
			conditions: [
				{
					field: "tool",
					operator: "eq",
					value: "git"
				},
				{
					field: "command",
					operator: "contains",
					value: "push"
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"projectRoot"
		]
	},
	{
		id: "test-before-commit",
		name: "Test Before Commit",
		category: "testing",
		description: "Run tests before committing code",
		hook: {
			name: "Test Before Commit",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "pre-tool-use"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npm test",
						workingDir: "{{projectRoot}}",
						failOnError: true
					}
				}
			],
			conditions: [
				{
					field: "tool",
					operator: "eq",
					value: "git"
				},
				{
					field: "command",
					operator: "contains",
					value: "commit"
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"projectRoot"
		]
	},
	{
		id: "changelog-update",
		name: "Changelog Update",
		category: "documentation",
		description: "Update changelog when version changes",
		hook: {
			name: "Changelog Update",
			version: "1.0.0",
			trigger: {
				type: "file_change",
				pattern: "package.json"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "npx conventional-changelog -p angular -i CHANGELOG.md -s",
						workingDir: "{{projectRoot}}"
					}
				},
				{
					type: "notify",
					config: {
						title: "Changelog Updated",
						message: "CHANGELOG.md has been updated",
						type: "info"
					}
				}
			],
			conditions: [
				{
					field: "versionChanged",
					operator: "eq",
					value: "true"
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"projectRoot"
		]
	},
	{
		id: "notify-on-error",
		name: "Notify on Error",
		category: "notification",
		description: "Send notification when an error occurs",
		hook: {
			name: "Notify on Error",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "error"
			},
			actions: [
				{
					type: "notify",
					config: {
						title: "Error Occurred",
						message: "{{errorMessage}}",
						type: "error",
						priority: "high"
					}
				},
				{
					type: "call_api",
					config: {
						url: "{{webhookUrl}}",
						method: "POST",
						body: {
							type: "error",
							message: "{{errorMessage}}",
							stack: "{{errorStack}}",
							timestamp: "{{timestamp}}"
						}
					}
				}
			],
			privacy: "private",
			enabled: true
		},
		variables: [
			"errorMessage",
			"errorStack",
			"timestamp",
			"webhookUrl"
		]
	},
	{
		id: "task-complete-notification",
		name: "Task Complete Notification",
		category: "notification",
		description: "Send notification when a task completes",
		hook: {
			name: "Task Complete Notification",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "task-complete"
			},
			actions: [
				{
					type: "notify",
					config: {
						title: "Task Complete",
						message: "{{taskDescription}} completed in {{duration}}ms",
						type: "success"
					}
				}
			],
			privacy: "private",
			enabled: true
		},
		variables: [
			"taskDescription",
			"duration"
		]
	},
	{
		id: "workflow-start-log",
		name: "Workflow Start Logger",
		category: "logging",
		description: "Log when a workflow starts",
		hook: {
			name: "Workflow Start Logger",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "workflow-start"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "echo '[{{timestamp}}] Workflow {{workflowId}} started' >> workflow.log",
						workingDir: "{{projectRoot}}"
					}
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"workflowId",
			"timestamp",
			"projectRoot"
		]
	},
	{
		id: "backup-on-change",
		name: "Backup on File Change",
		category: "backup",
		description: "Create backup when important files change",
		hook: {
			name: "Backup on File Change",
			version: "1.0.0",
			trigger: {
				type: "file_change",
				pattern: "{.env,.env.local,config/*.json}"
			},
			actions: [
				{
					type: "run_command",
					config: {
						command: "cp {{file}} {{file}}.backup.{{timestamp}}",
						workingDir: "{{projectRoot}}"
					}
				},
				{
					type: "notify",
					config: {
						title: "Backup Created",
						message: "Backup created for {{file}}",
						type: "info"
					}
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"file",
			"timestamp",
			"projectRoot"
		]
	},
	{
		id: "code-review-reminder",
		name: "Code Review Reminder",
		category: "collaboration",
		description: "Remind to request code review before pushing",
		hook: {
			name: "Code Review Reminder",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "pre-tool-use"
			},
			actions: [
				{
					type: "notify",
					config: {
						title: "Code Review Reminder",
						message: "Don't forget to request code review!",
						type: "info"
					}
				}
			],
			conditions: [
				{
					field: "tool",
					operator: "eq",
					value: "git"
				},
				{
					field: "command",
					operator: "contains",
					value: "push"
				},
				{
					field: "branch",
					operator: "ne",
					value: "main"
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"branch"
		]
	},
	{
		id: "performance-monitor",
		name: "Performance Monitor",
		category: "monitoring",
		description: "Monitor and log performance metrics",
		hook: {
			name: "Performance Monitor",
			version: "1.0.0",
			trigger: {
				type: "event",
				event: "task-complete"
			},
			actions: [
				{
					type: "transform",
					config: {
						input: "{{taskDuration}}",
						transform: "log-performance",
						output: "performance.log"
					}
				},
				{
					type: "call_api",
					config: {
						url: "{{metricsUrl}}",
						method: "POST",
						body: {
							task: "{{taskId}}",
							duration: "{{taskDuration}}",
							timestamp: "{{timestamp}}"
						}
					}
				}
			],
			conditions: [
				{
					field: "taskDuration",
					operator: "gt",
					value: "1000"
				}
			],
			privacy: "private",
			enabled: false
		},
		variables: [
			"taskId",
			"taskDuration",
			"timestamp",
			"metricsUrl"
		]
	}
];
const categories = [
	{
		id: "code-quality",
		name: {
			en: "Code Quality",
			"zh-CN": "代码质量"
		},
		description: {
			en: "Hooks for maintaining code quality and formatting",
			"zh-CN": "用于维护代码质量和格式化的钩子"
		},
		icon: "✨"
	},
	{
		id: "git",
		name: {
			en: "Git Workflow",
			"zh-CN": "Git 工作流"
		},
		description: {
			en: "Hooks for Git operations and version control",
			"zh-CN": "用于 Git 操作和版本控制的钩子"
		},
		icon: "🔀"
	},
	{
		id: "testing",
		name: {
			en: "Testing",
			"zh-CN": "测试"
		},
		description: {
			en: "Hooks for automated testing workflows",
			"zh-CN": "用于自动化测试工作流的钩子"
		},
		icon: "🧪"
	},
	{
		id: "documentation",
		name: {
			en: "Documentation",
			"zh-CN": "文档"
		},
		description: {
			en: "Hooks for documentation generation and updates",
			"zh-CN": "用于文档生成和更新的钩子"
		},
		icon: "📚"
	},
	{
		id: "security",
		name: {
			en: "Security",
			"zh-CN": "安全"
		},
		description: {
			en: "Hooks for security scanning and vulnerability checks",
			"zh-CN": "用于安全扫描和漏洞检查的钩子"
		},
		icon: "🔒"
	},
	{
		id: "notification",
		name: {
			en: "Notifications",
			"zh-CN": "通知"
		},
		description: {
			en: "Hooks for sending notifications and alerts",
			"zh-CN": "用于发送通知和警报的钩子"
		},
		icon: "🔔"
	},
	{
		id: "logging",
		name: {
			en: "Logging",
			"zh-CN": "日志"
		},
		description: {
			en: "Hooks for logging and audit trails",
			"zh-CN": "用于日志记录和审计跟踪的钩子"
		},
		icon: "📝"
	},
	{
		id: "backup",
		name: {
			en: "Backup",
			"zh-CN": "备份"
		},
		description: {
			en: "Hooks for automated backups",
			"zh-CN": "用于自动备份的钩子"
		},
		icon: "💾"
	},
	{
		id: "collaboration",
		name: {
			en: "Collaboration",
			"zh-CN": "协作"
		},
		description: {
			en: "Hooks for team collaboration workflows",
			"zh-CN": "用于团队协作工作流的钩子"
		},
		icon: "👥"
	},
	{
		id: "monitoring",
		name: {
			en: "Monitoring",
			"zh-CN": "监控"
		},
		description: {
			en: "Hooks for performance and system monitoring",
			"zh-CN": "用于性能和系统监控的钩子"
		},
		icon: "📊"
	}
];
const hookTemplatesData = {
	templates: templates,
	categories: categories
};

class CloudHooksSyncClient {
  baseUrl;
  apiKey;
  timeout;
  enableLogging;
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "https://api.api.claudehome.cn/v1/hooks";
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 3e4;
    this.enableLogging = options.enableLogging || false;
  }
  // ==========================================================================
  // Public API Methods
  // ==========================================================================
  /**
   * Upload hooks to cloud
   *
   * @param hooks - Hooks to upload
   * @returns Upload result
   */
  async uploadHooks(hooks) {
    this.log("Uploading hooks:", hooks.length);
    return this.request("/upload", {
      method: "POST",
      body: JSON.stringify({ hooks })
    });
  }
  /**
   * Download hooks from cloud
   *
   * @param options - Download options
   * @param options.privacy - Filter by privacy level
   * @param options.category - Filter by category
   * @param options.tags - Filter by tags
   * @returns Downloaded hooks
   */
  async downloadHooks(options) {
    this.log("Downloading hooks with options:", options);
    return this.request("/download", {
      method: "GET",
      params: options
    });
  }
  /**
   * Sync hooks bidirectionally
   *
   * @param localHooks - Local hooks to sync
   * @param options - Sync options
   * @returns Sync result
   */
  async syncHooks(localHooks, options) {
    this.log("Syncing hooks:", localHooks.length, "options:", options);
    return this.request("/sync", {
      method: "POST",
      body: JSON.stringify({ hooks: localHooks, options })
    });
  }
  /**
   * Get hook templates
   *
   * @param options - Filter options
   * @param options.category - Filter by category
   * @param options.tags - Filter by tags
   * @param options.language - Filter by language
   * @returns Hook templates
   */
  async getTemplates(options) {
    this.log("Getting templates with options:", options);
    return this.request("/templates", {
      method: "GET",
      params: options
    });
  }
  /**
   * Get a specific hook template
   *
   * @param id - Template ID
   * @returns Hook template
   */
  async getTemplate(id) {
    this.log("Getting template:", id);
    return this.request(`/templates/${id}`, {
      method: "GET"
    });
  }
  /**
   * Get hook by ID
   *
   * @param id - Hook ID
   * @returns Hook details
   */
  async getHook(id) {
    this.log("Getting hook:", id);
    return this.request(`/hooks/${id}`, {
      method: "GET"
    });
  }
  /**
   * Delete hook from cloud
   *
   * @param id - Hook ID
   * @returns Deletion result
   */
  async deleteHook(id) {
    this.log("Deleting hook:", id);
    return this.request(`/hooks/${id}`, {
      method: "DELETE"
    });
  }
  /**
   * Get hook execution logs
   *
   * @param hookId - Hook ID
   * @param options - Filter options
   * @param options.limit - Maximum number of logs to return
   * @param options.offset - Offset for pagination
   * @param options.status - Filter by execution status
   * @returns Execution logs
   */
  async getExecutionLogs(hookId, options) {
    this.log("Getting execution logs for hook:", hookId, "options:", options);
    return this.request(`/hooks/${hookId}/logs`, {
      method: "GET",
      params: options
    });
  }
  /**
   * Enable/disable hook
   *
   * @param id - Hook ID
   * @param enabled - Whether to enable or disable
   * @returns Update result
   */
  async setHookEnabled(id, enabled) {
    this.log("Setting hook enabled:", id, enabled);
    return this.request(`/hooks/${id}/enabled`, {
      method: "PUT",
      body: JSON.stringify({ enabled })
    });
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  /**
   * Make HTTP request to cloud service
   */
  async request(endpoint, options = {}) {
    const url = this.buildUrl(endpoint, options.params);
    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: this.getHeaders(),
        body: options.body,
        signal: AbortSignal.timeout(this.timeout)
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code || `HTTP_${response.status}`
        };
      }
      return {
        ...data,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
          code: "NETWORK_ERROR"
        };
      }
      return {
        success: false,
        error: String(error),
        code: "UNKNOWN_ERROR"
      };
    }
  }
  /**
   * Build full URL with query parameters
   */
  buildUrl(endpoint, params) {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0 && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      }
    }
    return url.toString();
  }
  /**
   * Get request headers
   */
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "CCJK-Hooks-Sync/1.0"
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
  /**
   * Log message (if logging is enabled)
   */
  log(...args) {
    if (this.enableLogging) {
      console.log("[CloudHooksSyncClient]", ...args);
    }
  }
}
function convertFromCloudHook(cloudHook) {
  return {
    id: cloudHook.id,
    name: cloudHook.name,
    description: cloudHook.metadata.description,
    type: cloudHook.trigger.event || "pre-tool-use",
    priority: 5,
    condition: cloudHook.conditions ? convertFromCloudConditions(cloudHook.conditions) : void 0,
    action: {
      execute: async () => {
        return {
          success: true,
          status: "success",
          durationMs: 0,
          continueChain: true
        };
      }
    },
    enabled: cloudHook.enabled,
    source: cloudHook.metadata.category,
    version: cloudHook.version,
    author: cloudHook.metadata.author,
    tags: cloudHook.metadata.tags
  };
}
function convertFromCloudConditions(conditions) {
  const condition = {};
  for (const cond of conditions) {
    if (cond.field === "tool") {
      condition.tool = cond.operator === "matches" ? new RegExp(cond.value) : cond.value;
    } else if (cond.field === "skillId") {
      condition.skillId = cond.operator === "matches" ? new RegExp(cond.value) : cond.value;
    } else if (cond.field === "workflowId") {
      condition.workflowId = cond.operator === "matches" ? new RegExp(cond.value) : cond.value;
    }
  }
  return condition;
}

class HookRegistry {
  state;
  constructor() {
    this.state = {
      version: "1.0.0",
      hooks: /* @__PURE__ */ new Map(),
      hooksByType: /* @__PURE__ */ new Map(),
      hooksByTool: /* @__PURE__ */ new Map(),
      lastUpdated: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Register a hook
   *
   * @param hook - Hook to register
   * @param options - Registration options
   * @returns Whether registration was successful
   */
  register(hook, options) {
    const existingEntry = this.state.hooks.get(hook.id);
    if (existingEntry && !options?.overwrite) {
      return false;
    }
    const entry = {
      hook: {
        ...hook,
        enabled: options?.enabled ?? hook.enabled
      },
      registeredAt: /* @__PURE__ */ new Date(),
      source: options?.source ?? hook.source,
      executionCount: 0,
      failureCount: 0
    };
    this.state.hooks.set(hook.id, entry);
    const typeHooks = this.state.hooksByType.get(hook.type) ?? [];
    if (!typeHooks.includes(hook.id)) {
      typeHooks.push(hook.id);
      this.state.hooksByType.set(hook.type, typeHooks);
    }
    if (hook.condition?.tool && typeof hook.condition.tool === "string") {
      const toolHooks = this.state.hooksByTool.get(hook.condition.tool) ?? [];
      if (!toolHooks.includes(hook.id)) {
        toolHooks.push(hook.id);
        this.state.hooksByTool.set(hook.condition.tool, toolHooks);
      }
    }
    this.state.lastUpdated = /* @__PURE__ */ new Date();
    return true;
  }
  /**
   * Unregister a hook
   *
   * @param hookId - ID of hook to unregister
   * @returns Whether unregistration was successful
   */
  unregister(hookId) {
    const entry = this.state.hooks.get(hookId);
    if (!entry) {
      return false;
    }
    this.state.hooks.delete(hookId);
    const typeHooks = this.state.hooksByType.get(entry.hook.type);
    if (typeHooks) {
      const index = typeHooks.indexOf(hookId);
      if (index !== -1) {
        typeHooks.splice(index, 1);
      }
    }
    if (entry.hook.condition?.tool && typeof entry.hook.condition.tool === "string") {
      const toolHooks = this.state.hooksByTool.get(entry.hook.condition.tool);
      if (toolHooks) {
        const index = toolHooks.indexOf(hookId);
        if (index !== -1) {
          toolHooks.splice(index, 1);
        }
      }
    }
    this.state.lastUpdated = /* @__PURE__ */ new Date();
    return true;
  }
  /**
   * Get a hook by ID
   *
   * @param hookId - Hook ID
   * @returns Hook entry or undefined
   */
  get(hookId) {
    return this.state.hooks.get(hookId);
  }
  /**
   * Get hooks for a specific type
   *
   * @param type - Hook type
   * @returns Array of hooks sorted by priority
   */
  getHooksForType(type) {
    const hookIds = this.state.hooksByType.get(type) ?? [];
    return hookIds.map((id) => this.state.hooks.get(id)?.hook).filter((hook) => hook !== void 0).sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));
  }
  /**
   * Get hooks for a specific tool
   *
   * @param tool - Tool name
   * @returns Array of hooks sorted by priority
   */
  getHooksForTool(tool) {
    const hookIds = this.state.hooksByTool.get(tool) ?? [];
    return hookIds.map((id) => this.state.hooks.get(id)?.hook).filter((hook) => hook !== void 0).sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));
  }
  /**
   * Filter hooks based on options
   *
   * @param options - Filter options
   * @returns Array of matching hooks
   */
  filter(options) {
    let hooks = Array.from(this.state.hooks.values()).map((entry) => entry.hook);
    if (options.type) {
      hooks = hooks.filter((h) => h.type === options.type);
    }
    if (options.enabled !== void 0) {
      hooks = hooks.filter((h) => h.enabled === options.enabled);
    }
    if (options.source) {
      hooks = hooks.filter((h) => h.source === options.source);
    }
    if (options.tags && options.tags.length > 0) {
      hooks = hooks.filter(
        (h) => options.tags.every((tag) => h.tags?.includes(tag))
      );
    }
    if (options.priorityRange) {
      const { min, max } = options.priorityRange;
      hooks = hooks.filter((h) => {
        const priority = h.priority ?? 5;
        if (min !== void 0 && priority < min)
          return false;
        if (max !== void 0 && priority > max)
          return false;
        return true;
      });
    }
    return hooks.sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));
  }
  /**
   * Enable a hook
   *
   * @param hookId - Hook ID
   * @returns Whether operation was successful
   */
  enable(hookId) {
    const entry = this.state.hooks.get(hookId);
    if (!entry)
      return false;
    entry.hook.enabled = true;
    this.state.lastUpdated = /* @__PURE__ */ new Date();
    return true;
  }
  /**
   * Disable a hook
   *
   * @param hookId - Hook ID
   * @returns Whether operation was successful
   */
  disable(hookId) {
    const entry = this.state.hooks.get(hookId);
    if (!entry)
      return false;
    entry.hook.enabled = false;
    this.state.lastUpdated = /* @__PURE__ */ new Date();
    return true;
  }
  /**
   * Update hook execution statistics
   *
   * @param hookId - Hook ID
   * @param success - Whether execution was successful
   * @param result - Execution result
   */
  updateStats(hookId, success, result) {
    const entry = this.state.hooks.get(hookId);
    if (!entry)
      return;
    entry.executionCount++;
    if (!success) {
      entry.failureCount++;
    }
    entry.lastExecutedAt = /* @__PURE__ */ new Date();
    entry.lastResult = result;
  }
  /**
   * Get registry statistics
   *
   * @returns Hook statistics
   */
  getStatistics() {
    const entries = Array.from(this.state.hooks.values());
    const hooks = entries.map((e) => e.hook);
    const hooksByType = {
      "pre-tool-use": 0,
      "post-tool-use": 0,
      "skill-activate": 0,
      "skill-complete": 0,
      "workflow-start": 0,
      "workflow-complete": 0,
      "config-change": 0,
      "error": 0,
      "task-start": 0,
      "task-complete": 0,
      "task-failed": 0,
      "task-progress": 0
    };
    const hooksBySource = {};
    for (const hook of hooks) {
      hooksByType[hook.type]++;
      hooksBySource[hook.source] = (hooksBySource[hook.source] ?? 0) + 1;
    }
    const totalExecutions = entries.reduce((sum, e) => sum + e.executionCount, 0);
    const totalFailures = entries.reduce((sum, e) => sum + e.failureCount, 0);
    const mostExecuted = entries.filter((e) => e.executionCount > 0).sort((a, b) => b.executionCount - a.executionCount).slice(0, 5).map((e) => ({ hookId: e.hook.id, executionCount: e.executionCount }));
    const mostFailed = entries.filter((e) => e.failureCount > 0).sort((a, b) => b.failureCount - a.failureCount).slice(0, 5).map((e) => ({ hookId: e.hook.id, failureCount: e.failureCount }));
    return {
      totalHooks: hooks.length,
      enabledHooks: hooks.filter((h) => h.enabled).length,
      disabledHooks: hooks.filter((h) => !h.enabled).length,
      totalExecutions,
      totalFailures,
      averageExecutionMs: 0,
      // Would need to track this separately
      hooksByType,
      hooksBySource,
      mostExecuted,
      mostFailed
    };
  }
  /**
   * Clear all hooks
   */
  clear() {
    this.state.hooks.clear();
    this.state.hooksByType.clear();
    this.state.hooksByTool.clear();
    this.state.lastUpdated = /* @__PURE__ */ new Date();
  }
  /**
   * Get all hooks
   *
   * @returns Array of all hooks
   */
  getAll() {
    return Array.from(this.state.hooks.values()).map((entry) => entry.hook);
  }
}
let globalRegistry = null;
function getGlobalRegistry() {
  if (!globalRegistry) {
    globalRegistry = new HookRegistry();
  }
  return globalRegistry;
}

const HOOKS_DIR = join(homedir(), ".ccjk", "hooks");
const HOOKS_STORAGE_FILE = join(HOOKS_DIR, "hooks.json");
async function hooksSync(options = {}) {
  try {
    if (!options.skipBanner) {
      displayBannerWithInfo();
    }
    const lang = options.lang || "zh-CN";
    if (options.action) {
      switch (options.action) {
        case "sync":
          await syncHooks();
          break;
        case "list":
          await listHooks(options);
          break;
        case "enable":
          if (!options.hookId) {
            console.log(ansis.red(i18n.t("menu:hooksSync.errors.hookIdRequired")));
            return;
          }
          await toggleHook(options.hookId, true);
          break;
        case "disable":
          if (!options.hookId) {
            console.log(ansis.red(i18n.t("menu:hooksSync.errors.hookIdRequired")));
            return;
          }
          await toggleHook(options.hookId, false);
          break;
        case "templates":
          await browseTemplates(lang, options);
          break;
        case "upload":
          await uploadHooks();
          break;
        case "download":
          await downloadHooks(options);
          break;
        default:
          await showHooksMenu(lang);
      }
    } else {
      await showHooksMenu(lang);
    }
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
async function showHooksMenu(lang) {
  while (true) {
    console.log(ansis.green.bold(`
${i18n.t("menu:hooksSync.title")}
`));
    const { action } = await inquirer.prompt([{
      type: "list",
      name: "action",
      message: i18n.t("menu:mcpMarket.selectAction"),
      choices: [
        { name: `\u{1F504} ${i18n.t("menu:hooksSync.syncNow")}`, value: "sync" },
        { name: `\u{1F4CB} ${i18n.t("menu:hooksSync.viewStatus")}`, value: "list" },
        { name: `\u{1F4DA} ${i18n.t("menu:hooksSync.browseTemplates")}`, value: "templates" },
        { name: `\u2601\uFE0F  ${i18n.t("menu:mcpMarket.upload") || "Upload"}`, value: "upload" },
        { name: `\u{1F4E5} ${i18n.t("menu:mcpMarket.download") || "Download"}`, value: "download" },
        new inquirer.Separator(),
        { name: ansis.gray(`\u21A9\uFE0F  ${i18n.t("common:back")}`), value: "back" }
      ]
    }]);
    if (!action || action === "back") {
      break;
    }
    switch (action) {
      case "sync":
        await syncHooks();
        break;
      case "list":
        await listHooks();
        break;
      case "templates":
        await browseTemplates(lang);
        break;
      case "upload":
        await uploadHooks();
        break;
      case "download":
        await downloadHooks();
        break;
    }
  }
}
async function syncHooks() {
  console.log(ansis.green(`
\u23F3 ${i18n.t("menu:hooksSync.syncNowDesc")}...`));
  try {
    const localHooks = await loadLocalHooks();
    console.log(ansis.dim(`  ${i18n.t("hooksSync:labels.localHooks")}: ${localHooks.length}`));
    const client = new CloudHooksSyncClient({
      enableLogging: false
    });
    const result = await client.syncHooks(localHooks, {
      direction: "bidirectional",
      overwrite: false
    });
    if (result.success && result.data) {
      console.log(ansis.green(`
\u2705 ${i18n.t("hooksSync:actions.syncCompleted")}`));
      console.log(ansis.dim(`  ${i18n.t("hooksSync:labels.uploaded")}: ${result.data.uploaded}`));
      console.log(ansis.dim(`  ${i18n.t("hooksSync:labels.downloaded")}: ${result.data.downloaded}`));
      console.log(ansis.dim(`  ${i18n.t("hooksSync:labels.skipped")}: ${result.data.skipped}`));
      if (result.data.failed > 0) {
        console.log(ansis.yellow(`  ${i18n.t("hooksSync:labels.failed")}: ${result.data.failed}`));
      }
      await saveLocalHooks(localHooks, result.data.timestamp);
    } else {
      console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:actions.syncError", { error: result.error || "Unknown error" })}`));
    }
  } catch (error) {
    console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:actions.syncError", { error: error instanceof Error ? error.message : String(error) })}`));
  }
}
async function uploadHooks() {
  console.log(ansis.green(`
\u23F3 ${i18n.t("hooksSync:actions.uploading")}`));
  try {
    const localHooks = await loadLocalHooks();
    if (localHooks.length === 0) {
      console.log(ansis.yellow(`
\u26A0\uFE0F  ${i18n.t("hooksSync:errors.noHooksFound")}`));
      return;
    }
    console.log(ansis.dim(`  ${i18n.t("hooksSync:labels.found")} ${localHooks.length} ${i18n.t("hooksSync:labels.localHooks").toLowerCase()}`));
    const client = new CloudHooksSyncClient();
    const result = await client.uploadHooks(localHooks);
    if (result.success && result.data) {
      console.log(ansis.green(`
\u2705 ${i18n.t("hooksSync:actions.uploadCompleted")}`));
      console.log(ansis.dim(`  ${i18n.t("hooksSync:labels.uploaded")}: ${result.data.uploaded}`));
    } else {
      console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:actions.uploadError", { error: result.error || "Unknown error" })}`));
    }
  } catch (error) {
    console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:actions.uploadError", { error: error instanceof Error ? error.message : String(error) })}`));
  }
}
async function downloadHooks(options = {}) {
  console.log(ansis.green(`
\u23F3 ${i18n.t("hooksSync:actions.downloading")}`));
  try {
    const client = new CloudHooksSyncClient();
    const result = await client.downloadHooks({
      privacy: options.privacy,
      category: options.category
    });
    if (result.success && result.data) {
      console.log(ansis.green(`
\u2705 ${i18n.t("hooksSync:actions.downloadCompleted")}`));
      console.log(ansis.dim(`  ${i18n.t("hooksSync:labels.downloaded")}: ${result.data.length}`));
      await saveLocalHooks(result.data);
      result.data.forEach((hook) => {
        console.log(`  ${ansis.green("\u2022")} ${hook.name} ${ansis.dim(`(${hook.id})`)}`);
      });
    } else {
      console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:actions.downloadError", { error: result.error || "Unknown error" })}`));
    }
  } catch (error) {
    console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:actions.downloadError", { error: error instanceof Error ? error.message : String(error) })}`));
  }
}
async function listHooks(options = {}) {
  console.log(ansis.green.bold(`
\u{1F4CB} ${i18n.t("hooksSync:labels.localHooks")}
`));
  try {
    const hooks = await loadLocalHooks();
    if (hooks.length === 0) {
      console.log(ansis.yellow(`  ${i18n.t("hooksSync:errors.noHooksFound")}`));
      return;
    }
    const filteredHooks = options.category ? hooks.filter((h) => h.metadata.category === options.category) : hooks;
    const byCategory = /* @__PURE__ */ new Map();
    for (const hook of filteredHooks) {
      const category = hook.metadata.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category).push(hook);
    }
    for (const [category, categoryHooks] of byCategory) {
      console.log(ansis.bold(`
${category}:`));
      for (const hook of categoryHooks) {
        const status = hook.enabled ? ansis.green("\u2713") : ansis.red("\u2717");
        const privacy = hook.privacy === "public" ? ansis.green("\u{1F310}") : ansis.dim("\u{1F512}");
        console.log(`  ${status} ${privacy} ${hook.name} ${ansis.dim(`(${hook.id})`)}`);
        console.log(`     ${ansis.dim(hook.metadata.description)}`);
      }
    }
    console.log(ansis.dim(`
${i18n.t("hooksSync:labels.total")}: ${filteredHooks.length}`));
  } catch (error) {
    console.log(ansis.red(`
\u274C ${i18n.t("common:error")}: ${error instanceof Error ? error.message : String(error)}`));
  }
}
async function toggleHook(hookId, enabled) {
  try {
    const hooks = await loadLocalHooks();
    const hook = hooks.find((h) => h.id === hookId);
    if (!hook) {
      console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:errors.hookNotFound", { id: hookId })}`));
      return;
    }
    hook.enabled = enabled;
    await saveLocalHooks(hooks);
    const registry = getGlobalRegistry();
    convertFromCloudHook(hook);
    const entry = registry.get(hookId);
    if (entry) {
      if (enabled) {
        registry.enable(hookId);
      } else {
        registry.disable(hookId);
      }
    }
    const status = enabled ? ansis.green(i18n.t("hooksSync:labels.enabled")) : ansis.red(i18n.t("hooksSync:labels.disabled"));
    console.log(`
\u2705 ${i18n.t("hooksSync:actions.hookToggled", { status, name: hook.name })}`);
  } catch (error) {
    console.log(ansis.red(`
\u274C ${i18n.t("common:error")}: ${error instanceof Error ? error.message : String(error)}`));
  }
}
async function browseTemplates(lang, options = {}) {
  console.log(ansis.green.bold(`
\u{1F4DA} ${i18n.t("menu:hooksSync.browseTemplates")}
`));
  try {
    const templates = hookTemplatesData.templates;
    const categories = hookTemplatesData.categories;
    const filteredTemplates = options.category ? templates.filter((t) => t.category === options.category) : templates;
    if (filteredTemplates.length === 0) {
      console.log(ansis.yellow(`  ${i18n.t("hooksSync:errors.noTemplatesFound")}`));
      return;
    }
    console.log(ansis.bold(`${i18n.t("hooksSync:labels.categories")}:`));
    for (const cat of categories) {
      const count = templates.filter((t) => t.category === cat.id).length;
      const catName = cat.name[lang] || cat.name.en;
      console.log(`  ${cat.icon} ${catName} ${ansis.dim(`(${count})`)}`);
    }
    const { templateId } = await inquirer.prompt([{
      type: "list",
      name: "templateId",
      message: i18n.t("hooksSync:prompts.selectTemplate"),
      choices: filteredTemplates.map((t) => ({
        name: `${t.name} - ${t.description}`,
        value: t.id
      }))
    }]);
    if (!templateId) {
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      return;
    }
    console.log(ansis.bold(`
${template.name}`));
    console.log(ansis.dim(template.description));
    console.log(ansis.bold(`
${i18n.t("hooksSync:labels.category")}: `) + template.category);
    console.log(ansis.bold(`${i18n.t("hooksSync:labels.variables")}: `) + template.variables.join(", "));
    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: i18n.t("hooksSync:prompts.confirmInstall"),
      default: true
    }]);
    if (!confirm) {
      return;
    }
    await installTemplate(template);
  } catch (error) {
    console.log(ansis.red(`
\u274C ${i18n.t("common:error")}: ${error instanceof Error ? error.message : String(error)}`));
  }
}
async function installTemplate(template) {
  try {
    const cloudHook = {
      id: `template-${template.id}-${Date.now()}`,
      ...template.hook,
      metadata: {
        author: "CCJK Templates",
        description: template.description,
        tags: [template.category],
        category: template.category,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    const hooks = await loadLocalHooks();
    hooks.push(cloudHook);
    await saveLocalHooks(hooks);
    const registry = getGlobalRegistry();
    const localHook = convertFromCloudHook(cloudHook);
    registry.register(localHook);
    console.log(ansis.green(`
\u2705 ${i18n.t("hooksSync:actions.templateInstalled", { name: template.name })}`));
  } catch (error) {
    console.log(ansis.red(`
\u274C ${i18n.t("hooksSync:actions.installError", { error: error instanceof Error ? error.message : String(error) })}`));
  }
}
async function loadLocalHooks() {
  try {
    await ensureDir(HOOKS_DIR);
    if (!await exists(HOOKS_STORAGE_FILE)) {
      return [];
    }
    const storage = await readJsonFile(HOOKS_STORAGE_FILE);
    return storage?.hooks || [];
  } catch (error) {
    console.error(i18n.t("hooksSync:errors.loadHooksFailed"), error);
    return [];
  }
}
async function saveLocalHooks(hooks, lastSyncedAt) {
  try {
    await ensureDir(HOOKS_DIR);
    const storage = {
      version: "1.0.0",
      hooks,
      lastSyncedAt: lastSyncedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    await writeFileAtomic(HOOKS_STORAGE_FILE, JSON.stringify(storage, null, 2));
  } catch (error) {
    console.error(i18n.t("hooksSync:errors.saveHooksFailed"), error);
    throw error;
  }
}

const CODE_TOOL_LABELS = {
  "claude-code": "Claude Code",
  "codex": "Codex",
  "aider": "Aider",
  "continue": "Continue",
  "cline": "Cline",
  "cursor": "Cursor"
};
function getCurrentCodeTool() {
  const config = readZcfConfig();
  if (config?.codeToolType && isCodeToolType(config.codeToolType)) {
    return config.codeToolType;
  }
  return DEFAULT_CODE_TOOL_TYPE;
}
function printSeparator() {
  console.log(`
${ansis.dim("\u2500".repeat(50))}
`);
}
function getCodeToolLabel(codeTool) {
  return CODE_TOOL_LABELS[codeTool] || codeTool;
}
async function promptCodeToolSelection(current) {
  const choices = addNumbersToChoices(Object.entries(CODE_TOOL_LABELS).map(([value, label]) => ({
    name: label,
    value,
    short: label
  })));
  const { tool } = await inquirer.prompt({
    type: "list",
    name: "tool",
    message: i18n.t("menu:switchCodeToolPrompt"),
    default: current,
    choices
  });
  if (!tool) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return null;
  }
  return tool;
}
async function handleCodeToolSwitch(current) {
  const newTool = await promptCodeToolSelection(current);
  if (!newTool || newTool === current) {
    return false;
  }
  updateZcfConfig({ codeToolType: newTool });
  console.log(ansis.green(`\u2714 ${i18n.t("menu:codeToolSwitched", { tool: getCodeToolLabel(newTool) })}`));
  return true;
}
async function showSuperpowersMenu() {
  console.log(ansis.green(i18n.t("superpowers:menu.title")));
  console.log("  -------- Superpowers --------");
  console.log(
    `  ${ansis.green("1.")} ${i18n.t("superpowers:menu.install")} ${ansis.gray(`- ${i18n.t("superpowers:menu.installDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("2.")} ${i18n.t("superpowers:menu.uninstall")} ${ansis.gray(`- ${i18n.t("superpowers:menu.uninstallDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("3.")} ${i18n.t("superpowers:menu.update")} ${ansis.gray(`- ${i18n.t("superpowers:menu.updateDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("4.")} ${i18n.t("superpowers:menu.checkStatus")} ${ansis.gray(`- ${i18n.t("superpowers:menu.checkStatusDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("5.")} ${i18n.t("superpowers:menu.viewSkills")} ${ansis.gray(`- ${i18n.t("superpowers:menu.viewSkillsDesc")}`)}`
  );
  console.log(`  ${ansis.green("0.")} ${i18n.t("superpowers:menu.back")}`);
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "5", "0"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  switch (choice) {
    case "1": {
      const { method } = await inquirer.prompt({
        type: "list",
        name: "method",
        message: i18n.t("superpowers:install.selectMethod"),
        choices: addNumbersToChoices([
          { name: i18n.t("superpowers:install.methodNpm"), value: "npm" },
          { name: i18n.t("superpowers:install.methodGit"), value: "git" }
        ])
      });
      if (method === "npm") {
        await installSuperpowers({ lang: i18n.language });
      } else if (method === "git") {
        await installSuperpowersViaGit();
      }
      break;
    }
    case "2": {
      const status = await checkSuperpowersInstalled();
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t("superpowers:status.notInstalled")));
        break;
      }
      const { confirm } = await inquirer.prompt({
        type: "confirm",
        name: "confirm",
        message: i18n.t("superpowers:uninstall.confirm"),
        default: false
      });
      if (confirm) {
        await uninstallSuperpowers();
      } else {
        console.log(ansis.yellow(i18n.t("common:cancelled")));
      }
      break;
    }
    case "3": {
      const status = await checkSuperpowersInstalled();
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t("superpowers:status.notInstalled")));
        break;
      }
      await updateSuperpowers();
      break;
    }
    case "4": {
      const status = await checkSuperpowersInstalled();
      if (status.installed) {
        console.log(ansis.green(`\u2714 ${i18n.t("superpowers:status.installed")}`));
      } else {
        console.log(ansis.yellow(i18n.t("superpowers:status.notInstalled")));
      }
      break;
    }
    case "5": {
      const status = await checkSuperpowersInstalled();
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t("superpowers:status.notInstalled")));
        break;
      }
      const skills = await getSuperpowersSkills();
      if (skills.length === 0) {
        console.log(ansis.yellow(i18n.t("superpowers:skills.noSkills")));
      } else {
        console.log(ansis.green(i18n.t("superpowers:skills.available")));
        skills.forEach((skill) => {
          console.log(`  ${ansis.green("\u2022")} ${skill}`);
        });
      }
      break;
    }
    case "0":
      return;
    default:
      return;
  }
  printSeparator();
}
async function showHooksSyncMenu() {
  i18n.language;
  console.log(ansis.green(i18n.t("menu:hooksSync.title")));
  console.log("  -------- Hooks Cloud Sync --------");
  console.log(
    `  ${ansis.green("1.")} ${i18n.t("menu:hooksSync.viewStatus")} ${ansis.gray(`- ${i18n.t("menu:hooksSync.viewStatusDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("2.")} ${i18n.t("menu:hooksSync.syncNow")} ${ansis.gray(`- ${i18n.t("menu:hooksSync.syncNowDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("3.")} ${i18n.t("menu:hooksSync.configure")} ${ansis.gray(`- ${i18n.t("menu:hooksSync.configureDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("4.")} ${i18n.t("menu:hooksSync.browseTemplates")} ${ansis.gray(`- ${i18n.t("menu:hooksSync.browseTemplatesDesc")}`)}`
  );
  console.log(`  ${ansis.green("0.")} ${i18n.t("common:back")}`);
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "0"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice || choice === "0") {
    return;
  }
  switch (choice) {
    case "1":
      await hooksSync({ action: "list" });
      break;
    case "2":
      await hooksSync({ action: "sync" });
      break;
    case "3":
      await hooksSync({});
      break;
    case "4":
      await hooksSync({ action: "templates" });
      break;
  }
  printSeparator();
}
async function showMcpMarketMenu() {
  console.log(ansis.green(i18n.t("menu:mcpMarket.title")));
  console.log("  -------- MCP Market --------");
  console.log(
    `  ${ansis.green("1.")} ${i18n.t("menu:mcpMarket.search")} ${ansis.gray(`- ${i18n.t("menu:mcpMarket.searchDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("2.")} ${i18n.t("menu:mcpMarket.trending")} ${ansis.gray(`- ${i18n.t("menu:mcpMarket.trendingDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("3.")} ${i18n.t("menu:mcpMarket.install")} ${ansis.gray(`- ${i18n.t("menu:mcpMarket.installDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("4.")} ${i18n.t("menu:mcpMarket.uninstall")} ${ansis.gray(`- ${i18n.t("menu:mcpMarket.uninstallDesc")}`)}`
  );
  console.log(
    `  ${ansis.green("5.")} ${i18n.t("menu:mcpMarket.list")} ${ansis.gray(`- ${i18n.t("menu:mcpMarket.listDesc")}`)}`
  );
  console.log(`  ${ansis.green("0.")} ${i18n.t("common:back")}`);
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "5", "0"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice || choice === "0") {
    return;
  }
  switch (choice) {
    case "1": {
      const { query } = await inquirer.prompt({
        type: "input",
        name: "query",
        message: i18n.t("menu:mcpMarket.searchPrompt")
      });
      if (query) {
        await mcpSearch(query);
      }
      break;
    }
    case "2": {
      await mcpTrending();
      break;
    }
    case "3": {
      const { serverName } = await inquirer.prompt({
        type: "input",
        name: "serverName",
        message: i18n.t("menu:mcpMarket.installPrompt")
      });
      if (serverName) {
        await mcpInstall(serverName);
      }
      break;
    }
    case "4": {
      const { serverName } = await inquirer.prompt({
        type: "input",
        name: "serverName",
        message: i18n.t("menu:mcpMarket.uninstallPrompt")
      });
      if (serverName) {
        await mcpUninstall(serverName);
      }
      break;
    }
    case "5": {
      await mcpList();
      break;
    }
  }
  printSeparator();
}
async function showMarketplaceMenu() {
  console.log(ansis.green(i18n.t("marketplace:menu.title")));
  console.log("  -------- Marketplace --------");
  console.log(
    `  ${ansis.green("1.")} ${i18n.t("marketplace:menu.search")} ${ansis.gray(`- ${i18n.t("marketplace:commands.search")}`)}`
  );
  console.log(
    `  ${ansis.green("2.")} ${i18n.t("marketplace:menu.browse")} ${ansis.gray(`- Browse by category`)}`
  );
  console.log(
    `  ${ansis.green("3.")} ${i18n.t("marketplace:menu.installed")} ${ansis.gray(`- ${i18n.t("marketplace:commands.list")}`)}`
  );
  console.log(
    `  ${ansis.green("4.")} ${i18n.t("marketplace:menu.updates")} ${ansis.gray(`- ${i18n.t("marketplace:commands.update")}`)}`
  );
  console.log(`  ${ansis.green("0.")} ${i18n.t("marketplace:menu.back")}`);
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "0"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  switch (choice) {
    case "1": {
      const { query } = await inquirer.prompt({
        type: "input",
        name: "query",
        message: i18n.t("marketplace:prompts.searchQuery")
      });
      if (query) {
        console.log(i18n.t("marketplace:searching", { query }));
        try {
          const result = await searchPackages({ query, limit: 10 });
          if (result.packages.length === 0) {
            console.log(ansis.yellow(i18n.t("marketplace:noResults")));
          } else {
            console.log(ansis.green(i18n.t("marketplace:searchResults", { count: result.total })));
            console.log("");
            for (const pkg of result.packages) {
              console.log(`  ${ansis.green(pkg.id)} ${ansis.gray(`v${pkg.version}`)}`);
              const description = pkg.description.en || Object.values(pkg.description)[0] || "";
              console.log(`    ${ansis.dim(description)}`);
            }
          }
        } catch {
          console.error(ansis.red(i18n.t("marketplace:searchFailed")));
        }
      }
      break;
    }
    case "2": {
      console.log(ansis.green(i18n.t("marketplace:categories.plugin")));
      console.log(ansis.dim("Category browsing coming soon..."));
      break;
    }
    case "3": {
      try {
        const installed = await getInstalledPackages();
        if (installed.length === 0) {
          console.log(ansis.yellow(i18n.t("marketplace:noInstalled")));
        } else {
          console.log(ansis.green(i18n.t("marketplace:installedPackages", { count: installed.length })));
          console.log("");
          for (const pkg of installed) {
            const status = pkg.enabled ? ansis.green("\u25CF") : ansis.gray("\u25CB");
            console.log(`  ${status} ${ansis.green(pkg.package.id)} ${ansis.gray(`v${pkg.package.version}`)}`);
          }
        }
      } catch {
        console.error(ansis.red(i18n.t("marketplace:listFailed")));
      }
      break;
    }
    case "4": {
      console.log(i18n.t("marketplace:checkingUpdates"));
      try {
        const updates = await checkForUpdates();
        if (updates.length === 0) {
          console.log(ansis.green(i18n.t("marketplace:noUpdates")));
        } else {
          console.log(ansis.green(i18n.t("marketplace:updatesAvailable", { count: updates.length })));
          console.log("");
          for (const update2 of updates) {
            console.log(`  ${ansis.green(update2.id)}: ${update2.currentVersion} \u2192 ${ansis.green(update2.latestVersion)}`);
          }
        }
      } catch {
        console.error(ansis.red(i18n.t("marketplace:updateCheckFailed")));
      }
      break;
    }
    case "0":
      return;
    default:
      return;
  }
  printSeparator();
  await showMarketplaceMenu();
}
async function showQuickActionsMenu() {
  const lang = i18n.language;
  const isZh = lang === "zh-CN";
  console.log(ansis.green(isZh ? "\u{1F680} \u5FEB\u6377\u64CD\u4F5C" : "\u{1F680} Quick Actions"));
  console.log("");
  console.log(generateQuickActionsPanel(lang));
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: isZh ? "\u8F93\u5165\u6570\u5B57 (1-8) \u6216 0 \u8FD4\u56DE:" : "Enter number (1-8) or 0 to go back:",
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "5", "6", "7", "8", "0", "?"];
      return valid.includes(value) || (isZh ? "\u8BF7\u8F93\u5165\u6709\u6548\u9009\u9879" : "Please enter a valid option");
    }
  });
  if (!choice || choice === "0") {
    return;
  }
  if (choice === "?") {
    console.log("");
    console.log(generateSkillReferenceCard(lang));
    console.log("");
    printSeparator();
    await showQuickActionsMenu();
    return;
  }
  const actionNum = Number.parseInt(choice, 10);
  const action = QUICK_ACTIONS.find((a) => a.id === actionNum);
  if (action) {
    const actionName = isZh ? action.nameZh : action.name;
    console.log("");
    console.log(ansis.green(`\u2714 ${isZh ? "\u6267\u884C" : "Executing"}: ${action.icon} ${actionName}`));
    console.log(ansis.gray(`${isZh ? "\u547D\u4EE4" : "Command"}: ${action.command}`));
    console.log("");
    console.log(ansis.green(isZh ? `\u{1F4A1} \u63D0\u793A: \u5728 Claude Code \u4E2D\u8F93\u5165 "${action.command}" \u6216\u76F4\u63A5\u8F93\u5165 "${choice}" \u6765\u6267\u884C\u6B64\u64CD\u4F5C` : `\u{1F4A1} Tip: In Claude Code, type "${action.command}" or just "${choice}" to execute this action`));
  }
  printSeparator();
}
async function showSmartGuideMenu() {
  const lang = i18n.language;
  const isZh = lang === "zh-CN";
  const installed = await isSmartGuideInstalled();
  console.log(ansis.green(isZh ? "\u{1F3AF} \u667A\u80FD\u52A9\u624B" : "\u{1F3AF} Smart Assistant"));
  console.log("");
  console.log(isZh ? "\u667A\u80FD\u52A9\u624B\u8BA9\u4F60\u5728 Claude Code \u4E2D\u901A\u8FC7\u8F93\u5165\u6570\u5B57\u5FEB\u901F\u6267\u884C\u64CD\u4F5C" : "Smart Assistant lets you execute actions by typing numbers in Claude Code");
  console.log("");
  console.log(`  ${isZh ? "\u72B6\u6001" : "Status"}: ${installed ? ansis.green(isZh ? "\u5DF2\u542F\u7528" : "Enabled") : ansis.yellow(isZh ? "\u672A\u542F\u7528" : "Disabled")}`);
  console.log("");
  console.log(`  ${ansis.green("1.")} ${installed ? isZh ? "\u66F4\u65B0\u667A\u80FD\u52A9\u624B" : "Update Smart Assistant" : isZh ? "\u542F\u7528\u667A\u80FD\u52A9\u624B" : "Enable Smart Assistant"}`);
  console.log(`  ${ansis.green("2.")} ${isZh ? "\u7981\u7528\u667A\u80FD\u52A9\u624B" : "Disable Smart Assistant"}`);
  console.log(`  ${ansis.green("3.")} ${isZh ? "\u67E5\u770B\u6280\u80FD\u901F\u67E5\u5361" : "View Skills Reference Card"}`);
  console.log(`  ${ansis.green("0.")} ${i18n.t("common:back")}`);
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "0"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice || choice === "0") {
    return;
  }
  switch (choice) {
    case "1": {
      const success = await injectSmartGuide(lang);
      if (success) {
        console.log(ansis.green(`\u2714 ${isZh ? "\u667A\u80FD\u52A9\u624B\u5DF2\u542F\u7528" : "Smart Assistant enabled"}`));
      } else {
        console.log(ansis.red(isZh ? "\u542F\u7528\u5931\u8D25" : "Failed to enable"));
      }
      break;
    }
    case "2": {
      if (!installed) {
        console.log(ansis.yellow(isZh ? "\u667A\u80FD\u52A9\u624B\u672A\u542F\u7528" : "Smart Assistant is not enabled"));
        break;
      }
      const success = await removeSmartGuide();
      if (success) {
        console.log(ansis.green(`\u2714 ${isZh ? "\u667A\u80FD\u52A9\u624B\u5DF2\u7981\u7528" : "Smart Assistant disabled"}`));
      } else {
        console.log(ansis.red(isZh ? "\u7981\u7528\u5931\u8D25" : "Failed to disable"));
      }
      break;
    }
    case "3": {
      console.log("");
      console.log(generateSkillReferenceCard(lang));
      break;
    }
  }
  printSeparator();
}
async function showWorkflowsAndSkillsMenu() {
  const lang = i18n.language;
  const isZh = lang === "zh-CN";
  console.log(ansis.green(i18n.t("menu:ccjkFeatures.workflowsTitle")));
  console.log("  -------- Workflows & Skills --------");
  console.log(`  ${ansis.green("1.")} ${i18n.t("menu:ccjkFeatures.viewInstalledWorkflows")}`);
  console.log(`  ${ansis.green("2.")} ${i18n.t("menu:ccjkFeatures.viewInstalledSkills")}`);
  console.log(`  ${ansis.green("3.")} ${i18n.t("menu:ccjkFeatures.installNewWorkflow")}`);
  console.log(`  ${ansis.green("4.")} ${isZh ? "\u{1F680} \u5FEB\u6377\u64CD\u4F5C\u9762\u677F" : "\u{1F680} Quick Actions Panel"}`);
  console.log(`  ${ansis.green("5.")} ${isZh ? "\u{1F3AF} \u667A\u80FD\u52A9\u624B\u8BBE\u7F6E" : "\u{1F3AF} Smart Assistant Settings"}`);
  console.log(`  ${ansis.green("0.")} ${i18n.t("common:back")}`);
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "5", "0"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  switch (choice) {
    case "1": {
      console.log(ansis.green(i18n.t("menu:ccjkFeatures.availableStyles")));
      console.log(ansis.dim("Feature coming soon - will show installed workflows"));
      break;
    }
    case "2": {
      const status = await checkSuperpowersInstalled();
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t("superpowers:status.notInstalled")));
        break;
      }
      const skills = await getSuperpowersSkills();
      if (skills.length === 0) {
        console.log(ansis.yellow(i18n.t("menu:ccjkFeatures.noSkillsInstalled")));
      } else {
        console.log(ansis.green(i18n.t("menu:ccjkFeatures.skillCount", { count: skills.length })));
        console.log("");
        skills.forEach((skill) => {
          console.log(`  ${ansis.green("\u2022")} ${skill}`);
        });
      }
      break;
    }
    case "3": {
      await update({ skipBanner: true });
      break;
    }
    case "4": {
      printSeparator();
      await showQuickActionsMenu();
      return;
    }
    case "5": {
      printSeparator();
      await showSmartGuideMenu();
      return;
    }
    case "0":
      return;
    default:
      return;
  }
  printSeparator();
}
async function showOutputStylesMenu() {
  console.log(ansis.green(i18n.t("menu:ccjkFeatures.outputStylesTitle")));
  console.log("");
  console.log(ansis.green(i18n.t("menu:ccjkFeatures.availableStyles")));
  console.log(`  ${ansis.green("\u2022")} speed-coder`);
  console.log(`  ${ansis.green("\u2022")} senior-architect`);
  console.log(`  ${ansis.green("\u2022")} pair-programmer`);
  console.log(`  ${ansis.green("\u2022")} expert-concise`);
  console.log(`  ${ansis.green("\u2022")} teaching-mode`);
  console.log(`  ${ansis.green("\u2022")} casual-friendly`);
  console.log(`  ${ansis.green("\u2022")} technical-precise`);
  console.log("");
  console.log(ansis.dim('Tip: Output styles are configured during initialization or via "Configure Claude global memory"'));
  printSeparator();
}
async function showConfigSwitchMenu() {
  console.log(ansis.green(i18n.t("menu:ccjkFeatures.configSwitchTitle")));
  console.log("");
  await configSwitchCommand({ codeType: "claude-code" });
}
function printCcjkFeaturesSection() {
  console.log(`  -------- ${i18n.t("menu:menuSections.smartFeatures")} --------`);
  console.log(
    `  ${ansis.green("A.")} ${i18n.t("menu:menuOptions.quickActions")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.quickActions")}`)}`
  );
  console.log(
    `  ${ansis.green("G.")} ${i18n.t("menu:menuOptions.smartGuide")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.smartGuide")}`)}`
  );
  console.log(
    `  ${ansis.green("D.")} ${i18n.t("menu:menuOptions.doctor")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.doctor")}`)}`
  );
  console.log("");
  console.log(`  -------- ${i18n.t("menu:menuSections.ccjkFeatures")} --------`);
  console.log(
    `  ${ansis.green("W.")} ${i18n.t("menu:menuOptions.workflowsAndSkills")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.workflowsAndSkills")}`)}`
  );
  console.log(
    `  ${ansis.green("O.")} ${i18n.t("menu:menuOptions.outputStyles")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.outputStyles")}`)}`
  );
  console.log(
    `  ${ansis.green("C.")} ${i18n.t("menu:menuOptions.configSwitch")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.configSwitch")}`)}`
  );
  console.log("");
}
function printRecommendedPluginsSection() {
  console.log(`  -------- ${i18n.t("menu:menuSections.recommendedPlugins")} --------`);
  console.log(
    `  ${ansis.green("R.")} ${i18n.t("menu:menuOptions.ccrManagement")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.ccrManagement")}`)}`
  );
  console.log(
    `  ${ansis.green("U.")} ${i18n.t("menu:menuOptions.ccusage")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.ccusage")}`)}`
  );
  console.log(
    `  ${ansis.green("L.")} ${i18n.t("menu:menuOptions.cometixLine")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.cometixLine")}`)}`
  );
  console.log(
    `  ${ansis.green("P.")} ${i18n.t("menu:menuOptions.superpowers")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.superpowers")}`)}`
  );
  console.log(
    `  ${ansis.green("M.")} ${i18n.t("menu:menuOptions.marketplace")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.marketplace")}`)}`
  );
  console.log("");
}
function printCloudServicesSection() {
  console.log(`  -------- ${i18n.t("menu:menuSections.cloudServices")} --------`);
  console.log(
    `  ${ansis.green("N.")} ${i18n.t("menu:menuOptions.cloudNotification")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.cloudNotification")}`)}`
  );
  console.log(
    `  ${ansis.green("K.")} ${i18n.t("menu:menuOptions.mcpMarket")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.mcpMarket")}`)}`
  );
  console.log(
    `  ${ansis.green("H.")} ${i18n.t("menu:menuOptions.hooksSync")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.hooksSync")}`)}`
  );
  console.log("");
}
function printZcfSection(options) {
  console.log("  ------------ CCJK ------------");
  console.log(
    `  ${ansis.green("0.")} ${i18n.t("menu:menuOptions.changeLanguage")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.changeLanguage")}`)}`
  );
  console.log(
    `  ${ansis.green("S.")} ${i18n.t("menu:menuOptions.switchCodeTool")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.switchCodeTool")}`)}`
  );
  console.log(
    `  ${ansis.green("-.")} ${options.uninstallOption} ${ansis.gray(`- ${options.uninstallDescription}`)}`
  );
  console.log(
    `  ${ansis.green("+.")} ${options.updateOption} ${ansis.gray(`- ${options.updateDescription}`)}`
  );
  console.log(`  ${ansis.red("Q.")} ${ansis.red(i18n.t("menu:menuOptions.exit"))}`);
  console.log("");
}
async function oneClickCheckup() {
  console.log(ansis.green(i18n.t("menu:oneClick.running")));
  console.log("");
  await doctor();
  await workspaceDiagnostics();
  console.log("");
  console.log(ansis.green(i18n.t("menu:oneClick.fixComplete")));
}
async function oneClickUpdate() {
  console.log(ansis.green(i18n.t("menu:oneClick.running")));
  console.log("");
  await checkUpdates();
  console.log("");
  console.log(ansis.green(i18n.t("menu:oneClick.updateComplete")));
}
async function showMoreFeaturesMenu() {
  let stayInMenu = true;
  while (stayInMenu) {
    const codeTool = getCurrentCodeTool();
    displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || "CCJK");
    console.log(ansis.green.bold(i18n.t("menu:moreMenu.title")));
    console.log("");
    console.log(`  ${ansis.green.bold(i18n.t("menu:moreMenu.extensions"))}`);
    console.log(
      `  ${ansis.white("1.")} ${ansis.white(i18n.t("menu:pluginsMenu.ccr"))} ${ansis.dim(`- ${i18n.t("menu:pluginsMenu.ccrDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("2.")} ${ansis.white(i18n.t("menu:pluginsMenu.ccusage"))} ${ansis.dim(`- ${i18n.t("menu:pluginsMenu.ccusageDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("3.")} ${ansis.white(i18n.t("menu:pluginsMenu.cometix"))} ${ansis.dim(`- ${i18n.t("menu:pluginsMenu.cometixDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("4.")} ${ansis.white(i18n.t("menu:pluginsMenu.superpowers"))} ${ansis.dim(`- ${i18n.t("menu:pluginsMenu.superpowersDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("5.")} ${ansis.white(i18n.t("menu:categorizedMenu.mcpMarket"))} ${ansis.dim(`- ${i18n.t("menu:categorizedMenu.mcpMarketDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("6.")} ${ansis.white(i18n.t("menu:categorizedMenu.marketplace"))} ${ansis.dim(`- ${i18n.t("menu:categorizedMenu.marketplaceDesc")}`)}`
    );
    console.log("");
    console.log(`  ${ansis.green.bold(i18n.t("menu:moreMenu.config"))}`);
    console.log(
      `  ${ansis.white("7.")} ${ansis.white(i18n.t("menu:configCenter.memory"))} ${ansis.dim(`- ${i18n.t("menu:configCenter.memoryDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("8.")} ${ansis.white(i18n.t("menu:configCenter.permission"))} ${ansis.dim(`- ${i18n.t("menu:configCenter.permissionDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("9.")} ${ansis.white(i18n.t("menu:configCenter.configSwitch"))} ${ansis.dim(`- ${i18n.t("menu:configCenter.configSwitchDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("10.")} ${ansis.white(i18n.t("menu:configCenter.context"))} ${ansis.dim(`- ${i18n.t("menu:configCenter.contextDesc")}`)}`
    );
    console.log("");
    console.log(`  ${ansis.green.bold(i18n.t("menu:moreMenu.system"))}`);
    console.log(
      `  ${ansis.white("11.")} ${ansis.white(i18n.t("menu:menuOptions.changeLanguage").split(" / ")[0])} ${ansis.dim(`- ${i18n.t("menu:menuDescriptions.changeLanguage")}`)}`
    );
    console.log(
      `  ${ansis.white("12.")} ${ansis.white(i18n.t("menu:menuOptions.switchCodeTool"))} ${ansis.dim(`- ${i18n.t("menu:menuDescriptions.switchCodeTool")}`)}`
    );
    console.log(
      `  ${ansis.white("13.")} ${ansis.white(i18n.t("menu:categorizedMenu.diagnostics"))} ${ansis.dim(`- ${i18n.t("menu:categorizedMenu.diagnosticsDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("14.")} ${ansis.white(i18n.t("menu:categorizedMenu.workspace"))} ${ansis.dim(`- ${i18n.t("menu:categorizedMenu.workspaceDesc")}`)}`
    );
    console.log(
      `  ${ansis.white("15.")} ${ansis.white(i18n.t("menu:menuOptions.uninstall"))} ${ansis.dim(`- ${i18n.t("menu:menuDescriptions.uninstall")}`)}`
    );
    console.log("");
    console.log(`  ${ansis.green("0.")} ${ansis.green(i18n.t("common:back"))}`);
    console.log("");
    const validChoices = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
    const { choice } = await inquirer.prompt({
      type: "input",
      name: "choice",
      message: i18n.t("common:enterChoice"),
      validate: (value) => {
        return validChoices.includes(value) || i18n.t("common:invalidChoice");
      }
    });
    if (!choice || choice === "0") {
      stayInMenu = false;
      continue;
    }
    printSeparator();
    switch (choice) {
      // Extensions
      case "1":
        await runCcrMenuFeature();
        break;
      case "2":
        await runCcusageFeature();
        break;
      case "3":
        await runCometixMenuFeature();
        break;
      case "4":
        await showSuperpowersMenu();
        break;
      case "5":
        await showMcpMarketMenu();
        break;
      case "6":
        await showMarketplaceMenu();
        break;
      // Config
      case "7":
        await configureAiMemoryFeature();
        break;
      case "8":
        await configureEnvPermissionFeature();
        break;
      case "9":
        await showConfigSwitchMenu();
        break;
      case "10":
        await showContextMenu();
        break;
      // System
      case "11": {
        const currentLang = i18n.language;
        await changeScriptLanguageFeature(currentLang);
        break;
      }
      case "12":
        await handleCodeToolSwitch("claude-code");
        break;
      case "13":
        await doctor();
        break;
      case "14":
        await workspaceDiagnostics();
        break;
      case "15":
        await uninstall();
        break;
    }
    if (stayInMenu) {
      printSeparator();
    }
  }
}
async function showCategorizedMenu() {
  console.log(ansis.green.bold(i18n.t("menu:oneClick.title")));
  console.log("");
  console.log(`  ${ansis.green.bold(i18n.t("menu:menuSections.quickStart"))}`);
  console.log(
    `  ${ansis.white("1.")} ${ansis.white(i18n.t("menu:oneClick.setup"))} ${ansis.dim(`- ${i18n.t("menu:oneClick.setupDesc")}`)}`
  );
  console.log(
    `  ${ansis.white("2.")} ${ansis.white(i18n.t("menu:oneClick.fix"))} ${ansis.dim(`- ${i18n.t("menu:oneClick.fixDesc")}`)}`
  );
  console.log(
    `  ${ansis.white("3.")} ${ansis.white(i18n.t("menu:oneClick.update"))} ${ansis.dim(`- ${i18n.t("menu:oneClick.updateDesc")}`)}`
  );
  console.log(
    `  ${ansis.white("4.")} ${ansis.white(i18n.t("menu:oneClick.notify"))} ${ansis.dim(`- ${i18n.t("menu:oneClick.notifyDesc")}`)}`
  );
  console.log("");
  console.log(`  ${ansis.green.bold(i18n.t("menu:menuSections.configCenter"))}`);
  console.log(
    `  ${ansis.white("5.")} ${ansis.white(i18n.t("menu:configCenter.api"))} ${ansis.dim(`- ${i18n.t("menu:configCenter.apiDesc")}`)}`
  );
  console.log(
    `  ${ansis.white("6.")} ${ansis.white(i18n.t("menu:configCenter.mcp"))} ${ansis.dim(`- ${i18n.t("menu:configCenter.mcpDesc")}`)}`
  );
  console.log(
    `  ${ansis.white("7.")} ${ansis.white(i18n.t("menu:configCenter.model"))} ${ansis.dim(`- ${i18n.t("menu:configCenter.modelDesc")}`)}`
  );
  console.log("");
  console.log(`  ${ansis.dim("\u2500".repeat(50))}`);
  console.log(
    `  ${ansis.white("8.")} ${ansis.white(i18n.t("menu:oneClick.more"))} \u2192 ${ansis.dim(i18n.t("menu:oneClick.moreDesc"))}`
  );
  console.log("");
  console.log(
    `  ${ansis.green("0.")} ${ansis.green(i18n.t("menu:menuOptions.changeLanguage").split(" / ")[0])}  ${ansis.red("Q.")} ${ansis.red(i18n.t("menu:menuOptions.exit"))}`
  );
  console.log("");
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "5", "6", "7", "8", "0", "q", "Q"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return "exit";
  }
  const normalized = choice.toLowerCase();
  switch (normalized) {
    // One-click setup
    case "1":
      await init({ skipBanner: true });
      break;
    // One-click checkup (diagnose + fix)
    case "2":
      await oneClickCheckup();
      break;
    // One-click update
    case "3":
      await oneClickUpdate();
      break;
    // Task notifications
    case "4":
      await notificationCommand();
      break;
    // API Config (Important Setting)
    case "5":
      await configureApiFeature();
      break;
    // MCP Config (Important Setting)
    case "6":
      await configureMcpFeature();
      break;
    // Default Model (Important Setting)
    case "7":
      await configureDefaultModelFeature();
      break;
    // More features submenu
    case "8":
      printSeparator();
      await showMoreFeaturesMenu();
      return void 0;
    // Change language
    case "0": {
      const currentLang = i18n.language;
      await changeScriptLanguageFeature(currentLang);
      break;
    }
    // Exit
    case "q":
      console.log(ansis.green(i18n.t("common:goodbye")));
      return "exit";
    default:
      return void 0;
  }
  printSeparator();
  const shouldContinue = await promptBoolean({
    message: i18n.t("common:returnToMenu"),
    defaultValue: true
  });
  if (!shouldContinue) {
    console.log(ansis.green(i18n.t("common:goodbye")));
    return "exit";
  }
  return void 0;
}
async function showClaudeCodeMenu() {
  console.log(ansis.green(i18n.t("menu:selectFunction")));
  console.log("  -------- Claude Code --------");
  console.log(
    `  ${ansis.green("1.")} ${i18n.t("menu:menuOptions.fullInit")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.fullInit")}`)}`
  );
  console.log(
    `  ${ansis.green("2.")} ${i18n.t("menu:menuOptions.importWorkflow")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.importWorkflow")}`)}`
  );
  console.log(
    `  ${ansis.green("3.")} ${i18n.t("menu:menuOptions.configureApiOrCcr")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.configureApiOrCcr")}`)}`
  );
  console.log(
    `  ${ansis.green("4.")} ${i18n.t("menu:menuOptions.configureMcp")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.configureMcp")}`)}`
  );
  console.log(
    `  ${ansis.green("5.")} ${i18n.t("menu:menuOptions.configureModel")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.configureModel")}`)}`
  );
  console.log(
    `  ${ansis.green("6.")} ${i18n.t("menu:menuOptions.configureAiMemory")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.configureAiMemory")}`)}`
  );
  console.log(
    `  ${ansis.green("7.")} ${i18n.t("menu:menuOptions.configureEnvPermission")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.configureEnvPermission")}`)}`
  );
  console.log("");
  printCcjkFeaturesSection();
  printRecommendedPluginsSection();
  printCloudServicesSection();
  printZcfSection({
    uninstallOption: i18n.t("menu:menuOptions.uninstall"),
    uninstallDescription: i18n.t("menu:menuDescriptions.uninstall"),
    updateOption: i18n.t("menu:menuOptions.checkUpdates"),
    updateDescription: i18n.t("menu:menuDescriptions.checkUpdates")
  });
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "5", "6", "7", "a", "A", "g", "G", "d", "D", "w", "W", "o", "O", "c", "C", "r", "R", "u", "U", "l", "L", "p", "P", "m", "M", "n", "N", "k", "K", "0", "-", "+", "s", "S", "q", "Q", "h", "H"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return "exit";
  }
  const normalized = choice.toLowerCase();
  switch (normalized) {
    case "1":
      await init({ skipBanner: true });
      break;
    case "2":
      await update({ skipBanner: true });
      break;
    case "3":
      await configureApiFeature();
      break;
    case "4":
      await configureMcpFeature();
      break;
    case "5":
      await configureDefaultModelFeature();
      break;
    case "6":
      await configureAiMemoryFeature();
      break;
    case "7":
      await configureEnvPermissionFeature();
      break;
    // Smart Features
    case "a":
      await showQuickActionsMenu();
      break;
    case "g":
      await showSmartGuideMenu();
      break;
    case "d":
      await doctor();
      break;
    // CCJK Features
    case "w":
      await showWorkflowsAndSkillsMenu();
      break;
    case "o":
      await showOutputStylesMenu();
      break;
    case "c":
      await showConfigSwitchMenu();
      break;
    case "r":
      await runCcrMenuFeature();
      break;
    case "u":
      await runCcusageFeature();
      break;
    case "l":
      await runCometixMenuFeature();
      break;
    case "p":
      await showSuperpowersMenu();
      break;
    case "m":
      await showMarketplaceMenu();
      break;
    // Cloud Services
    case "n":
      await notificationCommand();
      break;
    case "k":
      await showMcpMarketMenu();
      break;
    case "h":
      await showHooksSyncMenu();
      break;
    case "0": {
      const currentLang = i18n.language;
      await changeScriptLanguageFeature(currentLang);
      break;
    }
    case "-":
      await uninstall();
      break;
    case "+":
      await checkUpdates();
      break;
    case "s": {
      const switched = await handleCodeToolSwitch("claude-code");
      if (switched) {
        return "switch";
      }
      break;
    }
    case "q":
      console.log(ansis.green(i18n.t("common:goodbye")));
      return "exit";
    default:
      return void 0;
  }
  printSeparator();
  const shouldContinue = await promptBoolean({
    message: i18n.t("common:returnToMenu"),
    defaultValue: true
  });
  if (!shouldContinue) {
    console.log(ansis.green(i18n.t("common:goodbye")));
    return "exit";
  }
  return void 0;
}
async function showCodexMenu() {
  console.log(ansis.green(i18n.t("menu:selectFunction")));
  console.log("  -------- Codex --------");
  console.log(
    `  ${ansis.green("1.")} ${i18n.t("menu:menuOptions.codexFullInit")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.codexFullInit")}`)}`
  );
  console.log(
    `  ${ansis.green("2.")} ${i18n.t("menu:menuOptions.codexImportWorkflow")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.codexImportWorkflow")}`)}`
  );
  console.log(
    `  ${ansis.green("3.")} ${i18n.t("menu:menuOptions.codexConfigureApi")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.codexConfigureApi")}`)}`
  );
  console.log(
    `  ${ansis.green("4.")} ${i18n.t("menu:menuOptions.codexConfigureMcp")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.codexConfigureMcp")}`)}`
  );
  console.log(
    `  ${ansis.green("5.")} ${i18n.t("menu:menuOptions.codexConfigureModel")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.codexConfigureModel")}`)}`
  );
  console.log(
    `  ${ansis.green("6.")} ${i18n.t("menu:menuOptions.codexConfigureAiMemory")} ${ansis.gray(`- ${i18n.t("menu:menuDescriptions.codexConfigureAiMemory")}`)}`
  );
  console.log("");
  printZcfSection({
    uninstallOption: i18n.t("menu:menuOptions.codexUninstall"),
    uninstallDescription: i18n.t("menu:menuDescriptions.codexUninstall"),
    updateOption: i18n.t("menu:menuOptions.codexCheckUpdates"),
    updateDescription: i18n.t("menu:menuDescriptions.codexCheckUpdates")
  });
  const { choice } = await inquirer.prompt({
    type: "input",
    name: "choice",
    message: i18n.t("common:enterChoice"),
    validate: (value) => {
      const valid = ["1", "2", "3", "4", "5", "6", "0", "-", "+", "s", "S", "q", "Q"];
      return valid.includes(value) || i18n.t("common:invalidChoice");
    }
  });
  if (!choice) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return "exit";
  }
  const normalized = choice.toLowerCase();
  switch (normalized) {
    case "1":
      await runCodexFullInit();
      break;
    case "2":
      await runCodexWorkflowImportWithLanguageSelection();
      break;
    case "3":
      await configureCodexApi();
      break;
    case "4":
      await configureCodexMcp();
      break;
    case "5":
      await configureCodexDefaultModelFeature();
      break;
    case "6":
      await configureCodexAiMemoryFeature();
      break;
    case "0": {
      const currentLang = i18n.language;
      await changeScriptLanguageFeature(currentLang);
      printSeparator();
      return void 0;
    }
    case "-":
      await runCodexUninstall();
      printSeparator();
      return void 0;
    case "+":
      await runCodexUpdate();
      printSeparator();
      return void 0;
    case "s": {
      const switched = await handleCodeToolSwitch("codex");
      if (switched) {
        return "switch";
      }
      printSeparator();
      return void 0;
    }
    case "q":
      console.log(ansis.green(i18n.t("common:goodbye")));
      return "exit";
    default:
      return void 0;
  }
  printSeparator();
  const shouldContinue = await promptBoolean({
    message: i18n.t("common:returnToMenu"),
    defaultValue: true
  });
  if (!shouldContinue) {
    console.log(ansis.green(i18n.t("common:goodbye")));
    return "exit";
  }
  return void 0;
}
async function isFirstTimeUser() {
  const config = readZcfConfig();
  if (!config || !config.version) {
    return true;
  }
  if (!existsSync(join(CLAUDE_DIR, "commands"))) {
    return true;
  }
  return false;
}
async function showNewUserWelcome() {
  const { version } = await import('./package.mjs');
  console.log("");
  console.log(ansis.green.bold("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u2551") + ansis.white.bold("     \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557      \u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557                                 ") + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.white.bold("    \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D      \u2588\u2588\u2551\u2588\u2588\u2551 \u2588\u2588\u2554\u255D                                 ") + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.white.bold("    \u2588\u2588\u2551      \u2588\u2588\u2551           \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2554\u255D                                  ") + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.white.bold("    \u2588\u2588\u2551      \u2588\u2588\u2551      \u2588\u2588   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2588\u2588\u2557                                  ") + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.white.bold("    \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u255A\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2557                                 ") + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.white.bold("     \u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D                                 ") + ansis.green.bold("\u2551"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u2551") + ansis.gray(`                    Claude Code JinKu - v${version}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u2551") + ansis.yellow.bold(`   ${i18n.t("menu:newUser.welcomeTitle")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u2551") + ansis.white(`   ${i18n.t("menu:newUser.welcomeDesc1")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.white(`   ${i18n.t("menu:newUser.welcomeDesc2")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u2551") + ansis.green(`   ${i18n.t("menu:newUser.highlights")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.gray(`     \u2022 ${i18n.t("menu:newUser.highlight1")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.gray(`     \u2022 ${i18n.t("menu:newUser.highlight2")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.gray(`     \u2022 ${i18n.t("menu:newUser.highlight3")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(ansis.green.bold("\u2551") + ansis.gray(`     \u2022 ${i18n.t("menu:newUser.highlight4")}`.padEnd(72)) + ansis.green.bold("\u2551"));
  console.log(`${ansis.green.bold("\u2551")}                                                                        ${ansis.green.bold("\u2551")}`);
  console.log(ansis.green.bold("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"));
  console.log("");
  const { mode } = await inquirer.prompt({
    type: "list",
    name: "mode",
    message: i18n.t("menu:newUser.selectPrompt"),
    choices: [
      {
        name: ansis.green.bold(i18n.t("menu:newUser.quickStart")) + ansis.dim(` - ${i18n.t("menu:newUser.quickStartDesc")}`),
        value: "quick"
      },
      {
        name: ansis.green(i18n.t("menu:newUser.fullConfig")) + ansis.dim(` - ${i18n.t("menu:newUser.fullConfigDesc")}`),
        value: "full"
      },
      {
        name: ansis.yellow(i18n.t("menu:newUser.viewHelp")) + ansis.dim(` - ${i18n.t("menu:newUser.viewHelpDesc")}`),
        value: "help"
      }
    ],
    loop: false,
    pageSize: 10
  });
  return mode;
}
async function showFeaturesOverview() {
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("menu:newUser.featuresTitle")));
  console.log("");
  console.log(ansis.green(i18n.t("menu:newUser.coreFeatures")));
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.feature.api")}`);
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.feature.workflow")}`);
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.feature.mcp")}`);
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.feature.outputStyle")}`);
  console.log("");
  console.log(ansis.green(i18n.t("menu:newUser.recommendedPlugins")));
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.plugin.ccr")}`);
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.plugin.ccusage")}`);
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.plugin.cometix")}`);
  console.log(`  ${ansis.green("\u2022")} ${i18n.t("menu:newUser.plugin.superpowers")}`);
  console.log("");
  console.log(ansis.dim(i18n.t("menu:newUser.pressEnter")));
  await inquirer.prompt([{ type: "input", name: "continue", message: "" }]);
}
async function showMainMenu(options = {}) {
  try {
    if (await isFirstTimeUser()) {
      const mode = await showNewUserWelcome();
      if (mode === "quick") {
        await init({ skipPrompt: false });
        return;
      } else if (mode === "help") {
        await showFeaturesOverview();
        return showMainMenu(options);
      }
    }
    if (options.codeType) {
      try {
        const resolvedType = await resolveCodeType(options.codeType);
        const currentType = getCurrentCodeTool();
        if (resolvedType !== currentType) {
          updateZcfConfig({ codeToolType: resolvedType });
          console.log(ansis.green(`\u2714 ${i18n.t("menu:codeToolSwitched", { tool: getCodeToolLabel(resolvedType) })}`));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(ansis.yellow(errorMessage));
      }
    }
    const useLegacyMenu = options.legacyMenu || process__default.env.CCJK_LEGACY_MENU === "1";
    let exitMenu = false;
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool();
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || "CCJK");
      let result;
      if (codeTool === "codex") {
        result = await showCodexMenu();
      } else if (useLegacyMenu) {
        result = await showClaudeCodeMenu();
      } else {
        result = await showCategorizedMenu();
      }
      if (result === "exit") {
        exitMenu = true;
      } else if (result === "switch") {
        continue;
      }
    }
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}

const menu = {
  __proto__: null,
  showMainMenu: showMainMenu
};

export { showMainMenu as a, menu as m, showCcrMenu as s };
