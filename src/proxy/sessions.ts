import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'pathe'

export interface SessionSummary {
  tool: string
  path: string
  title: string
  updatedAt: string
  compressed: boolean
}

export interface SessionRoot {
  tool: string
  dir: string
}

function titleFromLine(line: string): string | undefined {
  try {
    const row = JSON.parse(line) as Record<string, unknown>
    if (typeof row.title === 'string' && row.title.trim())
      return row.title.trim()
    const message = row.message
    if (message && typeof message === 'object') {
      const content = (message as { content?: unknown }).content
      if (typeof content === 'string' && content.trim())
        return content.trim().slice(0, 80)
    }
    if (typeof row.summary === 'string' && row.summary.trim())
      return row.summary.trim().slice(0, 80)
  }
  catch {
    return undefined
  }
  return undefined
}

function walk(dir: string, acc: string[], limit: number) {
  if (!existsSync(dir) || acc.length >= limit)
    return
  for (const name of readdirSync(dir)) {
    if (acc.length >= limit)
      return
    const path = join(dir, name)
    let st
    try {
      st = statSync(path)
    }
    catch {
      continue
    }
    if (st.isDirectory()) {
      walk(path, acc, limit)
      continue
    }
    if (name.endsWith('.jsonl') || name.endsWith('.jsonl.zst'))
      acc.push(path)
  }
}

export function listSessions(roots: readonly SessionRoot[], limit = 100): SessionSummary[] {
  const files: string[] = []
  for (const root of roots)
    walk(root.dir, files, limit * 4)
  const rows: SessionSummary[] = []
  for (const path of files) {
    const root = roots.find(item => path.startsWith(item.dir))
    const compressed = path.endsWith('.jsonl.zst')
    let title = compressed ? '压缩会话（.jsonl.zst）' : path.split('/').pop() || 'session'
    if (!compressed) {
      const head = readFileSync(path, 'utf-8').split('\n').find(line => line.trim())
      const parsed = head ? titleFromLine(head) : undefined
      if (parsed)
        title = parsed
    }
    let updatedAt = ''
    try {
      updatedAt = statSync(path).mtime.toISOString()
    }
    catch {
      updatedAt = ''
    }
    rows.push({
      tool: root?.tool ?? 'unknown',
      path,
      title,
      updatedAt,
      compressed,
    })
  }
  return rows
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
}
