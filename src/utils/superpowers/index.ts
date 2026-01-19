/**
 * Superpowers module exports
 */

// Cloud sync exports
export {
  checkSkillUpdates,
  configureCloudSync,
  disableCloudSync,
  getCloudSyncStatus,
  isCloudSyncConfigured,
  readCloudSyncConfig,
  syncSkillsFromCloud,
  uploadSkillToCloud,
  writeCloudSyncConfig,
} from './cloud-sync'

export type {
  CloudSyncOptions,
  CloudSyncResult,
  SkillUpdate,
} from './cloud-sync'

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
