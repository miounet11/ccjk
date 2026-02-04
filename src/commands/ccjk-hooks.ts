import type { HookCategory, HookConfig, HookTemplate, HookType } from '../hooks/types.js'
import { performance } from 'node:perf_hooks'
import { consola } from 'consola'
import inquirer from 'inquirer'
import { ProjectAnalyzer } from '../analyzers/index.js'
import { getTemplatesClient } from '../cloud-client'
import { hookManager } from '../hooks/hook-manager.js'
import { loadHookTemplates } from '../hooks/template-loader.js'
import { validateHookTrigger } from '../hooks/trigger-validator.js'
import { i18n } from '../i18n/index.js'

export interface CcjkHooksOptions {
  type?: HookType | 'all'
  category?: HookCategory | 'all'
  exclude?: string[]
  enabled?: boolean
  priority?: number
  dryRun?: boolean
  json?: boolean
  verbose?: boolean
}

export async function ccjkHooks(
  options: CcjkHooksOptions = {},
) {
  const startTime = performance.now()
  const { json = false, dryRun = false } = options

  if (!json) {
    consola.log(i18n.t('hooks.analyzingProject'))
  }

  try {
    // Step 1: Analyze project
    const analyzer = new ProjectAnalyzer()
    const projectInfo = await analyzer.analyze(process.cwd())

    // Extract project type and framework from analysis
    const projectType = projectInfo.projectType
    const framework = projectInfo.frameworks?.[0]?.name || 'none'

    if (!json) {
      consola.success(i18n.t('hooks.projectDetected', {
        type: projectType,
        framework,
      }))
    }

    // Step 2: Get recommended hooks
    let recommendedHooks: HookTemplate[] = []
    const isZh = i18n.language === 'zh-CN'

    try {
      // Try cloud v8 Templates API first
      const templatesClient = getTemplatesClient({ language: isZh ? 'zh-CN' : 'en' })
      const cloudHooks = await templatesClient.getHooks()

      if (cloudHooks.length > 0) {
        consola.success(isZh ? `从云端获取 ${cloudHooks.length} 个钩子` : `Fetched ${cloudHooks.length} hooks from cloud`)

        // Filter by project relevance
        const languages = projectInfo.languages?.map(l => l.language.toLowerCase()) || []
        const frameworks = projectInfo.frameworks?.map(f => f.name.toLowerCase()) || []

        const relevantHooks = cloudHooks.filter((hook) => {
          const tags = hook.tags || []
          const category = hook.category || ''
          const compatibility = hook.compatibility || {}

          // Check if hook matches project
          return (
            tags.some(tag => languages.includes(tag) || frameworks.includes(tag) || projectType.includes(tag))
            || (compatibility.languages || []).some((lang: string) => languages.includes(lang.toLowerCase()))
            || (compatibility.frameworks || []).some((fw: string) => frameworks.includes(fw.toLowerCase()))
            || category === 'pre-commit' || category === 'commit-msg' // Always include common hooks
          )
        })

        // Convert cloud templates to HookTemplate format
        for (const hook of (relevantHooks.length > 0 ? relevantHooks : cloudHooks.slice(0, 10))) {
          const hookConfig: HookTemplate = {
            name: hook.name_zh_cn && isZh ? hook.name_zh_cn : hook.name_en,
            description: hook.description_zh_cn && isZh ? hook.description_zh_cn : (hook.description_en || ''),
            type: (hook.category || 'pre-commit') as HookType,
            category: (hook.category || 'pre-commit') as HookCategory,
            projectTypes: ['all'],
            trigger: {
              matcher: `git:${hook.category || 'pre-commit'}`,
              condition: undefined,
            },
            action: {
              command: hook.install_command || 'echo',
              args: [hook.name_en],
              timeout: 30000,
            },
            enabled: true,
            priority: hook.rating_average ? Math.round(hook.rating_average * 20) : 50,
          }
          recommendedHooks.push(hookConfig)
        }
      }
    }
    catch (error) {
      // Fallback to local templates
      consola.warn(isZh ? '云端获取失败，使用本地模板' : 'Cloud fetch failed, using local templates')
      const templates = await loadHookTemplates()
      recommendedHooks = templates.filter(template =>
        template.projectTypes.includes(projectType),
      )
    }

    // If still no hooks, use local templates
    if (recommendedHooks.length === 0) {
      const templates = await loadHookTemplates()
      recommendedHooks = templates.filter(template =>
        template.projectTypes.includes(projectType),
      )
    }

    // Step 3: Filter hooks based on options
    const filteredHooks = filterHooks(recommendedHooks, options)

    if (filteredHooks.length === 0) {
      if (json) {
        return { success: true, hooks: [], message: 'No hooks found matching criteria' }
      }
      consola.warn(i18n.t('hooks.noHooksFound'))
      return
    }

    // Step 4: Group hooks by category
    const hooksByCategory = groupHooksByCategory(filteredHooks)

    if (!json) {
      displayHooks(hooksByCategory, options)
    }

    // Step 5: Interactive confirmation (unless dry-run or json)
    if (!dryRun && !json) {
      const { shouldInstall } = await inquirer.prompt([{
        type: 'confirm',
        name: 'shouldInstall',
        message: i18n.t('hooks.installPrompt', { count: filteredHooks.length }),
        default: true,
      }])

      if (!shouldInstall) {
        consola.info(i18n.t('hooks.installCancelled'))
        return
      }
    }

    // Step 6: Install hooks
    if (!json) {
      consola.log(i18n.t('hooks.installingHooks'))
    }

    const installedHooks: string[] = []
    const errors: Array<{ hook: string, error: string }> = []

    for (const hook of filteredHooks) {
      try {
        if (dryRun) {
          if (json) {
            installedHooks.push(hook.name)
          }
          else {
            consola.log(`  ${i18n.t('hooks.wouldInstall', { name: hook.name })}`)
          }
          continue
        }

        // Validate hook trigger
        const isValid = await validateHookTrigger(hook.trigger, projectInfo as any)
        if (!isValid) {
          throw new Error(i18n.t('hooks.invalidTrigger', { trigger: hook.trigger.matcher }))
        }

        // Convert to Hook format for the manager
        const hookForManager = {
          command: hook.action.command,
          args: hook.action.args || [],
          type: hook.type as any, // Type assertion to handle the mismatch
          async: false,
          timeout: hook.action.timeout || 5000,
          workingDir: hook.action.workingDirectory,
          env: hook.action.environment,
          description: hook.description,
        }

        // Register with hook manager
        hookManager.registerHook(hookForManager)

        installedHooks.push(hook.name)

        if (!json) {
          consola.success(`  ${i18n.t('hooks.installed', { name: hook.name })}`)
        }
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push({ hook: hook.name, error: errorMessage })

        if (!json) {
          consola.error(`  ${i18n.t('hooks.installFailed', { name: hook.name })}: ${errorMessage}`)
        }
      }
    }

    // Step 7: Final output
    const duration = Math.round(performance.now() - startTime)

    if (json) {
      return {
        success: errors.length === 0,
        installed: installedHooks,
        errors,
        duration,
        hooks: installedHooks.map(name => ({ name, status: 'installed' })),
      }
    }

    if (installedHooks.length > 0) {
      consola.success(
        i18n.t('hooks.installSuccess', {
          count: installedHooks.length,
          duration,
        }),
      )
    }

    if (errors.length > 0) {
      consola.warn(
        i18n.t('hooks.installPartial', {
          failed: errors.length,
          total: filteredHooks.length,
        }),
      )
    }

    // Step 8: Show testing instructions
    if (installedHooks.length > 0 && !dryRun) {
      displayTestingInstructions(hooksByCategory)
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (json) {
      return {
        success: false,
        error: errorMessage,
        hooks: [],
      }
    }

    consola.error(i18n.t('hooks.installError', { error: errorMessage }))
    throw error
  }
}

function filterHooks(hooks: HookConfig[], options: CcjkHooksOptions): HookConfig[] {
  let filtered = hooks

  // Filter by type
  if (options.type && options.type !== 'all') {
    filtered = filtered.filter(hook => hook.type === options.type)
  }

  // Filter by category
  if (options.category && options.category !== 'all') {
    filtered = filtered.filter(hook => hook.category === options.category)
  }

  // Filter by exclude list
  if (options.exclude && options.exclude.length > 0) {
    filtered = filtered.filter(hook =>
      !options.exclude!.includes(hook.name),
    )
  }

  // Filter by enabled status
  if (options.enabled !== undefined) {
    filtered = filtered.filter(hook => hook.enabled === options.enabled)
  }

  // Sort by priority
  if (options.priority !== undefined) {
    filtered = filtered.sort((a, b) => {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      return priorityB - priorityA // Higher priority first
    })
  }

  return filtered
}

function groupHooksByCategory(hooks: HookConfig[]): Record<string, HookConfig[]> {
  const groups: Record<string, HookConfig[]> = {
    'pre-commit': [],
    'post-test': [],
    'lifecycle': [],
  }

  for (const hook of hooks) {
    const category = hook.category || 'lifecycle'
    // Dynamically create category group if it doesn't exist
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(hook)
  }

  return groups
}

function displayHooks(
  hooksByCategory: Record<string, HookConfig[]>,
  options: CcjkHooksOptions,
): void {
  const totalHooks = Object.values(hooksByCategory).flat().length

  consola.log(i18n.t('hooks.foundHooks', { count: totalHooks }))
  consola.log('')

  for (const [category, hooks] of Object.entries(hooksByCategory)) {
    if (hooks.length === 0)
      continue

    consola.log(`${i18n.t(`hooks.category.${category}`)}:`)

    for (const hook of hooks) {
      const status = hook.enabled ? '✅' : '⏸️'
      consola.log(`  ${status} ${hook.name.padEnd(25)} - ${hook.description}`)

      if (options.verbose) {
        consola.log(`     ${i18n.t('hooks.trigger')}: ${hook.trigger.matcher}`)
        consola.log(`     ${i18n.t('hooks.command')}: ${hook.action.command}`)
      }
    }

    consola.log('')
  }
}

function displayTestingInstructions(
  hooksByCategory: Record<string, HookConfig[]>,
): void {
  consola.log('')
  consola.info(i18n.t('hooks.testingInstructions'))
  consola.log('')

  if (hooksByCategory['pre-commit'].length > 0) {
    consola.log(`  • ${i18n.t('hooks.testPreCommit')}`)
  }

  if (hooksByCategory['post-test'].length > 0) {
    consola.log(`  • ${i18n.t('hooks.testPostTest')}`)
  }

  if (hooksByCategory.lifecycle.length > 0) {
    consola.log(`  • ${i18n.t('hooks.testLifecycle')}`)
  }

  consola.log(`  • ${i18n.t('hooks.listHooks')}: ccjk hooks list`)
  consola.log(`  • ${i18n.t('hooks.testHooks')}: ccjk hooks test`)
}
