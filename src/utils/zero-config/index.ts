/**
 * Zero-Config Activation Module
 *
 * Provides automatic Superpowers activation on first run.
 * Implements silent installation without interrupting user workflow.
 *
 * @module zero-config
 */

export { activateSuperpowers, checkActivationStatus } from './activator'
export { autoInstallSuperpowers } from './auto-install'
export { loadCoreSkills, loadSkill } from './skill-loader'
export type { ActivationStatus, SkillLoadResult } from './types'
