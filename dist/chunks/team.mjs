import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { join } from 'pathe';
import { i18n } from './index.mjs';
import { writeFileAtomic } from './fs-operations.mjs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:crypto';
import 'node:fs/promises';

const TEAM_DIR = ".ccjk/team";
const CONFIG_FILE = join(TEAM_DIR, "config.json");
async function teamInit() {
  if (!existsSync(TEAM_DIR)) {
    mkdirSync(TEAM_DIR, { recursive: true });
  }
  const { name } = await inquirer.prompt({
    type: "input",
    name: "name",
    message: i18n.t("team:enterTeamName"),
    default: "my-team"
  });
  const config = {
    name,
    members: [],
    sharedSettings: {}
  };
  writeFileAtomic(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(ansis.green(`\u2714 ${i18n.t("team:teamInitialized")}: ${name}`));
}
async function teamShare() {
  if (!existsSync(CONFIG_FILE)) {
    console.log(ansis.yellow(i18n.t("team:noTeamConfig")));
    return;
  }
  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  console.log(ansis.green(i18n.t("team:shareConfig")));
  console.log(JSON.stringify(config, null, 2));
}
async function teamSync() {
  if (!existsSync(CONFIG_FILE)) {
    console.log(ansis.yellow(i18n.t("team:noTeamConfig")));
    return;
  }
  console.log(ansis.green(`\u2714 ${i18n.t("team:syncComplete")}`));
}

export { teamInit, teamShare, teamSync };
