/**
 * 菜单系统基础测试
 */
import { describe, it, expect } from 'vitest'

describe('Menu System', () => {
  it('should export menu engine', async () => {
    const { MenuEngine } = await import('../menu-engine.js')
    expect(MenuEngine).toBeDefined()
  })

  it('should export menu renderer', async () => {
    const { MenuRenderer } = await import('../menu-renderer.js')
    expect(MenuRenderer).toBeDefined()
  })

  it('should export main menu config', async () => {
    const { mainMenuConfig } = await import('../config/main-menu.js')
    expect(mainMenuConfig).toBeDefined()
    expect(mainMenuConfig.groups).toBeDefined()
    expect(mainMenuConfig.groups.length).toBeGreaterThan(0)
  })

  it('should have API config as first menu item', async () => {
    const { mainMenuConfig } = await import('../config/main-menu.js')
    // API config is in the first group (core), first item
    const coreGroup = mainMenuConfig.groups[0]
    expect(coreGroup.id).toBe('core')
    const firstItem = coreGroup.items[0]
    expect(firstItem.id).toBe('api-config')
    expect(firstItem.label.en).toContain('API')
  })

  it('should export CLI runner', async () => {
    const { runCli } = await import('../cli.js')
    expect(runCli).toBeDefined()
    expect(typeof runCli).toBe('function')
  })

  it('should export menu index', async () => {
    const menuModule = await import('../index.js')
    expect(menuModule.showMenu).toBeDefined()
    expect(menuModule.runCli).toBeDefined()
    expect(menuModule.MenuEngine).toBeDefined()
    expect(menuModule.MenuRenderer).toBeDefined()
  })
})
