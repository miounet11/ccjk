import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const INSTALL_DIR = join(homedir(), ".agent-browser");
const BIN_PATH = join(INSTALL_DIR, "bin", "agent-browser");
function getInstallPath() {
  return INSTALL_DIR;
}
async function checkAgentBrowserInstalled() {
  try {
    const { execSync } = await import('node:child_process');
    execSync("which agent-browser 2>/dev/null || where agent-browser 2>nul", {
      encoding: "utf-8",
      stdio: "pipe"
    });
    return true;
  } catch {
  }
  if (existsSync(BIN_PATH)) {
    return true;
  }
  try {
    const { execSync } = await import('node:child_process');
    execSync("npx --yes @anthropic-ai/agent-browser --version 2>/dev/null", {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 1e4
    });
    return true;
  } catch {
  }
  return false;
}
async function installAgentBrowser(options = {}) {
  console.log(`
${bold(cyan("Installing Agent Browser..."))}
`);
  if (!options.force) {
    const installed = await checkAgentBrowserInstalled();
    if (installed) {
      console.log(`${green("\u2713")} Agent Browser is already installed`);
      console.log(`  ${gray("Use --force to reinstall")}
`);
      return true;
    }
  }
  const { execSync } = await import('node:child_process');
  const { mkdirSync } = await import('node:fs');
  try {
    mkdirSync(INSTALL_DIR, { recursive: true });
    console.log(`${cyan("Step 1/3:")} Installing via npm...`);
    try {
      execSync("npm install -g @anthropic-ai/agent-browser 2>&1", {
        encoding: "utf-8",
        stdio: options.verbose ? "inherit" : "pipe"
      });
      console.log(`  ${green("\u2713")} npm package installed globally`);
    } catch {
      console.log(`  ${yellow("!")} Global install failed, trying local install...`);
      execSync(`npm install @anthropic-ai/agent-browser --prefix "${INSTALL_DIR}" 2>&1`, {
        encoding: "utf-8",
        stdio: options.verbose ? "inherit" : "pipe"
      });
      console.log(`  ${green("\u2713")} npm package installed locally`);
    }
    console.log(`
${cyan("Step 2/3:")} Installing Playwright browsers...`);
    try {
      execSync("npx playwright install chromium 2>&1", {
        encoding: "utf-8",
        stdio: options.verbose ? "inherit" : "pipe",
        timeout: 3e5
        // 5 minutes
      });
      console.log(`  ${green("\u2713")} Chromium browser installed`);
    } catch (error) {
      console.log(`  ${yellow("!")} Playwright browser installation may have issues`);
      if (options.verbose && error instanceof Error) {
        console.log(`    ${gray(error.message)}`);
      }
    }
    console.log(`
${cyan("Step 3/3:")} Verifying installation...`);
    const verified = await checkAgentBrowserInstalled();
    if (verified) {
      console.log(`  ${green("\u2713")} Installation verified`);
      console.log(`
${green("\u2713")} ${bold("Agent Browser installed successfully!")}
`);
      showQuickStart();
      return true;
    } else {
      console.log(`  ${red("\u2717")} Verification failed`);
      console.log(`
${yellow("Try manual installation:")}`);
      console.log(`  npm install -g @anthropic-ai/agent-browser`);
      console.log(`  npx playwright install chromium
`);
      return false;
    }
  } catch (error) {
    console.error(`
${red("\u2717")} Installation failed`);
    if (error instanceof Error) {
      console.error(`  ${gray("Error:")} ${error.message}`);
    }
    console.log(`
${yellow("Manual installation:")}`);
    console.log(`  ${cyan("1.")} npm install -g @anthropic-ai/agent-browser`);
    console.log(`  ${cyan("2.")} npx playwright install chromium`);
    console.log(`  ${cyan("3.")} agent-browser --version
`);
    return false;
  }
}
async function uninstallAgentBrowser(options = {}) {
  console.log(`
${bold(cyan("Uninstalling Agent Browser..."))}
`);
  const { execSync } = await import('node:child_process');
  const { rmSync } = await import('node:fs');
  try {
    console.log(`${cyan("Step 1/2:")} Removing npm package...`);
    try {
      execSync("npm uninstall -g @anthropic-ai/agent-browser 2>&1", {
        encoding: "utf-8",
        stdio: options.verbose ? "inherit" : "pipe"
      });
      console.log(`  ${green("\u2713")} Global package removed`);
    } catch {
      console.log(`  ${gray("-")} No global package found`);
    }
    console.log(`
${cyan("Step 2/2:")} Cleaning up local files...`);
    if (existsSync(INSTALL_DIR)) {
      rmSync(INSTALL_DIR, { recursive: true, force: true });
      console.log(`  ${green("\u2713")} Local files removed`);
    } else {
      console.log(`  ${gray("-")} No local files found`);
    }
    console.log(`
${green("\u2713")} ${bold("Agent Browser uninstalled successfully!")}
`);
    return true;
  } catch (error) {
    console.error(`
${red("\u2717")} Uninstallation failed`);
    if (error instanceof Error) {
      console.error(`  ${gray("Error:")} ${error.message}`);
    }
    return false;
  }
}
function showQuickStart() {
  console.log(`${yellow("Quick Start:")}`);
  console.log(`  ${gray("# Open a webpage")}`);
  console.log(`  ${cyan("agent-browser open https://example.com")}`);
  console.log();
  console.log(`  ${gray("# Get interactive elements")}`);
  console.log(`  ${cyan("agent-browser snapshot -i")}`);
  console.log();
  console.log(`  ${gray("# Click an element by ref")}`);
  console.log(`  ${cyan("agent-browser click @e1")}`);
  console.log();
  console.log(`  ${gray("# Take a screenshot")}`);
  console.log(`  ${cyan("agent-browser screenshot page.png")}`);
  console.log();
  console.log(`  ${gray("# Close the browser")}`);
  console.log(`  ${cyan("agent-browser close")}`);
  console.log();
  console.log(`${gray("For full documentation, run")} ${cyan("/browser")} ${gray("in Claude Code")}`);
  console.log();
}

export { checkAgentBrowserInstalled, getInstallPath, installAgentBrowser, uninstallAgentBrowser };
