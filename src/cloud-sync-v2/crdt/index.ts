/**
 * Cloud Sync V2 - CRDT Module
 *
 * Conflict-free Replicated Data Types for distributed synchronization.
 *
 * @module cloud-sync-v2/crdt
 */

// Re-export types from main types module
export type {
  CRDTOperation,
  CRDTSnapshot,
  MergeResult,
  NodeId,
  Timestamp,
} from '../types'
// G-Counter (Grow-only Counter)
export {
  createGCounter,
  createPNCounter,
  GCounter,
  mergeGCounterStates,
  PNCounter,
} from './g-counter'

export type { GCounterState, GCounterStateObject, PNCounterState } from './g-counter'
// LWW-Register (Last-Write-Wins Register)
export {
  createLWWRegister,
  LWWRegister,
  mergeLWWStates,
} from './lww-register'

export type { LWWRegisterOptions, LWWRegisterState } from './lww-register'
// OR-Set (Observed-Remove Set)
export {
  createORSet,
  createORSetWithValues,
  ORSet,
} from './or-set'

export type { ORSetState, ORSetStateObject, Tag, TaggedElement } from './or-set'
