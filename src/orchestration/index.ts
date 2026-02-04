/**
 * Orchestration Module
 * Intelligent context management and compression for multi-agent orchestration
 */

export * from '../types/orchestration'
export { AutoOrchestrator, createPlan, detectAndPlan } from './auto-orchestrator'
export { OrchestrationContextManager, orchestrationContextManager } from './context-manager'
export { analyzeIntent, detectIntent, IntentDetector } from './intent-detector'
