/**
 * Agent Browser Module
 * 零配置浏览器自动化工具
 */

// 导出命令
export {
  agentBrowserHelp,
  agentBrowserStatus,
  configureBrowser,
  startBrowserSession,
  stopBrowserSession,
} from './commands'

// 导出安装器
export {
  checkAgentBrowserInstalled,
  getBinPath,
  getInstallPath,
  installAgentBrowser,
  uninstallAgentBrowser,
} from './installer'

// 导出会话管理
export {
  AgentBrowserSession,
  createSession,
  quickBrowse,
} from './session'

// 导出类型
export type {
  ElementRef,
  SessionOptions,
  SnapshotOptions,
} from './session'
