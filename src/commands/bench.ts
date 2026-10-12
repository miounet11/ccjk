import ansis from 'ansis'
import { probeCommand } from './probe'

/** 轻量基准：复用 probe 测延迟，CCJK 扩展命令 */
export async function benchCommand(opts: { json?: boolean } = {}): Promise<void> {
  console.log(ansis.bold('\nCCJK Bench（探活延迟）\n'))
  await probeCommand({ json: opts.json })
}