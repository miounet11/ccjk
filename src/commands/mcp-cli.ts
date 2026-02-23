/**
 * MCP CLI - Non-interactive MCP service management
 * Extends existing mcp-market.ts with full CLI support
 */

import type { CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import { i18n } from '../i18n'
import { getMcpServices } from '../config/mcp-services'
import { readMcpConfig } from '../utils/claude-config'
import { installMcpService, uninstallMcpService } from '../utils/mcp-installer'

export interface McpInstallOptions {
  services: string[]
  yes?: boolean
  tool?: CodeToolType
  lang?: SupportedLang
}

export interface McpUninstallOptions {
  services: string[]
  yes?: boolean
  tool?: CodeToolType
  lang?: SupportedLang
}

export interface McpListOptions {
  installed?: boolean
  json?: boolean
  lang?: SupportedLang
}

/**
 * Install MCP services non-interactively
 */
export async function mcpInstallCli(options: McpInstallOptions): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  if (!options.services || options.services.length === 0) {
    console.log(ansis.red(isZh ? '错误: 必须指定服务名称' : 'Error: Service names required'))
    console.log(ansis.dim(isZh
      ? '用法: ccjk mcp install <service1> [service2...]'
      : 'Usage: ccjk mcp install <service1> [service2...]'))
    process.exit(1)
  }

  // Validate service names
  const availableServices = await getMcpServices()
  const invalidServices = options.services.filter(s =>
    !availableServices.some(svc => svc.id === s),
  )

  if (invalidServices.length > 0) {
    console.log(ansis.red(isZh
      ? `错误: 未知的服务: ${invalidServices.join(', ')}`
      : `Error: Unknown services: ${invalidServices.join(', ')}`))
    console.log(ansis.dim(isZh
      ? '提示: 使用 ccjk mcp list 查看可用服务'
      : 'Tip: Use ccjk mcp list to see available services'))
    process.exit(1)
  }

  // Confirm installation
  if (!options.yes) {
    const inquirer = await import('inquirer')
    const { confirm } = await inquirer.default.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: isZh
        ? `确认安装 ${options.services.length} 个 MCP 服务?`
        : `Install ${options.services.length} MCP service(s)?`,
      default: true,
    }])

    if (!confirm) {
      console.log(ansis.yellow(isZh ? '已取消' : 'Cancelled'))
      return
    }
  }

  // Install services one by one
  let successCount = 0
  let failCount = 0

  for (const serviceId of options.services) {
    const result = await installMcpService(serviceId, options.tool)
    if (result.success) {
      successCount++
    }
    else {
      failCount++
      console.log(ansis.red(isZh
        ? `✗ 安装 ${serviceId} 失败: ${result.error || '未知错误'}`
        : `✗ Failed to install ${serviceId}: ${result.error || 'Unknown error'}`))
    }
  }

  if (successCount > 0) {
    console.log(ansis.green(isZh
      ? `✓ 已安装 ${successCount} 个服务`
      : `✓ Installed ${successCount} service(s)`))
  }
  if (failCount > 0) {
    console.log(ansis.red(isZh
      ? `✗ ${failCount} 个服务安装失败`
      : `✗ ${failCount} service(s) failed`))
  }
  if (successCount > 0) {
    console.log(ansis.dim(isZh
      ? '提示: 重启 Claude Code 以应用更改'
      : 'Tip: Restart Claude Code to apply changes'))
  }
}

/**
 * Uninstall MCP services non-interactively
 */
export async function mcpUninstallCli(options: McpUninstallOptions): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  if (!options.services || options.services.length === 0) {
    console.log(ansis.red(isZh ? '错误: 必须指定服务名称' : 'Error: Service names required'))
    console.log(ansis.dim(isZh
      ? '用法: ccjk mcp uninstall <service1> [service2...]'
      : 'Usage: ccjk mcp uninstall <service1> [service2...]'))
    process.exit(1)
  }

  // Read current configuration
  const config = readMcpConfig()
  if (!config || !config.mcpServers) {
    console.log(ansis.yellow(isZh ? '未安装任何 MCP 服务' : 'No MCP services installed'))
    return
  }

  // Check which services are actually installed
  const notInstalled = options.services.filter(s => !config.mcpServers![s])
  if (notInstalled.length > 0) {
    console.log(ansis.yellow(isZh
      ? `警告: 以下服务未安装: ${notInstalled.join(', ')}`
      : `Warning: Not installed: ${notInstalled.join(', ')}`))
  }

  const toRemove = options.services.filter(s => config.mcpServers![s])
  if (toRemove.length === 0) {
    console.log(ansis.yellow(isZh ? '没有服务需要卸载' : 'No services to uninstall'))
    return
  }

  // Confirm uninstallation
  if (!options.yes) {
    const inquirer = await import('inquirer')
    const { confirm } = await inquirer.default.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: isZh
        ? `确认卸载 ${toRemove.length} 个 MCP 服务?`
        : `Uninstall ${toRemove.length} MCP service(s)?`,
      default: true,
    }])

    if (!confirm) {
      console.log(ansis.yellow(isZh ? '已取消' : 'Cancelled'))
      return
    }
  }

  // Uninstall services one by one
  let successCount = 0
  let failCount = 0

  for (const serviceId of toRemove) {
    const result = await uninstallMcpService(serviceId, options.tool)
    if (result.success) {
      successCount++
    }
    else {
      failCount++
      console.log(ansis.red(isZh
        ? `✗ 卸载 ${serviceId} 失败: ${result.error || '未知错误'}`
        : `✗ Failed to uninstall ${serviceId}: ${result.error || 'Unknown error'}`))
    }
  }

  if (successCount > 0) {
    console.log(ansis.green(isZh
      ? `✓ 已卸载 ${successCount} 个服务`
      : `✓ Uninstalled ${successCount} service(s)`))
  }
  if (failCount > 0) {
    console.log(ansis.red(isZh
      ? `✗ ${failCount} 个服务卸载失败`
      : `✗ ${failCount} service(s) failed`))
  }
  if (successCount > 0) {
    console.log(ansis.dim(isZh
      ? '提示: 重启 Claude Code 以应用更改'
      : 'Tip: Restart Claude Code to apply changes'))
  }
}

/**
 * List MCP services
 */
export async function mcpListCli(options: McpListOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const availableServices = await getMcpServices()
  const config = readMcpConfig()
  const installedServices = Object.keys(config?.mcpServers || {})

  if (options.json) {
    const output = {
      installed: installedServices,
      available: availableServices.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        installed: installedServices.includes(s.id),
      })),
    }
    console.log(JSON.stringify(output, null, 2))
    return
  }

  // Text output
  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📦 MCP 服务' : '📦 MCP Services'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  if (options.installed) {
    // Show only installed services
    if (installedServices.length === 0) {
      console.log(ansis.yellow(isZh ? '未安装任何服务' : 'No services installed'))
    }
    else {
      console.log(ansis.green(isZh ? `已安装 ${installedServices.length} 个服务:` : `${installedServices.length} service(s) installed:`))
      for (const serviceId of installedServices) {
        const service = availableServices.find(s => s.id === serviceId)
        const name = service ? service.name : serviceId
        console.log(`  ${ansis.green('●')} ${name} ${ansis.dim(`(${serviceId})`)}`)
      }
    }
  }
  else {
    // Show all available services
    console.log(ansis.dim(isZh ? '可用服务:' : 'Available services:'))
    for (const service of availableServices) {
      const installed = installedServices.includes(service.id)
      const icon = installed ? ansis.green('✓') : ansis.dim('○')
      const name = service.name
      const desc = service.description
      console.log(`  ${icon} ${ansis.bold(name)} ${ansis.dim(`(${service.id})`)}`)
      console.log(`    ${ansis.dim(desc)}`)
    }
  }

  console.log('')
  console.log(ansis.dim(isZh
    ? '提示: 使用 ccjk mcp install <service> 安装服务'
    : 'Tip: Use ccjk mcp install <service> to install a service'))
}
