/**
 * CCJK Features Command
 * Display all available features in a unified view
 */

import ansis from 'ansis'

export async function showFeatures(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('╔══════════════════════════════════════════════════════════════╗'))
  console.log(ansis.bold.cyan('║') + ansis.bold.white('  📦 CCJK 功能一览                                            ') + ansis.bold.cyan('║'))
  console.log(ansis.bold.cyan('╠══════════════════════════════════════════════════════════════╣'))

  // CLI Commands Section
  console.log(`${ansis.bold.cyan('║')}                                                              ${ansis.bold.cyan('║')}`)
  console.log(ansis.bold.cyan('║') + ansis.bold.yellow('  🔧 CLI 命令                                                 ') + ansis.bold.cyan('║'))
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.cyan('ccjk init')}       初始化环境配置                        ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.cyan('ccjk update')}     更新工作流和模板                      ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.cyan('ccjk cs')}         切换 API 配置                         ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.cyan('ccjk doctor')}     诊断配置问题                          ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.cyan('ccjk ccr')}        CCR 代理管理                          ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  └─ ${ansis.cyan('ccjk ccu')}        使用量统计                            ${ansis.bold.cyan('║')}`)

  // Workflows Section
  console.log(`${ansis.bold.cyan('║')}                                                              ${ansis.bold.cyan('║')}`)
  console.log(ansis.bold.cyan('║') + ansis.bold.yellow('  📋 工作流（在 Claude Code 中使用）                          ') + ansis.bold.cyan('║'))
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.green('/ccjk:workflow')}  六阶段开发流程 ${ansis.bgGreen.black(' 推荐 ')}            ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.green('/ccjk:feat')}      功能规划流程                         ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.green('/git-commit')}     智能提交 ${ansis.bgYellow.black(' 热门 ')}                    ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.green('/git-rollback')}   回滚更改                             ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  └─ ${ansis.green('/git-cleanup')}    清理分支                             ${ansis.bold.cyan('║')}`)

  // Output Styles Section
  console.log(`${ansis.bold.cyan('║')}                                                              ${ansis.bold.cyan('║')}`)
  console.log(ansis.bold.cyan('║') + ansis.bold.yellow('  🎨 输出风格                                                 ') + ansis.bold.cyan('║'))
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.magenta('senior-architect')}   资深架构师风格                  ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ├─ ${ansis.magenta('pair-programmer')}    结对编程风格                    ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  └─ ${ansis.magenta('speed-coder')}        快速编码风格                    ${ansis.bold.cyan('║')}`)

  // Quick Actions Section
  console.log(`${ansis.bold.cyan('║')}                                                              ${ansis.bold.cyan('║')}`)
  console.log(ansis.bold.cyan('║') + ansis.bold.yellow('  ⚡ 快捷操作（在 Claude Code 中输入数字）                    ') + ansis.bold.cyan('║'))
  console.log(`${ansis.bold.cyan('║')}  ${ansis.dim('1=智能提交 2=代码审查 3=编写测试 4=规划功能')}                ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  ${ansis.dim('5=调试问题 6=头脑风暴 7=验证代码 8=写文档')}                  ${ansis.bold.cyan('║')}`)

  console.log(`${ansis.bold.cyan('║')}                                                              ${ansis.bold.cyan('║')}`)
  console.log(ansis.bold.cyan('╠══════════════════════════════════════════════════════════════╣'))
  console.log(ansis.bold.cyan('║') + ansis.dim('  💡 提示：输入 ccjk <命令> --help 查看详细用法               ') + ansis.bold.cyan('║'))
  console.log(ansis.bold.cyan('╚══════════════════════════════════════════════════════════════╝'))
  console.log('')
}
