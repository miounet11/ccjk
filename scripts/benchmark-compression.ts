#!/usr/bin/env tsx
/**
 * Compression Benchmark Script
 * Measures real compression ratios on actual code and context files
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { SemanticCompression } from '../src/context/compression/algorithms/semantic-compression'
import { createApiClient } from '../src/utils/context/api-client'
import { estimateTokens } from '../src/utils/context/token-estimator'

interface BenchmarkResult {
  name: string
  originalChars: number
  compressedChars: number
  originalTokens: number
  compressedTokens: number
  charReduction: number
  tokenReduction: number
  method: 'rule-based' | 'llm-based'
  duration: number
}

/**
 * Test files to benchmark
 */
const TEST_FILES = [
  'src/context/context-manager.ts',
  'src/context/compression/algorithms/semantic-compression.ts',
  'src/utils/context/multi-head-compressor.ts',
  'src/commands/menu.ts',
  'src/cli-lazy.ts',
]

/**
 * Sample context strings for testing
 */
const SAMPLE_CONTEXTS = [
  {
    name: 'Code Review Context',
    content: `
User: Review this function for potential bugs

Assistant: I'll analyze the function for potential issues.

The function has several concerns:
1. No null checking on input parameters
2. Missing error handling for async operations
3. Potential memory leak in event listeners
4. Race condition in concurrent access

Recommendations:
- Add input validation
- Wrap async calls in try-catch
- Implement cleanup for event listeners
- Use mutex or locks for shared state

User: Thanks, can you show me how to fix the null checking?

Assistant: Here's how to add null checking:

function processData(data: any) {
  if (!data) {
    throw new Error('Data is required');
  }
  if (typeof data !== 'object') {
    throw new Error('Data must be an object');
  }
  // ... rest of function
}

This ensures data is present and of the correct type before processing.
    `.trim(),
  },
  {
    name: 'Debugging Session',
    content: `
User: I'm getting "Cannot read property 'map' of undefined" error

Assistant: This error occurs when you try to call .map() on an undefined value. Let me help you debug this.

Common causes:
1. API response is undefined
2. State not initialized
3. Async timing issue
4. Incorrect data path

Can you share the code where the error occurs?

User: Here's the code:
const items = data.results.items;
const mapped = items.map(item => item.id);

Assistant: The issue is that data.results.items is undefined. This could happen if:
- data.results is undefined
- The API response structure is different than expected

Fix with optional chaining:
const items = data?.results?.items ?? [];
const mapped = items.map(item => item.id);

This provides a safe default empty array if any part of the chain is undefined.

User: Perfect, that fixed it!

Assistant: Great! For future reference, always use optional chaining (?.) and nullish coalescing (??) when accessing nested properties from external data sources.
    `.trim(),
  },
  {
    name: 'Feature Implementation',
    content: `
User: I need to implement a user authentication system with JWT tokens

Assistant: I'll help you implement a JWT-based authentication system. Here's a comprehensive approach:

1. Install dependencies:
npm install jsonwebtoken bcrypt
npm install --save-dev @types/jsonwebtoken @types/bcrypt

2. Create auth service:

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, SECRET_KEY) as { userId: string };
  } catch {
    return null;
  }
}

3. Create middleware:

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = payload.userId;
  next();
}

User: How do I handle token refresh?

Assistant: For token refresh, implement a refresh token strategy:

1. Generate both access and refresh tokens:

export function generateTokenPair(userId: string) {
  const accessToken = jwt.sign({ userId }, SECRET_KEY, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

2. Store refresh token in database
3. Create refresh endpoint
4. Implement token rotation

This provides better security with short-lived access tokens.
    `.trim(),
  },
]

/**
 * Run benchmark on a single text
 */
async function benchmarkText(
  name: string,
  text: string,
  useApi: boolean,
): Promise<BenchmarkResult> {
  const originalChars = text.length
  const originalTokens = estimateTokens(text)

  let compressor: SemanticCompression
  let method: 'rule-based' | 'llm-based'
  let compressed: string
  let duration: number

  if (useApi) {
    // LLM-based compression
    const apiClient = createApiClient({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 1024,
      temperature: 0.3,
    })
    compressor = new SemanticCompression(0.5, apiClient)
    method = 'llm-based'

    const startTime = Date.now()
    const result = await compressor.compressAsync(text)
    duration = Date.now() - startTime
    compressed = result.compressed
  }
  else {
    // Rule-based compression
    compressor = new SemanticCompression(0.5)
    method = 'rule-based'

    const startTime = Date.now()
    const result = compressor.compress(text)
    duration = Date.now() - startTime
    compressed = result.compressed
  }

  const compressedChars = compressed.length
  const compressedTokens = estimateTokens(compressed)

  const charReduction = ((originalChars - compressedChars) / originalChars) * 100
  const tokenReduction = ((originalTokens - compressedTokens) / originalTokens) * 100

  return {
    name,
    originalChars,
    compressedChars,
    originalTokens,
    compressedTokens,
    charReduction,
    tokenReduction,
    method,
    duration,
  }
}

/**
 * Format benchmark result
 */
function formatResult(result: BenchmarkResult): string {
  return `
${result.name} (${result.method}):
  Original: ${result.originalChars} chars, ~${result.originalTokens} tokens
  Compressed: ${result.compressedChars} chars, ~${result.compressedTokens} tokens
  Reduction: ${result.charReduction.toFixed(1)}% chars, ${result.tokenReduction.toFixed(1)}% tokens
  Duration: ${result.duration}ms
  `
}

/**
 * Calculate aggregate statistics
 */
function calculateStats(results: BenchmarkResult[]): {
  avgCharReduction: number
  avgTokenReduction: number
  minTokenReduction: number
  maxTokenReduction: number
  totalOriginalTokens: number
  totalCompressedTokens: number
} {
  const charReductions = results.map(r => r.charReduction)
  const tokenReductions = results.map(r => r.tokenReduction)

  return {
    avgCharReduction: charReductions.reduce((a, b) => a + b, 0) / charReductions.length,
    avgTokenReduction: tokenReductions.reduce((a, b) => a + b, 0) / tokenReductions.length,
    minTokenReduction: Math.min(...tokenReductions),
    maxTokenReduction: Math.max(...tokenReductions),
    totalOriginalTokens: results.reduce((sum, r) => sum + r.originalTokens, 0),
    totalCompressedTokens: results.reduce((sum, r) => sum + r.compressedTokens, 0),
  }
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('=== CCJK Compression Benchmark ===')
  console.log()

  const useApi = !!process.env.ANTHROPIC_API_KEY
  const method = useApi ? 'LLM-based (Claude Haiku)' : 'Rule-based'

  console.log(`Method: ${method}`)
  if (!useApi) {
    console.log('Note: Set ANTHROPIC_API_KEY to test LLM-based compression')
    console.log('      Rule-based compression provides 30-50% reduction')
    console.log('      LLM-based compression provides 40-60% reduction')
  }
  console.log()

  const results: BenchmarkResult[] = []

  // Benchmark sample contexts
  console.log('--- Sample Contexts ---')
  for (const sample of SAMPLE_CONTEXTS) {
    try {
      const result = await benchmarkText(sample.name, sample.content, useApi)
      results.push(result)
      console.log(formatResult(result))
    }
    catch (error) {
      console.error(`Failed to benchmark ${sample.name}:`, error instanceof Error ? error.message : error)
    }
  }

  // Benchmark actual source files
  console.log('--- Source Files ---')
  const projectRoot = path.join(__dirname, '..')
  for (const file of TEST_FILES) {
    const filePath = path.join(projectRoot, file)
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const result = await benchmarkText(path.basename(file), content, useApi)
        results.push(result)
        console.log(formatResult(result))
      }
      catch (error) {
        console.error(`Failed to benchmark ${file}:`, error instanceof Error ? error.message : error)
      }
    }
  }

  if (results.length === 0) {
    console.error('No benchmark results collected')
    process.exit(1)
  }

  // Calculate and display aggregate statistics
  console.log('--- Aggregate Statistics ---')
  const stats = calculateStats(results)
  console.log(`
Average Character Reduction: ${stats.avgCharReduction.toFixed(1)}%`)
  console.log(`Average Token Reduction: ${stats.avgTokenReduction.toFixed(1)}%`)
  console.log(`Token Reduction Range: ${stats.minTokenReduction.toFixed(1)}% - ${stats.maxTokenReduction.toFixed(1)}%`)
  console.log(`Total Tokens: ${stats.totalOriginalTokens} → ${stats.totalCompressedTokens}`)
  console.log(`Total Savings: ${stats.totalOriginalTokens - stats.totalCompressedTokens} tokens (${((stats.totalOriginalTokens - stats.totalCompressedTokens) / stats.totalOriginalTokens * 100).toFixed(1)}%)`)
  console.log()

  // Provide recommendation based on method
  const expectedMin = useApi ? 40 : 30
  const expectedMax = useApi ? 60 : 50

  if (stats.avgTokenReduction >= expectedMin && stats.avgTokenReduction <= expectedMax) {
    console.log(`✓ Compression meets target range (${expectedMin}-${expectedMax}% reduction for ${method})`)
  }
  else if (stats.avgTokenReduction < expectedMin) {
    console.log(`⚠ Compression below target (< ${expectedMin}% reduction)`)
    console.log(`  Consider increasing aggressiveness or checking compression logic`)
  }
  else {
    console.log(`⚠ Compression very aggressive (> ${expectedMax}% reduction)`)
    console.log(`  May lose important context - verify information preservation`)
  }

  console.log()
  console.log('=== Benchmark Complete ===')
}

// Run benchmark
main().catch((error) => {
  console.error('Benchmark failed:', error)
  process.exit(1)
})
