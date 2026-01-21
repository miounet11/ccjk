import process__default from 'node:process';
import { checkAgentBrowserInstalled, getInstallPath } from './installer.mjs';
import 'node:fs';
import 'node:os';
import 'node:path';

class AgentBrowserSession {
  options;
  isRunning = false;
  sessionId = null;
  constructor(options = {}) {
    this.options = {
      headless: true,
      verbose: false,
      timeout: 3e4,
      browser: "chromium",
      ...options
    };
  }
  /**
   * 启动浏览器会话
   */
  async start() {
    if (this.isRunning) {
      if (this.options.verbose) {
        console.log(`${yellow("!")} Session already running`);
      }
      return;
    }
    try {
      const { execSync } = await import('node:child_process');
      this.sessionId = `session-${Date.now()}`;
      const headlessFlag = this.options.headless ? "" : "--headed";
      execSync(`agent-browser start ${headlessFlag} 2>/dev/null || true`, {
        encoding: "utf-8",
        stdio: "pipe"
      });
      this.isRunning = true;
      if (this.options.verbose) {
        console.log(`${green("\u2713")} Browser session started: ${this.sessionId}`);
      }
    } catch (error) {
      this.isRunning = false;
      throw new Error(`Failed to start browser session: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 导航到 URL
   */
  async navigate(url) {
    this.ensureRunning();
    try {
      const { execSync } = await import('node:child_process');
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      execSync(`agent-browser open "${fullUrl}"`, {
        encoding: "utf-8",
        stdio: this.options.verbose ? "inherit" : "pipe",
        timeout: this.options.timeout
      });
      if (this.options.verbose) {
        console.log(`${green("\u2713")} Navigated to: ${fullUrl}`);
      }
    } catch (error) {
      throw new Error(`Failed to navigate: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 获取页面快照
   */
  async snapshot(options = {}) {
    this.ensureRunning();
    try {
      const { execSync } = await import('node:child_process');
      const flags = [];
      if (options.interactive)
        flags.push("-i");
      if (options.compact)
        flags.push("-c");
      if (options.depth)
        flags.push(`-d ${options.depth}`);
      if (options.json)
        flags.push("--json");
      const result = execSync(`agent-browser snapshot ${flags.join(" ")}`, {
        encoding: "utf-8",
        timeout: this.options.timeout
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to get snapshot: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 点击元素
   */
  async click(ref) {
    this.ensureRunning();
    try {
      const { execSync } = await import('node:child_process');
      const refId = ref.startsWith("@") ? ref : `@${ref}`;
      execSync(`agent-browser click ${refId}`, {
        encoding: "utf-8",
        stdio: this.options.verbose ? "inherit" : "pipe",
        timeout: this.options.timeout
      });
      if (this.options.verbose) {
        console.log(`${green("\u2713")} Clicked: ${refId}`);
      }
    } catch (error) {
      throw new Error(`Failed to click: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 填充输入框
   */
  async fill(ref, text) {
    this.ensureRunning();
    try {
      const { execSync } = await import('node:child_process');
      const refId = ref.startsWith("@") ? ref : `@${ref}`;
      execSync(`agent-browser fill ${refId} "${text.replace(/"/g, '\\"')}"`, {
        encoding: "utf-8",
        stdio: this.options.verbose ? "inherit" : "pipe",
        timeout: this.options.timeout
      });
      if (this.options.verbose) {
        console.log(`${green("\u2713")} Filled ${refId}: ${text}`);
      }
    } catch (error) {
      throw new Error(`Failed to fill: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 获取元素文本
   */
  async getText(ref) {
    this.ensureRunning();
    try {
      const { execSync } = await import('node:child_process');
      const refId = ref.startsWith("@") ? ref : `@${ref}`;
      const result = execSync(`agent-browser get text ${refId}`, {
        encoding: "utf-8",
        timeout: this.options.timeout
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to get text: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 截图
   */
  async screenshot(path, fullPage = false) {
    this.ensureRunning();
    try {
      const { execSync } = await import('node:child_process');
      const flags = [];
      if (fullPage)
        flags.push("--full");
      if (path)
        flags.push(path);
      const result = execSync(`agent-browser screenshot ${flags.join(" ")}`, {
        encoding: "utf-8",
        timeout: this.options.timeout
      });
      if (this.options.verbose) {
        console.log(`${green("\u2713")} Screenshot saved: ${path || "screenshot.png"}`);
      }
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 等待
   */
  async wait(condition) {
    this.ensureRunning();
    try {
      const { execSync } = await import('node:child_process');
      let cmd;
      if (typeof condition === "number") {
        cmd = `agent-browser wait ${condition}`;
      } else if (condition.startsWith("@")) {
        cmd = `agent-browser wait ${condition}`;
      } else {
        cmd = `agent-browser wait --text "${condition}"`;
      }
      execSync(cmd, {
        encoding: "utf-8",
        stdio: this.options.verbose ? "inherit" : "pipe",
        timeout: this.options.timeout
      });
    } catch (error) {
      throw new Error(`Failed to wait: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * 关闭会话
   */
  async close() {
    if (!this.isRunning) {
      return;
    }
    try {
      const { execSync } = await import('node:child_process');
      execSync("agent-browser close 2>/dev/null || true", {
        encoding: "utf-8",
        stdio: "pipe"
      });
      this.isRunning = false;
      this.sessionId = null;
      if (this.options.verbose) {
        console.log(`${green("\u2713")} Browser session closed`);
      }
    } catch {
      this.isRunning = false;
      this.sessionId = null;
    }
  }
  /**
   * 获取会话状态
   */
  getStatus() {
    return {
      running: this.isRunning,
      sessionId: this.sessionId
    };
  }
  /**
   * 确保会话正在运行
   */
  ensureRunning() {
    if (!this.isRunning) {
      throw new Error("Browser session is not running. Call start() first.");
    }
  }
}

function agentBrowserHelp(_options) {
  console.log(`
${bold(cyan("Agent Browser"))} - ${gray("Zero-config browser automation for AI agents")}

${yellow("Usage:")}
  ccjk browser <action> [options]
  ccjk ab <action> [options]

${yellow("Actions:")}
  ${cyan("install")}     Install Agent Browser (Rust CLI + Playwright)
  ${cyan("uninstall")}   Remove Agent Browser
  ${cyan("status")}      Check installation status
  ${cyan("start")}       Start a browser session
  ${cyan("stop")}        Stop current browser session
  ${cyan("config")}      Configure browser settings

${yellow("Examples:")}
  ${gray("# Install Agent Browser")}
  ccjk browser install

  ${gray("# Check status")}
  ccjk browser status

  ${gray("# Start a session with URL")}
  ccjk browser start https://example.com

${yellow("Quick Start:")}
  ${gray("After installation, use these commands directly:")}
  agent-browser open <url>        ${gray("# Navigate to URL")}
  agent-browser snapshot -i       ${gray("# Get interactive elements")}
  agent-browser click @e1         ${gray("# Click by ref")}
  agent-browser fill @e2 "text"   ${gray("# Fill input")}
  agent-browser screenshot        ${gray("# Take screenshot")}
  agent-browser close             ${gray("# Close browser")}

${yellow("Documentation:")}
  Run ${cyan("/browser")} in Claude Code for full skill documentation
  `);
}
async function agentBrowserStatus(options) {
  console.log(`
${bold(cyan("Agent Browser Status"))}
`);
  const installed = await checkAgentBrowserInstalled();
  const installPath = getInstallPath();
  if (installed) {
    console.log(`  ${green("\u2713")} Agent Browser is ${green("installed")}`);
    console.log(`  ${gray("Path:")} ${installPath}`);
    try {
      const { execSync } = await import('node:child_process');
      const version = execSync('agent-browser --version 2>/dev/null || echo "unknown"', {
        encoding: "utf-8"
      }).trim();
      console.log(`  ${gray("Version:")} ${version}`);
    } catch {
      console.log(`  ${gray("Version:")} ${yellow("unknown")}`);
    }
    try {
      const { execSync } = await import('node:child_process');
      execSync("npx playwright --version 2>/dev/null", { encoding: "utf-8" });
      console.log(`  ${green("\u2713")} Playwright browsers available`);
    } catch {
      console.log(`  ${yellow("!")} Playwright browsers may need installation`);
      console.log(`    ${gray("Run:")} npx playwright install chromium`);
    }
  } else {
    console.log(`  ${red("\u2717")} Agent Browser is ${red("not installed")}`);
    console.log(`
  ${gray("To install, run:")}`);
    console.log(`  ${cyan("ccjk browser install")}`);
  }
  if (options.verbose) {
    console.log(`
${gray("Debug Info:")}`);
    console.log(`  ${gray("Install path:")} ${installPath}`);
    console.log(`  ${gray("Platform:")} ${process__default.platform}`);
    console.log(`  ${gray("Arch:")} ${process__default.arch}`);
  }
  console.log();
}
async function startBrowserSession(url, options = {}) {
  const installed = await checkAgentBrowserInstalled();
  if (!installed) {
    console.log(`
${red("\u2717")} Agent Browser is not installed`);
    console.log(`  ${gray("Run:")} ${cyan("ccjk browser install")} ${gray("first")}
`);
    return;
  }
  console.log(`
${cyan("Starting browser session...")}
`);
  try {
    const session = new AgentBrowserSession({
      headless: true,
      verbose: options.verbose
    });
    await session.start();
    if (url) {
      console.log(`${gray("Navigating to:")} ${url}`);
      await session.navigate(url);
    }
    console.log(`
${green("\u2713")} Browser session started`);
    console.log(`
${yellow("Available commands:")}`);
    console.log(`  agent-browser snapshot -i    ${gray("# Get interactive elements")}`);
    console.log(`  agent-browser click @e1      ${gray("# Click element")}`);
    console.log(`  agent-browser close          ${gray("# Close session")}`);
    console.log();
  } catch (error) {
    console.error(`
${red("\u2717")} Failed to start browser session`);
    if (options.verbose && error instanceof Error) {
      console.error(`  ${gray("Error:")} ${error.message}`);
    }
    console.log(`
${gray("Try running:")} ${cyan("ccjk browser install")} ${gray("to reinstall")}
`);
  }
}
async function stopBrowserSession(options = {}) {
  console.log(`
${cyan("Stopping browser session...")}
`);
  try {
    const { execSync } = await import('node:child_process');
    execSync("agent-browser close 2>/dev/null || true", { encoding: "utf-8" });
    console.log(`${green("\u2713")} Browser session stopped
`);
  } catch (error) {
    if (options.verbose && error instanceof Error) {
      console.log(`${yellow("!")} No active session found or already closed`);
      console.log(`  ${gray("Error:")} ${error.message}`);
    } else {
      console.log(`${yellow("!")} No active session found
`);
    }
  }
}
async function configureBrowser(options = {}) {
  console.log(`
${bold(cyan("Agent Browser Configuration"))}
`);
  const installed = await checkAgentBrowserInstalled();
  if (!installed) {
    console.log(`${red("\u2717")} Agent Browser is not installed`);
    console.log(`  ${gray("Run:")} ${cyan("ccjk browser install")} ${gray("first")}
`);
    return;
  }
  console.log(`${yellow("Current Settings:")}`);
  console.log(`  ${gray("Default browser:")} chromium`);
  console.log(`  ${gray("Headless mode:")} enabled`);
  console.log(`  ${gray("Timeout:")} 30000ms`);
  console.log(`
${yellow("Configuration Options:")}`);
  console.log(`  ${gray("Environment variables:")}`);
  console.log(`    AGENT_BROWSER_HEADLESS=false  ${gray("# Show browser window")}`);
  console.log(`    AGENT_BROWSER_TIMEOUT=60000   ${gray("# Set timeout in ms")}`);
  console.log(`    AGENT_BROWSER_BROWSER=firefox ${gray("# Use Firefox")}`);
  if (options.verbose) {
    console.log(`
${gray("Advanced:")}`);
    console.log(`  ${gray("Config file:")} ~/.agent-browser/config.json`);
    console.log(`  ${gray("Session dir:")} ~/.agent-browser/sessions/`);
  }
  console.log();
}

export { agentBrowserHelp, agentBrowserStatus, configureBrowser, startBrowserSession, stopBrowserSession };
