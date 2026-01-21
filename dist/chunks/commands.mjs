import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import ansis from 'ansis';
import { ensureI18nInitialized, i18n } from './index.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';

const execAsync = promisify(exec);
async function runCcrUi(apiKey) {
  ensureI18nInitialized();
  console.log(ansis.green(`
\u{1F5A5}\uFE0F  ${i18n.t("ccr:startingCcrUi")}`));
  if (apiKey) {
    console.log(ansis.bold.green(`
\u{1F511} ${i18n.t("ccr:ccrUiApiKey") || "CCR UI API Key"}: ${apiKey}`));
    console.log(ansis.gray(`   ${i18n.t("ccr:ccrUiApiKeyHint") || "Use this API key to login to CCR UI"}
`));
  }
  try {
    const { stdout, stderr } = await execAsync("ccr ui");
    if (stdout)
      console.log(stdout);
    if (stderr)
      console.error(ansis.yellow(stderr));
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrUiStarted")}`));
  } catch (error) {
    console.error(ansis.red(`\u2716 ${i18n.t("ccr:ccrCommandFailed")}: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}
async function runCcrStatus() {
  ensureI18nInitialized();
  console.log(ansis.green(`
\u{1F4CA} ${i18n.t("ccr:checkingCcrStatus")}`));
  try {
    const { stdout, stderr } = await execAsync("ccr status");
    if (stdout) {
      console.log(`
${ansis.bold(i18n.t("ccr:ccrStatusTitle"))}`);
      console.log(stdout);
    }
    if (stderr)
      console.error(ansis.yellow(stderr));
  } catch (error) {
    console.error(ansis.red(`\u2716 ${i18n.t("ccr:ccrCommandFailed")}: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}
async function runCcrRestart() {
  ensureI18nInitialized();
  console.log(ansis.green(`
\u{1F504} ${i18n.t("ccr:restartingCcr")}`));
  try {
    const { stdout, stderr } = await execAsync("ccr restart");
    if (stdout)
      console.log(stdout);
    if (stderr)
      console.error(ansis.yellow(stderr));
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrRestarted")}`));
  } catch (error) {
    console.error(ansis.red(`\u2716 ${i18n.t("ccr:ccrCommandFailed")}: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}
async function runCcrStart() {
  ensureI18nInitialized();
  console.log(ansis.green(`
\u25B6\uFE0F  ${i18n.t("ccr:startingCcr")}`));
  try {
    const { stdout, stderr } = await execAsync("ccr start");
    if (stdout)
      console.log(stdout);
    if (stderr)
      console.error(ansis.yellow(stderr));
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrStarted")}`));
  } catch (error) {
    if (error.stdout && error.stdout.includes("Loaded JSON config from:")) {
      console.log(error.stdout);
      if (error.stderr)
        console.error(ansis.yellow(error.stderr));
      console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrStarted")}`));
    } else {
      console.error(ansis.red(`\u2716 ${i18n.t("ccr:ccrCommandFailed")}: ${error instanceof Error ? error.message : String(error)}`));
      throw error;
    }
  }
}
async function runCcrStop() {
  ensureI18nInitialized();
  console.log(ansis.green(`
\u23F9\uFE0F  ${i18n.t("ccr:stoppingCcr")}`));
  try {
    const { stdout, stderr } = await execAsync("ccr stop");
    if (stdout)
      console.log(stdout);
    if (stderr)
      console.error(ansis.yellow(stderr));
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrStopped")}`));
  } catch (error) {
    console.error(ansis.red(`\u2716 ${i18n.t("ccr:ccrCommandFailed")}: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}

export { runCcrRestart, runCcrStart, runCcrStatus, runCcrStop, runCcrUi };
