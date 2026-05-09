import inquirer from 'inquirer';
import ansis from 'ansis';

/**
 * 通用确认弹窗。封装常见模式：
 *   if (!opts.yes) { ...prompt confirm... if (!ok) { print 已取消; return false } }
 *
 * 返回 true 表示用户确认（或 yes=true 跳过），false 表示取消。
 * 取消时打印一行灰色 "已取消" 提示。
 */
export async function confirmAction(
  message: string,
  opts: { yes?: boolean | undefined; default?: boolean | undefined } = {},
): Promise<boolean> {
  if (opts.yes) return true;
  const { ok } = await inquirer.prompt<{ ok: boolean }>([{
    type: 'confirm',
    name: 'ok',
    message,
    default: opts.default ?? true,
  }]);
  if (!ok) console.log(ansis.gray('已取消。\n'));
  return ok;
}
