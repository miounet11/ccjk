/**
 * Superpowers module exports
 */

export {
  checkSuperpowersInstalled,
  getClaudePluginDir,
  getSuperpowersPath,
  getSuperpowersSkills,
  installSuperpowers,
  installSuperpowersViaGit,
  uninstallSuperpowers,
  updateSuperpowers,
} from './installer'

export type {
  SuperpowersInstallOptions,
  SuperpowersInstallResult,
  SuperpowersStatus,
} from './installer'
