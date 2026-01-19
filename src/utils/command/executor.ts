/**
 * Command Execution Utilities
 * Provides utilities for executing shell commands
 */

import { exec, spawn, ExecOptions, SpawnOptions } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string | boolean;
  encoding?: BufferEncoding;
  maxBuffer?: number;
}

/**
 * Execute a command and return the result
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: CommandOptions = {}
): Promise<CommandResult> {
  try {
    const fullCommand = buildCommand(command, args);
    const execOptions: ExecOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      timeout: options.timeout,
      shell: options.shell,
      encoding: options.encoding || 'utf8',
      maxBuffer: options.maxBuffer || 1024 * 1024 * 10, // 10MB default
    };

    const { stdout, stderr } = await execAsync(fullCommand, execOptions);

    return {
      success: true,
      stdout: stdout.toString().trim(),
      stderr: stderr.toString().trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout?.toString().trim() || '',
      stderr: error.stderr?.toString().trim() || '',
      exitCode: error.code || 1,
      error: error.message,
    };
  }
}

/**
 * Execute a command with streaming output
 */
export function executeCommandStream(
  command: string,
  args: string[] = [],
  options: CommandOptions & {
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
  } = {}
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: options.shell !== false,
    };

    const child = spawn(command, args, spawnOptions);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (options.onStdout) {
        options.onStdout(text);
      }
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (options.onStderr) {
        options.onStderr(text);
      }
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0,
        error: code !== 0 ? `Command exited with code ${code}` : undefined,
      });
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 1,
        error: error.message,
      });
    });

    // Handle timeout
    if (options.timeout) {
      setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 1,
          error: `Command timed out after ${options.timeout}ms`,
        });
      }, options.timeout);
    }
  });
}

/**
 * Build command string from command and arguments
 */
export function buildCommand(command: string, args: string[]): string {
  const escapedArgs = args.map(escapeArgument);
  return [command, ...escapedArgs].join(' ');
}

/**
 * Escape command argument
 */
export function escapeArgument(arg: string): string {
  // If argument contains spaces or special characters, wrap in quotes
  if (/[\s"'`$&|;<>(){}[\]\\]/.test(arg)) {
    // Escape existing quotes
    const escaped = arg.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return arg;
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  const isWindows = process.platform === 'win32';
  const checkCommand = isWindows ? 'where' : 'which';

  try {
    const result = await executeCommand(checkCommand, [command]);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get command path
 */
export async function getCommandPath(command: string): Promise<string | null> {
  const isWindows = process.platform === 'win32';
  const checkCommand = isWindows ? 'where' : 'which';

  try {
    const result = await executeCommand(checkCommand, [command]);
    if (result.success) {
      // Return first line (in case of multiple matches)
      return result.stdout.split('\n')[0].trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse version from command output
 */
export function parseVersion(output: string): string | null {
  // Common version patterns
  const patterns = [
    /version\s+v?(\d+\.\d+\.\d+)/i,
    /v?(\d+\.\d+\.\d+)/,
    /(\d+\.\d+\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get command version
 */
export async function getCommandVersion(
  command: string,
  versionFlag: string = '--version'
): Promise<string | null> {
  try {
    const result = await executeCommand(command, [versionFlag]);
    if (result.success) {
      return parseVersion(result.stdout || result.stderr);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Execute multiple commands in sequence
 */
export async function executeCommandSequence(
  commands: Array<{ command: string; args?: string[]; options?: CommandOptions }>
): Promise<CommandResult[]> {
  const results: CommandResult[] = [];

  for (const cmd of commands) {
    const result = await executeCommand(
      cmd.command,
      cmd.args || [],
      cmd.options || {}
    );
    results.push(result);

    // Stop on first failure
    if (!result.success) {
      break;
    }
  }

  return results;
}

/**
 * Execute multiple commands in parallel
 */
export async function executeCommandParallel(
  commands: Array<{ command: string; args?: string[]; options?: CommandOptions }>
): Promise<CommandResult[]> {
  const promises = commands.map((cmd) =>
    executeCommand(cmd.command, cmd.args || [], cmd.options || {})
  );

  return Promise.all(promises);
}
