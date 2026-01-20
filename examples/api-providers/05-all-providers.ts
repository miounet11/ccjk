/**
 * Example: All Providers
 * Demonstrates configuration for each supported provider
 */

import { createWizard } from '../../src/api-providers'

async function allProvidersExample() {
  console.log('=== All Providers Example ===\n')

  const wizard = createWizard()

  // 1. 302.AI
  console.log('1. 302.AI (Popular - Global)')
  console.log('   Setup time: 30 seconds')
  const setup302ai = await wizard.quickSetup(
    '302ai',
    'sk-302ai-key-123456789012345678901234567890',
  )
  console.log(`   ✅ ${setup302ai.provider.name} - ${setup302ai.model}`)
  console.log(`   URL: ${setup302ai.provider.baseUrl}\n`)
  wizard.reset()

  // 2. GLM (智谱AI)
  console.log('2. GLM (智谱AI) (Popular - China)')
  console.log('   Setup time: 1 minute')
  const setupGLM = await wizard.quickSetup(
    'glm',
    'glm-key-123456789012345678901234567890',
  )
  console.log(`   ✅ ${setupGLM.provider.name} - ${setupGLM.model}`)
  console.log(`   URL: ${setupGLM.provider.baseUrl}\n`)
  wizard.reset()

  // 3. Kimi (Moonshot AI)
  console.log('3. Kimi (Moonshot AI) (Popular - China)')
  console.log('   Setup time: 1 minute')
  const setupKimi = await wizard.quickSetup(
    'kimi',
    'sk-kimi-key-123456789012345678901234567890',
  )
  console.log(`   ✅ ${setupKimi.provider.name} - ${setupKimi.model}`)
  console.log(`   URL: ${setupKimi.provider.baseUrl}\n`)
  wizard.reset()

  // 4. MiniMax (requires Group ID)
  console.log('4. MiniMax (China)')
  console.log('   Setup time: 2 minutes')
  wizard.setProvider('minimax')
  await wizard.setCredentials({
    apiKey: 'minimax-key-123456789012345678901234567890',
    groupId: 'your-group-id',
  })
  const setupMiniMax = await wizard.complete()
  console.log(`   ✅ ${setupMiniMax.provider.name} - ${setupMiniMax.model}`)
  console.log(`   URL: ${setupMiniMax.provider.baseUrl}\n`)
  wizard.reset()

  // 5. Anthropic (Official)
  console.log('5. Anthropic (Official - Global)')
  console.log('   Setup time: 1 minute')
  const setupAnthropic = await wizard.quickSetup(
    'anthropic',
    'sk-ant-key-123456789012345678901234567890123456789012345678901234567890',
  )
  console.log(`   ✅ ${setupAnthropic.provider.name} - ${setupAnthropic.model}`)
  console.log(`   URL: ${setupAnthropic.provider.baseUrl}\n`)
  wizard.reset()

  // 6. Custom Provider
  console.log('6. Custom Provider (Any OpenAI-compatible API)')
  console.log('   Setup time: 3 minutes')
  wizard.setProvider('custom')
  await wizard.setCredentials({
    apiKey: 'custom-api-key',
    baseUrl: 'https://api.example.com/v1',
    model: 'gpt-3.5-turbo',
    authType: 'Bearer Token',
  })
  const setupCustom = await wizard.complete()
  console.log(`   ✅ ${setupCustom.provider.name} - ${setupCustom.model}`)
  console.log(`   URL: ${setupCustom.credentials.customFields?.baseUrl}\n`)

  // Summary
  console.log('=== Summary ===')
  console.log('✅ All 6 providers configured successfully!')
  console.log('Popular providers: 302.AI, GLM, Kimi')
  console.log('Other providers: MiniMax, Anthropic, Custom')
}

// Run example
allProvidersExample().catch(console.error)
