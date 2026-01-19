import { exec } from 'tinyexec'

export interface GitStatus {
  isRepo: boolean
  hasChanges: boolean
  staged: string[]
  unstaged: string[]
  untracked: string[]
}

export async function checkGitRepo(): Promise<boolean> {
  try {
    await exec('git', ['rev-parse', '--git-dir'])
    return true
  }
  catch {
    return false
  }
}

export async function getGitStatus(): Promise<GitStatus> {
  const isRepo = await checkGitRepo()
  if (!isRepo)
    return { isRepo: false, hasChanges: false, staged: [], unstaged: [], untracked: [] }

  const { stdout } = await exec('git', ['status', '--porcelain'])
  const lines = stdout.trim().split('\n').filter(Boolean)
  const staged: string[] = []
  const unstaged: string[] = []
  const untracked: string[] = []

  for (const line of lines) {
    const [s1, s2] = line.substring(0, 2)
    const file = line.substring(3)
    if (s1 !== ' ' && s1 !== '?')
      staged.push(file)
    if (s2 !== ' ')
      unstaged.push(file)
    if (line.startsWith('??'))
      untracked.push(file)
  }

  return {
    isRepo: true,
    hasChanges: staged.length + unstaged.length + untracked.length > 0,
    staged,
    unstaged,
    untracked,
  }
}

export async function generateCommitMessage(files: string[]): Promise<string> {
  if (files.length === 0)
    return 'chore: update files'

  const { stdout: diff } = await exec('git', ['diff', '--cached', '--stat'])
  const hasTest = files.some(f => f.includes('test') || f.includes('spec'))
  const hasDocs = files.some(f => f.endsWith('.md'))
  const hasConfig = files.some(f => f.endsWith('.json') || f.endsWith('.yaml'))
  const hasTs = files.some(f => f.endsWith('.ts'))

  const type = hasTest ? 'test' : hasDocs ? 'docs' : hasConfig ? 'config' : hasTs ? 'feat' : 'chore'
  const scope = files.length === 1 ? files[0].split('/')[0] : undefined
  const fileList = files.length <= 3 ? files.join(', ') : `${files.length} files`
  const message = scope ? `${type}(${scope}): update ${fileList}` : `${type}: update ${fileList}`

  return `${message}\n\n${diff.trim()}`
}

export async function stageAllChanges(): Promise<void> {
  await exec('git', ['add', '-A'])
}

export async function commitChanges(message: string): Promise<void> {
  await exec('git', ['commit', '-m', message])
}
