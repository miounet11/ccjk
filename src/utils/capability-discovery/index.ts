/**
 * Capability Discovery Module
 *
 * Scans and displays all available CCJK capabilities at startup.
 *
 * @module capability-discovery
 */

export { getCapabilitiesByType, getCapability, scanCapabilities } from './scanner'
export { formatCapabilityList, generateStatusPanel } from './status'
export type {
  Capability,
  CapabilityScanResult,
  CapabilityStatus,
  CapabilityType,
  StatusOptions,
  WelcomeOptions,
} from './types'

export { generateCompactWelcome, generateRecommendations, generateWelcome } from './welcome'
