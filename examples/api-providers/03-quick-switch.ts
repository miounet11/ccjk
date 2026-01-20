/**
 * Example: Quick Switch Between Providers
 * Save and switch between multiple providers
 */

import { createQuickSwitch, createWizard } from '../../src/api-providers'

async function quickSwitchExample() {
  console.log('=== Quick Switch Example ===\n')

  const wizard = createWizard()
  const switcher = createQuickSwitch()

  // Configure multiple providers
  console.log('Configuring providers...')

  const setup302ai = await wizard.quickSetup(
    '302ai',
    'sk-302ai-key-123456789012345678901234567890',
  )
  wizard.reset()

  const setupGLM = await wizard.quickSetup(
    'glm',
    'glm-key-123456789012345678901234567890',
  )
  wizard.reset()

  const setupKimi = await wizard.quickSetup(
    'kimi',
    'sk-kimi-key-123456789012345678901234567890',
  )

  // Save providers with nicknames
  console.log('Saving providers...')
  switcher.saveProvider(setup302ai, 'Fast - 302.AI')
  switcher.saveProvider(setupGLM, 'Chinese - GLM')
  switcher.saveProvider(setupKimi, 'Long Context - Kimi')

  console.log(`✅ Saved ${switcher.getCount()} providers\n`)

  // Get quick switch menu
  console.log('Quick Switch Menu:')
  const menu = switcher.getQuickSwitchMenu()
  menu.forEach((item, index) => {
    const marker = item.isCurrent ? '→' : ' '
    console.log(`${marker} ${index + 1}. ${item.label}`)
    console.log(`   ${item.description}`)
  })
  console.log()

  // Switch between providers
  console.log('Switching to 302.AI...')
  let current = switcher.switchTo('302ai')
  console.log(`✅ Now using: ${current.provider.name} (${current.model})\n`)

  console.log('Switching to Kimi for long document...')
  current = switcher.switchTo('kimi')
  console.log(`✅ Now using: ${current.provider.name} (${current.model})\n`)

  console.log('Switching to GLM for Chinese content...')
  current = switcher.switchTo('glm')
  console.log(`✅ Now using: ${current.provider.name} (${current.model})\n`)

  // Get recent providers
  console.log('Recently used providers:')
  const recent = switcher.getRecentProviders(3)
  recent.forEach((provider, index) => {
    console.log(`${index + 1}. ${provider.nickname || provider.name}`)
  })
  console.log()

  // Export configuration (without credentials for safety)
  console.log('Exporting configuration...')
  const exported = switcher.export(false)
  console.log('✅ Configuration exported (credentials excluded)\n')

  // Export with credentials (for backup)
  const backup = switcher.export(true)
  console.log('✅ Backup created (credentials included)\n')

  // Import configuration
  console.log('Importing configuration to new instance...')
  const newSwitcher = createQuickSwitch()
  await newSwitcher.import(backup)
  console.log(`✅ Imported ${newSwitcher.getCount()} providers`)
}

// Run example
quickSwitchExample().catch(console.error)
