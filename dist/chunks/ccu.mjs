import process__default from 'node:process';
import ansis from 'ansis';
import { x } from 'tinyexec';
import { i18n } from './index.mjs';
import 'node:fs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';

async function executeCcusage(args = []) {
  try {
    const command = "npx";
    const commandArgs = ["ccusage@latest", ...args || []];
    console.log(ansis.green(i18n.t("tools:runningCcusage")));
    console.log(ansis.gray(`$ npx ccusage@latest ${(args || []).join(" ")}`));
    console.log("");
    await x(command, commandArgs, {
      nodeOptions: {
        stdio: "inherit"
      }
    });
  } catch (error) {
    console.error(ansis.red(i18n.t("tools:ccusageFailed")));
    console.error(ansis.yellow(i18n.t("tools:checkNetworkConnection")));
    if (process__default.env.DEBUG) {
      console.error(ansis.gray(i18n.t("tools:errorDetails")), error);
    }
    if (process__default.env.NODE_ENV !== "test") {
      process__default.exit(1);
    }
    throw error;
  }
}

export { executeCcusage };
