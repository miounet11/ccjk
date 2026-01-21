import process__default from 'node:process';
import { exec } from 'tinyexec';
import { i18n, initI18n } from './index.mjs';
import { j as findRealCommandPath } from './platform.mjs';
import 'node:fs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import 'node:os';

const PASSTHROUGH_ARGS = /* @__PURE__ */ new Set([
  "--help",
  "-h",
  "--version",
  "-v",
  "--mcp-list",
  "--mcp-debug",
  "update",
  "config"
]);
function shouldPassthrough(args) {
  if (args.length === 0)
    return false;
  if (args[0]?.startsWith("/")) {
    return true;
  }
  return args.some((arg) => PASSTHROUGH_ARGS.has(arg));
}
async function claudeWrapper(args, options = {}) {
  const { debug = false, noWrap = false } = options;
  if (!i18n.isInitialized) {
    await initI18n();
  }
  const claudePath = await findRealCommandPath("claude");
  if (!claudePath) {
    console.error(i18n.t("context:claudeNotFound"));
    console.error(i18n.t("context:claudeNotFoundHint"));
    process__default.exit(1);
  }
  if (debug) {
    console.log(`[DEBUG] Claude path: ${claudePath}`);
    console.log(`[DEBUG] Args: ${JSON.stringify(args)}`);
    console.log(`[DEBUG] No wrap: ${noWrap}`);
    console.log(`[DEBUG] Passthrough: ${shouldPassthrough(args)}`);
  }
  if (noWrap || shouldPassthrough(args)) {
    if (debug) {
      console.log("[DEBUG] Using direct passthrough mode");
    }
    await execClaudeDirect(claudePath, args);
    return;
  }
  await execClaudeDirect(claudePath, args);
}
async function execClaudeDirect(claudePath, args) {
  try {
    const result = await exec(claudePath, args, {
      nodeOptions: {
        stdio: "inherit"
      }
    });
    process__default.exit(result.exitCode ?? 0);
  } catch (error) {
    if (error && typeof error === "object" && "signal" in error) {
      const signal = error.signal;
      const signalCodes = {
        SIGINT: 130,
        // 128 + 2
        SIGTERM: 143,
        // 128 + 15
        SIGQUIT: 131
        // 128 + 3
      };
      process__default.exit(signalCodes[signal] || 1);
    }
    console.error(i18n.t("context:wrapperError"), error);
    process__default.exit(1);
  }
}

export { claudeWrapper };
