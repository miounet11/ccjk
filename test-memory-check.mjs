#!/usr/bin/env node
/**
 * Quick test script for memory health check
 */
import { memoryCheck } from './dist/health/checks/memory-check.mjs'

console.log('Testing Memory Health Check...')
console.log('=')

try {
  const result = await memoryCheck.check()

  console.log('\nResult:')
  console.log('  Name:', result.name)
  console.log('  Status:', result.status)
  console.log('  Score:', result.score)
  console.log('  Weight:', result.weight)
  console.log('  Message:', result.message)

  if (result.details && result.details.length > 0) {
    console.log('\nDetails:')
    result.details.forEach(detail => console.log('  ' + detail))
  }

  if (result.fix) {
    console.log('\nRecommendations:')
    console.log('  ' + result.fix)
  }

  if (result.command) {
    console.log('\nSuggested command:')
    console.log('  ' + result.command)
  }

  console.log('\n✓ Memory check completed successfully')
} catch (error) {
  console.error('✗ Error running memory check:', error)
  process.exit(1)
}
