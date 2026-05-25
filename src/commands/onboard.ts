import ansis from 'ansis';
import { listProfiles } from '../core/profiles.js';
import { initCommand } from './init.js';
import { doctorCommand } from './doctor.js';

export interface OnboardOptions {
  force?: boolean;
}

/**
 * 首次运行向导。
 *
 * - 老用户（已有 profile）默认直接 return，不打扰；`--force` 可强制重跑。
 * - 新用户：印欢迎横幅 → 跑 init（4 步交互）→ 跑 doctor（健康检查）→ 提示完成。
 */
export async function onboardCommand(opts: OnboardOptions = {}): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length > 0 && !opts.force) {
    return;
  }

  console.log();
  console.log(ansis.bold.cyan('欢迎使用 ccjk —— 5 步配好你的 AI coding 工具'));
  console.log(ansis.gray('（接下来 init 会带你走配置流程，结束后 doctor 会做一次健康检查）'));
  console.log();

  await initCommand({});
  await doctorCommand({});

  console.log();
  console.log(ansis.green('完成！下次运行 `ccjk` 进入主菜单。'));
}
