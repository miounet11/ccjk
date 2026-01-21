/**
 * LSP Server Configurations
 *
 * Pre-configured settings for popular language servers.
 * These templates are used by the LSP manager to start servers.
 */

import type { LspServerConfig } from '../types/lsp'

/**
 * TypeScript language server configuration
 * Uses tsserver which comes with TypeScript
 */
export const typescriptLspConfig: LspServerConfig = {
  id: 'typescript',
  name: 'TypeScript Language Server',
  command: 'typescript-language-server',
  args: ['--stdio'],
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  languageIds: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  requires: {
    commands: ['typescript-language-server', 'tsserver'],
  },
  enabled: true,
  autoStart: true,
  initializationOptions: {
    preferences: {
      includeInlayParameterNameHints: 'all',
      includeInlayFunctionParameterTypeHints: true,
      includeInlayVariableTypeHints: true,
      includeInlayPropertyDeclarationTypeHints: true,
      includeInlayFunctionLikeReturnTypeHints: true,
    },
  },
}

/**
 * Python language server configuration
 * Uses pylsp (Python LSP Server)
 */
export const pythonLspConfig: LspServerConfig = {
  id: 'python',
  name: 'Python LSP Server',
  command: 'pylsp',
  args: ['--stdio'],
  extensions: ['.py', '.pyi', '.pyw'],
  languageIds: ['python'],
  requires: {
    commands: ['pylsp'],
    packages: ['python-lsp-server'],
  },
  enabled: true,
  autoStart: true,
}

/**
 * Rust language server configuration
 * Uses rust-analyzer (RA)
 */
export const rustLspConfig: LspServerConfig = {
  id: 'rust',
  name: 'Rust Analyzer',
  command: 'rust-analyzer',
  args: [],
  extensions: ['.rs'],
  languageIds: ['rust'],
  requires: {
    commands: ['rust-analyzer'],
  },
  enabled: true,
  autoStart: true,
}

/**
 * Go language server configuration
 * Uses gopls
 */
export const goLspConfig: LspServerConfig = {
  id: 'go',
  name: 'Go PLPS',
  command: 'gopls',
  args: ['serve'],
  extensions: ['.go'],
  languageIds: ['go'],
  requires: {
    commands: ['gopls'],
  },
  enabled: true,
  autoStart: true,
}

/**
 * JavaScript language server configuration
 * Uses typescript-language-server for JS as well
 */
export const javascriptLspConfig: LspServerConfig = {
  id: 'javascript',
  name: 'JavaScript Language Server',
  command: 'typescript-language-server',
  args: ['--stdio'],
  extensions: ['.js', '.jsx', '.mjs', '.cjs'],
  languageIds: ['javascript', 'javascriptreact'],
  requires: {
    commands: ['typescript-language-server'],
  },
  enabled: true,
  autoStart: true,
}

/**
 * JSX/TSX language server configuration
 */
export const jsxLspConfig: LspServerConfig = {
  id: 'jsx',
  name: 'JSX Language Server',
  command: 'typescript-language-server',
  args: ['--stdio'],
  extensions: ['.jsx'],
  languageIds: ['javascriptreact'],
  requires: {
    commands: ['typescript-language-server'],
  },
  enabled: true,
  autoStart: true,
}

/**
 * TSX language server configuration
 */
export const tsxLspConfig: LspServerConfig = {
  id: 'tsx',
  name: 'TSX Language Server',
  command: 'typescript-language-server',
  args: ['--stdio'],
  extensions: ['.tsx'],
  languageIds: ['typescriptreact'],
  requires: {
    commands: ['typescript-language-server'],
  },
  enabled: true,
  autoStart: true,
}

/**
 * C/C++ language server configuration
 * Uses clangd
 */
export const cppLspConfig: LspServerConfig = {
  id: 'cpp',
  name: 'Clangd (C/C++)',
  command: 'clangd',
  args: ['--background-index'],
  extensions: ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'],
  languageIds: ['c', 'cpp', 'objective-c', 'objective-cpp'],
  requires: {
    commands: ['clangd'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * C# language server configuration
 * Uses OmniSharp
 */
export const csharpLspConfig: LspServerConfig = {
  id: 'csharp',
  name: 'OmniSharp (C#)',
  command: 'omnisharp',
  args: ['-lsp'],
  extensions: ['.cs'],
  languageIds: ['csharp'],
  requires: {
    commands: ['omnisharp'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Java language server configuration
 * Uses jdtls
 */
export const javaLspConfig: LspServerConfig = {
  id: 'java',
  name: 'Eclipse JDT.LS (Java)',
  command: 'jdtls',
  args: [],
  extensions: ['.java'],
  languageIds: ['java'],
  requires: {
    commands: ['jdtls'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * PHP language server configuration
 * Uses intelephense
 */
export const phpLspConfig: LspServerConfig = {
  id: 'php',
  name: 'Intelephense (PHP)',
  command: 'intelephense',
  args: ['--stdio'],
  extensions: ['.php'],
  languageIds: ['php'],
  requires: {
    commands: ['intelephense'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Ruby language server configuration
 * Uses solargraph
 */
export const rubyLspConfig: LspServerConfig = {
  id: 'ruby',
  name: 'Solargraph (Ruby)',
  command: 'solargraph',
  args: ['stdio'],
  extensions: ['.rb', '.gemspec'],
  languageIds: ['ruby'],
  requires: {
    commands: ['solargraph'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Lua language server configuration
 * Uses lua-language-server
 */
export const luaLspConfig: LspServerConfig = {
  id: 'lua',
  name: 'Lua Language Server',
  command: 'lua-language-server',
  args: [],
  extensions: ['.lua'],
  languageIds: ['lua'],
  requires: {
    commands: ['lua-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Vim script language server configuration
 * Uses vim-language-server
 */
export const vimLspConfig: LspServerConfig = {
  id: 'vim',
  name: 'Vim Language Server',
  command: 'vim-language-server',
  args: ['--stdio'],
  extensions: ['.vim', '.v'],
  languageIds: ['vim', 'vimscript'],
  requires: {
    commands: ['vim-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * YAML language server configuration
 */
export const yamlLspConfig: LspServerConfig = {
  id: 'yaml',
  name: 'YAML Language Server',
  command: 'yaml-language-server',
  args: ['--stdio'],
  extensions: ['.yaml', '.yml'],
  languageIds: ['yaml'],
  requires: {
    commands: ['yaml-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * JSON language server configuration
 */
export const jsonLspConfig: LspServerConfig = {
  id: 'json',
  name: 'JSON Language Server',
  command: 'vscode-json-language-server',
  args: ['--stdio'],
  extensions: ['.json', '.jsonc'],
  languageIds: ['json', 'jsonc'],
  requires: {
    commands: ['vscode-json-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * CSS language server configuration
 */
export const cssLspConfig: LspServerConfig = {
  id: 'css',
  name: 'CSS Language Server',
  command: 'vscode-css-language-server',
  args: ['--stdio'],
  extensions: ['.css', '.scss', '.sass', '.less'],
  languageIds: ['css', 'scss', 'sass', 'less'],
  requires: {
    commands: ['vscode-css-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * HTML language server configuration
 */
export const htmlLspConfig: LspServerConfig = {
  id: 'html',
  name: 'HTML Language Server',
  command: 'vscode-html-language-server',
  args: ['--stdio'],
  extensions: ['.html', '.htm'],
  languageIds: ['html'],
  requires: {
    commands: ['vscode-html-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Markdown language server configuration
 */
export const markdownLspConfig: LspServerConfig = {
  id: 'markdown',
  name: 'Markdown Language Server',
  command: 'marksman',
  args: ['server'],
  extensions: ['.md', '.markdown'],
  languageIds: ['markdown'],
  requires: {
    commands: ['marksman'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * GraphQL language server configuration
 */
export const graphqlLspConfig: LspServerConfig = {
  id: 'graphql',
  name: 'GraphQL Language Server',
  command: 'graphql-language-server-cli',
  args: ['server'],
  extensions: ['.graphql', '.gql'],
  languageIds: ['graphql'],
  requires: {
    commands: ['graphql-language-server-cli'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Terraform language server configuration
 */
export const terraformLspConfig: LspServerConfig = {
  id: 'terraform',
  name: 'Terraform Language Server',
  command: 'terraform-ls',
  args: ['serve'],
  extensions: ['.tf', '.tfvars'],
  languageIds: ['terraform'],
  requires: {
    commands: ['terraform-ls'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Dockerfile language server configuration
 */
export const dockerfileLspConfig: LspServerConfig = {
  id: 'dockerfile',
  name: 'Dockerfile Language Server',
  command: 'docker-langserver',
  args: ['--stdio'],
  extensions: ['Dockerfile', '.dockerfile'],
  languageIds: ['dockerfile'],
  requires: {
    commands: ['docker-langserver'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * ESLint language server configuration
 */
export const eslintLspConfig: LspServerConfig = {
  id: 'eslint',
  name: 'ESLint Language Server',
  command: 'eslint-language-server',
  args: ['--stdio'],
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
  languageIds: ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'vue'],
  requires: {
    commands: ['eslint-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * Tailwind CSS language server configuration
 */
export const tailwindcssLspConfig: LspServerConfig = {
  id: 'tailwindcss',
  name: 'Tailwind CSS Language Server',
  command: 'tailwindcss-language-server',
  args: ['--stdio'],
  extensions: ['.html', '.tsx', '.jsx', '.vue', '.svelte'],
  languageIds: ['html', 'typescriptreact', 'javascriptreact', 'vue', 'svelte'],
  requires: {
    commands: ['tailwindcss-language-server'],
  },
  enabled: false,
  autoStart: false,
}

/**
 * All LSP server configurations
 */
export const LSP_SERVER_CONFIGS: LspServerConfig[] = [
  // Core/Popular servers
  typescriptLspConfig,
  javascriptLspConfig,
  jsxLspConfig,
  tsxLspConfig,
  pythonLspConfig,
  rustLspConfig,
  goLspConfig,

  // Other language servers
  cppLspConfig,
  csharpLspConfig,
  javaLspConfig,
  phpLspConfig,
  rubyLspConfig,
  luaLspConfig,
  vimLspConfig,

  // Configuration file servers
  yamlLspConfig,
  jsonLspConfig,
  cssLspConfig,
  htmlLspConfig,
  markdownLspConfig,
  graphqlLspConfig,
  terraformLspConfig,
  dockerfileLspConfig,

  // Tool-specific servers
  eslintLspConfig,
  tailwindcssLspConfig,
]

/**
 * Get LSP server configuration by ID
 */
export function getLspServerConfig(id: string): LspServerConfig | undefined {
  return LSP_SERVER_CONFIGS.find(config => config.id === id)
}

/**
 * Get LSP server configurations by file extension
 */
export function getLspServersForExtension(ext: string): LspServerConfig[] {
  return LSP_SERVER_CONFIGS.filter(config =>
    config.extensions?.includes(ext),
  )
}

/**
 * Get enabled LSP server configurations
 */
export function getEnabledLspServers(): LspServerConfig[] {
  return LSP_SERVER_CONFIGS.filter(config => config.enabled === true)
}

/**
 * Get auto-start LSP server configurations
 */
export function getAutoStartLspServers(): LspServerConfig[] {
  return LSP_SERVER_CONFIGS.filter(config => config.autoStart === true)
}

/**
 * Get popular/essential LSP servers for web development
 */
export function getWebDevLspServers(): LspServerConfig[] {
  return [
    typescriptLspConfig,
    javascriptLspConfig,
    jsxLspConfig,
    tsxLspConfig,
    cssLspConfig,
    htmlLspConfig,
    jsonLspConfig,
    yamlLspConfig,
    tailwindcssLspConfig,
    eslintLspConfig,
  ]
}

/**
 * Get popular/essential LSP servers for backend development
 */
export function getBackendDevLspServers(): LspServerConfig[] {
  return [
    pythonLspConfig,
    goLspConfig,
    rustLspConfig,
    jsonLspConfig,
    yamlLspConfig,
    markdownLspConfig,
  ]
}
