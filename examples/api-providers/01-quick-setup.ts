/**
 * Example: Quick Setup
 * The fastest way to configure an API provider
 */

import { createWizard } from '../../src/api-providers'

async function quickSetupExample() {
  console.log('=== Quick Setup Example ===\n')

  // Create wizard
  const wizard = createWizard()

  // Quick setup with just provider ID and API key
  console.log('Setting up 302.AI...')
  const setup = await wizard.quickSetup('302ai', 'sk-your-api-key-here')

  console.log('✅ Setup complete!')
  console.log(`Provider: ${setup.provider.name}`)
  console.log(`Model: ${setup.model}`)
  console.log(`Base URL: ${setup.provider.baseUrl}`)
}

// Run example
quickSetupExample().catch(console.error)
