/**
 * New User Onboarding Wizard
 * 3-step guided setup for first-time users
 */
import ansis from 'ansis'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../constants'
import { i18n } from '../i18n'
import { runHealthCheck } from '../health'

const ONBOARDING_STATE_FILE = join(CCJK_CONFIG_DIR, 'onboarding.json')

export interface OnboardingState {
  completed: boolean
  completedAt: string
  completedSteps?: number[] // which steps finished (1, 2, 3)
  version?: string // ccjk version when onboarding ran
}

export function readOnboardingState(): OnboardingState | null {
  try {
    if (!existsSync(ONBOARDING_STATE_FILE)) return null
    return JSON.parse(readFileSync(ONBOARDING_STATE_FILE, 'utf-8')) as OnboardingState
  }
  catch {
    return null
  }
}

function writeOnboardingState(state: OnboardingState): void {
  try {
    if (!existsSync(CCJK_CONFIG_DIR)) {
      mkdirSync(CCJK_CONFIG_DIR, { recursive: true })
    }
    writeFileSync(ONBOARDING_STATE_FILE, JSON.stringify(state, null, 2))
  }
  catch {
    // silently fail
  }
}

export function isOnboardingCompleted(): boolean {
  const state = readOnboardingState()
  return state?.completed === true
}

/**
 * Run the 3-step onboarding wizard.
 * Pass reset=true to re-run even if already completed.
 */
export async function runOnboardingWizard(options: { reset?: boolean } = {}): Promise<void> {
  if (options.reset) {
    // Clear state so wizard runs fresh
    try { writeOnboardingState({ completed: false, completedAt: '', completedSteps: [] }) } catch {}
  }

  const existingState = readOnboardingState()
  const completedSteps = new Set(existingState?.completedSteps ?? [])
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.yellow(isZh ? '🎉 欢迎使用 CCJK！' : '🎉 Welcome to CCJK!'))
  console.log(ansis.dim(isZh
    ? '   让我们用 3 步完成初始化配置'
    : '   Let\'s get you set up in 3 steps'))
  console.log('')

  // Step 1: Environment detection
  const step1Done = completedSteps.has(1)
  console.log(ansis.bold(`${isZh ? '步骤 1/3' : 'Step 1/3'}: ${isZh ? '环境检测' : 'Environment Detection'}${step1Done ? ansis.green(' ✔') : ''}`))
  if (!step1Done) {
    try {
      const { detectSmartDefaults } = await import('../config/smart-defaults')
      const defaults = await detectSmartDefaults()
      if (defaults) {
        console.log(ansis.green(`  ✔ ${isZh ? '检测到' : 'Detected'}: ${defaults.codeToolType || 'claude-code'}`))
        if (defaults.mcpServices?.length) {
          console.log(ansis.dim(`  ${isZh ? '推荐 MCP 服务' : 'Recommended MCP'}: ${defaults.mcpServices.slice(0, 3).join(', ')}`))
        }
      }
      else {
        console.log(ansis.dim(`  ${isZh ? '使用默认配置' : 'Using default configuration'}`))
      }
      completedSteps.add(1)
    }
    catch {
      console.log(ansis.dim(`  ${isZh ? '环境检测跳过' : 'Environment detection skipped'}`))
    }
  }
  else {
    console.log(ansis.dim(`  ${isZh ? '已完成，跳过' : 'Already done, skipping'}`))
  }
  console.log('')

  // Step 2: API setup
  const step2Done = completedSteps.has(2)
  console.log(ansis.bold(`${isZh ? '步骤 2/3' : 'Step 2/3'}: ${isZh ? 'API 配置' : 'API Configuration'}${step2Done ? ansis.green(' ✔') : ''}`))
  if (!step2Done) {
    try {
      const { getExistingApiConfig } = await import('../utils/config')
      const existing = getExistingApiConfig()
      if (existing?.key || existing?.url) {
        console.log(ansis.green(`  ✔ ${isZh ? '已配置' : 'Already configured'}`))
        completedSteps.add(2)
      }
      else {
        const { configureApiFeature } = await import('../utils/features')
        await configureApiFeature()
        completedSteps.add(2)
      }
    }
    catch {
      console.log(ansis.yellow(`  ${isZh ? '⚠ API 配置跳过，稍后可通过菜单配置' : '⚠ API setup skipped, configure later via menu'}`))
    }
  }
  else {
    console.log(ansis.dim(`  ${isZh ? '已完成，跳过' : 'Already done, skipping'}`))
  }
  console.log('')

  // Step 3: Health check
  console.log(ansis.bold(`${isZh ? '步骤 3/3' : 'Step 3/3'}: ${isZh ? '环境验证' : 'Verification'}`))
  try {
    const health = await runHealthCheck()
    const passCount = health.results.filter(r => r.status === 'pass').length
    const total = health.results.length
    const scoreColor = health.totalScore >= 75 ? ansis.green : health.totalScore >= 50 ? ansis.yellow : ansis.red
    console.log(scoreColor(`  ✔ ${isZh ? '健康分' : 'Health score'}: ${health.totalScore}/100 (${passCount}/${total} ${isZh ? '通过' : 'passed'})`))
    if (health.recommendations.length > 0) {
      const top = health.recommendations[0]
      console.log(ansis.dim(`  ${isZh ? '建议' : 'Tip'}: ${top.title}`))
      if (top.command) {
        console.log(ansis.dim(`    → ${top.command}`))
      }
    }
  }
  catch {
    console.log(ansis.dim(`  ${isZh ? '验证跳过' : 'Verification skipped'}`))
  }
  console.log('')

  completedSteps.add(3)
  // Mark complete
  writeOnboardingState({
    completed: true,
    completedAt: new Date().toISOString(),
    completedSteps: Array.from(completedSteps),
  })

  console.log(ansis.bold.green(isZh ? '✅ 初始化完成！进入主菜单...' : '✅ Setup complete! Loading main menu...'))
  console.log('')
}
