/**
 * Example: Error Handling
 * Comprehensive error handling with friendly messages
 */

import { createWizard, ValidationHelper } from '../../src/api-providers'

async function errorHandlingExample() {
  console.log('=== Error Handling Example ===\n')

  const wizard = createWizard()

  // Example 1: Invalid API key
  console.log('Example 1: Invalid API Key')
  try {
    wizard.setProvider('302ai')
    await wizard.setCredentials({ apiKey: 'short' })

    const state = wizard.getState()
    if (state.errors.length > 0) {
      console.log('❌ Validation Errors:')
      state.errors.forEach(err => console.log(`  • ${err}`))
    }
    if (state.suggestions.length > 0) {
      console.log('💡 Suggestions:')
      state.suggestions.forEach(sug => console.log(`  • ${sug}`))
    }
  }
  catch (error) {
    console.error('Error:', (error as Error).message)
  }
  console.log()

  // Example 2: Missing required field
  console.log('Example 2: Missing Required Field')
  wizard.reset()
  try {
    wizard.setProvider('minimax')
    await wizard.setCredentials({
      apiKey: 'test-key-123456789012345678901234567890',
      // Missing groupId
    })

    const state = wizard.getState()
    if (state.errors.length > 0) {
      console.log('❌ Validation Errors:')
      state.errors.forEach(err => console.log(`  • ${err}`))
    }
  }
  catch (error) {
    console.error('Error:', (error as Error).message)
  }
  console.log()

  // Example 3: Friendly error messages
  console.log('Example 3: Friendly Error Messages')
  const errors = [
    new Error('401 Unauthorized'),
    new Error('429 Rate limit exceeded'),
    new Error('Insufficient balance'),
    new Error('Network request failed'),
    new Error('Model not found'),
  ]

  errors.forEach((error) => {
    const friendly = ValidationHelper.getFriendlyError(error)
    console.log(`\nOriginal: ${error.message}`)
    console.log(`Title: ${friendly.title}`)
    console.log(`Message: ${friendly.message}`)
    console.log('Suggestions:')
    friendly.suggestions.slice(0, 2).forEach(s => console.log(`  • ${s}`))
  })
  console.log()

  // Example 4: Validation helpers
  console.log('Example 4: Validation Helpers')

  // Validate API key
  const apiKeyResult = ValidationHelper.validateApiKeyFormat('sk-test', 'sk-')
  console.log('\nAPI Key Validation:')
  console.log(ValidationHelper.formatValidationResult(apiKeyResult))

  // Validate URL
  const urlResult = ValidationHelper.validateUrl('http://api.example.com')
  console.log('\nURL Validation:')
  console.log(ValidationHelper.formatValidationResult(urlResult))

  // Validate required field
  const fieldResult = ValidationHelper.validateRequired('', 'API Key')
  console.log('\nRequired Field Validation:')
  console.log(ValidationHelper.formatValidationResult(fieldResult))

  // Example 5: Connection test with error handling
  console.log('\nExample 5: Connection Test')
  wizard.reset()
  wizard.setProvider('302ai')
  await wizard.setCredentials({
    apiKey: 'sk-invalid-key-123456789012345678901234567890',
  })

  const test = await wizard.testConnection()
  if (test.success) {
    console.log('✅', test.message)
  }
  else {
    console.log('❌', test.message)
    if (test.suggestions) {
      console.log('💡 Suggestions:')
      test.suggestions.forEach(s => console.log(`  • ${s}`))
    }
  }
}

// Run example
errorHandlingExample().catch((error) => {
  console.error('\n❌ Unexpected error:', error.message)
  const friendly = ValidationHelper.getFriendlyError(error)
  console.log(`\n${friendly.title}: ${friendly.message}`)
})
