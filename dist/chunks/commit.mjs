import ansis from 'ansis';
import inquirer from 'inquirer';
import { exec } from 'tinyexec';

async function checkGitRepo() {
  try {
    await exec("git", ["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}
async function getGitStatus() {
  const isRepo = await checkGitRepo();
  if (!isRepo)
    return { isRepo: false, hasChanges: false, staged: [], unstaged: [], untracked: [] };
  const { stdout } = await exec("git", ["status", "--porcelain"]);
  const lines = stdout.trim().split("\n").filter(Boolean);
  const staged = [];
  const unstaged = [];
  const untracked = [];
  for (const line of lines) {
    const [s1, s2] = line.substring(0, 2);
    const file = line.substring(3);
    if (s1 !== " " && s1 !== "?")
      staged.push(file);
    if (s2 !== " ")
      unstaged.push(file);
    if (line.startsWith("??"))
      untracked.push(file);
  }
  return {
    isRepo: true,
    hasChanges: staged.length + unstaged.length + untracked.length > 0,
    staged,
    unstaged,
    untracked
  };
}
async function generateCommitMessage(files) {
  if (files.length === 0)
    return "chore: update files";
  const { stdout: diff } = await exec("git", ["diff", "--cached", "--stat"]);
  const hasTest = files.some((f) => f.includes("test") || f.includes("spec"));
  const hasDocs = files.some((f) => f.endsWith(".md"));
  const hasConfig = files.some((f) => f.endsWith(".json") || f.endsWith(".yaml"));
  const hasTs = files.some((f) => f.endsWith(".ts"));
  const type = hasTest ? "test" : hasDocs ? "docs" : hasConfig ? "config" : hasTs ? "feat" : "chore";
  const scope = files.length === 1 ? files[0].split("/")[0] : void 0;
  const fileList = files.length <= 3 ? files.join(", ") : `${files.length} files`;
  const message = scope ? `${type}(${scope}): update ${fileList}` : `${type}: update ${fileList}`;
  return `${message}

${diff.trim()}`;
}
async function stageAllChanges() {
  await exec("git", ["add", "-A"]);
}
async function commitChanges(message) {
  await exec("git", ["commit", "-m", message]);
}

async function commit(options = {}) {
  if (!await checkGitRepo()) {
    console.log(ansis.red("\u2717 Not a git repository"));
    return;
  }
  const status = await getGitStatus();
  if (!status.hasChanges) {
    console.log(ansis.yellow("No changes to commit"));
    return;
  }
  console.log(ansis.green("\n\u{1F4DD} Changes detected:"));
  if (status.staged.length > 0) {
    console.log(ansis.green(`  Staged: ${status.staged.length} files`));
    status.staged.forEach((f) => console.log(ansis.gray(`    ${f}`)));
  }
  if (status.unstaged.length > 0)
    console.log(ansis.yellow(`  Unstaged: ${status.unstaged.length} files`));
  if (status.untracked.length > 0)
    console.log(ansis.yellow(`  Untracked: ${status.untracked.length} files`));
  if (status.unstaged.length > 0 || status.untracked.length > 0) {
    await stageAllChanges();
    console.log(ansis.green("\n\u2713 All changes staged"));
  }
  const allFiles = [...status.staged, ...status.unstaged, ...status.untracked];
  let message;
  if (options.message) {
    message = options.message;
  } else if (options.auto) {
    message = await generateCommitMessage(allFiles);
    console.log(ansis.green("\n\u{1F4AC} Generated commit message:"));
    console.log(ansis.white(message));
  } else {
    const suggested = await generateCommitMessage(allFiles);
    const { commitMessage } = await inquirer.prompt([{
      type: "input",
      name: "commitMessage",
      message: "Commit message:",
      default: suggested.split("\n")[0]
    }]);
    message = commitMessage;
  }
  if (options.dryRun) {
    console.log(ansis.yellow("\n\u{1F50D} Dry run - no commit created"));
    console.log(ansis.gray("Would commit with:"));
    console.log(ansis.white(message));
    return;
  }
  try {
    await commitChanges(message);
    console.log(ansis.green("\n\u2713 Changes committed"));
  } catch (error) {
    console.log(ansis.red(`
\u2717 Commit failed: ${error}`));
  }
}

export { commit };
