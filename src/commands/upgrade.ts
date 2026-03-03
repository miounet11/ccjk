/**
 * Upgrade Command
 * 升级命令 - 手动触发升级
 */

import { checkForUpdates, performUpgrade } from '../core/auto-upgrade'

export async function upgrade(): Promise<void> {
  console.log('🔍 Checking for updates...\n')

  const versionInfo = await checkForUpdates()

  if (!versionInfo.hasUpdate) {
    console.log('✅ You are already on the latest version!')
    console.log(`   Current version: v${versionInfo.current}\n`)
    return
  }

  console.log('📦 Update available:')
  console.log(`   Current: v${versionInfo.current}`)
  console.log(`   Latest:  v${versionInfo.latest} (${versionInfo.updateType} update)\n`)

  // 询问用户是否升级
  const { default: prompts } = await import('prompts')
  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Do you want to upgrade now?',
    initial: true,
  })

  if (!confirm) {
    console.log('\n⏭️  Upgrade cancelled.\n')
    return
  }

  // 执行升级
  await performUpgrade()
}
