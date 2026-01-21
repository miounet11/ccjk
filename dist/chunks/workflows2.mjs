import ansis from 'ansis';
import 'inquirer';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'pathe';

const PHASE_CONFIGS = {
  brainstorming: {
    phase: "brainstorming",
    name: {
      "en": "Brainstorming",
      "zh-CN": "\u5934\u8111\u98CE\u66B4",
      "ja-JP": "\u30D6\u30EC\u30A4\u30F3\u30B9\u30C8\u30FC\u30DF\u30F3\u30B0",
      "ko-KR": "\uBE0C\uB808\uC778\uC2A4\uD1A0\uBC0D"
    },
    description: {
      "en": "Explore ideas and gather requirements",
      "zh-CN": "\u63A2\u7D22\u60F3\u6CD5\uFF0C\u6536\u96C6\u9700\u6C42",
      "ja-JP": "\u30A2\u30A4\u30C7\u30A2\u3092\u63A2\u6C42\u3057\u3001\u8981\u4EF6\u3092\u53CE\u96C6\u3059\u308B",
      "ko-KR": "\uC544\uC774\uB514\uC5B4 \uD0D0\uC0C9 \uBC0F \uC694\uAD6C\uC0AC\uD56D \uC218\uC9D1"
    },
    autoActivateSkills: ["brainstorming", "requirements"],
    allowedTransitions: ["planning"],
    requiresConfirmation: true,
    maxDuration: 30
  },
  planning: {
    phase: "planning",
    name: {
      "en": "Planning",
      "zh-CN": "\u89C4\u5212",
      "ja-JP": "\u8A08\u753B",
      "ko-KR": "\uACC4\uD68D"
    },
    description: {
      "en": "Create detailed implementation plan with bite-sized tasks",
      "zh-CN": "\u521B\u5EFA\u8BE6\u7EC6\u7684\u5B9E\u65BD\u8BA1\u5212\uFF0C\u5206\u89E3\u4E3A\u5C0F\u4EFB\u52A1",
      "ja-JP": "\u8A73\u7D30\u306A\u5B9F\u88C5\u8A08\u753B\u3092\u4F5C\u6210\u3057\u3001\u5C0F\u3055\u306A\u30BF\u30B9\u30AF\u306B\u5206\u89E3\u3059\u308B",
      "ko-KR": "\uC138\uBD80 \uAD6C\uD604 \uACC4\uD68D \uC791\uC131 \uBC0F \uC791\uC740 \uC791\uC5C5\uC73C\uB85C \uBD84\uD574"
    },
    autoActivateSkills: ["planning", "task-breakdown"],
    allowedTransitions: ["implementation", "brainstorming"],
    requiresConfirmation: true,
    maxDuration: 60
  },
  implementation: {
    phase: "implementation",
    name: {
      "en": "Implementation",
      "zh-CN": "\u5B9E\u73B0",
      "ja-JP": "\u5B9F\u88C5",
      "ko-KR": "\uAD6C\uD604"
    },
    description: {
      "en": "Execute tasks via subagents with TDD approach",
      "zh-CN": "\u901A\u8FC7\u5B50\u4EE3\u7406\u6267\u884C\u4EFB\u52A1\uFF0C\u91C7\u7528 TDD \u65B9\u6CD5",
      "ja-JP": "TDD\u30A2\u30D7\u30ED\u30FC\u30C1\u3067\u30B5\u30D6\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3092\u4ECB\u3057\u3066\u30BF\u30B9\u30AF\u3092\u5B9F\u884C",
      "ko-KR": "TDD \uC811\uADFC \uBC29\uC2DD\uC73C\uB85C \uC11C\uBE0C\uC5D0\uC774\uC804\uD2B8\uB97C \uD1B5\uD574 \uC791\uC5C5 \uC2E4\uD589"
    },
    autoActivateSkills: ["implementation", "tdd", "coding"],
    allowedTransitions: ["review", "planning"],
    requiresConfirmation: false,
    maxDuration: 0
    // Unlimited
  },
  review: {
    phase: "review",
    name: {
      "en": "Code Review",
      "zh-CN": "\u4EE3\u7801\u5BA1\u67E5",
      "ja-JP": "\u30B3\u30FC\u30C9\u30EC\u30D3\u30E5\u30FC",
      "ko-KR": "\uCF54\uB4DC \uB9AC\uBDF0"
    },
    description: {
      "en": "Two-stage review: spec compliance + code quality",
      "zh-CN": "\u4E24\u9636\u6BB5\u5BA1\u67E5\uFF1A\u89C4\u683C\u7B26\u5408\u6027 + \u4EE3\u7801\u8D28\u91CF",
      "ja-JP": "2\u6BB5\u968E\u30EC\u30D3\u30E5\u30FC\uFF1A\u4ED5\u69D8\u6E96\u62E0 + \u30B3\u30FC\u30C9\u54C1\u8CEA",
      "ko-KR": "2\uB2E8\uACC4 \uAC80\uD1A0: \uC0AC\uC591 \uC900\uC218 + \uCF54\uB4DC \uD488\uC9C8"
    },
    autoActivateSkills: ["code-review", "quality-check"],
    allowedTransitions: ["finishing", "implementation"],
    requiresConfirmation: true,
    maxDuration: 30
  },
  finishing: {
    phase: "finishing",
    name: {
      "en": "Finishing",
      "zh-CN": "\u6536\u5C3E",
      "ja-JP": "\u4ED5\u4E0A\u3052",
      "ko-KR": "\uB9C8\uBB34\uB9AC"
    },
    description: {
      "en": "Final cleanup, documentation, and merge",
      "zh-CN": "\u6700\u7EC8\u6E05\u7406\u3001\u6587\u6863\u548C\u5408\u5E76",
      "ja-JP": "\u6700\u7D42\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3001\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3001\u30DE\u30FC\u30B8",
      "ko-KR": "\uCD5C\uC885 \uC815\uB9AC, \uBB38\uC11C\uD654 \uBC0F \uBCD1\uD569"
    },
    autoActivateSkills: ["finishing", "documentation"],
    allowedTransitions: [],
    requiresConfirmation: true,
    maxDuration: 15
  }
};
const WORKFLOW_PERSISTENCE_VERSION = 1;

function generateId() {
  return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
const DEFAULT_OPTIONS = {
  persistPath: join(homedir(), ".ccjk", "workflow-state.json"),
  autoSave: true,
  verbose: false
};
class WorkflowStateMachine extends EventEmitter {
  sessions = /* @__PURE__ */ new Map();
  options;
  constructor(options = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadState();
  }
  // ==========================================================================
  // Session Management
  // ==========================================================================
  /**
   * Create a new workflow session
   *
   * @param params - Session parameters
   * @param params.name - Session name
   * @param params.description - Optional session description
   * @param params.initialPhase - Optional initial workflow phase
   * @param params.branch - Optional git branch name
   * @param params.skills - Optional list of skill IDs to use
   * @param params.metadata - Optional additional metadata
   * @returns Created session
   */
  createSession(params) {
    const session = {
      id: generateId(),
      name: params.name,
      description: params.description || "",
      currentPhase: params.initialPhase || "brainstorming",
      status: "active",
      tasks: [],
      phaseHistory: [{
        from: null,
        to: params.initialPhase || "brainstorming",
        timestamp: /* @__PURE__ */ new Date(),
        reason: "Session created",
        triggeredBy: "system"
      }],
      branch: params.branch,
      skills: params.skills || [],
      metadata: params.metadata || {},
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.sessions.set(session.id, session);
    this.emit("session:created", session);
    this.log(`Created session: ${session.id} - ${session.name}`);
    this.saveState();
    return session;
  }
  /**
   * Get a session by ID
   */
  getSession(id) {
    return this.sessions.get(id) || null;
  }
  /**
   * Get all sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }
  /**
   * Get active sessions
   */
  getActiveSessions() {
    return this.getAllSessions().filter((s) => s.status === "active" || s.status === "paused");
  }
  /**
   * Update session metadata
   */
  updateSession(id, updates) {
    const session = this.getSessionOrThrow(id);
    Object.assign(session, updates, { updatedAt: /* @__PURE__ */ new Date() });
    this.saveState();
    return session;
  }
  /**
   * Delete a session
   */
  deleteSession(id) {
    const session = this.sessions.get(id);
    if (!session) {
      return false;
    }
    this.sessions.delete(id);
    this.log(`Deleted session: ${id}`);
    this.saveState();
    return true;
  }
  // ==========================================================================
  // Phase Transitions
  // ==========================================================================
  /**
   * Transition to a new phase
   *
   * @param sessionId - Session ID
   * @param targetPhase - Target phase
   * @param reason - Reason for transition
   * @returns Updated session
   * @throws Error if transition is not allowed
   */
  transitionTo(sessionId, targetPhase, reason) {
    const session = this.getSessionOrThrow(sessionId);
    this.validateTransition(session, targetPhase);
    const oldPhase = session.currentPhase;
    const transition = {
      from: oldPhase,
      to: targetPhase,
      timestamp: /* @__PURE__ */ new Date(),
      reason: reason || `Transition from ${oldPhase} to ${targetPhase}`,
      triggeredBy: "user"
    };
    session.currentPhase = targetPhase;
    session.phaseHistory.push(transition);
    session.updatedAt = /* @__PURE__ */ new Date();
    this.emit("phase:changed", session, transition);
    this.log(`Phase transition: ${oldPhase} -> ${targetPhase} (${session.name})`);
    this.saveState();
    return session;
  }
  /**
   * Check if a transition is allowed
   */
  canTransitionTo(sessionId, targetPhase) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    const currentConfig = PHASE_CONFIGS[session.currentPhase];
    return currentConfig.allowedTransitions.includes(targetPhase);
  }
  /**
   * Get allowed transitions for a session
   */
  getAllowedTransitions(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }
    return PHASE_CONFIGS[session.currentPhase].allowedTransitions;
  }
  /**
   * Auto-advance to next phase if conditions are met
   */
  autoAdvance(sessionId) {
    const session = this.getSessionOrThrow(sessionId);
    const currentConfig = PHASE_CONFIGS[session.currentPhase];
    if (currentConfig.requiresConfirmation) {
      return null;
    }
    const phaseTasks = this.getTasksForPhase(session, session.currentPhase);
    const allCompleted = phaseTasks.every((t) => t.status === "completed");
    if (!allCompleted || phaseTasks.length === 0) {
      return null;
    }
    const nextPhase = currentConfig.allowedTransitions[0];
    if (!nextPhase) {
      return null;
    }
    return this.transitionTo(sessionId, nextPhase, "Auto-advanced after task completion");
  }
  // ==========================================================================
  // Session Status Management
  // ==========================================================================
  /**
   * Pause a session
   */
  pauseSession(sessionId) {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== "active") {
      throw new Error(`Cannot pause session with status: ${session.status}`);
    }
    return this.changeSessionStatus(session, "paused");
  }
  /**
   * Resume a paused session
   */
  resumeSession(sessionId) {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== "paused") {
      throw new Error(`Cannot resume session with status: ${session.status}`);
    }
    return this.changeSessionStatus(session, "active");
  }
  /**
   * Complete a session
   */
  completeSession(sessionId) {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== "active") {
      throw new Error(`Cannot complete session with status: ${session.status}`);
    }
    session.completedAt = /* @__PURE__ */ new Date();
    const updated = this.changeSessionStatus(session, "completed");
    this.emit("workflow:completed", updated);
    return updated;
  }
  /**
   * Fail a session
   */
  failSession(sessionId, error) {
    const session = this.getSessionOrThrow(sessionId);
    session.error = error;
    const updated = this.changeSessionStatus(session, "failed");
    this.emit("workflow:failed", updated, error);
    return updated;
  }
  /**
   * Cancel a session
   */
  cancelSession(sessionId) {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status === "completed" || session.status === "failed") {
      throw new Error(`Cannot cancel session with status: ${session.status}`);
    }
    return this.changeSessionStatus(session, "cancelled");
  }
  // ==========================================================================
  // Task Management
  // ==========================================================================
  /**
   * Add a task to a session
   */
  addTask(sessionId, task) {
    const session = this.getSessionOrThrow(sessionId);
    const newTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: "pending",
      createdAt: /* @__PURE__ */ new Date()
    };
    session.tasks.push(newTask);
    session.updatedAt = /* @__PURE__ */ new Date();
    this.emit("task:created", session, newTask);
    this.saveState();
    return newTask;
  }
  /**
   * Update task status
   */
  updateTaskStatus(sessionId, taskId, status) {
    const session = this.getSessionOrThrow(sessionId);
    const task = session.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    const oldStatus = task.status;
    task.status = status;
    if (status === "running" && !task.startedAt) {
      task.startedAt = /* @__PURE__ */ new Date();
    }
    if (status === "completed" || status === "failed" || status === "cancelled") {
      task.completedAt = /* @__PURE__ */ new Date();
      if (task.startedAt) {
        task.actualMinutes = Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 6e4);
      }
    }
    session.updatedAt = /* @__PURE__ */ new Date();
    this.emit("task:status", session, task, oldStatus, status);
    if (status === "completed") {
      this.emit("task:completed", session, task);
    } else if (status === "failed") {
      this.emit("task:failed", session, task, task.error || "Unknown error");
    }
    this.saveState();
    return task;
  }
  /**
   * Get tasks for a specific phase
   */
  getTasksForPhase(session, phase) {
    return session.tasks.filter((t) => t.metadata?.phase === phase);
  }
  /**
   * Get pending tasks
   */
  getPendingTasks(sessionId) {
    const session = this.getSessionOrThrow(sessionId);
    return session.tasks.filter((t) => t.status === "pending" || t.status === "queued");
  }
  /**
   * Get running tasks
   */
  getRunningTasks(sessionId) {
    const session = this.getSessionOrThrow(sessionId);
    return session.tasks.filter((t) => t.status === "running");
  }
  // ==========================================================================
  // Persistence
  // ==========================================================================
  /**
   * Save state to disk
   */
  saveState() {
    if (!this.options.autoSave) {
      return;
    }
    const state = {
      version: WORKFLOW_PERSISTENCE_VERSION,
      sessions: Array.from(this.sessions.values()),
      lastUpdated: /* @__PURE__ */ new Date()
    };
    try {
      const dir = dirname(this.options.persistPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(
        this.options.persistPath,
        JSON.stringify(state, null, 2),
        "utf-8"
      );
      this.log(`State saved to ${this.options.persistPath}`);
    } catch (error) {
      console.error("Failed to save workflow state:", error);
    }
  }
  /**
   * Load state from disk
   */
  loadState() {
    try {
      if (!existsSync(this.options.persistPath)) {
        this.log("No existing state file found");
        return;
      }
      const content = readFileSync(this.options.persistPath, "utf-8");
      const state = JSON.parse(content);
      if (state.version !== WORKFLOW_PERSISTENCE_VERSION) {
        this.log(`Migrating state from version ${state.version} to ${WORKFLOW_PERSISTENCE_VERSION}`);
      }
      this.sessions.clear();
      for (const session of state.sessions) {
        session.createdAt = new Date(session.createdAt);
        session.updatedAt = new Date(session.updatedAt);
        if (session.completedAt) {
          session.completedAt = new Date(session.completedAt);
        }
        for (const task of session.tasks) {
          task.createdAt = new Date(task.createdAt);
          if (task.startedAt)
            task.startedAt = new Date(task.startedAt);
          if (task.completedAt)
            task.completedAt = new Date(task.completedAt);
        }
        for (const transition of session.phaseHistory) {
          transition.timestamp = new Date(transition.timestamp);
        }
        this.sessions.set(session.id, session);
      }
      this.log(`Loaded ${this.sessions.size} sessions from state file`);
    } catch (error) {
      console.error("Failed to load workflow state:", error);
    }
  }
  /**
   * Clear all state
   */
  clearState() {
    this.sessions.clear();
    this.saveState();
    this.log("State cleared");
  }
  // ==========================================================================
  // Statistics
  // ==========================================================================
  /**
   * Get workflow statistics
   */
  getStats() {
    const sessions = this.getAllSessions();
    const allTasks = sessions.flatMap((s) => s.tasks);
    const completedTasks = allTasks.filter((t) => t.status === "completed" && t.actualMinutes);
    const avgDuration = completedTasks.length > 0 ? completedTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / completedTasks.length : 0;
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      completedSessions: sessions.filter((s) => s.status === "completed").length,
      failedSessions: sessions.filter((s) => s.status === "failed").length,
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      averageTaskDuration: Math.round(avgDuration * 10) / 10
    };
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  getSessionOrThrow(id) {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    return session;
  }
  validateTransition(session, targetPhase) {
    if (session.status !== "active") {
      throw new Error(`Cannot transition session with status: ${session.status}`);
    }
    const currentConfig = PHASE_CONFIGS[session.currentPhase];
    if (!currentConfig.allowedTransitions.includes(targetPhase)) {
      throw new Error(
        `Invalid transition: ${session.currentPhase} -> ${targetPhase}. Allowed: ${currentConfig.allowedTransitions.join(", ")}`
      );
    }
  }
  changeSessionStatus(session, newStatus) {
    const oldStatus = session.status;
    session.status = newStatus;
    session.updatedAt = /* @__PURE__ */ new Date();
    this.emit("session:status", session, oldStatus, newStatus);
    this.log(`Session status: ${oldStatus} -> ${newStatus} (${session.name})`);
    this.saveState();
    return session;
  }
  log(message) {
    if (this.options.verbose) {
      console.log(`[WorkflowStateMachine] ${message}`);
    }
  }
  // ==========================================================================
  // Type-safe Event Emitter
  // ==========================================================================
  on(event, listener) {
    return super.on(event, listener);
  }
  emit(event, ...args) {
    return super.emit(event, ...args);
  }
  once(event, listener) {
    return super.once(event, listener);
  }
  off(event, listener) {
    return super.off(event, listener);
  }
}
let instance = null;
function getWorkflowStateMachine(options) {
  if (!instance) {
    instance = new WorkflowStateMachine(options);
  }
  return instance;
}

function listWorkflows() {
  const machine = getWorkflowStateMachine();
  return machine.getAllSessions();
}

const PHASE_ICONS = {
  brainstorming: "\u{1F4A1}",
  planning: "\u{1F4CB}",
  implementation: "\u{1F528}",
  review: "\u{1F50D}",
  finishing: "\u2705"
};
const PHASE_COLORS = {
  brainstorming: ansis.magenta,
  planning: ansis.green,
  implementation: ansis.yellow,
  review: ansis.green,
  finishing: ansis.green
};
const STATUS_ICONS = {
  active: "\u{1F504}",
  paused: "\u23F8\uFE0F",
  completed: "\u2705",
  failed: "\u274C",
  cancelled: "\u{1F6AB}"
};
function formatPhase(phase) {
  const icon = PHASE_ICONS[phase];
  const color = PHASE_COLORS[phase];
  return `${icon} ${color(phase.charAt(0).toUpperCase() + phase.slice(1))}`;
}
function getTaskCounts(session) {
  const tasks = session.tasks || [];
  return {
    completed: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    total: tasks.length
  };
}
async function listAllWorkflows(options = {}) {
  const workflows = listWorkflows();
  if (options.format === "json") {
    console.log(JSON.stringify(workflows, null, 2));
    return;
  }
  if (workflows.length === 0) {
    console.log(ansis.yellow("\n  \u26A0\uFE0F No workflows found\n"));
    return;
  }
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(80)));
  console.log(ansis.bold(`  ${"ID".padEnd(10)} ${"Name".padEnd(20)} ${"Phase".padEnd(15)} ${"Status".padEnd(10)} ${"Progress".padEnd(15)}`));
  console.log(ansis.bold.cyan("\u2501".repeat(80)));
  for (const wf of workflows) {
    const counts = getTaskCounts(wf);
    const progress = `${counts.completed}/${counts.total}`;
    console.log(
      `  ${ansis.dim(wf.id.slice(0, 8).padEnd(10))} ${wf.name.slice(0, 18).padEnd(20)} ${formatPhase(wf.currentPhase).padEnd(25)} ${STATUS_ICONS[wf.status]} ${wf.status.padEnd(8)} ${progress}`
    );
  }
  console.log(ansis.bold.cyan("\u2501".repeat(80)));
  console.log(ansis.dim(`  Total: ${workflows.length} workflows`));
  console.log("");
}

async function listWorkflowsQuick(options = {}) {
  const opts = {
    lang: options.lang,
    format: options.format
  };
  await listAllWorkflows(opts);
}

export { listWorkflowsQuick };
