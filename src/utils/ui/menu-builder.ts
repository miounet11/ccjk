import ansis from 'ansis'
import inquirer from 'inquirer'
import { COLORS, sectionDivider, STATUS } from '../banner'

/**
 * Menu item definition
 */
export interface MenuItem {
  /** Single key shortcut */
  key: string
  /** Display label */
  label: string
  /** Optional description */
  description?: string
  /** Icon/emoji */
  icon?: string
  /** Action to execute */
  action: () => Promise<MenuResult>
  /** Condition for visibility */
  visible?: () => boolean
  /** Whether this is a highlighted/recommended option */
  highlight?: boolean
  /** Whether this item is disabled */
  disabled?: boolean
}

/**
 * Menu section
 */
export interface MenuSection {
  /** Section title */
  title: string
  /** Items in this section */
  items: MenuItem[]
  /** Section icon */
  icon?: string
}

/**
 * Menu result
 */
export interface MenuResult {
  /** Action taken */
  action: 'continue' | 'back' | 'exit' | 'switch'
  /** Optional data */
  data?: any
}

/**
 * Menu builder options
 */
export interface MenuBuilderOptions {
  /** Menu title */
  title: string
  /** Menu subtitle */
  subtitle?: string
  /** Show back option */
  showBack?: boolean
  /** Show exit option */
  showExit?: boolean
  /** Breadcrumb path */
  breadcrumb?: string[]
  /** Box style */
  boxStyle?: 'single' | 'double' | 'rounded' | 'heavy'
}

/**
 * Menu builder for creating interactive menus
 */
export class MenuBuilder {
  private sections: MenuSection[] = []
  private options: MenuBuilderOptions

  constructor(options: MenuBuilderOptions) {
    this.options = {
      showBack: true,
      showExit: true,
      boxStyle: 'double',
      ...options,
    }
  }

  /**
   * Add a section to the menu
   */
  addSection(title: string, icon?: string): MenuBuilder {
    this.sections.push({ title, items: [], icon })
    return this
  }

  /**
   * Add an item to the current section
   */
  addItem(item: MenuItem): MenuBuilder {
    if (this.sections.length === 0) {
      this.addSection('')
    }
    this.sections[this.sections.length - 1].items.push(item)
    return this
  }

  /**
   * Add a separator
   */
  addSeparator(): MenuBuilder {
    return this
  }

  /**
   * Render the menu to string
   */
  render(): string {
    const lines: string[] = []

    // Breadcrumb
    if (this.options.breadcrumb && this.options.breadcrumb.length > 0) {
      const breadcrumb = this.options.breadcrumb.join(' > ')
      lines.push(ansis.gray(`  ${breadcrumb}`))
      lines.push('')
    }

    // Title
    lines.push(sectionDivider(this.options.title, 50))
    if (this.options.subtitle) {
      lines.push(ansis.gray(`  ${this.options.subtitle}`))
    }
    lines.push('')

    // Sections
    for (const section of this.sections) {
      // Filter visible items
      const visibleItems = section.items.filter(item =>
        item.visible ? item.visible() : true,
      )

      if (visibleItems.length === 0)
        continue

      // Section header
      if (section.title) {
        const icon = section.icon ? `${section.icon} ` : ''
        lines.push(ansis.white.bold(`  ${icon}${section.title}`))
      }

      // Items
      for (const item of visibleItems) {
        const keyPart = item.disabled
          ? ansis.gray(`[${item.key}]`)
          : item.highlight
            ? ansis.yellow.bold(`[${item.key}]`)
            : ansis.green.bold(`[${item.key}]`)

        const iconPart = item.icon ? `${item.icon} ` : ''
        const labelPart = item.disabled
          ? ansis.gray(item.label)
          : item.highlight
            ? ansis.yellow(item.label)
            : ansis.white(item.label)

        const descPart = item.description
          ? ansis.gray(` - ${item.description}`)
          : ''

        lines.push(`    ${keyPart} ${iconPart}${labelPart}${descPart}`)
      }

      lines.push('')
    }

    // System options
    const systemItems: string[] = []
    if (this.options.showBack) {
      systemItems.push(`${ansis.gray('[B]')} ${ansis.gray('Back')}`)
    }
    if (this.options.showExit) {
      systemItems.push(`${ansis.gray('[Q]')} ${ansis.gray('Quit')}`)
    }
    if (systemItems.length > 0) {
      lines.push(`  ${systemItems.join('  ')}`)
    }

    lines.push(ansis.green('═'.repeat(50)))

    return lines.join('\n')
  }

  /**
   * Display menu and handle input
   */
  async show(): Promise<MenuResult> {
    console.log(this.render())

    // Build valid keys
    const validKeys = new Set<string>()
    const keyMap = new Map<string, MenuItem>()

    for (const section of this.sections) {
      for (const item of section.items) {
        if (item.visible ? item.visible() : true) {
          if (!item.disabled) {
            validKeys.add(item.key.toLowerCase())
            validKeys.add(item.key.toUpperCase())
            keyMap.set(item.key.toLowerCase(), item)
          }
        }
      }
    }

    if (this.options.showBack) {
      validKeys.add('b')
      validKeys.add('B')
    }
    if (this.options.showExit) {
      validKeys.add('q')
      validKeys.add('Q')
    }

    // Get input
    const { choice } = await inquirer.prompt<{ choice: string }>([
      {
        type: 'input',
        name: 'choice',
        message: COLORS.primary('Select option:'),
        validate: (value: string) => {
          if (validKeys.has(value)) {
            return true
          }
          return 'Invalid option. Please try again.'
        },
      },
    ])

    const key = choice.toLowerCase()

    // Handle system keys
    if (key === 'b' && this.options.showBack) {
      return { action: 'back' }
    }
    if (key === 'q' && this.options.showExit) {
      return { action: 'exit' }
    }

    // Handle menu item
    const item = keyMap.get(key)
    if (item) {
      return item.action()
    }

    return { action: 'continue' }
  }

  /**
   * Run menu loop until exit or back
   */
  async loop(): Promise<MenuResult> {
    while (true) {
      const result = await this.show()
      if (result.action === 'exit' || result.action === 'back') {
        return result
      }
    }
  }
}

/**
 * Quick menu helper
 */
export async function showQuickMenu(
  title: string,
  items: Array<{ key: string, label: string, action: () => Promise<void> }>,
): Promise<void> {
  const builder = new MenuBuilder({ title, showBack: false })

  for (const item of items) {
    builder.addItem({
      key: item.key,
      label: item.label,
      action: async () => {
        await item.action()
        return { action: 'continue' }
      },
    })
  }

  await builder.show()
}

/**
 * Confirmation prompt helper
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const { result } = await inquirer.prompt<{ result: boolean }>([
    {
      type: 'confirm',
      name: 'result',
      message,
      default: defaultValue,
    },
  ])
  return result
}

/**
 * Display status message
 */
export function showStatus(type: keyof typeof STATUS, message: string): void {
  console.log(STATUS[type](message))
}
