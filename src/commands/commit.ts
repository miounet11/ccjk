import ansis from 'ansis'
import inquirer from 'inquirer'
import { checkGitRepo, commitChanges, generateCommitMessage, getGitStatus, stageAllChanges } from '../utils/git-auto'

export interface CommitCommandOptions {
  auto?: boolean
  dryRun?: boolean
  message?: string
}

export async function commit(options: CommitCommandOptions = {}): Promise<void> {
  if (!await checkGitRepo()) {
    console.log(ansis.red('✗ Not a git repository'))
    return
  }

  const status = await getGitStatus()
  if (!status.hasChanges) {
    console.log(ansis.yellow('No changes to commit'))
    return
  }

  console.log(ansis.green('\n📝 Changes detected:'))
  if (status.staged.length > 0) {
    console.log(ansis.green(`  Staged: ${status.staged.length} files`))
    status.staged.forEach(f => console.log(ansis.gray(`    ${f}`)))
  }
  if (status.unstaged.length > 0)
    console.log(ansis.yellow(`  Unstaged: ${status.unstaged.length} files`))
  if (status.untracked.length > 0)
    console.log(ansis.yellow(`  Untracked: ${status.untracked.length} files`))

  if (status.unstaged.length > 0 || status.untracked.length > 0) {
    await stageAllChanges()
    console.log(ansis.green('\n✓ All changes staged'))
  }

  const allFiles = [...status.staged, ...status.unstaged, ...status.untracked]
  let message: string

  if (options.message) {
    message = options.message
  }
  else if (options.auto) {
    message = await generateCommitMessage(allFiles)
    console.log(ansis.green('\n💬 Generated commit message:'))
    console.log(ansis.white(message))
  }
  else {
    const suggested = await generateCommitMessage(allFiles)
    const { commitMessage } = await inquirer.prompt([{
      type: 'input',
      name: 'commitMessage',
      message: 'Commit message:',
      default: suggested.split('\n')[0],
    }])
    message = commitMessage
  }

  if (options.dryRun) {
    console.log(ansis.yellow('\n🔍 Dry run - no commit created'))
    console.log(ansis.gray('Would commit with:'))
    console.log(ansis.white(message))
    return
  }

  try {
    await commitChanges(message)
    console.log(ansis.green('\n✓ Changes committed'))
  }
  catch (error) {
    console.log(ansis.red(`\n✗ Commit failed: ${error}`))
  }
}
