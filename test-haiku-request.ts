#!/usr/bin/env tsx
/**
 * Test script to verify Haiku model API requests
 */

async function testHaikuRequest() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  const haikuModel = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'claude-haiku-4.5'

  console.log('🔍 Testing Haiku Model Request...\n')
  console.log('Configuration:')
  console.log(`  API Key: ${apiKey ? '✓ Set' : '✗ Missing'}`)
  console.log(`  Base URL: ${baseUrl || 'https://api.anthropic.com'}`)
  console.log(`  Haiku Model: ${haikuModel}\n`)

  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment')
    process.exit(1)
  }

  try {
    // Remove trailing slash from baseUrl to avoid double slashes
    const cleanBaseUrl = (baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')
    const url = `${cleanBaseUrl}/v1/messages`

    console.log(`📡 Sending request to: ${url}`)
    console.log(`📝 Using model: ${haikuModel}\n`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: haikuModel,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Haiku!" in one sentence.',
          },
        ],
      }),
    })

    console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Request failed:')
      console.error(errorText)
      process.exit(1)
    }

    const data = await response.json()

    console.log('✅ Request successful!\n')
    console.log('Response:')
    console.log(JSON.stringify(data, null, 2))

    if (data.content && data.content[0]?.text) {
      console.log('\n💬 Haiku Response:')
      console.log(`   "${data.content[0].text}"`)
    }

    console.log('\n✨ Haiku model is working correctly!')

  } catch (error) {
    console.error('❌ Error during request:')
    console.error(error)
    process.exit(1)
  }
}

testHaikuRequest()
