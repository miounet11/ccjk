/**
 * LSP (Language Server Protocol) type definitions for CCJK
 *
 * Provides comprehensive type definitions for LSP server integration,
 * supporting features like go-to-definition, find-references, hover, etc.
 */

/**
 * LSP server ID - supported language servers
 */
export type LspServerId
  = | 'typescript'
    | 'python'
    | 'rust'
    | 'go'
    | 'javascript'
    | 'jsx'
    | 'tsx'
    | 'cpp'
    | 'csharp'
    | 'java'
    | 'php'
    | 'ruby'
    | 'lua'
    | 'vim'
    | 'yaml'
    | 'json'
    | 'css'
    | 'html'
    | 'markdown'
    | 'graphql'
    | 'terraform'
    | 'dockerfile'
    | 'eslint'
    | 'tailwindcss'

/**
 * LSP server status
 */
export type LspServerStatus = 'running' | 'stopped' | 'starting' | 'error' | 'not-installed'

/**
 * LSP server transport type
 */
export type LspTransport = 'stdio' | 'socket' | 'pipe'

/**
 * LSP position in a document
 */
export interface LspPosition {
  /** Line position (0-based) */
  line: number
  /** Character offset (0-based) */
  character: number
}

/**
 * LSP range in a document
 */
export interface LspRange {
  /** Start position */
  start: LspPosition
  /** End position */
  end: LspPosition
}

/**
 * LSP location for go-to-definition
 */
export interface LspLocation {
  /** Document URI */
  uri: string
  /** Range in the document */
  range: LspRange
}

/**
 * LSP document symbol kind
 */
export enum LspSymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

/**
 * LSP completion item kind
 */
export enum LspCompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

/**
 * LSP diagnostic severity
 */
export enum LspDiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

/**
 * LSP diagnostic information
 */
export interface LspDiagnostic {
  /** Range where diagnostic applies */
  range: LspRange
  /** Diagnostic severity */
  severity?: LspDiagnosticSeverity
  /** Diagnostic code */
  code?: string | number
  /** Diagnostic source */
  source?: string
  /** Diagnostic message */
  message: string
  /** Related tags */
  tags?: LspDiagnosticTag[]
}

/**
 * LSP diagnostic tags
 */
export enum LspDiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2,
}

/**
 * LSP hover response content
 */
export interface LspHoverContent {
  /** Content kind (markdown, plaintext, etc.) */
  kind: 'markdown' | 'plaintext' | 'snippet'
  /** The actual content */
  value: string
}

/**
 * LSP hover response
 */
export interface LspHover {
  /** Hover content */
  contents: LspHoverContent | LspHoverContent[] | string
  /** Range of the symbol */
  range?: LspRange
}

/**
 * LSP completion item
 */
export interface LspCompletionItem {
  /** Label shown to user */
  label: string
  /** Item kind */
  kind?: LspCompletionItemKind
  /** Detail information */
  detail?: string
  /** Documentation */
  documentation?: string | { kind: string, value: string }
  /** Sort text */
  sortText?: string
  /** Filter text */
  filterText?: string
  /** Insert text */
  insertText?: string
  /** Preselect this item */
  preselect?: boolean
  /** Deprecated flag */
  deprecated?: boolean
  /** Text edit for insertion */
  textEdit?: {
    range: LspRange
    newText: string
  }
  /** Additional edits */
  additionalTextEdits?: Array<{
    range: LspRange
    newText: string
  }>
}

/**
 * LSP completion list
 */
export interface LspCompletionList {
  /** Completion items */
  items: LspCompletionItem[]
  /** List is incomplete */
  isIncomplete?: boolean
}

/**
 * LSP text document identifier
 */
export interface LspTextDocumentIdentifier {
  /** Document URI */
  uri: string
}

/**
 * LSP text document position params
 */
export interface LspTextDocumentPositionParams {
  /** Document identifier */
  textDocument: LspTextDocumentIdentifier
  /** Position in document */
  position: LspPosition
}

/**
 * LSP reference params for find-references
 */
export interface LspReferenceParams extends LspTextDocumentPositionParams {
  /** Context */
  context: {
    /** Include declaration */
    includeDeclaration: boolean
  }
}

/**
 * LSP server configuration
 */
export interface LspServerConfig {
  /** Server ID */
  id: LspServerId
  /** Display name */
  name: string
  /** Command to start the server */
  command: string
  /** Arguments for command */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Transport type */
  transport?: LspTransport
  /** Working directory */
  cwd?: string
  /** Supported file extensions */
  extensions?: string[]
  /** Supported language IDs */
  languageIds?: string[]
  /** Initialization options */
  initializationOptions?: Record<string, any>
  /** Required for server to work */
  requires?: {
    /** Required commands in PATH */
    commands?: string[]
    /** Required files/directories */
    files?: string[]
    /** Required npm packages */
    packages?: string[]
  }
  /** Server is enabled by default */
  enabled?: boolean
  /** Auto-start on file match */
  autoStart?: boolean
  /** Maximum server restarts */
  maxRestarts?: number
  /** Server startup timeout (ms) */
  startupTimeout?: number
}

/**
 * LSP server state
 */
export interface LspServerState {
  /** Server ID */
  id: LspServerId
  /** Current status */
  status: LspServerStatus
  /** Process ID (if running) */
  pid?: number
  /** Server port (if socket transport) */
  port?: number
  /** Start time */
  startTime?: Date
  /** Last error message */
  error?: string
  /** Restart count */
  restartCount: number
  /** Files being handled */
  files: Set<string>
  /** Server capabilities */
  capabilities?: LspServerCapabilities
}

/**
 * LSP server capabilities
 */
export interface LspServerCapabilities {
  /** Text document sync */
  textDocumentSync?: number | {
    openClose?: boolean
    change?: number
    willSave?: boolean
    willSaveWaitUntil?: boolean
    save?: boolean | { includeText: boolean }
  }
  /** Completion provider */
  completionProvider?: {
    resolveProvider?: boolean
    triggerCharacters?: string[]
  }
  /** Hover provider */
  hoverProvider?: boolean
  /** Signature help provider */
  signatureHelpProvider?: {
    triggerCharacters?: string[]
    retriggerCharacters?: string[]
  }
  /** Definition provider */
  definitionProvider?: boolean
  /** References provider */
  referencesProvider?: boolean
  /** Document highlight provider */
  documentHighlightProvider?: boolean
  /** Document symbol provider */
  documentSymbolProvider?: boolean
  /** Workspace symbol provider */
  workspaceSymbolProvider?: boolean
  /** Code action provider */
  codeActionProvider?: boolean | { codeActionKinds?: string[] }
  /** Code lens provider */
  codeLensProvider?: { resolveProvider?: boolean }
  /** Document formatting provider */
  documentFormattingProvider?: boolean
  /** Document range formatting provider */
  documentRangeFormattingProvider?: boolean
  /** Document on type formatting provider */
  documentOnTypeFormattingProvider?: {
    firstTriggerCharacter: string
    moreTriggerCharacter?: string[]
  }
  /** Rename provider */
  renameProvider?: boolean | { prepareProvider: boolean }
  /** Document link provider */
  documentLinkProvider?: { resolveProvider?: boolean }
  /** Execute command provider */
  executeCommandProvider?: string[]
  /** Type definition provider */
  typeDefinitionProvider?: boolean
  /** Implementation provider */
  implementationProvider?: boolean
}

/**
 * LSP feature request
 */
export interface LspFeatureRequest<T = any> {
  /** Server ID */
  serverId: LspServerId
  /** Feature method */
  method: string
  /** Request params */
  params: T
  /** Request timeout (ms) */
  timeout?: number
}

/**
 * LSP feature response
 */
export interface LspFeatureResponse<T = any> {
  /** Response data */
  data?: T
  /** Error message */
  error?: string
  /** Error code */
  code?: number
}

/**
 * LSP manager configuration
 */
export interface LspManagerConfig {
  /** Maximum concurrent servers */
  maxServers?: number
  /** Default server startup timeout (ms) */
  defaultStartupTimeout?: number
  /** Default request timeout (ms) */
  defaultRequestTimeout?: number
  /** Enable server logging */
  enableLogging?: boolean
  /** Log directory */
  logDir?: string
  /** Auto-restart servers on error */
  autoRestart?: boolean
  /** Maximum restart attempts */
  maxRestartAttempts?: number
  /** Restart delay (ms) */
  restartDelay?: number
}

/**
 * LSP status information
 */
export interface LspStatusInfo {
  /** Server states */
  servers: Record<LspServerId, LspServerState>
  /** Total running servers */
  runningCount: number
  /** Total stopped servers */
  stoppedCount: number
  /** Servers with errors */
  errorCount: number
  /** Not installed servers */
  notInstalledCount: number
}

/**
 * LSP diagnostic report
 */
export interface LspDiagnosticReport {
  /** File URI */
  uri: string
  /** Diagnostics */
  diagnostics: LspDiagnostic[]
  /** Server that provided diagnostics */
  serverId: LspServerId
}
