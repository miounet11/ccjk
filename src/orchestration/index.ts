/**
 * Orchestration Module
 * Intelligent context management and compression for multi-agent orchestration
 */

export { OrchestrationContextManager, orchestrationContextManager } from './context-manager'
export { IntentDetector, detectIntent, analyzeIntent } from './intent-detector'
export { AutoOrchestrator, createPlan, detectAndPlan } from './auto-orchestrator'
export * from '../types/orchestration'
