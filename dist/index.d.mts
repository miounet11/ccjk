/**
 * Core types for the code tool abstraction layer
 */
/**
 * Configuration for a code tool
 */
interface ToolConfig {
    /** Tool name */
    name: string;
    /** Tool version */
    version?: string;
    /** Installation path */
    installPath?: string;
    /** API key or authentication token */
    apiKey?: string;
    /** Model to use (e.g., claude-opus-4, gpt-4) */
    model?: string;
    /** Additional tool-specific settings */
    settings?: Record<string, any>;
    /** Environment variables */
    env?: Record<string, string>;
}
/**
 * Installation status
 */
interface InstallStatus {
    /** Whether the tool is installed */
    installed: boolean;
    /** Installation path if installed */
    path?: string;
    /** Version if installed */
    version?: string;
    /** Error message if check failed */
    error?: string;
}
/**
 * Tool execution result
 */
interface ExecutionResult {
    /** Whether execution was successful */
    success: boolean;
    /** Output from the tool */
    output?: string;
    /** Error message if failed */
    error?: string;
    /** Exit code */
    exitCode?: number;
}
/**
 * Tool capabilities
 */
interface ToolCapabilities {
    /** Supports chat/conversation mode */
    supportsChat: boolean;
    /** Supports file editing */
    supportsFileEdit: boolean;
    /** Supports code generation */
    supportsCodeGen: boolean;
    /** Supports code review */
    supportsReview: boolean;
    /** Supports testing */
    supportsTesting: boolean;
    /** Supports debugging */
    supportsDebugging: boolean;
    /** Custom capabilities */
    custom?: Record<string, boolean>;
}
/**
 * Tool metadata
 */
interface ToolMetadata {
    /** Tool name */
    name: string;
    /** Display name */
    displayName: string;
    /** Tool description */
    description: string;
    /** Tool version */
    version: string;
    /** Tool homepage URL */
    homepage?: string;
    /** Tool documentation URL */
    documentation?: string;
    /** Tool capabilities */
    capabilities: ToolCapabilities;
}

/**
 * Core interfaces for the code tool abstraction layer
 */

/**
 * Base interface that all code tools must implement
 */
interface ICodeTool {
    /**
     * Get tool metadata
     */
    getMetadata: () => ToolMetadata;
    /**
     * Check if the tool is installed
     */
    isInstalled: () => Promise<InstallStatus>;
    /**
     * Install the tool
     */
    install: () => Promise<ExecutionResult>;
    /**
     * Uninstall the tool
     */
    uninstall: () => Promise<ExecutionResult>;
    /**
     * Get current configuration
     */
    getConfig: () => Promise<ToolConfig>;
    /**
     * Update configuration
     * @param updates Partial configuration to update
     */
    updateConfig: (updates: Partial<ToolConfig>) => Promise<void>;
    /**
     * Configure the tool with full config
     * @param config Complete configuration
     */
    configure: (config: ToolConfig) => Promise<void>;
    /**
     * Validate configuration
     * @param config Configuration to validate
     */
    validateConfig: (config: Partial<ToolConfig>) => Promise<boolean>;
    /**
     * Execute a command with the tool
     * @param command Command to execute
     * @param args Command arguments
     */
    execute: (command: string, args?: string[]) => Promise<ExecutionResult>;
    /**
     * Get tool version
     */
    getVersion: () => Promise<string | undefined>;
    /**
     * Reset tool to default configuration
     */
    reset: () => Promise<void>;
}
/**
 * Interface for tools that support chat/conversation
 */
interface IChatTool extends ICodeTool {
    /**
     * Start a chat session
     * @param prompt Initial prompt
     */
    chat: (prompt: string) => Promise<ExecutionResult>;
    /**
     * Continue a chat session
     * @param message Message to send
     */
    continueChat: (message: string) => Promise<ExecutionResult>;
    /**
     * End chat session
     */
    endChat: () => Promise<void>;
}
/**
 * Interface for tools that support file editing
 */
interface IFileEditTool extends ICodeTool {
    /**
     * Edit a file
     * @param filePath Path to file
     * @param instructions Edit instructions
     */
    editFile: (filePath: string, instructions: string) => Promise<ExecutionResult>;
    /**
     * Edit multiple files
     * @param files Array of file paths
     * @param instructions Edit instructions
     */
    editFiles: (files: string[], instructions: string) => Promise<ExecutionResult>;
}
/**
 * Interface for tools that support code generation
 */
interface ICodeGenTool extends ICodeTool {
    /**
     * Generate code
     * @param prompt Generation prompt
     * @param outputPath Optional output path
     */
    generateCode: (prompt: string, outputPath?: string) => Promise<ExecutionResult>;
}

/**
 * Abstract base class for code tools
 * Implements common functionality to reduce code duplication
 */

/**
 * Base abstract class that provides common functionality for all code tools
 */
declare abstract class BaseCodeTool implements ICodeTool {
    protected config: ToolConfig;
    protected configPath: string;
    constructor(initialConfig?: Partial<ToolConfig>);
    /**
     * Get the default configuration path for this tool
     */
    protected getDefaultConfigPath(): string;
    /**
     * Abstract method to get tool metadata - must be implemented by subclasses
     */
    abstract getMetadata(): ToolMetadata;
    /**
     * Abstract method to get the command to check if tool is installed
     */
    protected abstract getInstallCheckCommand(): string;
    /**
     * Abstract method to get the installation command
     */
    protected abstract getInstallCommand(): string;
    /**
     * Abstract method to get the uninstallation command
     */
    protected abstract getUninstallCommand(): string;
    /**
     * Check if the tool is installed
     */
    isInstalled(): Promise<InstallStatus>;
    /**
     * Install the tool
     */
    install(): Promise<ExecutionResult>;
    /**
     * Uninstall the tool
     */
    uninstall(): Promise<ExecutionResult>;
    /**
     * Get current configuration
     */
    getConfig(): Promise<ToolConfig>;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ToolConfig>): Promise<void>;
    /**
     * Configure the tool with full config
     */
    configure(config: ToolConfig): Promise<void>;
    /**
     * Validate configuration
     */
    validateConfig(config: Partial<ToolConfig>): Promise<boolean>;
    /**
     * Execute a command with the tool
     */
    execute(command: string, args?: string[]): Promise<ExecutionResult>;
    /**
     * Get tool version
     */
    getVersion(): Promise<string | undefined>;
    /**
     * Reset tool to default configuration
     */
    reset(): Promise<void>;
    /**
     * Load configuration from file
     */
    protected loadConfig(): Promise<void>;
    /**
     * Save configuration to file
     */
    protected saveConfig(): Promise<void>;
    /**
     * Remove configuration file
     */
    protected removeConfigFile(): Promise<void>;
    /**
     * Build command string from command and arguments
     */
    protected buildCommand(command: string, args: string[]): string;
    /**
     * Parse version from command output
     */
    protected parseVersion(output: string): string | undefined;
    /**
     * Find the tool's installation path
     */
    protected findToolPath(): Promise<string | undefined>;
    /**
     * Create default capabilities object
     */
    protected createDefaultCapabilities(): ToolCapabilities;
}

/**
 * Aider adapter
 */

/**
 * Aider tool adapter
 */
declare class AiderTool extends BaseCodeTool implements IChatTool, IFileEditTool {
    getMetadata(): ToolMetadata;
    protected getInstallCheckCommand(): string;
    protected getInstallCommand(): string;
    protected getUninstallCommand(): string;
    /**
     * Start a chat session
     */
    chat(prompt: string): Promise<ExecutionResult>;
    /**
     * Continue a chat session
     */
    continueChat(message: string): Promise<ExecutionResult>;
    /**
     * End chat session
     */
    endChat(): Promise<void>;
    /**
     * Edit a file
     */
    editFile(filePath: string, instructions: string): Promise<ExecutionResult>;
    /**
     * Edit multiple files
     */
    editFiles(files: string[], instructions: string): Promise<ExecutionResult>;
}

/**
 * Claude Code adapter
 */

/**
 * Claude Code tool adapter
 */
declare class ClaudeCodeTool extends BaseCodeTool implements IChatTool, IFileEditTool, ICodeGenTool {
    getMetadata(): ToolMetadata;
    protected getInstallCheckCommand(): string;
    protected getInstallCommand(): string;
    protected getUninstallCommand(): string;
    /**
     * Start a chat session
     */
    chat(prompt: string): Promise<ExecutionResult>;
    /**
     * Continue a chat session
     */
    continueChat(message: string): Promise<ExecutionResult>;
    /**
     * End chat session
     */
    endChat(): Promise<void>;
    /**
     * Edit a file
     */
    editFile(filePath: string, instructions: string): Promise<ExecutionResult>;
    /**
     * Edit multiple files
     */
    editFiles(files: string[], instructions: string): Promise<ExecutionResult>;
    /**
     * Generate code
     */
    generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult>;
}

/**
 * Cline adapter
 */

/**
 * Cline tool adapter
 */
declare class ClineTool extends BaseCodeTool implements IChatTool, IFileEditTool, ICodeGenTool {
    getMetadata(): ToolMetadata;
    protected getInstallCheckCommand(): string;
    protected getInstallCommand(): string;
    protected getUninstallCommand(): string;
    /**
     * Start a chat session
     */
    chat(prompt: string): Promise<ExecutionResult>;
    /**
     * Continue a chat session
     */
    continueChat(message: string): Promise<ExecutionResult>;
    /**
     * End chat session
     */
    endChat(): Promise<void>;
    /**
     * Edit a file
     */
    editFile(filePath: string, instructions: string): Promise<ExecutionResult>;
    /**
     * Edit multiple files
     */
    editFiles(files: string[], instructions: string): Promise<ExecutionResult>;
    /**
     * Generate code
     */
    generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult>;
}

/**
 * Codex adapter
 */

/**
 * OpenAI Codex tool adapter
 */
declare class CodexTool extends BaseCodeTool implements ICodeGenTool {
    getMetadata(): ToolMetadata;
    protected getInstallCheckCommand(): string;
    protected getInstallCommand(): string;
    protected getUninstallCommand(): string;
    /**
     * Generate code
     */
    generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult>;
}

/**
 * Continue adapter
 */

/**
 * Continue tool adapter
 */
declare class ContinueTool extends BaseCodeTool implements IChatTool, ICodeGenTool {
    getMetadata(): ToolMetadata;
    protected getInstallCheckCommand(): string;
    protected getInstallCommand(): string;
    protected getUninstallCommand(): string;
    /**
     * Start a chat session
     */
    chat(prompt: string): Promise<ExecutionResult>;
    /**
     * Continue a chat session
     */
    continueChat(message: string): Promise<ExecutionResult>;
    /**
     * End chat session
     */
    endChat(): Promise<void>;
    /**
     * Generate code
     */
    generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult>;
}

/**
 * Cursor adapter
 */

/**
 * Cursor tool adapter
 */
declare class CursorTool extends BaseCodeTool implements IChatTool, IFileEditTool, ICodeGenTool {
    getMetadata(): ToolMetadata;
    protected getInstallCheckCommand(): string;
    protected getInstallCommand(): string;
    protected getUninstallCommand(): string;
    /**
     * Start a chat session
     */
    chat(prompt: string): Promise<ExecutionResult>;
    /**
     * Continue a chat session
     */
    continueChat(message: string): Promise<ExecutionResult>;
    /**
     * End chat session
     */
    endChat(): Promise<void>;
    /**
     * Edit a file
     */
    editFile(filePath: string, instructions: string): Promise<ExecutionResult>;
    /**
     * Edit multiple files
     */
    editFiles(files: string[], instructions: string): Promise<ExecutionResult>;
    /**
     * Generate code
     */
    generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult>;
}

/**
 * Tool registry for managing code tool instances
 */

/**
 * Registry for managing code tool instances
 */
declare class ToolRegistry {
    private static instance;
    private tools;
    private toolClasses;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): ToolRegistry;
    /**
     * Register a tool class
     */
    registerToolClass(name: string, toolClass: new () => ICodeTool): void;
    /**
     * Register a tool instance
     */
    registerTool(tool: ICodeTool): void;
    /**
     * Get a tool instance by name
     */
    getTool(name: string): ICodeTool | undefined;
    /**
     * Get all registered tool names
     */
    getToolNames(): string[];
    /**
     * Get all tool instances
     */
    getAllTools(): ICodeTool[];
    /**
     * Check if a tool is registered
     */
    hasTool(name: string): boolean;
    /**
     * Unregister a tool
     */
    unregisterTool(name: string): void;
    /**
     * Clear all registered tools
     */
    clear(): void;
    /**
     * Get metadata for all registered tools
     */
    getAllMetadata(): Promise<ToolMetadata[]>;
}
/**
 * Convenience function to get the registry instance
 */
declare function getRegistry(): ToolRegistry;

/**
 * Factory for creating code tool instances
 */

/**
 * Factory for creating code tool instances
 */
declare class ToolFactory {
    private registry;
    constructor(registry?: ToolRegistry);
    /**
     * Create a tool instance by name
     */
    createTool(name: string, config?: Partial<ToolConfig>): ICodeTool;
    /**
     * Create multiple tool instances
     */
    createTools(names: string[]): ICodeTool[];
    /**
     * Create all registered tools
     */
    createAllTools(): ICodeTool[];
    /**
     * Check if a tool can be created
     */
    canCreateTool(name: string): boolean;
    /**
     * Get available tool names
     */
    getAvailableTools(): string[];
}
/**
 * Convenience function to create a tool
 */
declare function createTool(name: string, config?: Partial<ToolConfig>): ICodeTool;

/**
 * Array Utilities
 * Array manipulation and transformation functions
 */
/**
 * Remove duplicates from array
 */
declare function unique<T>(arr: T[]): T[];
/**
 * Remove duplicates by key
 */
declare function uniqueBy<T>(arr: T[], key: keyof T | ((item: T) => any)): T[];
/**
 * Flatten nested array
 */
declare function flatten$1<T>(arr: any[], depth?: number): T[];
/**
 * Chunk array into smaller arrays
 */
declare function chunk<T>(arr: T[], size: number): T[][];
/**
 * Shuffle array randomly
 */
declare function shuffle<T>(arr: T[]): T[];
/**
 * Get random element from array
 */
declare function sample<T>(arr: T[]): T | undefined;
/**
 * Get multiple random elements from array
 */
declare function sampleSize<T>(arr: T[], size: number): T[];
/**
 * Partition array into two arrays based on predicate
 */
declare function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]];
/**
 * Get intersection of arrays
 */
declare function intersection<T>(...arrays: T[][]): T[];
/**
 * Get union of arrays
 */
declare function union<T>(...arrays: T[][]): T[];
/**
 * Get difference between arrays (items in first but not in others)
 */
declare function difference<T>(arr: T[], ...others: T[][]): T[];
/**
 * Zip arrays together
 */
declare function zip<T>(...arrays: T[][]): T[][];
/**
 * Unzip array of arrays
 */
declare function unzip<T>(arr: T[][]): T[][];
/**
 * Group consecutive elements
 */
declare function groupConsecutive<T>(arr: T[], predicate: (a: T, b: T) => boolean): T[][];
/**
 * Take first n elements
 */
declare function take<T>(arr: T[], n: number): T[];
/**
 * Take last n elements
 */
declare function takeLast<T>(arr: T[], n: number): T[];
/**
 * Drop first n elements
 */
declare function drop<T>(arr: T[], n: number): T[];
/**
 * Drop last n elements
 */
declare function dropLast<T>(arr: T[], n: number): T[];
/**
 * Take elements while predicate is true
 */
declare function takeWhile<T>(arr: T[], predicate: (item: T) => boolean): T[];
/**
 * Drop elements while predicate is true
 */
declare function dropWhile<T>(arr: T[], predicate: (item: T) => boolean): T[];
/**
 * Find index of element
 */
declare function findIndex<T>(arr: T[], predicate: (item: T) => boolean): number;
/**
 * Find last index of element
 */
declare function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number;
/**
 * Count occurrences of element
 */
declare function count<T>(arr: T[], item: T): number;
/**
 * Count elements matching predicate
 */
declare function countBy<T>(arr: T[], predicate: (item: T) => boolean): number;
/**
 * Sum array of numbers
 */
declare function sum(arr: number[]): number;
/**
 * Sum by property or function
 */
declare function sumBy<T>(arr: T[], selector: keyof T | ((item: T) => number)): number;
/**
 * Get average of numbers
 */
declare function average(arr: number[]): number;
/**
 * Get minimum value
 */
declare function min(arr: number[]): number | undefined;
/**
 * Get maximum value
 */
declare function max(arr: number[]): number | undefined;
/**
 * Get minimum by property or function
 */
declare function minBy<T>(arr: T[], selector: keyof T | ((item: T) => number)): T | undefined;
/**
 * Get maximum by property or function
 */
declare function maxBy<T>(arr: T[], selector: keyof T | ((item: T) => number)): T | undefined;
/**
 * Sort array by property or function
 */
declare function sortBy<T>(arr: T[], selector: keyof T | ((item: T) => any), order?: 'asc' | 'desc'): T[];
/**
 * Check if array is empty
 */
declare function isEmpty$1<T>(arr: T[]): boolean;
/**
 * Compact array (remove falsy values)
 */
declare function compact$1<T>(arr: T[]): NonNullable<T>[];
/**
 * Range of numbers
 */
declare function range(start: number, end?: number, step?: number): number[];
/**
 * Rotate array by n positions
 */
declare function rotate<T>(arr: T[], n: number): T[];
/**
 * Check if arrays are equal
 */
declare function isEqual$1<T>(arr1: T[], arr2: T[]): boolean;

/**
 * Array Utilities
 * Array manipulation and transformation
 */

declare const index$6_average: typeof average;
declare const index$6_chunk: typeof chunk;
declare const index$6_count: typeof count;
declare const index$6_countBy: typeof countBy;
declare const index$6_difference: typeof difference;
declare const index$6_drop: typeof drop;
declare const index$6_dropLast: typeof dropLast;
declare const index$6_dropWhile: typeof dropWhile;
declare const index$6_findIndex: typeof findIndex;
declare const index$6_findLastIndex: typeof findLastIndex;
declare const index$6_groupConsecutive: typeof groupConsecutive;
declare const index$6_intersection: typeof intersection;
declare const index$6_max: typeof max;
declare const index$6_maxBy: typeof maxBy;
declare const index$6_min: typeof min;
declare const index$6_minBy: typeof minBy;
declare const index$6_partition: typeof partition;
declare const index$6_range: typeof range;
declare const index$6_rotate: typeof rotate;
declare const index$6_sample: typeof sample;
declare const index$6_sampleSize: typeof sampleSize;
declare const index$6_shuffle: typeof shuffle;
declare const index$6_sortBy: typeof sortBy;
declare const index$6_sum: typeof sum;
declare const index$6_sumBy: typeof sumBy;
declare const index$6_take: typeof take;
declare const index$6_takeLast: typeof takeLast;
declare const index$6_takeWhile: typeof takeWhile;
declare const index$6_union: typeof union;
declare const index$6_unique: typeof unique;
declare const index$6_uniqueBy: typeof uniqueBy;
declare const index$6_unzip: typeof unzip;
declare const index$6_zip: typeof zip;
declare namespace index$6 {
  export {
    index$6_average as average,
    index$6_chunk as chunk,
    compact$1 as compact,
    index$6_count as count,
    index$6_countBy as countBy,
    index$6_difference as difference,
    index$6_drop as drop,
    index$6_dropLast as dropLast,
    index$6_dropWhile as dropWhile,
    index$6_findIndex as findIndex,
    index$6_findLastIndex as findLastIndex,
    flatten$1 as flatten,
    index$6_groupConsecutive as groupConsecutive,
    index$6_intersection as intersection,
    isEmpty$1 as isEmpty,
    isEqual$1 as isEqual,
    index$6_max as max,
    index$6_maxBy as maxBy,
    index$6_min as min,
    index$6_minBy as minBy,
    index$6_partition as partition,
    index$6_range as range,
    index$6_rotate as rotate,
    index$6_sample as sample,
    index$6_sampleSize as sampleSize,
    index$6_shuffle as shuffle,
    index$6_sortBy as sortBy,
    index$6_sum as sum,
    index$6_sumBy as sumBy,
    index$6_take as take,
    index$6_takeLast as takeLast,
    index$6_takeWhile as takeWhile,
    index$6_union as union,
    index$6_unique as unique,
    index$6_uniqueBy as uniqueBy,
    index$6_unzip as unzip,
    index$6_zip as zip,
  };
}

/**
 * Async Utilities
 * Asynchronous operation helpers
 */
/**
 * Sleep for specified milliseconds
 */
declare function sleep(ms: number): Promise<void>;
/**
 * Retry async function with exponential backoff
 */
declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
}): Promise<T>;
/**
 * Timeout a promise
 */
declare function timeout<T>(promise: Promise<T>, ms: number, errorMessage?: string): Promise<T>;
/**
 * Debounce async function
 */
declare function debounce<T extends (...args: any[]) => Promise<any>>(fn: T, delay: number): (...args: Parameters<T>) => Promise<ReturnType<T>>;
/**
 * Throttle async function
 */
declare function throttle<T extends (...args: any[]) => Promise<any>>(fn: T, delay: number): (...args: Parameters<T>) => Promise<ReturnType<T>>;
/**
 * Execute promises in parallel with concurrency limit
 */
declare function parallelLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]>;
/**
 * Execute promises in sequence
 */
declare function sequence<T>(tasks: (() => Promise<T>)[]): Promise<T[]>;
/**
 * Execute promises with all settled (no rejection)
 */
declare function allSettled<T>(promises: Promise<T>[]): Promise<Array<{
    status: 'fulfilled';
    value: T;
} | {
    status: 'rejected';
    reason: any;
}>>;
/**
 * Race promises with timeout
 */
declare function raceWithTimeout<T>(promises: Promise<T>[], ms: number): Promise<T>;
/**
 * Memoize async function
 */
declare function memoize<T extends (...args: any[]) => Promise<any>>(fn: T, options?: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
}): T;
/**
 * Create a deferred promise
 */
interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
}
declare function defer<T>(): Deferred<T>;
/**
 * Wait for condition to be true
 */
declare function waitFor(condition: () => boolean | Promise<boolean>, options?: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
}): Promise<void>;
/**
 * Execute function with mutex lock
 */
declare class Mutex {
    private locked;
    private queue;
    acquire(): Promise<void>;
    release(): void;
    runExclusive<T>(fn: () => Promise<T>): Promise<T>;
}
/**
 * Create a semaphore for limiting concurrent operations
 */
declare class Semaphore {
    private permits;
    private queue;
    constructor(permits: number);
    acquire(): Promise<void>;
    release(): void;
    runExclusive<T>(fn: () => Promise<T>): Promise<T>;
}
/**
 * Batch async operations
 */
declare function batch<T, R>(items: T[], batchSize: number, processor: (batch: T[]) => Promise<R[]>): Promise<R[]>;
/**
 * Poll for result
 */
declare function poll<T>(fn: () => Promise<T>, options?: {
    interval?: number;
    timeout?: number;
    validate?: (result: T) => boolean;
}): Promise<T>;

/**
 * Async Utilities
 * Asynchronous operation helpers
 */

type index$5_Deferred<T> = Deferred<T>;
type index$5_Mutex = Mutex;
declare const index$5_Mutex: typeof Mutex;
type index$5_Semaphore = Semaphore;
declare const index$5_Semaphore: typeof Semaphore;
declare const index$5_allSettled: typeof allSettled;
declare const index$5_batch: typeof batch;
declare const index$5_debounce: typeof debounce;
declare const index$5_defer: typeof defer;
declare const index$5_memoize: typeof memoize;
declare const index$5_parallelLimit: typeof parallelLimit;
declare const index$5_poll: typeof poll;
declare const index$5_raceWithTimeout: typeof raceWithTimeout;
declare const index$5_retry: typeof retry;
declare const index$5_sequence: typeof sequence;
declare const index$5_sleep: typeof sleep;
declare const index$5_throttle: typeof throttle;
declare const index$5_timeout: typeof timeout;
declare const index$5_waitFor: typeof waitFor;
declare namespace index$5 {
  export { index$5_Mutex as Mutex, index$5_Semaphore as Semaphore, index$5_allSettled as allSettled, index$5_batch as batch, index$5_debounce as debounce, index$5_defer as defer, index$5_memoize as memoize, index$5_parallelLimit as parallelLimit, index$5_poll as poll, index$5_raceWithTimeout as raceWithTimeout, index$5_retry as retry, index$5_sequence as sequence, index$5_sleep as sleep, index$5_throttle as throttle, index$5_timeout as timeout, index$5_waitFor as waitFor };
  export type { index$5_Deferred as Deferred };
}

/**
 * Command Execution Utilities
 * Provides utilities for executing shell commands
 */
interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    error?: string;
}
interface CommandOptions {
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
declare function executeCommand(command: string, args?: string[], options?: CommandOptions): Promise<CommandResult>;
/**
 * Execute a command with streaming output
 */
declare function executeCommandStream(command: string, args?: string[], options?: CommandOptions & {
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
}): Promise<CommandResult>;
/**
 * Build command string from command and arguments
 */
declare function buildCommand(command: string, args: string[]): string;
/**
 * Escape command argument
 */
declare function escapeArgument(arg: string): string;
/**
 * Check if a command exists in PATH
 */
declare function commandExists$1(command: string): Promise<boolean>;
/**
 * Get command path
 */
declare function getCommandPath(command: string): Promise<string | null>;
/**
 * Parse version from command output
 */
declare function parseVersion(output: string): string | null;
/**
 * Get command version
 */
declare function getCommandVersion(command: string, versionFlag?: string): Promise<string | null>;
/**
 * Execute multiple commands in sequence
 */
declare function executeCommandSequence(commands: Array<{
    command: string;
    args?: string[];
    options?: CommandOptions;
}>): Promise<CommandResult[]>;
/**
 * Execute multiple commands in parallel
 */
declare function executeCommandParallel(commands: Array<{
    command: string;
    args?: string[];
    options?: CommandOptions;
}>): Promise<CommandResult[]>;

/**
 * Command Utilities
 * Command execution and management
 */

type index$4_CommandOptions = CommandOptions;
type index$4_CommandResult = CommandResult;
declare const index$4_buildCommand: typeof buildCommand;
declare const index$4_escapeArgument: typeof escapeArgument;
declare const index$4_executeCommand: typeof executeCommand;
declare const index$4_executeCommandParallel: typeof executeCommandParallel;
declare const index$4_executeCommandSequence: typeof executeCommandSequence;
declare const index$4_executeCommandStream: typeof executeCommandStream;
declare const index$4_getCommandPath: typeof getCommandPath;
declare const index$4_getCommandVersion: typeof getCommandVersion;
declare const index$4_parseVersion: typeof parseVersion;
declare namespace index$4 {
  export { index$4_buildCommand as buildCommand, commandExists$1 as commandExists, index$4_escapeArgument as escapeArgument, index$4_executeCommand as executeCommand, index$4_executeCommandParallel as executeCommandParallel, index$4_executeCommandSequence as executeCommandSequence, index$4_executeCommandStream as executeCommandStream, index$4_getCommandPath as getCommandPath, index$4_getCommandVersion as getCommandVersion, index$4_parseVersion as parseVersion };
  export type { index$4_CommandOptions as CommandOptions, index$4_CommandResult as CommandResult };
}

declare const AI_OUTPUT_LANGUAGES: {
    readonly 'zh-CN': {
        readonly directive: "Always respond in Chinese-simplified";
    };
    readonly en: {
        readonly directive: "Always respond in English";
    };
    readonly custom: {
        readonly directive: "";
    };
};
type AiOutputLanguage = keyof typeof AI_OUTPUT_LANGUAGES;

/**
 * API configuration for Claude Code
 */
interface ApiConfig {
    url: string;
    key: string;
    authType?: 'auth_token' | 'api_key';
}

declare function ensureClaudeDir(): void;
declare function backupExistingConfig(): string | null;
declare function copyConfigFiles(onlyMd?: boolean): void;
declare function configureApi(apiConfig: ApiConfig | null): ApiConfig | null;
declare function mergeConfigs(sourceFile: string, targetFile: string): void;
/**
 * Update custom model configuration using environment variables
 * @param primaryModel - Primary model name for general tasks
 * @param haikuModel - Default Haiku model (optional)
 * @param sonnetModel - Default Sonnet model (optional)
 * @param opusModel - Default Opus model (optional)
 */
declare function updateCustomModel(primaryModel?: string, haikuModel?: string, sonnetModel?: string, opusModel?: string): void;
/**
 * Update the default model configuration in settings.json
 * @param model - The model type to set: opus, sonnet, sonnet[1m], default, or custom
 * Note: 'custom' model type is handled differently - it should use environment variables instead
 */
declare function updateDefaultModel(model: 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom'): void;
/**
 * Merge settings.json intelligently
 * Preserves user's environment variables and custom configurations
 */
declare function mergeSettingsFile(templatePath: string, targetPath: string): void;
/**
 * Get existing model configuration from settings.json
 */
declare function getExistingModelConfig(): 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom' | null;
/**
 * Get existing API configuration from settings.json
 */
declare function getExistingApiConfig(): ApiConfig | null;
declare function applyAiLanguageDirective(aiOutputLang: AiOutputLanguage | string): void;
/**
 * Switch to official login mode - remove all third-party API configurations
 * Removes: ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY from settings.json
 * Removes: primaryApiKey from ~/.claude/config.json
 */
declare function switchToOfficialLogin(): boolean;
/**
 * Prompt user for API configuration action when existing config is found
 * Returns the user's choice for how to handle existing configuration
 */
declare function promptApiConfigurationAction(): Promise<'modify-partial' | 'modify-all' | 'keep-existing' | null>;

type config_ApiConfig = ApiConfig;
declare const config_applyAiLanguageDirective: typeof applyAiLanguageDirective;
declare const config_backupExistingConfig: typeof backupExistingConfig;
declare const config_configureApi: typeof configureApi;
declare const config_copyConfigFiles: typeof copyConfigFiles;
declare const config_ensureClaudeDir: typeof ensureClaudeDir;
declare const config_getExistingApiConfig: typeof getExistingApiConfig;
declare const config_getExistingModelConfig: typeof getExistingModelConfig;
declare const config_mergeConfigs: typeof mergeConfigs;
declare const config_mergeSettingsFile: typeof mergeSettingsFile;
declare const config_promptApiConfigurationAction: typeof promptApiConfigurationAction;
declare const config_switchToOfficialLogin: typeof switchToOfficialLogin;
declare const config_updateCustomModel: typeof updateCustomModel;
declare const config_updateDefaultModel: typeof updateDefaultModel;
declare namespace config {
  export { config_applyAiLanguageDirective as applyAiLanguageDirective, config_backupExistingConfig as backupExistingConfig, config_configureApi as configureApi, config_copyConfigFiles as copyConfigFiles, config_ensureClaudeDir as ensureClaudeDir, config_getExistingApiConfig as getExistingApiConfig, config_getExistingModelConfig as getExistingModelConfig, config_mergeConfigs as mergeConfigs, config_mergeSettingsFile as mergeSettingsFile, config_promptApiConfigurationAction as promptApiConfigurationAction, config_switchToOfficialLogin as switchToOfficialLogin, config_updateCustomModel as updateCustomModel, config_updateDefaultModel as updateDefaultModel };
  export type { config_ApiConfig as ApiConfig };
}

/**
 * Configuration Manager
 * Provides utilities for loading, saving, and managing configuration files
 */
interface ConfigOptions {
    configDir?: string;
    fileName?: string;
    createIfMissing?: boolean;
    validate?: (config: any) => boolean;
}
/**
 * Configuration Manager class
 * Handles configuration file operations with validation and error handling
 */
declare class ConfigManager<T = any> {
    private readonly namespace;
    private configPath;
    private options;
    private cache?;
    constructor(namespace: string, options?: ConfigOptions);
    /**
     * Get the default configuration directory
     */
    private getDefaultConfigDir;
    /**
     * Load configuration from file
     */
    load(): Promise<T | null>;
    /**
     * Save configuration to file
     */
    save(config: T): Promise<void>;
    /**
     * Update configuration (merge with existing)
     */
    update(updates: Partial<T>): Promise<T>;
    /**
     * Delete configuration file
     */
    delete(): Promise<void>;
    /**
     * Check if configuration file exists
     */
    exists(): Promise<boolean>;
    /**
     * Get configuration path
     */
    getPath(): string;
    /**
     * Get cached configuration (without file I/O)
     */
    getCached(): T | undefined;
    /**
     * Clear cache
     */
    clearCache(): void;
}
/**
 * Create a configuration manager instance
 */
declare function createConfigManager<T = any>(namespace: string, options?: ConfigOptions): ConfigManager<T>;

/**
 * Configuration Validator
 * Provides utilities for validating configuration objects
 */
interface ValidationRule<T = any> {
    field: keyof T;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    validator?: (value: any) => boolean;
    message?: string;
}
interface ValidationError$1 {
    field: string;
    message: string;
}
interface ValidationResult$1 {
    valid: boolean;
    errors: ValidationError$1[];
}
/**
 * Configuration Validator class
 */
declare class ConfigValidator<T = any> {
    private rules;
    constructor(rules: ValidationRule<T>[]);
    /**
     * Validate a configuration object
     */
    validate(config: Partial<T>): ValidationResult$1;
    /**
     * Validate and throw on error
     */
    validateOrThrow(config: Partial<T>): void;
}
/**
 * Create a configuration validator
 */
declare function createValidator<T = any>(rules: ValidationRule<T>[]): ConfigValidator<T>;
/**
 * Common validation functions
 */
declare const validators: {
    /**
     * Validate string is not empty
     */
    notEmpty: (value: string) => boolean;
    /**
     * Validate string matches pattern
     */
    pattern: (regex: RegExp) => (value: string) => boolean;
    /**
     * Validate number is in range
     */
    range: (min: number, max: number) => (value: number) => boolean;
    /**
     * Validate string length
     */
    length: (min: number, max?: number) => (value: string) => boolean;
    /**
     * Validate value is one of allowed values
     */
    oneOf: <T>(allowed: T[]) => (value: T) => boolean;
    /**
     * Validate email format
     */
    email: (value: string) => boolean;
    /**
     * Validate URL format
     */
    url: (value: string) => boolean;
    /**
     * Validate object has required keys
     */
    hasKeys: (keys: string[]) => (value: any) => boolean;
    /**
     * Validate array is not empty
     */
    notEmptyArray: (value: any[]) => boolean;
};

/**
 * Error Utilities
 * Error handling and custom error classes
 */
/**
 * Base custom error class
 */
declare class BaseError extends Error {
    readonly code?: string | undefined;
    readonly statusCode?: number | undefined;
    readonly details?: any | undefined;
    constructor(message: string, code?: string | undefined, statusCode?: number | undefined, details?: any | undefined);
    toJSON(): {
        name: string;
        message: string;
        code: string | undefined;
        statusCode: number | undefined;
        details: any;
        stack: string | undefined;
    };
}
/**
 * Validation error
 */
declare class ValidationError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Not found error
 */
declare class NotFoundError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Unauthorized error
 */
declare class UnauthorizedError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Forbidden error
 */
declare class ForbiddenError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Conflict error
 */
declare class ConflictError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Timeout error
 */
declare class TimeoutError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Internal error
 */
declare class InternalError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Configuration error
 */
declare class ConfigurationError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Network error
 */
declare class NetworkError extends BaseError {
    constructor(message: string, details?: any);
}
/**
 * Check if error is of specific type
 */
declare function isErrorType<T extends Error>(error: unknown, errorClass: new (...args: any[]) => T): error is T;
/**
 * Get error message safely
 */
declare function getErrorMessage(error: unknown): string;
/**
 * Get error stack safely
 */
declare function getErrorStack(error: unknown): string | undefined;
/**
 * Format error for logging
 */
declare function formatError(error: unknown): {
    message: string;
    name?: string;
    code?: string;
    statusCode?: number;
    stack?: string;
    details?: any;
};
/**
 * Wrap error with additional context
 */
declare function wrapError(error: unknown, message: string, code?: string): BaseError;
/**
 * Try-catch wrapper that returns result or error
 */
declare function tryCatch<T>(fn: () => T): {
    success: true;
    data: T;
} | {
    success: false;
    error: Error;
};
/**
 * Async try-catch wrapper
 */
declare function tryCatchAsync<T>(fn: () => Promise<T>): Promise<{
    success: true;
    data: T;
} | {
    success: false;
    error: Error;
}>;
/**
 * Assert condition or throw error
 */
declare function assert$1(condition: boolean, message: string, ErrorClass?: new (message: string) => Error): asserts condition;
/**
 * Create error handler
 */
declare function createErrorHandler(handlers: Record<string, (error: Error) => void>, defaultHandler?: (error: Error) => void): (error: unknown) => void;
/**
 * Aggregate multiple errors
 */
declare class AggregateError extends BaseError {
    readonly errors: Error[];
    constructor(errors: Error[], message?: string);
    static fromErrors(errors: Error[]): AggregateError;
}
/**
 * Retry with error handling
 */
declare function retryWithErrorHandling<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    delay?: number;
    shouldRetry?: (error: Error) => boolean;
    onError?: (error: Error, attempt: number) => void;
}): Promise<T>;

/**
 * Error Utilities
 * Error handling and custom error classes
 */

type index$3_AggregateError = AggregateError;
declare const index$3_AggregateError: typeof AggregateError;
type index$3_BaseError = BaseError;
declare const index$3_BaseError: typeof BaseError;
type index$3_ConfigurationError = ConfigurationError;
declare const index$3_ConfigurationError: typeof ConfigurationError;
type index$3_ConflictError = ConflictError;
declare const index$3_ConflictError: typeof ConflictError;
type index$3_ForbiddenError = ForbiddenError;
declare const index$3_ForbiddenError: typeof ForbiddenError;
type index$3_InternalError = InternalError;
declare const index$3_InternalError: typeof InternalError;
type index$3_NetworkError = NetworkError;
declare const index$3_NetworkError: typeof NetworkError;
type index$3_NotFoundError = NotFoundError;
declare const index$3_NotFoundError: typeof NotFoundError;
type index$3_TimeoutError = TimeoutError;
declare const index$3_TimeoutError: typeof TimeoutError;
type index$3_UnauthorizedError = UnauthorizedError;
declare const index$3_UnauthorizedError: typeof UnauthorizedError;
type index$3_ValidationError = ValidationError;
declare const index$3_ValidationError: typeof ValidationError;
declare const index$3_createErrorHandler: typeof createErrorHandler;
declare const index$3_formatError: typeof formatError;
declare const index$3_getErrorMessage: typeof getErrorMessage;
declare const index$3_getErrorStack: typeof getErrorStack;
declare const index$3_isErrorType: typeof isErrorType;
declare const index$3_retryWithErrorHandling: typeof retryWithErrorHandling;
declare const index$3_tryCatch: typeof tryCatch;
declare const index$3_tryCatchAsync: typeof tryCatchAsync;
declare const index$3_wrapError: typeof wrapError;
declare namespace index$3 {
  export {
    index$3_AggregateError as AggregateError,
    index$3_BaseError as BaseError,
    index$3_ConfigurationError as ConfigurationError,
    index$3_ConflictError as ConflictError,
    index$3_ForbiddenError as ForbiddenError,
    index$3_InternalError as InternalError,
    index$3_NetworkError as NetworkError,
    index$3_NotFoundError as NotFoundError,
    index$3_TimeoutError as TimeoutError,
    index$3_UnauthorizedError as UnauthorizedError,
    index$3_ValidationError as ValidationError,
    assert$1 as assert,
    index$3_createErrorHandler as createErrorHandler,
    index$3_formatError as formatError,
    index$3_getErrorMessage as getErrorMessage,
    index$3_getErrorStack as getErrorStack,
    index$3_isErrorType as isErrorType,
    index$3_retryWithErrorHandling as retryWithErrorHandling,
    index$3_tryCatch as tryCatch,
    index$3_tryCatchAsync as tryCatchAsync,
    index$3_wrapError as wrapError,
  };
}

/**
 * File System Utilities
 * Provides utilities for file system operations
 */
/**
 * Check if a file or directory exists
 */
declare function exists(filePath: string): Promise<boolean>;
/**
 * Check if path is a file
 */
declare function isFile(filePath: string): Promise<boolean>;
/**
 * Check if path is a directory
 */
declare function isDirectory(filePath: string): Promise<boolean>;
/**
 * Create directory recursively
 */
declare function ensureDir(dirPath: string): Promise<void>;
/**
 * Read file as string
 */
declare function readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;
/**
 * Write file with content
 */
declare function writeFile(filePath: string, content: string, encoding?: BufferEncoding): Promise<void>;
/**
 * Append content to file
 */
declare function appendFile(filePath: string, content: string, encoding?: BufferEncoding): Promise<void>;
/**
 * Read JSON file
 */
declare function readJSON<T = any>(filePath: string): Promise<T>;
/**
 * Write JSON file
 */
declare function writeJSON(filePath: string, data: any, pretty?: boolean): Promise<void>;
/**
 * Copy file
 */
declare function copyFile(src: string, dest: string): Promise<void>;
/**
 * Move/rename file
 */
declare function moveFile(src: string, dest: string): Promise<void>;
/**
 * Delete file
 */
declare function deleteFile(filePath: string): Promise<void>;
/**
 * Delete directory recursively
 */
declare function deleteDir(dirPath: string): Promise<void>;
/**
 * List files in directory
 */
declare function listFiles(dirPath: string, recursive?: boolean): Promise<string[]>;
/**
 * List directories in directory
 */
declare function listDirs(dirPath: string): Promise<string[]>;
/**
 * Get file size in bytes
 */
declare function getFileSize$1(filePath: string): Promise<number>;
/**
 * Get file modification time
 */
declare function getModifiedTime(filePath: string): Promise<Date>;
/**
 * Get file creation time
 */
declare function getCreatedTime(filePath: string): Promise<Date>;
/**
 * Check if file is readable
 */
declare function isReadable(filePath: string): Promise<boolean>;
/**
 * Check if file is writable
 */
declare function isWritable(filePath: string): Promise<boolean>;
/**
 * Check if file is executable
 */
declare function isExecutable(filePath: string): Promise<boolean>;
/**
 * Find files matching pattern
 */
declare function findFiles(dirPath: string, pattern: RegExp | string, recursive?: boolean): Promise<string[]>;
/**
 * Get directory size (total size of all files)
 */
declare function getDirSize(dirPath: string): Promise<number>;
/**
 * Copy directory recursively
 */
declare function copyDir(src: string, dest: string): Promise<void>;
/**
 * Empty directory (delete all contents but keep directory)
 */
declare function emptyDir(dirPath: string): Promise<void>;

/**
 * File System Utilities
 * File and directory operations
 */

declare const index$2_appendFile: typeof appendFile;
declare const index$2_copyDir: typeof copyDir;
declare const index$2_copyFile: typeof copyFile;
declare const index$2_deleteDir: typeof deleteDir;
declare const index$2_deleteFile: typeof deleteFile;
declare const index$2_emptyDir: typeof emptyDir;
declare const index$2_ensureDir: typeof ensureDir;
declare const index$2_exists: typeof exists;
declare const index$2_findFiles: typeof findFiles;
declare const index$2_getCreatedTime: typeof getCreatedTime;
declare const index$2_getDirSize: typeof getDirSize;
declare const index$2_getModifiedTime: typeof getModifiedTime;
declare const index$2_isDirectory: typeof isDirectory;
declare const index$2_isExecutable: typeof isExecutable;
declare const index$2_isFile: typeof isFile;
declare const index$2_isReadable: typeof isReadable;
declare const index$2_isWritable: typeof isWritable;
declare const index$2_listDirs: typeof listDirs;
declare const index$2_listFiles: typeof listFiles;
declare const index$2_moveFile: typeof moveFile;
declare const index$2_readFile: typeof readFile;
declare const index$2_readJSON: typeof readJSON;
declare const index$2_writeFile: typeof writeFile;
declare const index$2_writeJSON: typeof writeJSON;
declare namespace index$2 {
  export {
    index$2_appendFile as appendFile,
    index$2_copyDir as copyDir,
    index$2_copyFile as copyFile,
    index$2_deleteDir as deleteDir,
    index$2_deleteFile as deleteFile,
    index$2_emptyDir as emptyDir,
    index$2_ensureDir as ensureDir,
    index$2_exists as exists,
    index$2_findFiles as findFiles,
    index$2_getCreatedTime as getCreatedTime,
    index$2_getDirSize as getDirSize,
    getFileSize$1 as getFileSize,
    index$2_getModifiedTime as getModifiedTime,
    index$2_isDirectory as isDirectory,
    index$2_isExecutable as isExecutable,
    index$2_isFile as isFile,
    index$2_isReadable as isReadable,
    index$2_isWritable as isWritable,
    index$2_listDirs as listDirs,
    index$2_listFiles as listFiles,
    index$2_moveFile as moveFile,
    index$2_readFile as readFile,
    index$2_readJSON as readJSON,
    index$2_writeFile as writeFile,
    index$2_writeJSON as writeJSON,
  };
}

/**
 * CCJK Logger - MUD Style
 *
 * Structured logging with terminal green aesthetics
 */
type LogLevel$1 = 'debug' | 'info' | 'warn' | 'error';
interface LoggerOptions$1 {
    level?: LogLevel$1;
    silent?: boolean;
}
declare class Logger$1 {
    private level;
    private silent;
    private levels;
    constructor(options?: LoggerOptions$1);
    private shouldLog;
    private format;
    /** MUD-style color scheme for log levels */
    private colorize;
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
    setLevel(level: LogLevel$1): void;
    setSilent(silent: boolean): void;
}
declare const logger$1: Logger$1;

declare namespace logger$2 {
  export { Logger$1 as Logger, logger$1 as logger };
  export type { LogLevel$1 as LogLevel, LoggerOptions$1 as LoggerOptions };
}

/**
 * Logger Utilities
 * Simple logging utilities
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LoggerOptions {
    level?: LogLevel;
    prefix?: string;
    timestamp?: boolean;
    colors?: boolean;
}
/**
 * Simple logger class
 */
declare class Logger {
    private level;
    private prefix;
    private timestamp;
    private colors;
    constructor(options?: LoggerOptions);
    private shouldLog;
    private formatMessage;
    private stringify;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
}
/**
 * Create a logger instance
 */
declare function createLogger(options?: LoggerOptions): Logger;
/**
 * Default logger instance
 */
declare const logger: Logger;

/**
 * Object Utilities
 * Object manipulation and transformation functions
 */
/**
 * Deep clone an object
 */
declare function deepClone<T>(obj: T): T;
/**
 * Deep merge two objects
 */
declare function deepMerge<T extends object>(target: T, source: Partial<T>): T;
/**
 * Get nested property value using dot notation
 */
declare function get<T = any>(obj: any, path: string, defaultValue?: T): T | undefined;
/**
 * Set nested property value using dot notation
 */
declare function set(obj: any, path: string, value: any): void;
/**
 * Check if object has nested property using dot notation
 */
declare function has(obj: any, path: string): boolean;
/**
 * Delete nested property using dot notation
 */
declare function unset(obj: any, path: string): boolean;
/**
 * Get all keys from object (including nested)
 */
declare function keys(obj: any, prefix?: string): string[];
/**
 * Get all values from object
 */
declare function values<T = any>(obj: Record<string, T>): T[];
/**
 * Get all entries from object
 */
declare function entries<T = any>(obj: Record<string, T>): [string, T][];
/**
 * Pick specific keys from object
 */
declare function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
/**
 * Omit specific keys from object
 */
declare function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
/**
 * Filter object by predicate
 */
declare function filter<T>(obj: Record<string, T>, predicate: (value: T, key: string) => boolean): Record<string, T>;
/**
 * Map object values
 */
declare function map<T, U>(obj: Record<string, T>, mapper: (value: T, key: string) => U): Record<string, U>;
/**
 * Check if object is empty
 */
declare function isEmpty(obj: object): boolean;
/**
 * Flatten nested object
 */
declare function flatten(obj: any, prefix?: string, separator?: string): Record<string, any>;
/**
 * Unflatten object (reverse of flatten)
 */
declare function unflatten(obj: Record<string, any>, separator?: string): any;
/**
 * Invert object (swap keys and values)
 */
declare function invert<T extends string | number>(obj: Record<string, T>): Record<T, string>;
/**
 * Group array of objects by key
 */
declare function groupBy<T>(arr: T[], key: keyof T | ((item: T) => string)): Record<string, T[]>;
/**
 * Convert array to object using key selector
 */
declare function keyBy<T>(arr: T[], key: keyof T | ((item: T) => string)): Record<string, T>;
/**
 * Check if two objects are deeply equal
 */
declare function isEqual(obj1: any, obj2: any): boolean;
/**
 * Remove null and undefined values from object
 */
declare function compact<T extends object>(obj: T): Partial<T>;
/**
 * Freeze object deeply (immutable)
 */
declare function deepFreeze<T>(obj: T): Readonly<T>;
/**
 * Merge multiple objects
 */
declare function merge<T extends object>(...objects: Partial<T>[]): T;
/**
 * Get object size (number of keys)
 */
declare function size(obj: object): number;

/**
 * Object Utilities
 * Object manipulation and transformation
 */

declare const index$1_compact: typeof compact;
declare const index$1_deepClone: typeof deepClone;
declare const index$1_deepFreeze: typeof deepFreeze;
declare const index$1_deepMerge: typeof deepMerge;
declare const index$1_entries: typeof entries;
declare const index$1_filter: typeof filter;
declare const index$1_flatten: typeof flatten;
declare const index$1_get: typeof get;
declare const index$1_groupBy: typeof groupBy;
declare const index$1_has: typeof has;
declare const index$1_invert: typeof invert;
declare const index$1_isEmpty: typeof isEmpty;
declare const index$1_isEqual: typeof isEqual;
declare const index$1_keyBy: typeof keyBy;
declare const index$1_keys: typeof keys;
declare const index$1_map: typeof map;
declare const index$1_merge: typeof merge;
declare const index$1_omit: typeof omit;
declare const index$1_pick: typeof pick;
declare const index$1_set: typeof set;
declare const index$1_size: typeof size;
declare const index$1_unflatten: typeof unflatten;
declare const index$1_unset: typeof unset;
declare const index$1_values: typeof values;
declare namespace index$1 {
  export {
    index$1_compact as compact,
    index$1_deepClone as deepClone,
    index$1_deepFreeze as deepFreeze,
    index$1_deepMerge as deepMerge,
    index$1_entries as entries,
    index$1_filter as filter,
    index$1_flatten as flatten,
    index$1_get as get,
    index$1_groupBy as groupBy,
    index$1_has as has,
    index$1_invert as invert,
    index$1_isEmpty as isEmpty,
    index$1_isEqual as isEqual,
    index$1_keyBy as keyBy,
    index$1_keys as keys,
    index$1_map as map,
    index$1_merge as merge,
    index$1_omit as omit,
    index$1_pick as pick,
    index$1_set as set,
    index$1_size as size,
    index$1_unflatten as unflatten,
    index$1_unset as unset,
    index$1_values as values,
  };
}

declare function getPlatform$1(): 'windows' | 'macos' | 'linux';
declare function isTermux(): boolean;
declare function getTermuxPrefix(): string;
declare function isWindows$1(): boolean;
interface WSLInfo {
    isWSL: true;
    distro: string | null;
    version: string | null;
}
declare function isWSL(): boolean;
declare function getWSLDistro(): string | null;
declare function getWSLInfo(): WSLInfo | null;
/**
 * Get MCP command with platform-specific wrapper if needed
 * @param command - The base command to execute (default: 'npx')
 * @returns Command array with Windows wrapper if applicable
 */
declare function getMcpCommand(command?: string): string[];
/**
 * Normalize Windows paths by converting backslashes to forward slashes
 * This ensures Windows paths like "C:\Program Files\nodejs\npx.cmd" are correctly
 * written as "C:/Program Files/nodejs/npx.cmd" in TOML format, avoiding escape issues
 * Unified function used by getSystemRoot() and normalizePath() to avoid code duplication
 * @param str - The string to normalize (typically a Windows path)
 * @returns The normalized string with backslashes replaced by forward slashes
 */
declare function normalizeTomlPath(str: string): string;
declare function getSystemRoot(): string | null;
declare function shouldUseSudoForGlobalInstall(): boolean;
declare function wrapCommandWithSudo(command: string, args: string[]): {
    command: string;
    args: string[];
    usedSudo: boolean;
};
declare function commandExists(command: string): Promise<boolean>;
/**
 * Get possible Homebrew paths for a command on macOS
 * Handles both Apple Silicon (/opt/homebrew) and Intel (/usr/local) installations
 * Also checks npm global paths within Homebrew's node installation
 * and Homebrew cask installations in Caskroom
 */
declare function getHomebrewCommandPaths(command: string): Promise<string[]>;
/**
 * Find the actual path of a command, checking standard PATH and Homebrew locations
 * Returns null if command is not found
 */
declare function findCommandPath(command: string): Promise<string | null>;
/**
 * Find the real binary path of a command, bypassing shell functions/aliases
 * This is useful when a shell function wraps a command and we need the actual binary
 * Returns null if command is not found
 */
declare function findRealCommandPath(command: string): Promise<string | null>;
/**
 * Get recommended install methods for a code tool based on current platform
 * Returns methods in priority order (most recommended first)
 */
type CodeType = 'claude-code' | 'codex';
type InstallMethod = 'npm' | 'homebrew' | 'curl' | 'powershell' | 'cmd' | 'npm-global' | 'native';
declare function getRecommendedInstallMethods(codeType: CodeType): InstallMethod[];

type platform_CodeType = CodeType;
type platform_InstallMethod = InstallMethod;
type platform_WSLInfo = WSLInfo;
declare const platform_commandExists: typeof commandExists;
declare const platform_findCommandPath: typeof findCommandPath;
declare const platform_findRealCommandPath: typeof findRealCommandPath;
declare const platform_getHomebrewCommandPaths: typeof getHomebrewCommandPaths;
declare const platform_getMcpCommand: typeof getMcpCommand;
declare const platform_getRecommendedInstallMethods: typeof getRecommendedInstallMethods;
declare const platform_getSystemRoot: typeof getSystemRoot;
declare const platform_getTermuxPrefix: typeof getTermuxPrefix;
declare const platform_getWSLDistro: typeof getWSLDistro;
declare const platform_getWSLInfo: typeof getWSLInfo;
declare const platform_isTermux: typeof isTermux;
declare const platform_isWSL: typeof isWSL;
declare const platform_normalizeTomlPath: typeof normalizeTomlPath;
declare const platform_shouldUseSudoForGlobalInstall: typeof shouldUseSudoForGlobalInstall;
declare const platform_wrapCommandWithSudo: typeof wrapCommandWithSudo;
declare namespace platform {
  export { platform_commandExists as commandExists, platform_findCommandPath as findCommandPath, platform_findRealCommandPath as findRealCommandPath, platform_getHomebrewCommandPaths as getHomebrewCommandPaths, platform_getMcpCommand as getMcpCommand, getPlatform$1 as getPlatform, platform_getRecommendedInstallMethods as getRecommendedInstallMethods, platform_getSystemRoot as getSystemRoot, platform_getTermuxPrefix as getTermuxPrefix, platform_getWSLDistro as getWSLDistro, platform_getWSLInfo as getWSLInfo, platform_isTermux as isTermux, platform_isWSL as isWSL, isWindows$1 as isWindows, platform_normalizeTomlPath as normalizeTomlPath, platform_shouldUseSudoForGlobalInstall as shouldUseSudoForGlobalInstall, platform_wrapCommandWithSudo as wrapCommandWithSudo };
  export type { platform_CodeType as CodeType, platform_InstallMethod as InstallMethod, platform_WSLInfo as WSLInfo };
}

/**
 * Platform Detection Utilities
 * Provides utilities for detecting and working with different platforms
 */
type Platform = 'darwin' | 'linux' | 'win32' | 'unknown';
type Architecture = 'x64' | 'arm64' | 'ia32' | 'unknown';
/**
 * Get current platform
 */
declare function getPlatform(): Platform;
/**
 * Get current architecture
 */
declare function getArchitecture(): Architecture;
/**
 * Check if running on macOS
 */
declare function isMacOS(): boolean;
/**
 * Check if running on Linux
 */
declare function isLinux(): boolean;
/**
 * Check if running on Windows
 */
declare function isWindows(): boolean;
/**
 * Check if running on Unix-like system (macOS or Linux)
 */
declare function isUnix(): boolean;
/**
 * Get platform-specific information
 */
interface PlatformInfo {
    platform: Platform;
    architecture: Architecture;
    release: string;
    hostname: string;
    homedir: string;
    tmpdir: string;
    cpus: number;
    totalMemory: number;
    freeMemory: number;
}
/**
 * Get comprehensive platform information
 */
declare function getPlatformInfo(): PlatformInfo;

/**
 * Platform Path Utilities
 * Provides utilities for working with platform-specific paths
 */

/**
 * Get user's home directory
 */
declare function getHomeDir(): string;
/**
 * Get user's config directory
 */
declare function getConfigDir(appName?: string): string;
/**
 * Get user's data directory
 */
declare function getDataDir(appName?: string): string;
/**
 * Get user's cache directory
 */
declare function getCacheDir(appName?: string): string;
/**
 * Get user's temporary directory
 */
declare function getTempDir(appName?: string): string;

/**
 * Stream Processor - Handle large files efficiently
 *
 * Provides utilities for:
 * - Streaming large JSON files
 * - Processing large files in chunks
 * - Memory-efficient file operations
 */
/**
 * Chunk processing options
 */
interface ChunkProcessorOptions {
    chunkSize?: number;
    encoding?: BufferEncoding;
    paused?: boolean;
}
/**
 * Stream processor options
 */
interface StreamProcessorOptions extends ChunkProcessorOptions {
    objectMode?: boolean;
    destroy?: boolean;
}
/**
 * Process a large file in chunks
 */
declare function processLargeFile(filePath: string, processor: (chunk: Buffer, index: number) => void | Promise<void>, options?: ChunkProcessorOptions): Promise<void>;
/**
 * Stream read a JSON file efficiently
 */
declare function streamJSON<T = any>(filePath: string, options?: StreamProcessorOptions): Promise<T | null>;
/**
 * Stream write a JSON file efficiently
 */
declare function streamWriteJSON<T>(filePath: string, data: T, options?: StreamProcessorOptions): Promise<void>;
/**
 * Process file line by line
 */
declare function processLineByLine(filePath: string, processor: (line: string, index: number) => void | Promise<void>): Promise<void>;
/**
 * File size utility
 */
declare function getFileSize(filePath: string): Promise<number>;
/**
 * Count lines in a file efficiently
 */
declare function countLines(filePath: string): Promise<number>;
/**
 * Batch process multiple files
 */
declare function batchProcessFiles<T = any>(filePaths: string[], processor: (file: string) => Promise<T>, concurrency?: number): Promise<Map<string, T>>;
/**
 * Check if file is large (above threshold)
 */
declare function isLargeFile(filePath: string, threshold?: number): Promise<boolean>;
/**
 * Get file info efficiently
 */
interface FileInfo {
    path: string;
    size: number;
    lines: number;
    isLarge: boolean;
    encoding: BufferEncoding | null;
}
declare function getFileInfo(filePath: string, options?: StreamProcessorOptions): Promise<FileInfo>;

/**
 * String Utilities
 * String manipulation and formatting functions
 */
/**
 * Capitalize first letter of string
 */
declare function capitalize(str: string): string;
/**
 * Convert string to camelCase
 */
declare function camelCase(str: string): string;
/**
 * Convert string to PascalCase
 */
declare function pascalCase(str: string): string;
/**
 * Convert string to snake_case
 */
declare function snakeCase(str: string): string;
/**
 * Convert string to kebab-case
 */
declare function kebabCase(str: string): string;
/**
 * Convert string to CONSTANT_CASE
 */
declare function constantCase(str: string): string;
/**
 * Truncate string to specified length
 */
declare function truncate(str: string, length: number, suffix?: string): string;
/**
 * Pad string to specified length
 */
declare function pad(str: string, length: number, char?: string, direction?: 'left' | 'right' | 'both'): string;
/**
 * Remove whitespace from both ends
 */
declare function trim(str: string): string;
/**
 * Remove whitespace from start
 */
declare function trimStart(str: string): string;
/**
 * Remove whitespace from end
 */
declare function trimEnd(str: string): string;
/**
 * Split string by delimiter
 */
declare function split(str: string, delimiter: string | RegExp): string[];
/**
 * Join array of strings
 */
declare function join(arr: string[], separator?: string): string;
/**
 * Replace all occurrences of search with replacement
 */
declare function replaceAll(str: string, search: string | RegExp, replacement: string): string;
/**
 * Check if string starts with prefix
 */
declare function startsWith(str: string, prefix: string): boolean;
/**
 * Check if string ends with suffix
 */
declare function endsWith(str: string, suffix: string): boolean;
/**
 * Check if string contains substring
 */
declare function contains(str: string, substring: string): boolean;
/**
 * Count occurrences of substring
 */
declare function countOccurrences(str: string, substring: string): number;
/**
 * Reverse string
 */
declare function reverse(str: string): string;
/**
 * Remove all whitespace
 */
declare function removeWhitespace(str: string): string;
/**
 * Normalize whitespace (replace multiple spaces with single space)
 */
declare function normalizeWhitespace(str: string): string;
/**
 * Extract words from string
 */
declare function words(str: string): string[];
/**
 * Count words in string
 */
declare function wordCount(str: string): number;
/**
 * Convert string to title case
 */
declare function titleCase(str: string): string;
/**
 * Convert string to sentence case
 */
declare function sentenceCase(str: string): string;
/**
 * Escape HTML special characters
 */
declare function escapeHTML(str: string): string;
/**
 * Unescape HTML special characters
 */
declare function unescapeHTML(str: string): string;
/**
 * Escape regular expression special characters
 */
declare function escapeRegExp(str: string): string;
/**
 * Generate random string
 */
declare function randomString(length: number, charset?: string): string;
/**
 * Generate UUID v4
 */
declare function uuid(): string;
/**
 * Slugify string (URL-friendly)
 */
declare function slugify(str: string): string;
/**
 * Extract numbers from string
 */
declare function extractNumbers(str: string): number[];
/**
 * Format template string with values
 */
declare function template(str: string, values: Record<string, any>): string;
/**
 * Repeat string n times
 */
declare function repeat(str: string, count: number): string;
/**
 * Check if string is empty or only whitespace
 */
declare function isBlank(str: string): boolean;
/**
 * Ensure string ends with suffix
 */
declare function ensureSuffix(str: string, suffix: string): string;
/**
 * Ensure string starts with prefix
 */
declare function ensurePrefix(str: string, prefix: string): string;
/**
 * Remove prefix from string
 */
declare function removePrefix(str: string, prefix: string): string;
/**
 * Remove suffix from string
 */
declare function removeSuffix(str: string, suffix: string): string;

/**
 * String Utilities
 * String manipulation and formatting
 */

declare const index_camelCase: typeof camelCase;
declare const index_capitalize: typeof capitalize;
declare const index_constantCase: typeof constantCase;
declare const index_contains: typeof contains;
declare const index_countOccurrences: typeof countOccurrences;
declare const index_endsWith: typeof endsWith;
declare const index_ensurePrefix: typeof ensurePrefix;
declare const index_ensureSuffix: typeof ensureSuffix;
declare const index_escapeHTML: typeof escapeHTML;
declare const index_escapeRegExp: typeof escapeRegExp;
declare const index_extractNumbers: typeof extractNumbers;
declare const index_isBlank: typeof isBlank;
declare const index_join: typeof join;
declare const index_kebabCase: typeof kebabCase;
declare const index_normalizeWhitespace: typeof normalizeWhitespace;
declare const index_pad: typeof pad;
declare const index_pascalCase: typeof pascalCase;
declare const index_randomString: typeof randomString;
declare const index_removePrefix: typeof removePrefix;
declare const index_removeSuffix: typeof removeSuffix;
declare const index_removeWhitespace: typeof removeWhitespace;
declare const index_repeat: typeof repeat;
declare const index_replaceAll: typeof replaceAll;
declare const index_reverse: typeof reverse;
declare const index_sentenceCase: typeof sentenceCase;
declare const index_slugify: typeof slugify;
declare const index_snakeCase: typeof snakeCase;
declare const index_split: typeof split;
declare const index_startsWith: typeof startsWith;
declare const index_template: typeof template;
declare const index_titleCase: typeof titleCase;
declare const index_trim: typeof trim;
declare const index_trimEnd: typeof trimEnd;
declare const index_trimStart: typeof trimStart;
declare const index_truncate: typeof truncate;
declare const index_unescapeHTML: typeof unescapeHTML;
declare const index_uuid: typeof uuid;
declare const index_wordCount: typeof wordCount;
declare const index_words: typeof words;
declare namespace index {
  export {
    index_camelCase as camelCase,
    index_capitalize as capitalize,
    index_constantCase as constantCase,
    index_contains as contains,
    index_countOccurrences as countOccurrences,
    index_endsWith as endsWith,
    index_ensurePrefix as ensurePrefix,
    index_ensureSuffix as ensureSuffix,
    index_escapeHTML as escapeHTML,
    index_escapeRegExp as escapeRegExp,
    index_extractNumbers as extractNumbers,
    index_isBlank as isBlank,
    index_join as join,
    index_kebabCase as kebabCase,
    index_normalizeWhitespace as normalizeWhitespace,
    index_pad as pad,
    index_pascalCase as pascalCase,
    index_randomString as randomString,
    index_removePrefix as removePrefix,
    index_removeSuffix as removeSuffix,
    index_removeWhitespace as removeWhitespace,
    index_repeat as repeat,
    index_replaceAll as replaceAll,
    index_reverse as reverse,
    index_sentenceCase as sentenceCase,
    index_slugify as slugify,
    index_snakeCase as snakeCase,
    index_split as split,
    index_startsWith as startsWith,
    index_template as template,
    index_titleCase as titleCase,
    index_trim as trim,
    index_trimEnd as trimEnd,
    index_trimStart as trimStart,
    index_truncate as truncate,
    index_unescapeHTML as unescapeHTML,
    index_uuid as uuid,
    index_wordCount as wordCount,
    index_words as words,
  };
}

/**
 * Unified Input Validation Library
 * Provides reusable validation functions for common input types
 */
/**
 * Validation result interface
 */
interface ValidationResult {
    valid: boolean;
    error?: string;
}
/**
 * Validate array access safety
 */
declare function validateArrayAccess<T>(array: T[] | null | undefined, index: number): ValidationResult;
/**
 * Safely access array element
 */
declare function safeArrayAccess<T>(array: T[] | null | undefined, index: number, defaultValue?: T): T | undefined;
/**
 * Validate object key access
 */
declare function validateObjectKeyAccess<T extends Record<string, unknown>>(obj: T | null | undefined, key: string): ValidationResult;
/**
 * Safely access object property
 */
declare function safeObjectAccess<T extends Record<string, unknown>, K extends keyof T>(obj: T | null | undefined, key: K, defaultValue?: T[K]): T[K] | undefined;
/**
 * Validate environment variable name
 */
declare function isValidEnvVarName(name: string): ValidationResult;
/**
 * Sanitize environment variable value
 */
declare function sanitizeEnvValue(value: string): string;
/**
 * Validate URL format
 */
declare function isValidUrl(url: string): ValidationResult;
/**
 * Validate file path safety (no directory traversal)
 */
declare function isValidFilePath(path: string): ValidationResult;
/**
 * Validate path entry (filename or directory name)
 */
declare function isValidPathEntry(entry: string): ValidationResult;
/**
 * Validate user input string
 */
declare function validateUserInput(input: string, options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedChars?: string;
}): ValidationResult;
/**
 * Sanitize user input
 */
declare function sanitizeUserInput(input: string, maxLength?: number): string;
/**
 * Validate API key format
 */
declare function isValidApiKey(apiKey: string): ValidationResult;
/**
 * Format API key for display (mask sensitive parts)
 */
declare function formatApiKeyDisplay(apiKey: string | null | undefined): string;
/**
 * Validate configuration object structure
 */
declare function validateConfigStructure(config: unknown, schema: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>): ValidationResult;
/**
 * Validate array of items
 */
declare function validateArray(array: unknown, validator: (item: unknown) => ValidationResult): ValidationResult;
/**
 * Validate enum value
 */
declare function isValidEnumValue<T extends string | number>(value: unknown, allowedValues: T[]): ValidationResult;
/**
 * Validate port number
 */
declare function isValidPort(port: unknown): ValidationResult;
/**
 * Validate hostname
 */
declare function isValidHostname(hostname: string): ValidationResult;

type validation_ValidationResult = ValidationResult;
declare const validation_formatApiKeyDisplay: typeof formatApiKeyDisplay;
declare const validation_isValidApiKey: typeof isValidApiKey;
declare const validation_isValidEnumValue: typeof isValidEnumValue;
declare const validation_isValidEnvVarName: typeof isValidEnvVarName;
declare const validation_isValidFilePath: typeof isValidFilePath;
declare const validation_isValidHostname: typeof isValidHostname;
declare const validation_isValidPathEntry: typeof isValidPathEntry;
declare const validation_isValidPort: typeof isValidPort;
declare const validation_isValidUrl: typeof isValidUrl;
declare const validation_safeArrayAccess: typeof safeArrayAccess;
declare const validation_safeObjectAccess: typeof safeObjectAccess;
declare const validation_sanitizeEnvValue: typeof sanitizeEnvValue;
declare const validation_sanitizeUserInput: typeof sanitizeUserInput;
declare const validation_validateArray: typeof validateArray;
declare const validation_validateArrayAccess: typeof validateArrayAccess;
declare const validation_validateConfigStructure: typeof validateConfigStructure;
declare const validation_validateObjectKeyAccess: typeof validateObjectKeyAccess;
declare const validation_validateUserInput: typeof validateUserInput;
declare namespace validation {
  export { validation_formatApiKeyDisplay as formatApiKeyDisplay, validation_isValidApiKey as isValidApiKey, validation_isValidEnumValue as isValidEnumValue, validation_isValidEnvVarName as isValidEnvVarName, validation_isValidFilePath as isValidFilePath, validation_isValidHostname as isValidHostname, validation_isValidPathEntry as isValidPathEntry, validation_isValidPort as isValidPort, validation_isValidUrl as isValidUrl, validation_safeArrayAccess as safeArrayAccess, validation_safeObjectAccess as safeObjectAccess, validation_sanitizeEnvValue as sanitizeEnvValue, validation_sanitizeUserInput as sanitizeUserInput, validation_validateArray as validateArray, validation_validateArrayAccess as validateArrayAccess, validation_validateConfigStructure as validateConfigStructure, validation_validateObjectKeyAccess as validateObjectKeyAccess, validation_validateUserInput as validateUserInput };
  export type { validation_ValidationResult as ValidationResult };
}

/**
 * Validation Utilities
 * General-purpose validation functions
 */
/**
 * Check if value is defined (not null or undefined)
 */
declare function isDefined<T>(value: T | null | undefined): value is T;
/**
 * Check if value is a string
 */
declare function isString(value: any): value is string;
/**
 * Check if value is a number
 */
declare function isNumber(value: any): value is number;
/**
 * Check if value is a boolean
 */
declare function isBoolean(value: any): value is boolean;
/**
 * Check if value is an object
 */
declare function isObject(value: any): value is object;
/**
 * Check if value is an array
 */
declare function isArray(value: any): value is any[];
/**
 * Check if value is a valid email
 */
declare function isEmail(value: string): boolean;
/**
 * Check if value is a valid URL
 */
declare function isURL(value: string): boolean;
/**
 * Assert value is defined, throw error if not
 */
declare function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T;
/**
 * Assert condition is true, throw error if not
 */
declare function assert(condition: boolean, message?: string): asserts condition;

export { AiderTool, BaseCodeTool, BaseError, ClaudeCodeTool, ClineTool, CodexTool, ConfigManager, ConfigValidator, ConfigurationError, ContinueTool, CursorTool, InternalError, Logger, Mutex, NotFoundError, Semaphore, TimeoutError, ToolFactory, ToolRegistry, UnauthorizedError, ValidationError, index$6 as array, assert, assertDefined, index$5 as async, batchProcessFiles, camelCase, capitalize, chunk, index$4 as command, commandExists$1 as commandExists, config, copyFile, countLines, createConfigManager, createLogger, createTool, createValidator, debounce, deepClone, deepMerge, deleteDir, deleteFile, difference, ensureDir, index$3 as error, executeCommand, executeCommandStream, exists, flatten, flatten$1 as flattenArray, formatError, index$2 as fs, get, getArchitecture, getCacheDir, getCommandPath, getCommandVersion, getConfigDir, getDataDir, getErrorMessage, getFileInfo, getFileSize, getHomeDir, getPlatform, getPlatformInfo, getRegistry, getTempDir, has, intersection, isArray, isBoolean, isDefined, isDirectory, isEmail, isFile, isLargeFile, isLinux, isMacOS, isNumber, isObject, isString, isURL, isUnix, isWindows, kebabCase, listDirs, listFiles, logger, logger$2 as loggerUtils, moveFile, index$1 as object, omit, parallelLimit, partition, pascalCase, pick, platform, processLargeFile, processLineByLine, readFile, readJSON, retry, sequence, set, shuffle, sleep, slugify, snakeCase, streamJSON, streamWriteJSON, index as string, template, throttle, timeout, truncate, tryCatch, tryCatchAsync, unflatten, union, unique, validation, validators, waitFor, wrapError, writeFile, writeJSON };
export type { ChunkProcessorOptions, ExecutionResult, FileInfo, IChatTool, ICodeGenTool, ICodeTool, IFileEditTool, InstallStatus, StreamProcessorOptions, ToolCapabilities, ToolConfig, ToolMetadata };
