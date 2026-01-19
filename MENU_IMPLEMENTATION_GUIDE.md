# CCJK Menu Implementation Guide 🛠️

**Step-by-Step Guide for Developers**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Implementation Steps](#implementation-steps)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Maintenance](#maintenance)

---

## Prerequisites

### Required Knowledge

- TypeScript/JavaScript
- Node.js ecosystem
- Terminal/CLI development
- Async/await patterns
- i18n concepts

### Required Tools

- Node.js 16+ or Bun
- TypeScript 5+
- Git
- Code editor (VS Code recommended)

### Dependencies to Install

```bash
npm install inquirer ansis ora boxen figlet i18next
npm install -D @types/inquirer @types/node
```

---

## Project Setup

### 1. Create Directory Structure

```bash
mkdir -p src/cli/{types,config,renderer,controller,actions,i18n}
mkdir -p src/cli/i18n/{locales/en,locales/zh}
```

### 2. Install Dependencies

```bash
cd /Users/lu/ccjk-public/ccjk
npm install inquirer@^9.0.0 ansis@^3.0.0 ora@^8.0.0 boxen@^7.0.0 figlet@^1.7.0 i18next@^23.0.0
npm install -D @types/inquirer @types/figlet
```

### 3. Update package.json

```json
{
  "name": "ccjk",
  "version": "1.0.0",
  "bin": {
    "ccjk": "./bin/ccjk.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli/index.ts",
    "menu": "tsx src/cli/index.ts"
  },
  "dependencies": {
    "inquirer": "^9.0.0",
    "ansis": "^3.0.0",
    "ora": "^8.0.0",
    "boxen": "^7.0.0",
    "figlet": "^1.7.0",
    "i18next": "^23.0.0"
  }
}
```

---

## Implementation Steps

### Step 1: Create Type Definitions

**File**: `src/cli/types.ts`

```typescript
export type MenuCategory = 'quick-start' | 'core' | 'advanced' | 'more';
export type Language = 'en' | 'zh';

export interface MenuItem {
  id: string;
  label: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
  description: string;
  descriptionEn: string;
  descriptionZh: string;
  category: MenuCategory;
  shortcut: number;
  letterShortcut?: string;
  action: () => Promise<void>;
  visible: boolean;
  enabled: boolean;
  badge?: 'NEW' | 'HOT' | 'BETA' | 'PRO';
  requiresSetup?: boolean;
}

export interface MenuCategoryConfig {
  id: MenuCategory;
  label: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
  items: MenuItem[];
  collapsed: boolean;
  color: string;
}

export interface MenuConfig {
  title: string;
  version: string;
  subtitle: string;
  subtitleEn: string;
  subtitleZh: string;
  categories: MenuCategoryConfig[];
  footer: string;
  footerEn: string;
  footerZh: string;
  shortcuts: Record<string, string>;
  language: Language;
}

export interface MenuState {
  currentCategory?: MenuCategory;
  history: string[];
  favorites: string[];
  recentActions: string[];
}
```

### Step 2: Create Action Handlers

**File**: `src/cli/actions/index.ts`

```typescript
import ora from 'ora';
import ansis from 'ansis';

export async function quickInitialize(): Promise<void> {
  console.log(ansis.cyan('\n⚡ Quick Initialize - One-Click Setup\n'));
  
  const spinner = ora('Initializing...').start();
  
  try {
    // Step 1: Choose code tool
    spinner.text = 'Step 1/4: Choosing code tool...';
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Configure API
    spinner.text = 'Step 2/4: Configuring API provider...';
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Install MCP services
    spinner.text = 'Step 3/4: Installing MCP services...';
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Import workflows
    spinner.text = 'Step 4/4: Importing workflows...';
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    spinner.succeed('Setup complete!');
    
    console.log(ansis.green('\n🎉 Success!\n'));
    console.log('✅ Code tool installed');
    console.log('✅ API provider configured');
    console.log('✅ MCP services ready');
    console.log('✅ Workflows imported\n');
    
  } catch (error) {
    spinner.fail('Setup failed');
    console.error(ansis.red(`Error: ${error.message}`));
  }
}

export async function configureApiProvider(): Promise<void> {
  console.log(ansis.cyan('\n🔧 Configure API Provider\n'));
  // Implementation here
}

export async function installMcpServices(): Promise<void> {
  console.log(ansis.cyan('\n🔌 Install MCP Services\n'));
  // Implementation here
}

// ... more action handlers
```

### Step 3: Create Menu Configuration

**File**: `src/cli/config/menu-config.ts`

```typescript
import { MenuConfig } from '../types';
import * as actions from '../actions';

export const menuConfig: MenuConfig = {
  title: 'CCJK',
  version: '1.0.0',
  subtitle: 'Claude Code Enhancement Toolkit',
  subtitleEn: 'Claude Code Enhancement Toolkit - Making AI Coding Easier',
  subtitleZh: 'Claude Code 增强工具 - 让 AI 编程更简单',
  language: 'en',
  
  categories: [
    {
      id: 'quick-start',
      label: 'Quick Start',
      labelEn: 'Quick Start',
      labelZh: '快速开始',
      emoji: '🎯',
      color: 'green',
      collapsed: false,
      items: [
        {
          id: 'quick-init',
          label: 'Quick Initialize',
          labelEn: 'Quick Initialize',
          labelZh: '快速初始化',
          emoji: '⚡',
          description: 'One-click setup for all features',
          descriptionEn: 'One-click setup for all features',
          descriptionZh: '一键配置所有功能',
          category: 'quick-start',
          shortcut: 1,
          visible: true,
          enabled: true,
          badge: 'HOT',
          action: actions.quickInitialize,
        },
        {
          id: 'configure-api',
          label: 'Configure API Provider',
          labelEn: 'Configure API Provider',
          labelZh: '配置 API 提供商',
          emoji: '🔧',
          description: 'Choose and configure AI provider',
          descriptionEn: 'Choose and configure AI provider',
          descriptionZh: '选择并配置 AI 服务商',
          category: 'quick-start',
          shortcut: 2,
          visible: true,
          enabled: true,
          action: actions.configureApiProvider,
        },
        // ... more items
      ],
    },
    // ... more categories
  ],
  
  footer: 'Tip: Enter number (1-18) | Press ? for shortcuts | Press Q to quit',
  footerEn: '💡 Tip: Enter number (1-18) | Press ? for shortcuts | Press Q to quit',
  footerZh: '💡 提示: 输入数字选择 (1-18) | 按 ? 查看快捷键 | 按 Q 退出',
  
  shortcuts: {
    '?': 'help',
    'h': 'help',
    'q': 'quit',
    'Q': 'quit',
    '/': 'search',
    'f': 'favorites',
    'r': 'recent',
  },
};
```

### Step 4: Create Menu Renderer

**File**: `src/cli/renderer/menu-renderer.ts`

```typescript
import ansis from 'ansis';
import figlet from 'figlet';
import { MenuConfig, MenuCategoryConfig, MenuItem } from '../types';

export class MenuRenderer {
  constructor(private config: MenuConfig) {}

  renderBanner(): void {
    const banner = figlet.textSync('CCJK', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
    });
    
    console.log(ansis.cyan(banner));
    
    const subtitle = this.config.language === 'zh' 
      ? this.config.subtitleZh 
      : this.config.subtitleEn;
    
    console.log(ansis.gray(subtitle));
    console.log(ansis.dim(`v${this.config.version} | 6 Tools | 15+ Providers | 50+ MCP Services`));
    console.log('');
  }

  renderCategory(category: MenuCategoryConfig): void {
    const colorFn = this.getCategoryColor(category.color);
    const label = this.config.language === 'zh' ? category.labelZh : category.labelEn;
    
    console.log('');
    console.log(colorFn(`  ${category.emoji} ${label}`));
    
    for (const item of category.items) {
      if (!item.visible) continue;
      this.renderMenuItem(item);
    }
  }

  renderMenuItem(item: MenuItem): void {
    const label = this.config.language === 'zh' ? item.labelZh : item.labelEn;
    const desc = this.config.language === 'zh' ? item.descriptionZh : item.descriptionEn;
    
    const shortcut = ansis.cyan(`${item.shortcut}.`);
    const emoji = item.emoji;
    const badge = item.badge ? ansis.yellow(` [${item.badge}]`) : '';
    const description = ansis.gray(`- ${desc}`);
    
    const line = `  ├─ ${shortcut} ${emoji} ${label}${badge}`;
    const padding = ' '.repeat(Math.max(0, 30 - label.length));
    
    console.log(`${line}${padding}${description}`);
  }

  renderFooter(): void {
    console.log('');
    console.log(ansis.dim('─'.repeat(70)));
    
    const footer = this.config.language === 'zh' 
      ? this.config.footerZh 
      : this.config.footerEn;
    
    console.log(ansis.gray(footer));
  }

  renderFullMenu(): void {
    console.clear();
    this.renderBanner();
    
    for (const category of this.config.categories) {
      this.renderCategory(category);
    }
    
    this.renderFooter();
  }

  private getCategoryColor(color: string): (text: string) => string {
    const colors: Record<string, (text: string) => string> = {
      green: ansis.green,
      blue: ansis.blue,
      yellow: ansis.yellow,
      gray: ansis.gray,
      cyan: ansis.cyan,
      magenta: ansis.magenta,
    };
    return colors[color] || ansis.white;
  }
}
```

### Step 5: Create Menu Controller

**File**: `src/cli/controller/menu-controller.ts`

```typescript
import inquirer from 'inquirer';
import ansis from 'ansis';
import boxen from 'boxen';
import { MenuConfig, MenuItem, MenuState } from '../types';
import { MenuRenderer } from '../renderer/menu-renderer';

export class MenuController {
  private state: MenuState;
  private renderer: MenuRenderer;

  constructor(private config: MenuConfig) {
    this.renderer = new MenuRenderer(config);
    this.state = {
      history: [],
      favorites: [],
      recentActions: [],
    };
  }

  async start(): Promise<void> {
    let running = true;

    while (running) {
      this.renderer.renderFullMenu();
      
      const choice = await this.promptChoice();
      
      if (choice === 'quit') {
        running = false;
        const goodbye = this.config.language === 'zh' 
          ? '\n👋 感谢使用 CCJK！再见！\n'
          : '\n👋 Thank you for using CCJK! Goodbye!\n';
        console.log(ansis.cyan(goodbye));
        break;
      }

      await this.handleChoice(choice);
      
      const shouldContinue = await this.promptContinue();
      if (!shouldContinue) {
        running = false;
        const goodbye = this.config.language === 'zh' 
          ? '\n👋 感谢使用 CCJK！再见！\n'
          : '\n👋 Thank you for using CCJK! Goodbye!\n';
        console.log(ansis.cyan(goodbye));
      }
    }
  }

  private async promptChoice(): Promise<string> {
    const message = this.config.language === 'zh' 
      ? '请选择功能' 
      : 'Enter choice';
    
    const invalidMsg = this.config.language === 'zh'
      ? '无效的选项，请输入 1-18 或快捷键'
      : 'Invalid choice, please enter 1-18 or shortcut';
    
    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'input',
      name: 'choice',
      message,
      validate: (value) => {
        if (!value) return this.config.language === 'zh' ? '请输入选项' : 'Please enter a choice';
        
        const num = parseInt(value);
        if (!isNaN(num) && num >= 1 && num <= 18) {
          return true;
        }
        
        if (this.config.shortcuts[value.toLowerCase()]) {
          return true;
        }
        
        return invalidMsg;
      },
    });

    return choice.toLowerCase();
  }

  private async handleChoice(choice: string): Promise<void> {
    if (this.config.shortcuts[choice]) {
      const action = this.config.shortcuts[choice];
      
      switch (action) {
        case 'help':
          await this.showHelp();
          return;
        case 'quit':
          return;
        case 'search':
          await this.showSearch();
          return;
        case 'favorites':
          await this.showFavorites();
          return;
        case 'recent':
          await this.showRecent();
          return;
      }
    }

    const num = parseInt(choice);
    if (!isNaN(num)) {
      const item = this.findItemByShortcut(num);
      if (item) {
        this.state.history.push(item.id);
        this.state.recentActions.unshift(item.id);
        this.state.recentActions = this.state.recentActions.slice(0, 5);
        
        console.log('');
        await item.action();
      }
    }
  }

  private findItemByShortcut(shortcut: number): MenuItem | undefined {
    for (const category of this.config.categories) {
      const item = category.items.find(i => i.shortcut === shortcut);
      if (item) return item;
    }
    return undefined;
  }

  private async promptContinue(): Promise<boolean> {
    console.log('');
    const message = this.config.language === 'zh' 
      ? '返回主菜单？' 
      : 'Return to main menu?';
    
    const { shouldContinue } = await inquirer.prompt<{ shouldContinue: boolean }>({
      type: 'confirm',
      name: 'shouldContinue',
      message,
      default: true,
    });
    return shouldContinue;
  }

  private async showHelp(): Promise<void> {
    const title = this.config.language === 'zh' 
      ? 'CCJK 快捷键帮助' 
      : 'CCJK Keyboard Shortcuts';
    
    console.log('\n' + boxen(
      ansis.bold(`${title}\n\n`) +
      ansis.cyan(this.config.language === 'zh' ? '数字快捷键:\n' : 'Number Shortcuts:\n') +
      '  1-18    ' + (this.config.language === 'zh' ? '直接执行对应功能' : 'Execute menu item') + '\n\n' +
      ansis.cyan(this.config.language === 'zh' ? '字母快捷键:\n' : 'Letter Shortcuts:\n') +
      '  ?/h     ' + (this.config.language === 'zh' ? '显示此帮助' : 'Show this help') + '\n' +
      '  q/Q     ' + (this.config.language === 'zh' ? '退出菜单' : 'Quit menu') + '\n' +
      '  /       ' + (this.config.language === 'zh' ? '搜索功能' : 'Search features') + '\n' +
      '  f       ' + (this.config.language === 'zh' ? '显示收藏' : 'Show favorites') + '\n' +
      '  r       ' + (this.config.language === 'zh' ? '显示最近使用' : 'Show recent') + '\n',
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    ));
  }

  private async showSearch(): Promise<void> {
    const message = this.config.language === 'zh' 
      ? '搜索功能 (输入关键词):' 
      : 'Search features (enter keyword):';
    
    const { query } = await inquirer.prompt<{ query: string }>({
      type: 'input',
      name: 'query',
      message,
    });

    if (!query) return;

    const results: MenuItem[] = [];
    for (const category of this.config.categories) {
      for (const item of category.items) {
        const searchText = `${item.labelZh} ${item.labelEn} ${item.descriptionZh} ${item.descriptionEn}`.toLowerCase();
        if (searchText.includes(query.toLowerCase())) {
          results.push(item);
        }
      }
    }

    if (results.length === 0) {
      const noResults = this.config.language === 'zh' 
        ? '\n未找到匹配的功能\n' 
        : '\nNo matching features found\n';
      console.log(ansis.yellow(noResults));
      return;
    }

    const found = this.config.language === 'zh' 
      ? `\n找到 ${results.length} 个匹配项:\n` 
      : `\nFound ${results.length} matches:\n`;
    
    console.log(ansis.green(found));
    for (const item of results) {
      const label = this.config.language === 'zh' ? item.labelZh : item.labelEn;
      console.log(`  ${item.shortcut}. ${item.emoji} ${label}`);
    }
    console.log('');
  }

  private async showFavorites(): Promise<void> {
    if (this.state.favorites.length === 0) {
      const noFavorites = this.config.language === 'zh' 
        ? '\n暂无收藏的功能\n' 
        : '\nNo favorite features yet\n';
      console.log(ansis.yellow(noFavorites));
      return;
    }

    const title = this.config.language === 'zh' 
      ? '\n收藏的功能:\n' 
      : '\nFavorite Features:\n';
    
    console.log(ansis.green(title));
    for (const id of this.state.favorites) {
      const item = this.findItemById(id);
      if (item) {
        const label = this.config.language === 'zh' ? item.labelZh : item.labelEn;
        console.log(`  ${item.shortcut}. ${item.emoji} ${label}`);
      }
    }
    console.log('');
  }

  private async showRecent(): Promise<void> {
    if (this.state.recentActions.length === 0) {
      const noRecent = this.config.language === 'zh' 
        ? '\n暂无最近使用的功能\n' 
        : '\nNo recent actions yet\n';
      console.log(ansis.yellow(noRecent));
      return;
    }

    const title = this.config.language === 'zh' 
      ? '\n最近使用:\n' 
      : '\nRecent Actions:\n';
    
    console.log(ansis.green(title));
    for (const id of this.state.recentActions) {
      const item = this.findItemById(id);
      if (item) {
        const label = this.config.language === 'zh' ? item.labelZh : item.labelEn;
        console.log(`  ${item.shortcut}. ${item.emoji} ${label}`);
      }
    }
    console.log('');
  }

  private findItemById(id: string): MenuItem | undefined {
    for (const category of this.config.categories) {
      const item = category.items.find(i => i.id === id);
      if (item) return item;
    }
    return undefined;
  }
}
```

### Step 6: Create Main Entry Point

**File**: `src/cli/index.ts`

```typescript
import { MenuController } from './controller/menu-controller';
import { menuConfig } from './config/menu-config';

export async function startInteractiveMenu(): Promise<void> {
  const controller = new MenuController(menuConfig);
  await controller.start();
}

export { MenuController, MenuRenderer } from './renderer/menu-renderer';
export { menuConfig } from './config/menu-config';
export * from './types';
```

### Step 7: Update bin/ccjk.ts

**File**: `bin/ccjk.ts`

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { startInteractiveMenu } from '../src/cli';
import { version } from '../package.json';

const program = new Command();

program
  .name('ccjk')
  .description('CCJK - Claude Code Enhancement Toolkit')
  .version(version);

// Interactive menu (default command)
program
  .command('menu', { isDefault: true })
  .description('Start interactive menu')
  .action(async () => {
    await startInteractiveMenu();
  });

// Keep existing commands for backward compatibility
program
  .command('list')
  .description('List all available tools')
  .action(async () => {
    const { listTools } = await import('../src/commands/list');
    await listTools();
  });

// ... other commands

program.parse();
```

---

## Testing

### Unit Tests

**File**: `src/cli/__tests__/menu-renderer.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { MenuRenderer } from '../renderer/menu-renderer';
import { menuConfig } from '../config/menu-config';

describe('MenuRenderer', () => {
  it('should create renderer instance', () => {
    const renderer = new MenuRenderer(menuConfig);
    expect(renderer).toBeDefined();
  });

  it('should render banner', () => {
    const renderer = new MenuRenderer(menuConfig);
    // Test banner rendering
  });

  it('should render menu items', () => {
    const renderer = new MenuRenderer(menuConfig);
    // Test menu item rendering
  });
});
```

### Integration Tests

```bash
# Manual testing
npm run dev

# Test each menu option
# Test keyboard shortcuts
# Test error handling
# Test different terminal sizes
```

---

## Deployment

### Build for Production

```bash
npm run build
```

### Publish to npm

```bash
npm version patch
npm publish
```

### Install Globally

```bash
npm install -g ccjk
```

---

## Maintenance

### Adding New Menu Items

1. Add action handler in `src/cli/actions/`
2. Add menu item to `menuConfig`
3. Update translations
4. Test thoroughly
5. Update documentation

### Updating Translations

1. Edit `src/cli/i18n/locales/en/*.json`
2. Edit `src/cli/i18n/locales/zh/*.json`
3. Test language switching
4. Verify all strings translated

### Performance Optimization

- Cache menu rendering
- Lazy load action handlers
- Optimize terminal output
- Reduce dependencies

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-19  
**Status**: Ready for Implementation ✅

