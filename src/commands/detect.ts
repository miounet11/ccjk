import ansis from 'ansis';
import { detectAll } from '../core/detect.js';
import { TOOLS } from '../core/tools.js';

export function detectCommand(): void {
  const results = detectAll();
  console.log(ansis.bold('\n已检测到的代码工具：\n'));
  for (const r of results) {
    const meta = TOOLS[r.tool];
    const cli = r.cliInstalled ? ansis.green('已安装') : ansis.gray('未安装');
    const cfg = r.configExists ? ansis.green('有配置') : ansis.gray('无配置');
    console.log(`  ${meta.displayName.padEnd(14)} CLI: ${cli}  配置: ${cfg}  ${ansis.dim(meta.configDir)}`);
  }
  console.log('');
}
