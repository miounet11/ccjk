/**
 * Agent Browser Module
 *
 * Headless browser automation CLI for AI agents.
 * Provides installation, session management, and command execution.
 *
 * @see https://github.com/vercel-labs/agent-browser
 * @module utils/agent-browser
 */

// Command exports
export {
  // Navigation
  back,
  // Interaction
  check,
  click,
  // Browser control
  close,
  // Tab management
  closeTab,
  dblclick,
  ensureReady,
  evaluate,
  fill,
  forward,
  getAttribute,
  getText,
  getTitle,
  getUrl,
  hover,
  // State checks
  isChecked,
  isEnabled,
  isVisible,
  listTabs,
  newTab,
  open,
  press,
  // Utility
  quickTask,
  reload,
  screenshot,
  scroll,
  select,
  // Information
  snapshot,
  switchTab,
  type,
  uncheck,
  // Wait
  wait,
  waitForSelector,
  waitForText,
} from './commands'

export type { CommandOptions, CommandResult, SnapshotOptions } from './commands'

// Installer exports
export {
  checkForUpdate,
  getAgentBrowserStatus,
  getLatestVersion,
  installAgentBrowser,
  installBrowser,
  uninstallAgentBrowser,
  updateAgentBrowser,
} from './installer'

export type { AgentBrowserInstallStatus } from './installer'

// Menu exports
export { recommendAgentBrowser, showAgentBrowserMenu } from './menu'

// Session exports
export {
  closeAllSessions,
  closeSession,
  createSession,
  executeInSession,
  generateSessionNames,
  getCurrentSession,
  getSessionStatus,
  listSessions,
} from './session'

export type { BrowserSession, SessionCreateOptions } from './session'

// Skill exports
export { browserSkill, getBrowserSkill, getBrowserSkillTemplate } from './skill'
