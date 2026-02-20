import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { ensureI18nInitialized, i18n } from '../i18n'

/**
 * Common function to select MCP services
 * @returns Array of selected service IDs, or undefined if cancelled
 */
export async function selectMcpServices(): Promise<string[] | undefined> {
  ensureI18nInitialized()
  const mcpServices = await getMcpServices()

  // Build a lookup for defaultSelected from config
  const defaultSelectedIds = new Set(
    MCP_SERVICE_CONFIGS.filter(c => c.defaultSelected).map(c => c.id),
  )

  // Build choices, pre-selecting services marked as defaultSelected
  const choices = mcpServices.map(service => ({
    name: `${service.name} - ${ansis.gray(service.description)}`,
    value: service.id,
    checked: defaultSelectedIds.has(service.id),
  }))

  const { services } = await inquirer.prompt<{ services: string[] }>({
    type: 'checkbox',
    name: 'services',
    message: `${i18n.t('mcp:selectMcpServices')}${i18n.t('common:multiSelectHint')}`,
    choices,
  })

  // Return undefined if cancelled (user pressed Ctrl+C or similar)
  if (services === undefined) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return undefined
  }

  // Return the selected services (could be empty array)
  return services
}
