import ansis from 'ansis';

/**
 * 输出 shell completion 脚本到 stdout。
 * 用户安装方式（README 会写）：
 *   bash:  ccjk completion bash > /usr/local/etc/bash_completion.d/ccjk
 *   zsh:   ccjk completion zsh  > "${fpath[1]}/_ccjk"
 *   fish:  ccjk completion fish > ~/.config/fish/completions/ccjk.fish
 *
 * 简单实现：硬编码顶层命令列表 + 每个命令的简短描述。
 * 不做"基于上下文的动态补全"（比如 ccjk use <tab> 列 profile 名字）—— 那需要从 shell 调回 ccjk，
 * 增加 100ms+ 延迟，得不偿失。
 */

interface CmdSpec {
  name: string;
  desc: string;
}

const COMMANDS: CmdSpec[] = [
  { name: 'init', desc: '配置 API（写 settings.json，存为 profile）' },
  { name: 'use', desc: '切换 profile' },
  { name: 'profile', desc: '管理已保存的 profile' },
  { name: 'mode', desc: '对话模式（thinking/effort 档位）' },
  { name: 'workflow', desc: '工作流（多步命令一键跑）' },
  { name: 'perms', desc: '权限档位 safe/standard/yolo' },
  { name: 'perms-show', desc: '查看三个工具当前权限' },
  { name: 'mcp', desc: '配置 MCP 服务（预设勾选）' },
  { name: 'mcp-ls', desc: '列出已安装的 MCP' },
  { name: 'mcp-add', desc: '添加自定义 MCP' },
  { name: 'mcp-rm', desc: '卸载 MCP' },
  { name: 'doctor', desc: '检查 settings.json 配置问题（--fix 自动修）' },
  { name: 'rollback', desc: '从备份还原 settings.json / config.toml' },
  { name: 'tools', desc: '查看工具版本（--check-updates 查最新）' },
  { name: 'install', desc: '安装代码工具（Clavue/Claude Code/Codex）' },
  { name: 'update', desc: '升级代码工具' },
  { name: 'detect', desc: '列出已安装的代码工具' },
  { name: 'status', desc: '显示完整状态（profile / perms / mode / 工具版本）' },
  { name: 'statusline-install', desc: '安装状态栏' },
  { name: 'statusline-uninstall', desc: '卸载状态栏' },
  { name: 'git-install', desc: '安装 git slash 命令模板' },
  { name: 'menu', desc: '交互菜单（默认）' },
  { name: 'completion', desc: '生成 shell 补全脚本' },
];

export interface CompletionOptions {
  install?: boolean;
}

export function completionCommand(shell: string | undefined, _opts: CompletionOptions = {}): void {
  if (!shell) {
    console.log(ansis.bold('\n生成 shell 补全脚本'));
    console.log();
    console.log(ansis.dim('用法：'));
    console.log('  ccjk completion bash');
    console.log('  ccjk completion zsh');
    console.log('  ccjk completion fish');
    console.log();
    console.log(ansis.dim('安装（按你用的 shell 选一种）：'));
    console.log('  ccjk completion bash > /usr/local/etc/bash_completion.d/ccjk');
    console.log('  ccjk completion zsh  > "${fpath[1]}/_ccjk"  # 然后 compinit');
    console.log('  ccjk completion fish > ~/.config/fish/completions/ccjk.fish');
    console.log();
    return;
  }

  switch (shell) {
    case 'bash':
      process.stdout.write(bashScript());
      break;
    case 'zsh':
      process.stdout.write(zshScript());
      break;
    case 'fish':
      process.stdout.write(fishScript());
      break;
    default:
      throw new Error(`不支持的 shell: ${shell}（可选: bash, zsh, fish）`);
  }
}

function bashScript(): string {
  const cmds = COMMANDS.map(c => c.name).join(' ');
  return `# ccjk bash completion
_ccjk_complete() {
  local cur prev cmds
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  cmds="${cmds}"

  if [ "\$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( \$(compgen -W "\$cmds" -- "\$cur") )
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
    profile)
      COMPREPLY=( \$(compgen -W "ls show rm use export import copy rename" -- "\$cur") )
      ;;
    mode)
      COMPREPLY=( \$(compgen -W "ls use show add" -- "\$cur") )
      ;;
    workflow)
      COMPREPLY=( \$(compgen -W "ls run" -- "\$cur") )
      ;;
    perms)
      COMPREPLY=( \$(compgen -W "safe standard yolo" -- "\$cur") )
      ;;
    completion)
      COMPREPLY=( \$(compgen -W "bash zsh fish" -- "\$cur") )
      ;;
  esac
}

complete -F _ccjk_complete ccjk
`;
}

function zshScript(): string {
  const cmdLines = COMMANDS.map(c => `      '${c.name}:${escapeZsh(c.desc)}'`).join('\n');
  return `#compdef ccjk
# ccjk zsh completion

_ccjk() {
  local -a commands
  commands=(
${cmdLines}
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "\${words[2]}" in
    profile)
      _values 'subcommand' \\
        'ls[列出 profile]' \\
        'show[查看详情]' \\
        'rm[删除]' \\
        'use[切换]' \\
        'export[导出 JSON 包]' \\
        'import[导入 JSON 包]' \\
        'copy[基于现有 profile 复制]' \\
        'rename[重命名]'
      ;;
    mode)
      _values 'subcommand' 'ls[列出]' 'use[切换]' 'show[查看]' 'add[自定义]'
      ;;
    workflow)
      _values 'subcommand' 'ls[列出]' 'run[执行]'
      ;;
    perms)
      _values 'tier' 'safe[只读]' 'standard[日常推荐]' 'yolo[放飞]'
      ;;
    completion)
      _values 'shell' 'bash' 'zsh' 'fish'
      ;;
  esac
}

_ccjk "\$@"
`;
}

function fishScript(): string {
  const lines: string[] = [
    '# ccjk fish completion',
    '',
    'complete -c ccjk -f',
  ];
  for (const c of COMMANDS) {
    lines.push(`complete -c ccjk -n "__fish_use_subcommand" -a "${c.name}" -d "${escapeFish(c.desc)}"`);
  }
  // 子命令组
  lines.push('');
  lines.push('# profile 子命令');
  for (const sub of ['ls', 'show', 'rm', 'use', 'export', 'import', 'copy', 'rename']) {
    lines.push(`complete -c ccjk -n "__fish_seen_subcommand_from profile" -a "${sub}"`);
  }
  lines.push('');
  lines.push('# mode 子命令');
  for (const sub of ['ls', 'use', 'show', 'add']) {
    lines.push(`complete -c ccjk -n "__fish_seen_subcommand_from mode" -a "${sub}"`);
  }
  lines.push('');
  lines.push('# workflow 子命令');
  for (const sub of ['ls', 'run']) {
    lines.push(`complete -c ccjk -n "__fish_seen_subcommand_from workflow" -a "${sub}"`);
  }
  lines.push('');
  lines.push('# perms 档位');
  for (const tier of ['safe', 'standard', 'yolo']) {
    lines.push(`complete -c ccjk -n "__fish_seen_subcommand_from perms" -a "${tier}"`);
  }
  lines.push('');
  lines.push('# completion shell');
  for (const shell of ['bash', 'zsh', 'fish']) {
    lines.push(`complete -c ccjk -n "__fish_seen_subcommand_from completion" -a "${shell}"`);
  }
  return `${lines.join('\n')}\n`;
}

function escapeZsh(s: string): string {
  return s.replace(/'/g, "''").replace(/:/g, '\\:');
}

function escapeFish(s: string): string {
  return s.replace(/"/g, '\\"');
}
