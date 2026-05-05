/**
 * Vim Mode Command - /vim command implementation
 *
 * Provides CLI interface for Vim mode configuration and management
 *
 * @module commands/vim
 */

import type { SupportedLang } from '../constants';
import type { VimModeConfig } from '../terminal/vim-mode';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { ensureI18nInitialized, i18n } from '../i18n';
import {
  createVimModeManager,
  generateKeybindingReference,
  getInputrcPath,
  installVimKeybindings,
  isVimKeybindingsInstalled,
  parseVimCommand,
  uninstallVimKeybindings,

} from '../terminal/vim-mode';
import {
  formatCommand,
  isValidVimCommand,
} from '../terminal/vim-parser';
import { addNumbersToChoices } from '../utils/prompt-helpers';

// ============================================================================
// Command Options
// ============================================================================

export interface VimCommandOptions {
  lang?: SupportedLang;
  enable?: boolean;
  disable?: boolean;
  toggle?: boolean;
  status?: boolean;
  keys?: boolean;
  install?: boolean;
  uninstall?: boolean;
  config?: string; // JSON string for config options
  test?: string; // Test a Vim command
}

// ============================================================================
// Status Display
// ============================================================================

/**
 * Show current Vim mode status
 */
export async function showVimStatus(lang: SupportedLang = 'en'): Promise<void> {
  const isZh = lang === 'zh-CN';

  console.log('');
  console.log(ansis.bold(isZh ? '📊 Vim 模式状态' : '📊 Vim Mode Status'));
  console.log(ansis.dim('─'.repeat(50)));

  const manager = createVimModeManager();
  const config = manager.getConfig();
  const isInstalled = isVimKeybindingsInstalled();
  const inputrcPath = getInputrcPath();

  // Status indicator
  const statusColor = config.enabled ? 'green' : 'yellow';
  const statusText = config.enabled
    ? (isZh ? '已启用' : 'Enabled')
    : (isZh ? '已禁用' : 'Disabled');

  console.log(`\n${ansis[statusColor].bold('●')} ${ansis.bold(isZh ? '状态:' : 'Status:')} ${statusText}`);

  // Keybindings installation status
  const keybindingsColor = isInstalled ? 'green' : 'yellow';
  const keybindingsText = isInstalled
    ? (isZh ? '已安装' : 'Installed')
    : (isZh ? '未安装' : 'Not Installed');

  console.log(`${ansis[keybindingsColor].bold('●')} ${ansis.bold(isZh ? '快捷键:' : 'Keybindings:')} ${keybindingsText}`);

  // Configuration details
  console.log('');
  console.log(ansis.bold(isZh ? '⚙️ 配置:' : '⚙️ Configuration:'));
  console.log(`  ${ansis.dim('─')}`);

  console.log(`  ${ansis.cyan('Mode Indicator:')} ${config.showModeIndicator ? (isZh ? '开启' : 'On') : (isZh ? '关闭' : 'Off')}`);
  console.log(`  ${ansis.cyan('Auto Indent:')} ${config.autoIndent ? (isZh ? '开启' : 'On') : (isZh ? '关闭' : 'Off')}`);
  console.log(`  ${ansis.cyan('Expand Tab:')} ${config.expandTab ? (isZh ? '开启' : 'On') : (isZh ? '关闭' : 'Off')}`);
  console.log(`  ${ansis.cyan('Tab Width:')} ${config.tabWidth}`);
  console.log(`  ${ansis.cyan('Smart Case:')} ${config.smartCase ? (isZh ? '开启' : 'On') : (isZh ? '关闭' : 'Off')}`);
  console.log(`  ${ansis.cyan('Language:')} ${config.lang}`);

  // File location
  console.log('');
  console.log(ansis.bold(isZh ? '📁 文件位置:' : '📁 File Location:'));
  console.log(`  ${ansis.dim('─')}`);
  console.log(`  ${ansis.cyan('InputRC:')} ${inputrcPath}`);

  // Reload instruction
  if (isInstalled) {
    console.log('');
    console.log(ansis.yellow(isZh
      ? '💡 提示: 修改后需要运行 `source ~/.inputrc` 或重启终端'
      : '💡 Tip: Run `source ~/.inputrc` or restart terminal after changes'));
  }

  console.log('');
}

// ========================================================================
// Toggle Mode
// ========================================================================

/**
 * Toggle Vim mode on/off
 */
export async function toggleVimMode(lang: SupportedLang = 'en'): Promise<void> {
  const manager = createVimModeManager();
  const config = manager.getConfig();

  config.enabled = !config.enabled;
  await manager.updateConfig(config);

  const isZh = lang === 'zh-CN';
  const statusText = config.enabled
    ? (isZh ? '已启用' : 'enabled')
    : (isZh ? '已禁用' : 'disabled');

  console.log(ansis.green(`✓ Vim mode ${statusText}`));

  // If enabling and keybindings not installed, offer to install
  if (config.enabled && !isVimKeybindingsInstalled()) {
    console.log('');
    console.log(ansis.yellow(isZh
      ? '⚠️ Vim 模式快捷键尚未安装'
      : '⚠️ Vim mode keybindings not installed'));

    const { install } = await inquirer.prompt<{ install: boolean }>({
      type: 'confirm',
      name: 'install',
      message: isZh ? '是否现在安装 Vim 快捷键?' : 'Install Vim keybindings now?',
      default: true,
    });

    if (install) {
      await doInstallKeybindings(lang);
    }
  }
}

// ========================================================================
// Enable/Disable Mode
// ========================================================================

/**
 * Enable Vim mode
 */
export async function enableVimMode(lang: SupportedLang = 'en'): Promise<void> {
  const manager = createVimModeManager();
  const config = manager.getConfig();

  if (config.enabled) {
    const isZh = lang === 'zh-CN';
    console.log(ansis.yellow(isZh ? 'Vim 模式已经是启用状态' : 'Vim mode is already enabled'));
    return;
  }

  config.enabled = true;
  await manager.updateConfig(config);

  const isZh = lang === 'zh-CN';
  console.log(ansis.green(isZh ? '✓ Vim 模式已启用' : '✓ Vim mode enabled'));
}

/**
 * Disable Vim mode
 */
export async function disableVimMode(lang: SupportedLang = 'en'): Promise<void> {
  const manager = createVimModeManager();
  const config = manager.getConfig();

  if (!config.enabled) {
    const isZh = lang === 'zh-CN';
    console.log(ansis.yellow(isZh ? 'Vim 模式已经是禁用状态' : 'Vim mode is already disabled'));
    return;
  }

  config.enabled = false;
  await manager.updateConfig(config);

  const isZh = lang === 'zh-CN';
  console.log(ansis.green(isZh ? '✓ Vim 模式已禁用' : '✓ Vim mode disabled'));
}

// ========================================================================
// Keybindings Installation
// ========================================================================

/**
 * Install Vim keybindings to .inputrc
 */
async function doInstallKeybindings(lang: SupportedLang = 'en'): Promise<void> {
  const isZh = lang === 'zh-CN';

  console.log('');
  console.log(ansis.cyan(isZh ? '📦 安装 Vim 快捷键到 .inputrc...' : '📦 Installing Vim keybindings to .inputrc...'));

  const manager = createVimModeManager();
  const config = manager.getConfig();

  const success = await installVimKeybindings(config);

  if (success) {
    console.log(ansis.green(isZh ? '✓ 快捷键安装成功!' : '✓ Keybindings installed successfully!'));
    console.log('');
    console.log(ansis.yellow(isZh
      ? '💡 运行以下命令使配置生效:'
      : '💡 Run the following command to apply changes:'));
    console.log(ansis.cyan('  source ~/.inputrc'));
  }
  else {
    console.log(ansis.red(isZh ? '✗ 快捷键安装失败' : '✗ Keybindings installation failed'));
  }
}

/**
 * Uninstall Vim keybindings from .inputrc
 */
async function doUninstallKeybindings(lang: SupportedLang = 'en'): Promise<void> {
  const isZh = lang === 'zh-CN';

  console.log('');
  console.log(ansis.cyan(isZh ? '🗑️ 从 .inputrc 卸载 Vim 快捷键...' : '🗑️ Uninstalling Vim keybindings from .inputrc...'));

  const success = await uninstallVimKeybindings();

  if (success) {
    console.log(ansis.green(isZh ? '✓ 快捷键已卸载' : '✓ Keybindings uninstalled'));
  }
  else {
    console.log(ansis.red(isZh ? '✗ 快捷键卸载失败' : '✗ Keybindings uninstallation failed'));
  }
}

// ========================================================================
// Configuration Menu
// ========================================================================

/**
 * Show interactive configuration menu
 */
export async function showVimConfigMenu(lang: SupportedLang = 'en'): Promise<void> {
  const isZh = lang === 'zh-CN';
  const manager = createVimModeManager();
  let config = manager.getConfig();

  while (true) {
    const choices = addNumbersToChoices([
      {
        name: `${config.showModeIndicator ? ansis.green('●') : ansis.gray('○')} ${isZh ? '显示模式指示器' : 'Show Mode Indicator'}`,
        value: 'showModeIndicator',
        short: 'Mode Indicator',
      },
      {
        name: `${config.autoIndent ? ansis.green('●') : ansis.gray('○')} ${isZh ? '自动缩进' : 'Auto Indent'}`,
        value: 'autoIndent',
        short: 'Auto Indent',
      },
      {
        name: `${config.expandTab ? ansis.green('●') : ansis.gray('○')} ${isZh ? '空格代替 Tab' : 'Expand Tab'}`,
        value: 'expandTab',
        short: 'Expand Tab',
      },
      {
        name: `   ${isZh ? 'Tab 宽度' : 'Tab Width'}: ${ansis.cyan(config.tabWidth.toString())}`,
        value: 'tabWidth',
        short: 'Tab Width',
      },
      {
        name: `${config.smartCase ? ansis.green('●') : ansis.gray('○')} ${isZh ? '智能大小写' : 'Smart Case'}`,
        value: 'smartCase',
        short: 'Smart Case',
      },
      {
        name: `   ${isZh ? '语言' : 'Language'}: ${ansis.cyan(config.lang)}`,
        value: 'language',
        short: 'Language',
      },
      {
        name: ansis.green(isZh ? '应用更改' : 'Apply Changes'),
        value: 'apply',
        short: isZh ? '应用' : 'Apply',
      },
      {
        name: ansis.yellow(isZh ? '取消' : 'Cancel'),
        value: 'cancel',
        short: isZh ? '取消' : 'Cancel',
      },
    ]);

    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'list',
      name: 'choice',
      message: isZh ? '选择配置项:' : 'Select configuration option:',
      choices: [
        ...choices.slice(0, -2),
        new inquirer.Separator(ansis.dim('─'.repeat(40))),
        ...choices.slice(-2),
      ],
    });

    if (choice === 'cancel') {
      break;
    }

    if (choice === 'apply') {
      await manager.updateConfig(config);
      console.log(ansis.green(isZh ? '✓ 配置已保存' : '✓ Configuration saved'));
      break;
    }

    if (choice === 'tabWidth') {
      const { width } = await inquirer.prompt<{ width: number }>({
        type: 'number',
        name: 'width',
        message: isZh ? '输入 Tab 宽度:' : 'Enter tab width:',
        default: config.tabWidth,
      });
      config.tabWidth = width;
    }
    else if (choice === 'language') {
      const { language } = await inquirer.prompt<{ language: SupportedLang }>({
        type: 'list',
        name: 'language',
        message: isZh ? '选择语言:' : 'Select language:',
        choices: [
          { name: 'English', value: 'en' },
          { name: '中文', value: 'zh-CN' },
        ],
      });
      config.lang = language;
    }
    else {
      // Toggle boolean options
      const key = choice as keyof VimModeConfig;
      config = { ...config, [key]: !config[key] };
    }
  }
}

// ========================================================================
// Command Testing
// ========================================================================

/**
 * Test a Vim command parsing
 */
export function testVimCommand(input: string, lang: SupportedLang = 'en'): void {
  const isZh = lang === 'zh-CN';

  console.log('');
  console.log(ansis.bold(isZh ? '🧪 Vim 命令测试' : '🧪 Vim Command Test'));
  console.log(ansis.dim(`Input: "${input}"`));
  console.log('');

  // Check validity
  const valid = isValidVimCommand(input);
  console.log(`${ansis.cyan('Valid:')} ${valid ? ansis.green('Yes') : ansis.red('No')}`);

  if (!valid) {
    console.log(ansis.yellow(isZh ? '无效的 Vim 命令' : 'Invalid Vim command'));
    return;
  }

  // Parse command
  const parsed = parseVimCommand(input);
  if (parsed) {
    console.log('');
    console.log(ansis.bold(isZh ? '解析结果:' : 'Parsed Result:'));
    console.log(`  ${ansis.cyan('Operator:')} ${parsed.operator || ansis.dim('none')}`);
    console.log(`  ${ansis.cyan('Motion:')} ${parsed.motion || ansis.dim('none')}`);
    console.log(`  ${ansis.cyan('Count:')} ${parsed.count || ansis.dim('none')}`);
    if (parsed.textObject) {
      console.log(`  ${ansis.cyan('Text Object:')} ${parsed.textObject.inclusive ? 'a' : 'i'}${parsed.textObject.type}`);
    }

    // Get formatted command
    const formatted = formatCommand(parsed, lang);
    console.log(`  ${ansis.cyan('Description:')} ${formatted}`);
  }

  console.log('');
}

// ========================================================================
// Keybinding Reference
// ========================================================================

/**
 * Show keybinding reference
 */
export function showKeybindingReference(lang: SupportedLang = 'en'): void {
  const reference = generateKeybindingReference(lang);
  console.log('');
  console.log(reference);
  console.log('');
}

// ========================================================================
// Main Command Handler
// ========================================================================

/**
 * Main vim command handler
 */
export async function vimCommand(options: VimCommandOptions = {}): Promise<void> {
  await ensureI18nInitialized();

  const lang: SupportedLang = options.lang || i18n.language as SupportedLang || 'en';

  // Handle test option first
  if (options.test) {
    testVimCommand(options.test, lang);
    return;
  }

  // Handle show keys
  if (options.keys) {
    showKeybindingReference(lang);
    return;
  }

  // Handle status
  if (options.status) {
    await showVimStatus(lang);
    return;
  }

  // Handle install
  if (options.install) {
    await doInstallKeybindings(lang);
    return;
  }

  // Handle uninstall
  if (options.uninstall) {
    await doUninstallKeybindings(lang);
    return;
  }

  // Handle toggle
  if (options.toggle) {
    await toggleVimMode(lang);
    return;
  }

  // Handle enable
  if (options.enable) {
    await enableVimMode(lang);
    return;
  }

  // Handle disable
  if (options.disable) {
    await disableVimMode(lang);
    return;
  }

  // No options - show interactive menu
  await showVimMenu(lang);
}

// ========================================================================
// Interactive Menu
// ========================================================================

/**
 * Show interactive Vim mode menu
 */
async function showVimMenu(lang: SupportedLang = 'en'): Promise<void> {
  const isZh = lang === 'zh-CN';
  const manager = createVimModeManager();
  const config = manager.getConfig();

  while (true) {
    const isEnabled = config.enabled;
    const isInstalled = isVimKeybindingsInstalled();

    // Header
    console.log('');
    console.log(ansis.bold.cyan(isZh ? '⌨️ CCJK Vim 模式配置' : '⌨️ CCJK Vim Mode Configuration'));
    console.log(ansis.dim('─'.repeat(50)));

    // Status
    const statusColor = isEnabled ? 'green' : 'yellow';
    const statusText = isEnabled
      ? (isZh ? '已启用' : 'Enabled')
      : (isZh ? '已禁用' : 'Disabled');
    console.log(`  ${ansis[statusColor]('●')} ${isZh ? '状态' : 'Status'}: ${statusText}`);

    const installedColor = isInstalled ? 'green' : 'yellow';
    const installedText = isInstalled
      ? (isZh ? '已安装' : 'Installed')
      : (isZh ? '未安装' : 'Not Installed');
    console.log(`  ${ansis[installedColor]('●')} ${isZh ? '快捷键' : 'Keybindings'}: ${installedText}`);
    console.log('');

    const choices = addNumbersToChoices([
      {
        name: isEnabled
          ? ansis.yellow(isZh ? '🔴 禁用 Vim 模式' : '🔴 Disable Vim Mode')
          : ansis.green(isZh ? '🟢 启用 Vim 模式' : '🟢 Enable Vim Mode'),
        value: 'toggle',
        short: isZh ? '切换' : 'Toggle',
      },
      {
        name: isInstalled
          ? ansis.yellow(isZh ? '🗑️ 卸载快捷键' : '🗑️ Uninstall Keybindings')
          : ansis.green(isZh ? '📦 安装快捷键' : '📦 Install Keybindings'),
        value: isInstalled ? 'uninstall' : 'install',
        short: isInstalled ? isZh ? '卸载' : 'Uninstall' : isZh ? '安装' : 'Install',
      },
      {
        name: ansis.cyan(isZh ? '⚙️ 配置选项' : '⚙️ Configure Options'),
        value: 'config',
        short: isZh ? '配置' : 'Configure',
      },
      {
        name: ansis.blue(isZh ? '📋 查看快捷键参考' : '📋 Keybinding Reference'),
        value: 'keys',
        short: isZh ? '快捷键' : 'Keys',
      },
      {
        name: ansis.magenta(isZh ? '🧪 测试命令' : '🧪 Test Command'),
        value: 'test',
        short: isZh ? '测试' : 'Test',
      },
      {
        name: ansis.gray(isZh ? '↩️ 返回' : '↩️ Back'),
        value: 'back',
        short: isZh ? '返回' : 'Back',
      },
    ]);

    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'list',
      name: 'choice',
      message: isZh ? '选择操作:' : 'Select action:',
      choices,
    });

    switch (choice) {
      case 'toggle':
        await toggleVimMode(lang);
        break;
      case 'install':
        await doInstallKeybindings(lang);
        break;
      case 'uninstall':
        await doUninstallKeybindings(lang);
        break;
      case 'config':
        await showVimConfigMenu(lang);
        break;
      case 'keys':
        showKeybindingReference(lang);
        await pressEnterToContinue(lang);
        break;
      case 'test': {
        const { input } = await inquirer.prompt<{ input: string }>({
          type: 'input',
          name: 'input',
          message: isZh ? '输入要测试的 Vim 命令:' : 'Enter Vim command to test:',
          default: 'ciw',
        });
        testVimCommand(input, lang);
        await pressEnterToContinue(lang);
        break;
      }
      case 'back':
        return;
    }

    // Refresh config
    const updatedConfig = manager.getConfig();
    Object.assign(config, updatedConfig);
  }
}

/**
 * Prompt user to press Enter to continue
 */
async function pressEnterToContinue(lang: SupportedLang): Promise<void> {
  const isZh = lang === 'zh-CN';
  const message = isZh ? '按回车键继续...' : 'Press Enter to continue...';

  await inquirer.prompt<{ confirm: boolean }>({
    type: 'input',
    name: 'confirm',
    message,
  });
}

// ========================================================================
// Help Text
// ============================================================================

export function printVimHelp(lang: SupportedLang = 'en'): void {
  const isZh = lang === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan('⌨️ CCJK Vim Mode'));
  console.log('');
  console.log(ansis.bold(isZh ? '用法:' : 'Usage:'));
  console.log(`  ccjk vim [options]`);
  console.log('');
  console.log(ansis.bold(isZh ? '选项:' : 'Options:'));
  console.log(`  --enable, -e         ${isZh ? '启用 Vim 模式' : 'Enable Vim mode'}`);
  console.log(`  --disable, -d        ${isZh ? '禁用 Vim 模式' : 'Disable Vim mode'}`);
  console.log(`  --toggle, -t         ${isZh ? '切换 Vim 模式' : 'Toggle Vim mode'}`);
  console.log(`  --status, -s         ${isZh ? '显示状态' : 'Show status'}`);
  console.log(`  --install            ${isZh ? '安装快捷键' : 'Install keybindings'}`);
  console.log(`  --uninstall          ${isZh ? '卸载快捷键' : 'Uninstall keybindings'}`);
  console.log(`  --keys, -k           ${isZh ? '显示快捷键参考' : 'Show keybinding reference'}`);
  console.log(`  --test <cmd>         ${isZh ? '测试命令解析' : 'Test command parsing'}`);
  console.log(`  --lang, -l <lang>    ${isZh ? '语言 (en, zh-CN)' : 'Language (en, zh-CN)'}`);
  console.log('');
  console.log(ansis.bold(isZh ? '示例:' : 'Examples:'));
  console.log(`  ccjk vim             ${isZh ? '# 打开配置菜单' : '# Open config menu'}`);
  console.log(`  ccjk vim --enable    ${isZh ? '# 启用 Vim 模式' : '# Enable Vim mode'}`);
  console.log(`  ccjk vim --toggle    ${isZh ? '# 切换状态' : '# Toggle status'}`);
  console.log(`  ccjk vim --keys      ${isZh ? '# 显示快捷键' : '# Show keybindings'}`);
  console.log(`  ccjk vim --test ciw  ${isZh ? '# 测试命令' : '# Test command'}`);
  console.log('');
}
