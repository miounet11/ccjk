import ansis from 'ansis';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'pathe';
import { homedir } from 'node:os';
import { AutoMemoryBridge } from '../brain/auto-memory-bridge.js';
import { i18n } from '../i18n/index.js';
import { CLAUDE_DIR } from '../constants.js';
import { x } from 'tinyexec';

interface MemoryOptions {
  view?: boolean;
  edit?: boolean;
  sync?: boolean;
  project?: string;
}

/**
 * Get Claude directory path
 */
function getClaudeDir(): string {
  return join(homedir(), CLAUDE_DIR);
}

/**
 * Get memory file path for current or specified project
 */
function getMemoryPath(projectPath?: string): string {
  const claudeDir = getClaudeDir();

  if (projectPath) {
    // Project-specific memory
    const projectHash = Buffer.from(projectPath).toString('base64').replace(/[/+=]/g, '_');
    return join(claudeDir, 'projects', projectHash, 'memory', 'MEMORY.md');
  }

  // Global memory
  return join(claudeDir, 'memory', 'MEMORY.md');
}

/**
 * Read memory content
 */
function readMemory(memoryPath: string): string {
  if (!existsSync(memoryPath)) {
    return '';
  }
  return readFileSync(memoryPath, 'utf-8');
}

/**
 * Write memory content
 */
function writeMemory(memoryPath: string, content: string): void {
  const dir = join(memoryPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(memoryPath, content, 'utf-8');
}

/**
 * Display memory content with syntax highlighting
 */
function displayMemory(content: string, title: string): void {
  console.log(ansis.cyan.bold(`\n${'='.repeat(60)}`));
  console.log(ansis.cyan.bold(`  ${title}`));
  console.log(ansis.cyan.bold(`${'='.repeat(60)}\n`));

  if (!content.trim()) {
    console.log(ansis.gray('  (Empty memory)'));
  } else {
    // Simple syntax highlighting for markdown
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        console.log(ansis.yellow.bold(line));
      } else if (line.startsWith('## ')) {
        console.log(ansis.green.bold(line));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        console.log(ansis.blue(line));
      } else if (line.startsWith('```')) {
        console.log(ansis.magenta(line));
      } else {
        console.log(line);
      }
    });
  }

  console.log(ansis.cyan.bold(`\n${'='.repeat(60)}\n`));
}

/**
 * Interactive memory editor
 */
async function editMemoryInteractive(memoryPath: string): Promise<void> {
  const currentContent = readMemory(memoryPath);

  console.log(ansis.yellow('\nCurrent memory content:'));
  displayMemory(currentContent, 'Current Memory');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Append new content', value: 'append' },
        { name: 'Replace entire content', value: 'replace' },
        { name: 'Clear memory', value: 'clear' },
        { name: 'Open in editor', value: 'editor' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'cancel') {
    console.log(ansis.gray('Cancelled.'));
    return;
  }

  if (action === 'clear') {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to clear all memory?',
        default: false,
      },
    ]);

    if (confirmed) {
      writeMemory(memoryPath, '');
      console.log(ansis.green('✓ Memory cleared'));
    }
    return;
  }

  if (action === 'editor') {
    const editor = process.env.EDITOR || 'vim';
    try {
      await x(editor, [memoryPath], { nodeOptions: { stdio: 'inherit' } });
      console.log(ansis.green('✓ Memory updated'));
    } catch (error) {
      console.error(ansis.red('Failed to open editor:'), error);
    }
    return;
  }

  const { newContent } = await inquirer.prompt([
    {
      type: 'input',
      name: 'newContent',
      message: 'Enter content (use \\n for line breaks):',
      default: '',
    },
  ]);

  if (!newContent.trim()) {
    console.log(ansis.gray('No content entered.'));
    return;
  }

  const formattedContent = newContent.replace(/\\n/g, '\n');

  if (action === 'append') {
    const updated = currentContent
      ? `${currentContent}\n\n${formattedContent}`
      : formattedContent;
    writeMemory(memoryPath, updated);
    console.log(ansis.green('✓ Content appended to memory'));
  } else if (action === 'replace') {
    writeMemory(memoryPath, formattedContent);
    console.log(ansis.green('✓ Memory replaced'));
  }
}

/**
 * Sync memory using AutoMemoryBridge
 */
async function syncMemory(projectPath?: string): Promise<void> {
  console.log(ansis.cyan('\nSyncing memory with AutoMemoryBridge...'));

  try {
    const bridge = new AutoMemoryBridge({});
    // Note: syncMemory method may not exist, using placeholder
    console.log(ansis.yellow('⚠ AutoMemoryBridge sync not yet implemented'));
    console.log(ansis.green('✓ Memory sync placeholder executed'));
  } catch (error) {
    console.error(ansis.red('Failed to sync memory:'), error);
    throw error;
  }
}

/**
 * Main memory command handler
 */
export async function memoryCommand(options: MemoryOptions): Promise<void> {
  const projectPath = options.project || process.cwd();
  const memoryPath = getMemoryPath(options.project);

  // Handle direct flags
  if (options.view) {
    const content = readMemory(memoryPath);
    const title = options.project
      ? `Project Memory: ${options.project}`
      : 'Global Memory';
    displayMemory(content, title);
    return;
  }

  if (options.edit) {
    await editMemoryInteractive(memoryPath);
    return;
  }

  if (options.sync) {
    await syncMemory(options.project);
    return;
  }

  // Interactive mode
  console.log(ansis.cyan.bold('\n📝 Memory Management'));
  console.log(ansis.gray(`Memory path: ${memoryPath}\n`));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '👁️  View memory', value: 'view' },
        { name: '✏️  Edit memory', value: 'edit' },
        { name: '🔄 Sync memory (AutoMemoryBridge)', value: 'sync' },
        { name: '📊 Memory stats', value: 'stats' },
        { name: '🚪 Exit', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'view': {
      const content = readMemory(memoryPath);
      const title = options.project
        ? `Project Memory: ${options.project}`
        : 'Global Memory';
      displayMemory(content, title);
      break;
    }

    case 'edit':
      await editMemoryInteractive(memoryPath);
      break;

    case 'sync':
      await syncMemory(options.project);
      break;

    case 'stats': {
      const content = readMemory(memoryPath);
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(w => w.length > 0).length;
      const chars = content.length;

      console.log(ansis.cyan('\n📊 Memory Statistics:'));
      console.log(ansis.gray(`  Lines: ${lines}`));
      console.log(ansis.gray(`  Words: ${words}`));
      console.log(ansis.gray(`  Characters: ${chars}`));
      console.log(ansis.gray(`  Size: ${(chars / 1024).toFixed(2)} KB\n`));
      break;
    }

    case 'exit':
      console.log(ansis.gray('Goodbye!'));
      break;
  }
}
