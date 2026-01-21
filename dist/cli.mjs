#!/usr/bin/env node
import process__default from 'node:process';

const COMMANDS = [
  // ==================== Core Commands ====================
  {
    name: "",
    description: "Show interactive menu (default)",
    tier: "core",
    options: [
      { flags: "--lang, -l <lang>", description: "Display language (zh-CN, en)" },
      { flags: "--code-type, -T <type>", description: "Code tool type" }
    ],
    loader: async () => {
      const { showMainMenu } = await import('./chunks/menu.mjs').then(function (n) { return n.m; });
      return async (options) => {
        await showMainMenu({ codeType: options.codeType });
      };
    }
  },
  {
    name: "init",
    description: "Initialize Claude Code configuration",
    aliases: ["i"],
    tier: "core",
    options: [
      { flags: "--lang, -l <lang>", description: "Display language" },
      { flags: "--config-lang, -c <lang>", description: "Configuration language" },
      { flags: "--force, -f", description: "Force overwrite" },
      { flags: "--skip-prompt, -s", description: "Skip prompts" },
      { flags: "--api-type, -t <type>", description: "API type" },
      { flags: "--api-key, -k <key>", description: "API key" },
      { flags: "--code-type, -T <type>", description: "Code tool type" }
    ],
    loader: async () => {
      const { init } = await import('./chunks/init.mjs').then(function (n) { return n.k; });
      return async (options) => {
        await init(options);
      };
    }
  },
  {
    name: "update",
    description: "Update Claude Code prompts",
    aliases: ["u"],
    tier: "core",
    options: [
      { flags: "--lang, -l <lang>", description: "Display language" },
      { flags: "--config-lang, -c <lang>", description: "Configuration language" }
    ],
    loader: async () => {
      const { update } = await import('./chunks/update.mjs');
      return async (options) => {
        await update({
          codeType: options.codeType,
          configLang: options.configLang,
          aiOutputLang: options.aiOutputLang
        });
      };
    }
  },
  {
    name: "doctor",
    description: "Run environment health check",
    tier: "core",
    options: [
      { flags: "--check-providers", description: "Check API provider health" },
      { flags: "--code-type, -T <type>", description: "Code tool type" }
    ],
    loader: async () => {
      const { doctor } = await import('./chunks/doctor.mjs');
      return async (options) => {
        await doctor({
          checkProviders: options.checkProviders,
          codeType: options.codeType
        });
      };
    }
  },
  {
    name: "help [topic]",
    description: "Show help and quick reference",
    aliases: ["h", "?"],
    tier: "core",
    loader: async () => {
      const { help } = await import('./chunks/help.mjs');
      return async (_options, topic) => {
        await help(topic);
      };
    }
  },
  // ==================== Extended Commands ====================
  {
    name: "serve",
    description: "Start CCJK as MCP server",
    tier: "extended",
    options: [
      { flags: "--mcp", description: "Enable MCP server mode" },
      { flags: "--stdio", description: "Use stdio transport (default)" },
      { flags: "--http", description: "Use HTTP transport" },
      { flags: "--port <port>", description: "HTTP server port (default: 3000)" },
      { flags: "--host <host>", description: "HTTP server host (default: localhost)" },
      { flags: "--debug", description: "Enable debug logging" }
    ],
    loader: async () => {
      return async (options) => {
        if (!options.mcp) {
          console.error("Error: --mcp flag is required for serve command");
          console.log("Usage: ccjk serve --mcp [--stdio|--http] [--port 3000]");
          process__default.exit(1);
        }
        const { startMCPServer } = await import('./chunks/mcp-server.mjs');
        const transport = options.http ? "http" : "stdio";
        const port = options.port ? Number.parseInt(options.port, 10) : 3e3;
        const host = options.host || "localhost";
        const debug = options.debug || false;
        console.error(`Starting CCJK MCP Server (${transport} mode)...`);
        await startMCPServer({
          transport,
          port,
          host,
          debug
        });
        if (transport === "http") {
          console.error(`MCP Server running on http://${host}:${port}`);
          console.error("Press Ctrl+C to stop");
        }
      };
    }
  },
  {
    name: "mcp <action> [...args]",
    description: "MCP Server management",
    tier: "extended",
    options: [
      { flags: "--verbose, -v", description: "Verbose output" },
      { flags: "--dry-run, -d", description: "Preview changes" }
    ],
    loader: async () => {
      return async (options, action, args) => {
        const actionStr = action;
        const argsArr = args;
        if (actionStr === "status" || !actionStr) {
          const { mcpStatus } = await import('./chunks/mcp.mjs');
          await mcpStatus(options);
        } else if (actionStr === "doctor") {
          const { mcpDoctor } = await import('./chunks/mcp.mjs');
          await mcpDoctor(options);
        } else if (actionStr === "profile") {
          const { listProfiles, useProfile } = await import('./chunks/mcp.mjs');
          if (!argsArr[0] || argsArr[0] === "list") {
            await listProfiles(options);
          } else {
            await useProfile(argsArr[0], options);
          }
        } else if (actionStr === "release") {
          const { mcpRelease } = await import('./chunks/mcp.mjs');
          await mcpRelease(options);
        } else if (actionStr === "help") {
          const { mcpHelp } = await import('./chunks/mcp.mjs');
          mcpHelp(options);
        } else if (actionStr === "list") {
          const { mcpList } = await import('./chunks/mcp.mjs');
          await mcpList(options);
        } else if (actionStr === "search") {
          const { mcpSearch } = await import('./chunks/mcp.mjs');
          await mcpSearch(argsArr[0] || "", options);
        } else if (actionStr === "install") {
          const { mcpInstall } = await import('./chunks/mcp.mjs');
          await mcpInstall(argsArr[0] || "", options);
        } else if (actionStr === "uninstall") {
          const { mcpUninstall } = await import('./chunks/mcp.mjs');
          await mcpUninstall(argsArr[0] || "", options);
        } else {
          const { mcpHelp } = await import('./chunks/mcp.mjs');
          mcpHelp(options);
        }
      };
    }
  },
  {
    name: "browser <action> [...args]",
    description: "Agent Browser management",
    aliases: ["ab"],
    tier: "extended",
    options: [
      { flags: "--verbose, -v", description: "Verbose output" }
    ],
    loader: async () => {
      return async (options, action, args) => {
        const actionStr = action;
        const argsArr = args;
        if (actionStr === "install") {
          const { installAgentBrowser } = await import('./chunks/installer.mjs');
          await installAgentBrowser(options);
        } else if (actionStr === "uninstall") {
          const { uninstallAgentBrowser } = await import('./chunks/installer.mjs');
          await uninstallAgentBrowser(options);
        } else if (actionStr === "status") {
          const { agentBrowserStatus } = await import('./chunks/commands2.mjs');
          await agentBrowserStatus(options);
        } else if (actionStr === "start") {
          const { startBrowserSession } = await import('./chunks/commands2.mjs');
          await startBrowserSession(argsArr[0], options);
        } else if (actionStr === "stop") {
          const { stopBrowserSession } = await import('./chunks/commands2.mjs');
          await stopBrowserSession(options);
        } else if (actionStr === "config") {
          const { configureBrowser } = await import('./chunks/commands2.mjs');
          await configureBrowser(options);
        } else {
          const { agentBrowserHelp } = await import('./chunks/commands2.mjs');
          agentBrowserHelp(options);
        }
      };
    }
  },
  {
    name: "interview [specFile]",
    description: "Interview-Driven Development",
    aliases: ["iv"],
    tier: "extended",
    options: [
      { flags: "--template, -t <template>", description: "Interview template" },
      { flags: "--depth, -d <depth>", description: "Interview depth" },
      { flags: "--resume, -r", description: "Resume session" },
      { flags: "--list", description: "List sessions" }
    ],
    loader: async () => {
      const { interview, quickInterview, deepInterview, listInterviewSessions, resumeInterview } = await import('./chunks/interview.mjs');
      return async (options, specFile) => {
        if (options.list) {
          await listInterviewSessions();
        } else if (options.resume) {
          await resumeInterview();
        } else if (options.depth === "quick") {
          await quickInterview(specFile, {
            specFile,
            depth: "quick",
            resume: !!options.resume,
            lang: options.lang
          });
        } else if (options.depth === "deep") {
          await deepInterview(specFile, {
            specFile,
            depth: "deep",
            resume: !!options.resume,
            lang: options.lang
          });
        } else {
          await interview({
            specFile,
            depth: options.depth,
            template: options.template,
            resume: !!options.resume,
            lang: options.lang
          });
        }
      };
    }
  },
  {
    name: "commit",
    description: "Smart git commit",
    tier: "extended",
    options: [
      { flags: "--auto, -a", description: "Auto-generate message" },
      { flags: "--dry-run, -d", description: "Preview only" },
      { flags: "--message, -m <msg>", description: "Custom message" }
    ],
    loader: async () => {
      const { commit } = await import('./chunks/commit.mjs');
      return async (options) => {
        await commit({
          auto: options.auto,
          dryRun: options.dryRun,
          message: options.message
        });
      };
    }
  },
  {
    name: "config [action] [...args]",
    description: "Manage CCJK configuration",
    tier: "extended",
    options: [
      { flags: "--format, -f <format>", description: "Output format (table|json|yaml)" },
      { flags: "--global, -g", description: "Use global config" }
    ],
    loader: async () => {
      return async (options, action, args) => {
        const actionStr = action;
        const argsArr = args;
        const configOptions = { global: !!options.global, json: options.format === "json" };
        if (!actionStr || actionStr === "list") {
          const { listConfig } = await import('./chunks/config.mjs');
          await listConfig(configOptions);
        } else if (actionStr === "get") {
          const { getConfig } = await import('./chunks/config.mjs');
          await getConfig(argsArr[0] || "", configOptions);
        } else if (actionStr === "set") {
          const { setConfig } = await import('./chunks/config.mjs');
          await setConfig(argsArr[0] || "", argsArr[1] || "", configOptions);
        } else if (actionStr === "unset") {
          const { unsetConfig } = await import('./chunks/config.mjs');
          await unsetConfig(argsArr[0] || "", configOptions);
        } else if (actionStr === "reset") {
          const { resetConfig } = await import('./chunks/config.mjs');
          await resetConfig(configOptions);
        } else if (actionStr === "edit") {
          const { editConfig } = await import('./chunks/config.mjs');
          await editConfig(configOptions);
        } else if (actionStr === "validate") {
          const { validateConfig } = await import('./chunks/config.mjs');
          await validateConfig(configOptions);
        } else {
          console.error(`Unknown config action: ${actionStr}`);
          console.log("Available actions: list, get, set, unset, reset, edit, validate");
        }
      };
    }
  },
  {
    name: "daemon <action>",
    description: "Remote control daemon management",
    tier: "extended",
    options: [
      { flags: "--debug, -d", description: "Enable debug logging" }
    ],
    loader: async () => {
      return async (_options, action) => {
        const actionStr = action;
        if (actionStr === "setup") {
          const { setupDaemon } = await import('./chunks/cli.mjs');
          await setupDaemon();
        } else if (actionStr === "start") {
          const { startDaemon } = await import('./chunks/cli.mjs');
          await startDaemon();
        } else if (actionStr === "stop") {
          const { stopDaemon } = await import('./chunks/cli.mjs');
          await stopDaemon();
        } else if (actionStr === "status") {
          const { showStatus } = await import('./chunks/cli.mjs');
          await showStatus();
        } else if (actionStr === "logs") {
          const { showLogs } = await import('./chunks/cli.mjs');
          await showLogs();
        } else {
          console.error(`Unknown daemon action: ${actionStr}`);
          console.log("Available actions: setup, start, stop, status, logs");
          console.log("\nUsage:");
          console.log("  ccjk daemon setup   - Configure email settings");
          console.log("  ccjk daemon start   - Start the daemon");
          console.log("  ccjk daemon stop    - Stop the daemon");
          console.log("  ccjk daemon status  - Show daemon status");
          console.log("  ccjk daemon logs    - Show daemon logs");
        }
      };
    }
  },
  {
    name: "providers [action] [...args]",
    description: "Manage API providers",
    tier: "extended",
    options: [
      { flags: "--format, -f <format>", description: "Output format (table|json)" },
      { flags: "--code-type, -T <type>", description: "Code tool type" },
      { flags: "--verbose, -v", description: "Verbose output" }
    ],
    loader: async () => {
      return async (options, action) => {
        const actionStr = action;
        const { providersCommand } = await import('./chunks/providers.mjs');
        await providersCommand(actionStr || "list", {
          lang: options.lang,
          codeType: options.codeType,
          verbose: options.verbose
        });
      };
    }
  },
  {
    name: "ccr",
    description: "Configure Claude Code Router",
    tier: "extended",
    loader: async () => {
      const { ccr } = await import('./chunks/ccr.mjs');
      return async () => {
        await ccr();
      };
    }
  },
  {
    name: "vim",
    description: "Vim mode configuration and keybindings",
    tier: "extended",
    options: [
      { flags: "--enable, -e", description: "Enable Vim mode" },
      { flags: "--disable, -d", description: "Disable Vim mode" },
      { flags: "--toggle, -t", description: "Toggle Vim mode" },
      { flags: "--status, -s", description: "Show status" },
      { flags: "--install", description: "Install keybindings" },
      { flags: "--uninstall", description: "Uninstall keybindings" },
      { flags: "--keys, -k", description: "Show keybinding reference" },
      { flags: "--test <cmd>", description: "Test command parsing" },
      { flags: "--lang, -l <lang>", description: "Language (en, zh-CN)" }
    ],
    loader: async () => {
      return async (options) => {
        const { vimCommand } = await import('./chunks/vim.mjs');
        await vimCommand({
          lang: options.lang,
          enable: options.enable,
          disable: options.disable,
          toggle: options.toggle,
          status: options.status,
          install: options.install,
          uninstall: options.uninstall,
          keys: options.keys,
          test: options.test
        });
      };
    }
  },
  {
    name: "permissions [action] [...args]",
    description: "Manage CCJK permissions",
    aliases: ["perm"],
    tier: "extended",
    options: [
      { flags: "--format, -f <format>", description: "Output format (table|json|list)" },
      { flags: "--verbose, -v", description: "Verbose output" }
    ],
    loader: async () => {
      return async (options, action, args) => {
        const actionStr = action;
        const argsArr = args;
        if (!actionStr || actionStr === "list") {
          const { listPermissions } = await import('./chunks/permissions.mjs');
          await listPermissions(options);
        } else if (actionStr === "check") {
          const { checkPermission } = await import('./chunks/permissions.mjs');
          await checkPermission(argsArr[0] || "", options);
        } else if (actionStr === "grant") {
          const { grantPermission } = await import('./chunks/permissions.mjs');
          await grantPermission(argsArr[0] || "", options);
        } else if (actionStr === "revoke") {
          const { revokePermission } = await import('./chunks/permissions.mjs');
          await revokePermission(argsArr[0] || "", options);
        } else if (actionStr === "reset") {
          const { resetPermissions } = await import('./chunks/permissions.mjs');
          await resetPermissions(options);
        } else if (actionStr === "export") {
          const { exportPermissions } = await import('./chunks/permissions.mjs');
          await exportPermissions(argsArr[0], options);
        } else if (actionStr === "import") {
          const { importPermissions } = await import('./chunks/permissions.mjs');
          await importPermissions(argsArr[0] || "", options);
        } else {
          const { permissionsHelp } = await import('./chunks/permissions.mjs');
          permissionsHelp(options);
        }
      };
    }
  },
  {
    name: "skills [action] [...args]",
    description: "Manage CCJK skills",
    aliases: ["sk"],
    tier: "extended",
    options: [
      { flags: "--category, -c <category>", description: "Filter by category" },
      { flags: "--show-disabled", description: "Show disabled skills" },
      { flags: "--format, -f <format>", description: "Output format (table|json|list)" },
      { flags: "--batch", description: "Batch create skills" }
    ],
    loader: async () => {
      return async (options, action, args) => {
        const { initI18n } = await import('./chunks/index.mjs');
        await initI18n(options.lang || "zh-CN");
        const actionStr = action;
        const argsArr = args;
        if (!actionStr) {
          const { skillsMenu } = await import('./chunks/skills.mjs');
          await skillsMenu(options);
        } else if (actionStr === "list" || actionStr === "ls") {
          const { listSkills } = await import('./chunks/skills.mjs');
          await listSkills(options);
        } else if (actionStr === "run") {
          const { runSkill } = await import('./chunks/skills.mjs');
          await runSkill(argsArr[0] || "", options);
        } else if (actionStr === "info") {
          const { showSkillInfo } = await import('./chunks/skills.mjs');
          await showSkillInfo(argsArr[0] || "", options);
        } else if (actionStr === "create") {
          const { createSkill } = await import('./chunks/skills.mjs');
          await createSkill(argsArr[0] || "", options);
        } else if (actionStr === "enable") {
          const { enableSkill } = await import('./chunks/skills.mjs');
          await enableSkill(argsArr[0] || "", options);
        } else if (actionStr === "disable") {
          const { disableSkill } = await import('./chunks/skills.mjs');
          await disableSkill(argsArr[0] || "", options);
        } else if (actionStr === "delete" || actionStr === "remove" || actionStr === "rm") {
          const { deleteSkill } = await import('./chunks/skills.mjs');
          await deleteSkill(argsArr[0] || "", options);
        } else {
          const { runSkill } = await import('./chunks/skills.mjs');
          await runSkill(actionStr, options);
        }
      };
    }
  },
  // ==================== Plugins-v2 Commands ====================
  {
    name: "skill [action] [...args]",
    description: "Manage plugins-v2 skills (SKILL.md based)",
    tier: "extended",
    options: [
      { flags: "--force, -f", description: "Force reinstall" },
      { flags: "--json", description: "Output as JSON" }
    ],
    loader: async () => {
      const { handleSkillCommand } = await import('./chunks/skill.mjs');
      return async (options, action, args) => {
        const actionStr = action;
        const argsArr = args;
        await handleSkillCommand([actionStr, ...argsArr], {
          force: options.force,
          json: options.json
        });
      };
    }
  },
  {
    name: "agent [action] [...args]",
    description: "Manage AI agents (Skills + MCP composition)",
    aliases: ["ag"],
    tier: "extended",
    options: [
      { flags: "--template, -t <template>", description: "Use agent template" },
      { flags: "--skills, -s <skills>", description: "Comma-separated skill IDs" },
      { flags: "--mcp, -m <servers>", description: "Comma-separated MCP servers" },
      { flags: "--persona, -p <persona>", description: "Custom persona" },
      { flags: "--json", description: "Output as JSON" }
    ],
    loader: async () => {
      const { handleAgentCommand } = await import('./chunks/agent.mjs');
      return async (options, action, args) => {
        const actionStr = action;
        const argsArr = args;
        await handleAgentCommand([actionStr, ...argsArr], {
          template: options.template,
          skills: options.skills ? options.skills.split(",") : void 0,
          mcp: options.mcp ? options.mcp.split(",") : void 0,
          persona: options.persona,
          json: options.json
        });
      };
    }
  },
  {
    name: "ccu [...args]",
    description: "Claude Code usage analysis",
    tier: "extended",
    loader: async () => {
      const { executeCcusage } = await import('./chunks/ccu.mjs');
      return async (_options, args) => {
        await executeCcusage(args);
      };
    }
  },
  {
    name: "stats [action]",
    description: "Usage statistics and analytics",
    tier: "extended",
    options: [
      { flags: "--period, -p <period>", description: "Time period (1d, 7d, 30d, 90d, all)" },
      { flags: "--format, -f <format>", description: "Output format (table, json, csv)" },
      { flags: "--export, -e <file>", description: "Export to file" },
      { flags: "--provider <provider>", description: "Filter by provider" },
      { flags: "--days <days>", description: "Days to keep for cleanup action" }
    ],
    loader: async () => {
      return async (options, action) => {
        const actionStr = action;
        if (actionStr === "dates") {
          const { listStatsDates } = await import('./chunks/stats.mjs');
          await listStatsDates();
        } else if (actionStr === "storage") {
          const { storageStats } = await import('./chunks/stats.mjs');
          await storageStats();
        } else if (actionStr === "cleanup") {
          const { cleanupStats } = await import('./chunks/stats.mjs');
          const days = options.days ? Number.parseInt(options.days, 10) : 90;
          await cleanupStats(days);
        } else {
          const { stats } = await import('./chunks/stats.mjs');
          await stats(options);
        }
      };
    }
  },
  {
    name: "uninstall",
    description: "Remove CCJK configurations",
    tier: "extended",
    options: [
      { flags: "--mode, -m <mode>", description: "Uninstall mode" },
      { flags: "--code-type, -T <type>", description: "Code tool type" }
    ],
    loader: async () => {
      const { uninstall } = await import('./chunks/uninstall.mjs');
      return async (options) => {
        await uninstall(options);
      };
    }
  },
  {
    name: "check-updates",
    description: "Check for updates",
    aliases: ["check"],
    tier: "extended",
    options: [
      { flags: "--code-type, -T <type>", description: "Code tool type" },
      { flags: "--skip-prompt, -s", description: "Skip prompts" }
    ],
    loader: async () => {
      const { checkUpdates } = await import('./chunks/check-updates.mjs');
      return async (options) => {
        await checkUpdates(options);
      };
    }
  },
  {
    name: "config-switch [target]",
    description: "Switch configuration",
    aliases: ["cs"],
    tier: "extended",
    options: [
      { flags: "--code-type, -T <type>", description: "Code tool type" },
      { flags: "--list, -l", description: "List configurations" }
    ],
    loader: async () => {
      const { configSwitchCommand } = await import('./chunks/config-switch.mjs');
      return async (options, target) => {
        await configSwitchCommand({
          target,
          codeType: options.codeType,
          list: options.list
        });
      };
    }
  },
  {
    name: "workflows",
    description: "Manage workflows",
    aliases: ["wf"],
    tier: "extended",
    loader: async () => {
      const { listWorkflowsQuick } = await import('./chunks/workflows2.mjs');
      return async () => {
        await listWorkflowsQuick();
      };
    }
  },
  {
    name: "notification [action]",
    description: "Task notifications",
    aliases: ["notify"],
    tier: "extended",
    loader: async () => {
      const { notificationCommand } = await import('./chunks/notification.mjs');
      return async (_options, action) => {
        await notificationCommand(action);
      };
    }
  },
  {
    name: "session <action> [id]",
    description: "Session management (save, restore, list, delete, resume)",
    tier: "extended",
    options: [
      { flags: "--name, -n <name>", description: "Session name" }
    ],
    loader: async () => {
      const { handleSessionCommand } = await import('./chunks/session.mjs');
      return async (_options, action, id) => {
        const args = [];
        if (action)
          args.push(action);
        if (id)
          args.push(id);
        await handleSessionCommand(args);
      };
    }
  },
  {
    name: "context <action> [id]",
    description: "Context management (analyze, compress, optimize, status)",
    aliases: ["ctx"],
    tier: "extended",
    options: [
      { flags: "--verbose, -v", description: "Verbose output" }
    ],
    loader: async () => {
      const { handleContextCommand } = await import('./chunks/context.mjs');
      return async (_options, action, id) => {
        const args = [];
        if (action)
          args.push(action);
        if (id)
          args.push(id);
        await handleContextCommand(args);
      };
    }
  },
  {
    name: "api [action] [...args]",
    description: "Configure API providers",
    tier: "extended",
    options: [
      { flags: "--provider, -p <provider>", description: "Provider ID" },
      { flags: "--key, -k <key>", description: "API key" },
      { flags: "--test, -t", description: "Test connection" }
    ],
    loader: async () => {
      const { apiCommand } = await import('./chunks/api.mjs');
      return async (options, action, args) => {
        await apiCommand(action || "wizard", args || [], options);
      };
    }
  },
  {
    name: "team <action>",
    description: "Team collaboration",
    tier: "extended",
    loader: async () => {
      const { teamInit, teamShare, teamSync } = await import('./chunks/team.mjs');
      return async (_options, action) => {
        const actionStr = action;
        if (actionStr === "init")
          await teamInit();
        else if (actionStr === "share")
          await teamShare();
        else if (actionStr === "sync")
          await teamSync();
      };
    }
  },
  // ==================== Thinking Mode Commands ====================
  {
    name: "thinking [action] [...args]",
    description: "Thinking Mode (Opus 4.5+ extended reasoning)",
    aliases: ["think"],
    tier: "extended",
    options: [
      { flags: "--json", description: "Output in JSON format" },
      { flags: "--verbose, -v", description: "Verbose output" }
    ],
    loader: async () => {
      const { thinking } = await import('./chunks/thinking.mjs');
      return async (options, action, args) => {
        await thinking(action, args, options);
      };
    }
  },
  // ==================== Postmortem System ====================
  {
    name: "postmortem <action> [...args]",
    description: "\u{1F52C} Postmortem Intelligence - Learn from historical bugs",
    aliases: ["pm"],
    tier: "extended",
    options: [
      { flags: "--severity <level>", description: "Filter by severity (critical/high/medium/low)" },
      { flags: "--category <cat>", description: "Filter by category" },
      { flags: "--status <status>", description: "Filter by status" },
      { flags: "--staged", description: "Check staged files only" },
      { flags: "--ci", description: "CI mode, exit with error on issues" },
      { flags: "--since <tag>", description: "Start version/commit" },
      { flags: "--until <tag>", description: "End version/commit" },
      { flags: "--version <ver>", description: "Associated version" }
    ],
    loader: async () => {
      return async (options, action, args) => {
        const actionStr = action;
        const argsArr = args || [];
        const { getPostmortemManager } = await import('./chunks/index2.mjs');
        const manager = getPostmortemManager(process__default.cwd());
        if (actionStr === "init") {
          const ora = (await import('ora')).default;
          const chalk = (await import('./chunks/index3.mjs')).default;
          const spinner = ora("Analyzing historical fix commits...").start();
          try {
            const result = await manager.init();
            spinner.succeed(chalk.green("Postmortem system initialized"));
            console.log(`
   ${chalk.yellow("Reports generated:")} ${result.created}`);
            console.log(`   ${chalk.yellow("Directory:")} ${result.directory}
`);
          } catch (error) {
            spinner.fail(chalk.red("Initialization failed"));
            console.error(error);
          }
        } else if (actionStr === "generate" || actionStr === "gen") {
          const ora = (await import('ora')).default;
          const chalk = (await import('./chunks/index3.mjs')).default;
          const spinner = ora("Analyzing commits...").start();
          try {
            if (options.version) {
              const summary = await manager.generateReleaseSummary({
                version: options.version,
                since: options.since,
                until: options.until
              });
              spinner.succeed(chalk.green("Release summary generated"));
              console.log(`
   ${chalk.yellow("Version:")} ${summary.version}`);
              console.log(`   ${chalk.yellow("Fix commits:")} ${summary.fixCommitCount}`);
              console.log(`   ${chalk.yellow("New postmortems:")} ${summary.newPostmortems.length}
`);
            } else {
              const result = await manager.init();
              spinner.succeed(chalk.green("Postmortem generation complete"));
              console.log(`
   ${chalk.yellow("Reports:")} ${result.created}
`);
            }
          } catch (error) {
            spinner.fail(chalk.red("Generation failed"));
            console.error(error);
          }
        } else if (actionStr === "list" || actionStr === "ls") {
          const chalk = (await import('./chunks/index3.mjs')).default;
          let reports = manager.listReports();
          if (options.severity)
            reports = reports.filter((r) => r.severity === options.severity);
          if (options.category)
            reports = reports.filter((r) => r.category === options.category);
          if (options.status)
            reports = reports.filter((r) => r.status === options.status);
          if (reports.length === 0) {
            console.log(chalk.yellow("\nNo postmortem reports found"));
            console.log(chalk.gray('Run "ccjk postmortem init" to initialize\n'));
            return;
          }
          const severityEmoji = { critical: "\u{1F534}", high: "\u{1F7E0}", medium: "\u{1F7E1}", low: "\u{1F7E2}" };
          console.log(chalk.cyan.bold("\n\u{1F4CB} Postmortem Reports"));
          console.log(chalk.gray("\u2500".repeat(50)));
          for (const r of reports) {
            console.log(`
${severityEmoji[r.severity] || "\u26AA"} ${chalk.bold(r.id)}: ${r.title}`);
            console.log(`   ${chalk.gray("Category:")} ${r.category}  ${chalk.gray("Status:")} ${r.status}`);
          }
          console.log(chalk.gray(`
\u2500 Total: ${reports.length} reports \u2500
`));
        } else if (actionStr === "show") {
          const chalk = (await import('./chunks/index3.mjs')).default;
          const id = argsArr[0];
          if (!id) {
            console.log(chalk.red("Please specify a postmortem ID"));
            return;
          }
          const report = manager.getReport(id);
          if (!report) {
            console.log(chalk.red(`Postmortem not found: ${id}`));
            return;
          }
          console.log(chalk.cyan.bold(`
\u2550\u2550\u2550 ${report.id}: ${report.title} \u2550\u2550\u2550
`));
          console.log(`${chalk.yellow("Severity:")} ${report.severity.toUpperCase()}`);
          console.log(`${chalk.yellow("Category:")} ${report.category}`);
          console.log(`${chalk.yellow("Status:")} ${report.status}`);
          console.log(`
${chalk.cyan("Description:")}
${report.description}`);
          console.log(`
${chalk.cyan("Root Cause:")}
${report.rootCause.map((c) => `  \u2022 ${c}`).join("\n")}`);
          console.log(`
${chalk.cyan("Prevention:")}
${report.preventionMeasures.map((m) => `  \u2022 ${m}`).join("\n")}`);
          console.log(`
${chalk.cyan("AI Directives:")}
${report.aiDirectives.map((d) => `  \u2022 ${d}`).join("\n")}
`);
        } else if (actionStr === "check") {
          const ora = (await import('ora')).default;
          const chalk = (await import('./chunks/index3.mjs')).default;
          const spinner = ora("Checking code...").start();
          try {
            const result = await manager.checkCode({
              staged: options.staged,
              files: argsArr.length > 0 ? argsArr : void 0
            });
            spinner.stop();
            console.log(chalk.cyan.bold("\n\u{1F50D} Postmortem Code Check"));
            console.log(chalk.gray("\u2500".repeat(40)));
            console.log(`   Files checked: ${result.filesChecked}`);
            console.log(`   Issues found: ${result.issuesFound.length}`);
            console.log(`
   \u{1F534} Critical: ${result.summary.critical}`);
            console.log(`   \u{1F7E0} High: ${result.summary.high}`);
            console.log(`   \u{1F7E1} Medium: ${result.summary.medium}`);
            console.log(`   \u{1F7E2} Low: ${result.summary.low}`);
            if (result.issuesFound.length > 0) {
              console.log(chalk.yellow("\n\u26A0\uFE0F Issues:"));
              for (const issue of result.issuesFound.slice(0, 10)) {
                console.log(`
   ${issue.file}:${issue.line}`);
                console.log(`   ${issue.message}`);
              }
            }
            console.log(result.passed ? chalk.green("\n\u2705 Check passed\n") : chalk.red("\n\u274C Check failed\n"));
            if (!result.passed && options.ci)
              process__default.exit(1);
          } catch (error) {
            spinner.fail(chalk.red("Check failed"));
            console.error(error);
          }
        } else if (actionStr === "sync") {
          const ora = (await import('ora')).default;
          const chalk = (await import('./chunks/index3.mjs')).default;
          const spinner = ora("Syncing to CLAUDE.md...").start();
          try {
            const result = await manager.syncToClaudeMd();
            spinner.succeed(chalk.green("Sync complete"));
            console.log(`
   ${chalk.yellow("Synced:")} ${result.synced} items`);
            console.log(`   ${chalk.yellow("File:")} ${result.claudeMdPath}
`);
          } catch (error) {
            spinner.fail(chalk.red("Sync failed"));
            console.error(error);
          }
        } else if (actionStr === "stats") {
          const chalk = (await import('./chunks/index3.mjs')).default;
          const index = manager.loadIndex();
          if (!index) {
            console.log(chalk.yellow("\nNo statistics available"));
            console.log(chalk.gray('Run "ccjk postmortem init" to initialize\n'));
            return;
          }
          console.log(chalk.cyan.bold("\n\u{1F4CA} Postmortem Statistics"));
          console.log(chalk.gray("\u2500".repeat(40)));
          console.log(`
${chalk.yellow("Total:")} ${index.stats.total} reports`);
          console.log(`
${chalk.yellow("By Severity:")}`);
          console.log(`   \u{1F534} Critical: ${index.stats.bySeverity.critical}`);
          console.log(`   \u{1F7E0} High: ${index.stats.bySeverity.high}`);
          console.log(`   \u{1F7E1} Medium: ${index.stats.bySeverity.medium}`);
          console.log(`   \u{1F7E2} Low: ${index.stats.bySeverity.low}`);
          console.log(`
${chalk.yellow("By Status:")}`);
          console.log(`   \u26A1 Active: ${index.stats.byStatus.active}`);
          console.log(`   \u2705 Resolved: ${index.stats.byStatus.resolved}`);
          console.log(`   \u{1F440} Monitoring: ${index.stats.byStatus.monitoring}`);
          console.log(`   \u{1F4E6} Archived: ${index.stats.byStatus.archived}
`);
        } else {
          console.log("\n\u{1F52C} Postmortem Commands:");
          console.log("  ccjk postmortem init          - Initialize system");
          console.log("  ccjk postmortem generate      - Generate from commits");
          console.log("  ccjk postmortem list          - List all reports");
          console.log("  ccjk postmortem show <id>     - Show report details");
          console.log("  ccjk postmortem check         - Check code for issues");
          console.log("  ccjk postmortem sync          - Sync to CLAUDE.md");
          console.log("  ccjk postmortem stats         - Show statistics\n");
        }
      };
    }
  },
  // ==================== Context Compression System ====================
  {
    name: "claude",
    description: "Transparent claude command wrapper with context compression",
    tier: "extended",
    options: [
      { flags: "--debug", description: "Enable debug output" },
      { flags: "--no-wrap", description: "Disable wrapping (pass through)" }
    ],
    loader: async () => {
      const { claudeWrapper } = await import('./chunks/claude-wrapper.mjs');
      return async (options) => {
        const argv = process__default.argv;
        const claudeIndex = argv.findIndex((arg) => arg === "claude");
        const rawArgs = claudeIndex >= 0 ? argv.slice(claudeIndex + 1) : [];
        const args = rawArgs.filter((arg) => arg !== "--debug" && arg !== "--no-wrap");
        await claudeWrapper(args, {
          debug: options.debug,
          noWrap: options.noWrap
        });
      };
    }
  },
  // ==================== Configuration Management ====================
  {
    name: "config [action] [key] [value]",
    description: "Manage configuration",
    tier: "extended",
    options: [
      { flags: "--json", description: "Output in JSON format" }
    ],
    loader: async () => {
      const { configCommand } = await import('./chunks/config.mjs');
      return async (options, action, key, value) => {
        const args = [];
        if (key !== void 0)
          args.push(key);
        if (value !== void 0)
          args.push(value);
        await configCommand(action || "list", args, {
          lang: options.lang,
          codeType: options.codeType,
          global: options.global,
          json: options.json
        });
      };
    }
  }
  // context 命令已在上面定义（第 435 行），使用 context-compression/commands/context.ts
  // shell hook 管理功能通过 'ccjk context hook install/uninstall' 子命令访问
  // Deprecated commands removed in v2.x cleanup
  // - shencha: replaced by 'ccjk doctor'
  // - features: replaced by 'ccjk' menu
  // - tools: replaced by 'ccjk' menu
];
let i18nInitialized = false;
let currentLang = "en";
async function initI18nLazy(lang) {
  if (i18nInitialized && lang === currentLang)
    return;
  const { initI18n, changeLanguage } = await import('./chunks/index.mjs');
  if (!i18nInitialized) {
    await initI18n(lang || "en");
    i18nInitialized = true;
  } else if (lang && lang !== currentLang) {
    await changeLanguage(lang);
  }
  currentLang = lang || "en";
}
async function resolveLanguage(options) {
  const envLang = process__default.env.CCJK_LANG;
  if (options?.allLang)
    return options.allLang;
  if (options?.lang)
    return options.lang;
  if (envLang)
    return envLang;
  try {
    const { readZcfConfigAsync } = await import('./chunks/ccjk-config.mjs');
    const config = await readZcfConfigAsync();
    if (config?.preferredLang)
      return config.preferredLang;
  } catch {
  }
  if (!options?.skipPrompt) {
    const { selectScriptLanguage } = await import('./chunks/prompts.mjs');
    return await selectScriptLanguage();
  }
  return "en";
}
function extractLanguageOptions(options) {
  if (!options || typeof options !== "object")
    return {};
  const obj = options;
  return {
    lang: typeof obj.lang === "string" ? obj.lang : void 0,
    allLang: typeof obj.allLang === "string" ? obj.allLang : void 0,
    skipPrompt: typeof obj.skipPrompt === "boolean" ? obj.skipPrompt : void 0
  };
}
async function setupCommandsLazy(cli) {
  const envLang = process__default.env.CCJK_LANG;
  if (envLang) {
    await initI18nLazy(envLang);
  }
  for (const cmd of COMMANDS) {
    const command = cli.command(cmd.name, cmd.description);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        command.alias(alias);
      }
    }
    if (cmd.options) {
      for (const opt of cmd.options) {
        command.option(opt.flags, opt.description);
      }
    }
    if (cmd.name !== "claude") {
      command.option("--lang, -l <lang>", "Display language (zh-CN, en)");
      command.option("--all-lang, -g <lang>", "Set all language parameters");
    } else {
      command.allowUnknownOptions();
    }
    command.action(async (...args) => {
      const options = args[args.length - 1];
      if (cmd.name !== "claude") {
        const langOptions = extractLanguageOptions(options);
        const lang = await resolveLanguage(langOptions);
        await initI18nLazy(lang);
      }
      if (cmd.tier === "deprecated" && cmd.deprecationMessage) {
        console.warn(`
${cmd.deprecationMessage}
`);
      }
      const handler = await cmd.loader();
      await handler(options, ...args.slice(0, -1));
    });
  }
  await registerSpecialCommands(cli);
  const { version } = await import('./chunks/package.mjs');
  cli.help((sections) => customizeHelpLazy(sections, version));
  cli.version(version);
}
async function registerSpecialCommands(cli) {
  cli.command("cloud [resource] [action]", "Cloud sync (skills/agents/plugins)").alias("c").option("--dry-run, -d", "Preview changes").option("--force, -f", "Force sync").action(async (resource, action, options) => {
    const resourceStr = resource || "menu";
    if (resourceStr === "skills" || resourceStr === "sk") {
      const { skillsSyncMenu, syncSkills, pushSkillsCommand, pullSkillsCommand } = await import('./chunks/skills-sync.mjs');
      if (!action)
        await skillsSyncMenu(options);
      else if (action === "sync")
        await syncSkills(options);
      else if (action === "push")
        await pushSkillsCommand(options);
      else if (action === "pull")
        await pullSkillsCommand(options);
    } else if (resourceStr === "agents" || resourceStr === "ag") {
      console.log("\n\u{1F916} Agent Commands:");
      console.log("  ccjk agents list      - List installed agents");
      console.log("  ccjk agents search    - Search agents in cloud");
      console.log("  ccjk agents install   - Install an agent");
      console.log("  ccjk agents sync      - Sync with cloud");
      console.log("  ccjk agents templates - View templates\n");
    } else if (resourceStr === "plugins" || resourceStr === "pl") {
      const { marketplaceMenu } = await import('./chunks/marketplace.mjs');
      await marketplaceMenu(action, options);
    } else {
      console.log("\n\u2601\uFE0F  Cloud Sync Commands:");
      console.log("  ccjk cloud skills [action]  - Sync custom skills");
      console.log("  ccjk cloud agents [action]  - Sync AI agents");
      console.log("  ccjk cloud plugins [action] - Plugin marketplace\n");
    }
  });
  cli.command("skills-sync [action]", '[DEPRECATED] Use "ccjk cloud skills"').action(async (_action, options) => {
    console.warn('\n\u26A0\uFE0F  skills-sync \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk cloud skills" \u66FF\u4EE3\n');
    const { skillsSyncMenu } = await import('./chunks/skills-sync.mjs');
    await skillsSyncMenu(options);
  });
  cli.command("agents-sync [action]", '[DEPRECATED] Use "ccjk agents"').action(async () => {
    console.warn('\n\u26A0\uFE0F  agents-sync \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk agents" \u66FF\u4EE3\n');
    console.log("\u{1F916} Agent Commands:");
    console.log("  ccjk agents list      - List installed agents");
    console.log("  ccjk agents search    - Search agents in cloud");
    console.log("  ccjk agents install   - Install an agent");
    console.log("  ccjk agents sync      - Sync with cloud\n");
  });
  cli.command("marketplace [action]", '[DEPRECATED] Use "ccjk cloud plugins"').action(async (action, options) => {
    console.warn('\n\u26A0\uFE0F  marketplace \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk cloud plugins" \u66FF\u4EE3\n');
    const { marketplaceMenu } = await import('./chunks/marketplace.mjs');
    await marketplaceMenu(action, options);
  });
  cli.command("plugin [action] [...args]", "Plugin marketplace (install/search/list)").option("--verbose, -v", "Show verbose output").option("--force, -f", "Force operation").option("--version, -V <version>", "Specify plugin version").action(async (action, args, _options) => {
    const { handlePluginCommand } = await import('./chunks/plugin.mjs');
    const allArgs = [action, ...args || []].filter(Boolean);
    await handlePluginCommand(allArgs);
  });
  cli.command("quick [specFile]", '[DEPRECATED] Use "ccjk interview -d quick"').action(async (specFile) => {
    console.warn('\n\u26A0\uFE0F  quick \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk interview -d quick" \u66FF\u4EE3\n');
    const { quickInterview } = await import('./chunks/interview.mjs');
    await quickInterview(specFile, {});
  });
  cli.command("deep [specFile]", '[DEPRECATED] Use "ccjk interview -d deep"').action(async (specFile) => {
    console.warn('\n\u26A0\uFE0F  deep \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk interview -d deep" \u66FF\u4EE3\n');
    const { deepInterview } = await import('./chunks/interview.mjs');
    await deepInterview(specFile, {});
  });
  cli.command("system [action]", "System management (setup/upgrade/info)").alias("sys").action(async (action) => {
    const actionStr = action || "info";
    if (actionStr === "setup" || actionStr === "s") {
      const { runOnboarding } = await import('./chunks/onboarding.mjs');
      await runOnboarding();
    } else if (actionStr === "sync") {
      const { quickSync } = await import('./chunks/onboarding.mjs');
      await quickSync();
    } else if (actionStr === "versions" || actionStr === "ver") {
      const { checkAllVersions } = await import('./chunks/upgrade-manager.mjs');
      await checkAllVersions();
    } else if (actionStr === "upgrade" || actionStr === "up") {
      const { upgradeAll } = await import('./chunks/upgrade-manager.mjs');
      await upgradeAll();
    } else if (actionStr === "permissions" || actionStr === "perm") {
      const { displayPermissions } = await import('./chunks/permission-manager.mjs');
      displayPermissions();
    } else if (actionStr === "config" || actionStr === "cfg") {
      const { detectAllConfigs, displayConfigScan } = await import('./chunks/config-consolidator.mjs');
      const configs = detectAllConfigs();
      displayConfigScan(configs);
    } else if (actionStr === "workspace" || actionStr === "ws") {
      const { workspaceDiagnostics } = await import('./chunks/doctor.mjs');
      await workspaceDiagnostics();
    } else {
      console.log("\n\u{1F527} System Commands:");
      console.log("  ccjk system setup      - First-time setup");
      console.log("  ccjk system sync       - Quick knowledge sync");
      console.log("  ccjk system versions   - Check all versions");
      console.log("  ccjk system upgrade    - Upgrade all components");
      console.log("  ccjk system permissions- Show permissions");
      console.log("  ccjk system config     - Scan config files");
      console.log("  ccjk system workspace  - Workspace diagnostics\n");
    }
  });
  cli.command("setup", '[DEPRECATED] Use "ccjk system setup"').action(async () => {
    console.warn('\n\u26A0\uFE0F  setup \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk system setup" \u66FF\u4EE3\n');
    const { runOnboarding } = await import('./chunks/onboarding.mjs');
    await runOnboarding();
  });
  cli.command("sync", '[DEPRECATED] Use "ccjk system sync"').action(async () => {
    console.warn('\n\u26A0\uFE0F  sync \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk system sync" \u66FF\u4EE3\n');
    const { quickSync } = await import('./chunks/onboarding.mjs');
    await quickSync();
  });
  cli.command("versions", '[DEPRECATED] Use "ccjk system versions"').action(async () => {
    console.warn('\n\u26A0\uFE0F  versions \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk system versions" \u66FF\u4EE3\n');
    const { checkAllVersions } = await import('./chunks/upgrade-manager.mjs');
    await checkAllVersions();
  });
  cli.command("upgrade", '[DEPRECATED] Use "ccjk system upgrade"').action(async () => {
    console.warn('\n\u26A0\uFE0F  upgrade \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk system upgrade" \u66FF\u4EE3\n');
    const { upgradeAll } = await import('./chunks/upgrade-manager.mjs');
    await upgradeAll();
  });
  cli.command("permissions", '[DEPRECATED] Use "ccjk system permissions"').action(async () => {
    console.warn('\n\u26A0\uFE0F  permissions \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk system permissions" \u66FF\u4EE3\n');
    const { displayPermissions } = await import('./chunks/permission-manager.mjs');
    displayPermissions();
  });
  cli.command("config-scan", '[DEPRECATED] Use "ccjk system config"').action(async () => {
    console.warn('\n\u26A0\uFE0F  config-scan \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk system config" \u66FF\u4EE3\n');
    const { detectAllConfigs, displayConfigScan } = await import('./chunks/config-consolidator.mjs');
    const configs = detectAllConfigs();
    displayConfigScan(configs);
  });
  cli.command("workspace [dir]", '[DEPRECATED] Use "ccjk system workspace"').action(async (dir) => {
    console.warn('\n\u26A0\uFE0F  workspace \u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 "ccjk system workspace" \u66FF\u4EE3\n');
    const { workspaceDiagnostics } = await import('./chunks/doctor.mjs');
    await workspaceDiagnostics(dir);
  });
}
function customizeHelpLazy(_sections, version) {
  const cyan = (s) => `\x1B[36m${s}\x1B[0m`;
  const yellow = (s) => `\x1B[33m${s}\x1B[0m`;
  const gray = (s) => `\x1B[90m${s}\x1B[0m`;
  const green = (s) => `\x1B[32m${s}\x1B[0m`;
  const bold = (s) => `\x1B[1m${s}\x1B[0m`;
  const cyanBold = (s) => bold(cyan(s));
  const newSections = [];
  newSections.push({
    title: "",
    body: cyanBold(`CCJK - Claude Code Jailbreak Kit v${version}
`) + gray("Lightweight CLI for Claude Code enhancement")
  });
  newSections.push({
    title: yellow("\u{1F4E6} Core Commands"),
    body: [
      `  ${cyan("ccjk")}                    Interactive menu ${green("(default)")}`,
      `  ${cyan("ccjk init")}         ${gray("i")}     Initialize configuration`,
      `  ${cyan("ccjk update")}       ${gray("u")}     Update prompts & workflows`,
      `  ${cyan("ccjk doctor")}             Health check & diagnostics`,
      `  ${cyan("ccjk help")}         ${gray("h")}     Help center & quick reference ${green("NEW")}`
    ].join("\n")
  });
  newSections.push({
    title: yellow("\u{1F6E0}\uFE0F  Development"),
    body: [
      `  ${cyan("ccjk mcp")} <action>        MCP server management`,
      `  ${cyan("ccjk browser")}      ${gray("ab")}    Agent Browser automation ${green("NEW")}`,
      `  ${cyan("ccjk skills")}       ${gray("sk")}    Manage CCJK skills ${green("NEW")}`,
      `  ${cyan("ccjk interview")}    ${gray("iv")}    Interview-driven development`,
      `  ${cyan("ccjk commit")}             Smart git commit`,
      `  ${cyan("ccjk config-switch")} ${gray("cs")}   Switch configuration`,
      `  ${cyan("ccjk postmortem")}   ${gray("pm")}    Postmortem intelligence`
    ].join("\n")
  });
  newSections.push({
    title: yellow("\u2601\uFE0F  Unified Commands") + green(" NEW"),
    body: [
      `  ${cyan("ccjk cloud")} <resource>    Cloud sync (skills/agents/plugins)`,
      `  ${cyan("ccjk system")} <action>     System management (setup/upgrade)`,
      "",
      gray("  Examples:"),
      gray("    ccjk cloud skills sync   - Sync custom skills"),
      gray("    ccjk system upgrade      - Upgrade all components")
    ].join("\n")
  });
  newSections.push({
    title: yellow("\u{1F4CB} Other"),
    body: [
      `  ${cyan("ccjk workflows")}    ${gray("wf")}    Manage workflows`,
      `  ${cyan("ccjk ccr")}               CCR proxy management`,
      `  ${cyan("ccjk ccu")}               Usage statistics`,
      `  ${cyan("ccjk uninstall")}         Remove configurations`
    ].join("\n")
  });
  newSections.push({
    title: yellow("\u2699\uFE0F  Options"),
    body: [
      `  ${green("--lang, -l")} <lang>       Display language (zh-CN, en)`,
      `  ${green("--force, -f")}             Force overwrite`,
      `  ${green("--help, -h")}              Show help`,
      `  ${green("--version, -v")}           Show version`
    ].join("\n")
  });
  newSections.push({
    title: "",
    body: [
      gray("\u2500".repeat(50)),
      gray('Run "ccjk <command> --help" for detailed usage'),
      gray('Run "ccjk" for interactive menu')
    ].join("\n")
  });
  return newSections;
}
async function runLazyCli() {
  bootstrapCloudServices();
  const cac = (await import('cac')).default;
  const cli = cac("ccjk");
  await setupCommandsLazy(cli);
  cli.parse();
}
function bootstrapCloudServices() {
  setImmediate(async () => {
    try {
      const { autoBootstrap } = await import('./chunks/auto-bootstrap.mjs');
      await autoBootstrap();
      const { autoUpgrade } = await import('./chunks/silent-updater.mjs');
      await autoUpgrade();
    } catch {
    }
  });
}

runLazyCli().catch(console.error);
