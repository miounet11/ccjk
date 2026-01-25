/**
 * Cloud Sync V2 - CRDT Module
 *
 * Conflict-free Replicated Data Types for distributed synchronization.
 *
 * @module cloud-sync-v2/crdt
 */

// G-Counter (Grow-only Counter)
export {
  GCounter,
  PNCounter,
  createGCounter,
  createPNCounter,
  mergeGCounterStates,
} from './g-counter'
export type { GCounterState, GCounterStateObject, PNCounterState } from './g-counter'

// LWW-Register (Last-Write-Wins Register)
export {
  LWWRegister,
  createLWWRegister,
  mergeLWWStates,
} from './lww-register'
export type { LWWRegisterState, LWWRegisterOptions } from './lww-register'

// OR-Set (Observed-Remove Set)
export {
  ORSet,
  createORSet,
  createORSetWithValues,
} from './or-set'
export type { ORSetState, ORSetStateObject, Tag, TaggedElement } from './or-set'

// Re-export types from main types module
export type {
  CRDTOperation,
  CRDTSnapshot,
  MergeResult,
  NodeId,
  Timestamp,
} from '../types'
