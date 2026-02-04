/**
 * Zero-Config Brain System Demo
 *
 * This demonstrates how the Brain system works with ZERO configuration.
 * Users just type what they want - the system handles everything.
 */

import { processUserInput } from '../router'

/**
 * Demo: Various user inputs and how Brain system handles them
 */
async function demo() {
  console.log('🧠 Brain System - Zero-Config Demo\n')
  console.log('='.repeat(70))
  console.log()

  // Example 1: Complex feature request
  console.log('Example 1: Complex Feature Request')
  console.log('User types: "Implement user authentication with JWT and refresh tokens"')
  console.log()

  const result1 = await processUserInput(
    'Implement user authentication with JWT and refresh tokens',
  )

  if (result1.handled && result1.result) {
    console.log('✓ Brain system handled it automatically!')
    console.log(`  Route: ${result1.result.route}`)
    console.log(`  Complexity: ${result1.result.intent.complexity}`)
    console.log(`  Agents created: ${result1.result.agentsCreated.length}`)
    console.log(`  Skills created: ${result1.result.skillsCreated.length}`)
    console.log(`  MCP tools: ${result1.result.mcpToolsUsed.join(', ')}`)
    console.log(`  Convoy: ${result1.result.convoyId}`)
  }

  console.log()
  console.log('='.repeat(70))
  console.log()

  // Example 2: Architecture design
  console.log('Example 2: Architecture Design')
  console.log('User types: "Design a microservices architecture for e-commerce"')
  console.log()

  const result2 = await processUserInput(
    'Design a microservices architecture for e-commerce',
  )

  if (result2.handled && result2.result) {
    console.log('✓ Brain system handled it automatically!')
    console.log(`  Route: ${result2.result.route}`)
    console.log(`  Complexity: ${result2.result.intent.complexity}`)
    console.log(`  Agents created: ${result2.result.agentsCreated.length}`)
    console.log(`  Skills created: ${result2.result.skillsCreated.length}`)
  }

  console.log()
  console.log('='.repeat(70))
  console.log()

  // Example 3: Simple question (bypassed)
  console.log('Example 3: Simple Question (Bypassed)')
  console.log('User types: "What is React?"')
  console.log()

  const result3 = await processUserInput('What is React?')

  if (result3.passthrough) {
    console.log('✓ Passed through to Claude Code (simple question)')
    console.log(`  Reason: ${result3.message}`)
  }

  console.log()
  console.log('='.repeat(70))
  console.log()

  // Example 4: Deployment task
  console.log('Example 4: Deployment Task')
  console.log('User types: "Setup CI/CD pipeline with GitHub Actions and Docker"')
  console.log()

  const result4 = await processUserInput(
    'Setup CI/CD pipeline with GitHub Actions and Docker',
  )

  if (result4.handled && result4.result) {
    console.log('✓ Brain system handled it automatically!')
    console.log(`  Route: ${result4.result.route}`)
    console.log(`  Complexity: ${result4.result.intent.complexity}`)
    console.log(`  Agents created: ${result4.result.agentsCreated.length}`)
    console.log(`  Skills created: ${result4.result.skillsCreated.length}`)
    console.log(`  MCP tools: ${result4.result.mcpToolsUsed.join(', ')}`)
  }

  console.log()
  console.log('='.repeat(70))
  console.log()

  console.log('🎉 Demo complete!')
  console.log()
  console.log('Key takeaways:')
  console.log('  ✓ Users never typed /ccjk:feat or /ccjk:mayor')
  console.log('  ✓ System automatically created skills and agents')
  console.log('  ✓ System automatically selected MCP tools')
  console.log('  ✓ System automatically routed to appropriate execution path')
  console.log('  ✓ Simple questions were passed through to Claude Code')
  console.log()
  console.log('Zero configuration. Zero manual intervention. Just works.')
}

// Run demo if executed directly
if (require.main === module) {
  demo().catch(console.error)
}

export { demo }
