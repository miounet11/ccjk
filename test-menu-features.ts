#!/usr/bin/env node
/**
 * Test script to verify each menu feature
 */

import { analyzeProject } from './src/analyzers/index.js'
import { createTemplatesClient } from './src/cloud-client/index.js'
import { getCloudRecommendations } from './src/cloud-client/index.js'

const logger = {
  info: (msg: string) => console.log(`✓ ${msg}`),
  error: (msg: string) => console.log(`✗ ${msg}`),
  warn: (msg: string) => console.log(`⚠ ${msg}`),
}

async function testFeature(name: string, fn: () => Promise<void>) {
  console.log(`\n━━━ Testing: ${name} ━━━`)
  try {
    await fn()
    logger.info(`${name} - PASSED`)
  }
  catch (error: any) {
    logger.error(`${name} - FAILED: ${error.message}`)
    if (error.statusCode === 404) {
      logger.warn('  → Requires cloud API endpoint')
    }
  }
}

async function main() {
  console.log('🧪 Testing CCJK Menu Features\n')

  // Test 1: Project Analysis (G - 智能生成)
  await testFeature('Project Analysis', async () => {
    const analysis = await analyzeProject('.')
    if (analysis.projectType === 'unknown') {
      throw new Error('Failed to detect project type')
    }
    logger.info(`  Detected: ${analysis.projectType} (${(analysis.languages[0]?.confidence * 100).toFixed(1)}% confidence)`)
  })

  // Test 2: Templates API (A - Agents 管理)
  await testFeature('Templates API - List Agents', async () => {
    const client = createTemplatesClient()
    const templates = await client.listTemplates({ type: 'agent', limit: 10 })
    logger.info(`  Found ${templates.length} agent templates`)
  })

  // Test 3: Templates API - Skills
  await testFeature('Templates API - List Skills', async () => {
    const client = createTemplatesClient()
    const templates = await client.listTemplates({ type: 'skill', limit: 10 })
    logger.info(`  Found ${templates.length} skill templates`)
  })

  // Test 4: Cloud Recommendations
  await testFeature('Cloud Recommendations', async () => {
    const recommendations = await getCloudRecommendations('.')
    logger.info(`  Got ${recommendations.agents?.length || 0} agent recommendations`)
    logger.info(`  Got ${recommendations.skills?.length || 0} skill recommendations`)
  })

  // Test 5: Skills Marketplace API
  await testFeature('Skills Marketplace API', async () => {
    const response = await fetch('https://api.claudehome.cn/api/v8/skills/marketplace')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    logger.info(`  Marketplace API accessible`)
  })

  // Test 6: User Skills API
  await testFeature('User Skills API', async () => {
    const response = await fetch('https://api.claudehome.cn/api/v8/skills/user')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    logger.info(`  User Skills API accessible`)
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n📊 Summary: Check which features need cloud API support')
}

main().catch(console.error)
