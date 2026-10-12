# Implementation Roadmap: Gastown-Inspired Upgrades

**Timeline**: 6-8 weeks
**Team Size**: 1-2 developers
**Status**: Planning

---

## 📅 Phase-by-Phase Breakdown

### Phase 1: Persistence Foundation (Weeks 1-3)

#### Week 1: Git-Backed State Core

**Goals**:
- ✅ Implement GitBackedStateManager
- ✅ Create worktree management
- ✅ Basic state save/load

**Tasks**:
```typescript
// Day 1-2: Core infrastructure
- [ ] Create src/brain/persistence/ directory
- [ ] Implement GitBackedStateManager class
- [ ] Add git worktree creation/deletion
- [ ] Write unit tests

// Day 3-4: State serialization
- [ ] Implement state save/load
- [ ] Add compression support
- [ ] Handle git commits
- [ ] Write integration tests

// Day 5: Integration
- [ ] Integrate with BrainOrchestrator
- [ ] Update BaseAgent to use persistence
- [ ] Add error handling
- [ ] Documentation
```

**Deliverables**:
- `src/brain/persistence/git-backed-state.ts`
- `src/brain/persistence/worktree-manager.ts`
- `tests/brain/persistence/git-backed-state.test.ts`
- Documentation in `docs/persistence.md`

**Success Criteria**:
- ✅ Agent state persists across restarts
- ✅ <100ms save latency
- ✅ 100% test coverage

---

#### Week 2: Persistent Mailbox

**Goals**:
- ✅ Implement PersistentMailboxManager
- ✅ Message persistence
- ✅ Inbox/outbox management

**Tasks**:
```typescript
// Day 1-2: Mailbox core
- [ ] Create src/brain/messaging/ directory
- [ ] Implement PersistentMailboxManager
- [ ] Add message CRUD operations
- [ ] Write unit tests

// Day 3-4: Integration
- [ ] Integrate with MessageBus
- [ ] Update agents to check mailbox on startup
- [ ] Add message archiving
- [ ] Write integration tests

// Day 5: Polish
- [ ] Add message filtering
- [ ] Implement message search
- [ ] Performance optimization
- [ ] Documentation
```

**Deliverables**:
- `src/brain/messaging/persistent-mailbox.ts`
- `src/brain/messaging/message-store.ts`
- `tests/brain/messaging/persistent-mailbox.test.ts`
- Documentation in `docs/messaging.md`

**Success Criteria**:
- ✅ 100% message delivery guarantee
- ✅ Messages survive crashes
- ✅ <50ms message send latency

---

#### Week 3: State Recovery

**Goals**:
- ✅ Automatic crash recovery
- ✅ State validation
- ✅ Rollback capability

**Tasks**:
```typescript
// Day 1-2: Recovery logic
- [ ] Implement StateRecoveryManager
- [ ] Add crash detection
- [ ] Implement recovery workflow
- [ ] Write unit tests

// Day 3-4: Validation
- [ ] Add state validation
- [ ] Implement consistency checks
- [ ] Add corruption detection
- [ ] Write integration tests

// Day 5: Rollback
- [ ] Implement rollback mechanism
- [ ] Add rollback UI/CLI
- [ ] Performance testing
- [ ] Documentation
```

**Deliverables**:
- `src/brain/persistence/state-recovery.ts`
- `src/brain/persistence/state-validator.ts`
- `tests/brain/persistence/state-recovery.test.ts`
- Documentation in `docs/recovery.md`

**Success Criteria**:
- ✅ 95% successful recovery rate
- ✅ <5s recovery time
- ✅ Zero data loss

---

### Phase 2: Convoy System (Weeks 4-5)

#### Week 4: Convoy Core

**Goals**:
- ✅ Implement ConvoyManager
- ✅ Task grouping
- ✅ Progress tracking

**Tasks**:
```typescript
// Day 1-2: Core implementation
- [ ] Create src/brain/convoy/ directory
- [ ] Implement ConvoyManager class
- [ ] Add convoy CRUD operations
- [ ] Write unit tests

// Day 3-4: Progress tracking
- [ ] Implement ProgressTracker
- [ ] Add real-time updates
- [ ] Integrate with task system
- [ ] Write integration tests

// Day 5: Persistence
- [ ] Integrate with GitBackedState
- [ ] Add convoy persistence
- [ ] Performance optimization
- [ ] Documentation
```

**Deliverables**:
- `src/brain/convoy/convoy-manager.ts`
- `src/brain/convoy/convoy-types.ts`
- `src/brain/convoy/progress-tracker.ts`
- `tests/brain/convoy/convoy-manager.test.ts`
- Documentation in `docs/convoy.md`

**Success Criteria**:
- ✅ Real-time progress updates
- ✅ <10ms update latency
- ✅ 100% task tracking accuracy

---

#### Week 5: Convoy CLI & Notifications

**Goals**:
- ✅ CLI commands for convoy management
- ✅ Notification system
- ✅ User interface

**Tasks**:
```typescript
// Day 1-2: CLI commands
- [ ] Add 'ccjk convoy create' command
- [ ] Add 'ccjk convoy list' command
- [ ] Add 'ccjk convoy show' command
- [ ] Add 'ccjk convoy add' command
- [ ] Write CLI tests

// Day 3-4: Notifications
- [ ] Implement NotificationManager
- [ ] Add email notifications (optional)
- [ ] Add terminal notifications
- [ ] Write notification tests

// Day 5: UI polish
- [ ] Add progress bars
- [ ] Add colored output
- [ ] Add interactive mode
- [ ] Documentation
```

**Deliverables**:
- `src/commands/convoy.ts`
- `src/brain/convoy/notification-manager.ts`
- `tests/commands/convoy.test.ts`
- Documentation in `docs/convoy-cli.md`

**Success Criteria**:
- ✅ Intuitive CLI interface
- ✅ Real-time notifications
- ✅ 90% user satisfaction

---

### Phase 3: Mayor Agent (Weeks 6-7)

#### Week 6: Mayor Core

**Goals**:
- ✅ Implement MayorAgent
- ✅ Intent analysis
- ✅ Task planning

**Tasks**:
```typescript
// Day 1-2: Mayor agent
- [ ] Create src/brain/mayor/ directory
- [ ] Implement MayorAgent class
- [ ] Add request processing
- [ ] Write unit tests

// Day 3-4: Intent analysis
- [ ] Implement IntentAnalyzer
- [ ] Add LLM integration
- [ ] Add intent classification
- [ ] Write integration tests

// Day 5: Task planning
- [ ] Implement TaskPlanner
- [ ] Add task decomposition
- [ ] Add agent selection
- [ ] Documentation
```

**Deliverables**:
- `src/brain/mayor/mayor-agent.ts`
- `src/brain/mayor/intent-analyzer.ts`
- `src/brain/mayor/task-planner.ts`
- `tests/brain/mayor/mayor-agent.test.ts`
- Documentation in `docs/mayor.md`

**Success Criteria**:
- ✅ 85% intent understanding accuracy
- ✅ Automatic convoy creation
- ✅ Intelligent agent selection

---

#### Week 7: Mayor Integration & Monitoring

**Goals**:
- ✅ Integrate Mayor with orchestrator
- ✅ Progress monitoring
- ✅ Result summarization

**Tasks**:
```typescript
// Day 1-2: Integration
- [ ] Integrate Mayor with BrainOrchestrator
- [ ] Add Mayor CLI command
- [ ] Update agent spawning
- [ ] Write integration tests

// Day 3-4: Monitoring
- [ ] Implement convoy monitoring
- [ ] Add real-time updates
- [ ] Add progress visualization
- [ ] Write monitoring tests

// Day 5: Summarization
- [ ] Implement result summarization
- [ ] Add human-readable reports
- [ ] Add export functionality
- [ ] Documentation
```

**Deliverables**:
- `src/commands/mayor.ts`
- `src/brain/mayor/convoy-monitor.ts`
- `src/brain/mayor/result-summarizer.ts`
- `tests/commands/mayor.test.ts`
- Documentation in `docs/mayor-cli.md`

**Success Criteria**:
- ✅ 70% reduction in user commands
- ✅ Automatic progress monitoring
- ✅ Clear result summaries

---

### Phase 4: Workflow Formulas (Week 8)

#### Week 8: Formula System

**Goals**:
- ✅ Implement WorkflowFormulaEngine
- ✅ TOML parsing
- ✅ Dependency resolution

**Tasks**:
```typescript
// Day 1-2: Formula engine
- [ ] Create src/config/formula/ directory
- [ ] Implement WorkflowFormulaEngine
- [ ] Add TOML parsing
- [ ] Write unit tests

// Day 3-4: Execution
- [ ] Implement dependency graph builder
- [ ] Add step execution
- [ ] Add variable substitution
- [ ] Write integration tests

// Day 5: CLI & examples
- [ ] Add 'ccjk formula' commands
- [ ] Create example formulas
- [ ] Add formula validation
- [ ] Documentation
```

**Deliverables**:
- `src/config/formula/formula-engine.ts`
- `src/config/formula/formula-parser.ts`
- `src/commands/formula.ts`
- `.ccjk/formulas/release.toml` (example)
- `tests/config/formula/formula-engine.test.ts`
- Documentation in `docs/formulas.md`

**Success Criteria**:
- ✅ 100% dependency resolution accuracy
- ✅ Variable substitution works
- ✅ 80% workflow reusability

---

## 📦 File Structure Changes

```
src/
├── brain/
│   ├── persistence/          # NEW
│   │   ├── git-backed-state.ts
│   │   ├── worktree-manager.ts
│   │   ├── state-recovery.ts
│   │   └── state-validator.ts
│   ├── messaging/            # NEW
│   │   ├── persistent-mailbox.ts
│   │   └── message-store.ts
│   ├── convoy/               # NEW
│   │   ├── convoy-manager.ts
│   │   ├── convoy-types.ts
│   │   ├── progress-tracker.ts
│   │   └── notification-manager.ts
│   ├── mayor/                # NEW
│   │   ├── mayor-agent.ts
│   │   ├── intent-analyzer.ts
│   │   ├── task-planner.ts
│   │   ├── convoy-monitor.ts
│   │   └── result-summarizer.ts
│   └── orchestrator.ts       # MODIFIED
├── config/
│   └── formula/              # NEW
│       ├── formula-engine.ts
│       └── formula-parser.ts
├── commands/
│   ├── convoy.ts             # NEW
│   ├── mayor.ts              # NEW
│   └── formula.ts            # NEW
└── types/
    ├── convoy.ts             # NEW
    ├── mayor.ts              # NEW
    └── formula.ts            # NEW

tests/
├── brain/
│   ├── persistence/          # NEW
│   ├── messaging/            # NEW
│   ├── convoy/               # NEW
│   └── mayor/                # NEW
├── config/
│   └── formula/              # NEW
└── commands/
    ├── convoy.test.ts        # NEW
    ├── mayor.test.ts         # NEW
    └── formula.test.ts       # NEW

docs/
├── persistence.md            # NEW
├── messaging.md              # NEW
├── convoy.md                 # NEW
├── convoy-cli.md             # NEW
├── mayor.md                  # NEW
├── mayor-cli.md              # NEW
└── formulas.md               # NEW

.ccjk/
├── workspace/                # NEW - Git workspace
│   ├── .git/
│   └── agents/
│       ├── agent-1/
│       ├── agent-2/
│       └── ...
└── formulas/                 # NEW - Formula templates
    ├── release.toml
    ├── test.toml
    └── deploy.toml
```

---

## 🧪 Testing Strategy

### Unit Tests (Target: 90% coverage)
```bash
# Persistence
pnpm test src/brain/persistence/

# Messaging
pnpm test src/brain/messaging/

# Convoy
pnpm test src/brain/convoy/

# Mayor
pnpm test src/brain/mayor/

# Formulas
pnpm test src/config/formula/
```

### Integration Tests
```bash
# End-to-end persistence
pnpm test:e2e persistence

# Convoy workflow
pnpm test:e2e convoy

# Mayor orchestration
pnpm test:e2e mayor
```

### Performance Tests
```bash
# State save/load latency
pnpm test:perf persistence

# Message throughput
pnpm test:perf messaging

# Convoy update latency
pnpm test:perf convoy
```

---

## 📊 Progress Tracking

### Phase 1: Persistence Foundation
- [ ] Week 1: Git-Backed State Core
- [ ] Week 2: Persistent Mailbox
- [ ] Week 3: State Recovery

### Phase 2: Convoy System
- [ ] Week 4: Convoy Core
- [ ] Week 5: Convoy CLI & Notifications

### Phase 3: Mayor Agent
- [ ] Week 6: Mayor Core
- [ ] Week 7: Mayor Integration & Monitoring

### Phase 4: Workflow Formulas
- [ ] Week 8: Formula System

---

## 🎯 Milestones

### Milestone 1: Persistence (Week 3)
**Deliverables**:
- ✅ Git-backed state persistence
- ✅ Persistent mailbox
- ✅ Automatic crash recovery

**Demo**: Agent survives crash and resumes work

---

### Milestone 2: Convoy (Week 5)
**Deliverables**:
- ✅ Convoy management system
- ✅ Progress tracking
- ✅ CLI commands

**Demo**: Create convoy, track progress, receive notifications

---

### Milestone 3: Mayor (Week 7)
**Deliverables**:
- ✅ Mayor agent
- ✅ Intent analysis
- ✅ Automatic orchestration

**Demo**: Natural language request → automatic convoy creation

---

### Milestone 4: Formulas (Week 8)
**Deliverables**:
- ✅ Formula engine
- ✅ TOML parsing
- ✅ Example formulas

**Demo**: Execute release formula with variables

---

## 🚀 Release Plan

### v7.0.0-alpha.1 (Week 3)
- Git-backed persistence
- Persistent mailbox
- State recovery

### v7.0.0-alpha.2 (Week 5)
- Convoy system
- Progress tracking
- CLI commands

### v7.0.0-beta.1 (Week 7)
- Mayor agent
- Intent analysis
- Automatic orchestration

### v7.0.0 (Week 8)
- Workflow formulas
- Complete documentation
- Production ready

---

## 📝 Documentation Plan

### User Documentation
- [ ] Getting Started with Persistence
- [ ] Convoy User Guide
- [ ] Mayor Agent Tutorial
- [ ] Formula Writing Guide
- [ ] Migration Guide (v6 → v7)

### Developer Documentation
- [ ] Persistence Architecture
- [ ] Convoy System Design
- [ ] Mayor Agent Implementation
- [ ] Formula Engine Internals
- [ ] API Reference

### Examples
- [ ] Basic convoy usage
- [ ] Mayor natural language examples
- [ ] Formula templates
- [ ] Recovery scenarios

---

## 🔧 Configuration Changes

### New Config Options
```typescript
// ~/.ccjk/config.json
{
  "brain": {
    // Existing options...

    // NEW: Persistence
    "persistence": {
      "enabled": true,
      "workspaceRoot": "~/.ccjk/workspace",
      "useWorktrees": true,
      "autoCommit": true,
      "compressionLevel": 6
    },

    // NEW: Convoy
    "convoy": {
      "enabled": true,
      "notifyOnComplete": true,
      "notifyOnFailure": true,
      "progressUpdateInterval": 5000
    },

    // NEW: Mayor
    "mayor": {
      "enabled": true,
      "autoCreateConvoy": true,
      "autoSpawnWorkers": true,
      "monitoringInterval": 5000
    },

    // NEW: Formulas
    "formulas": {
      "enabled": true,
      "formulaDir": "~/.ccjk/formulas",
      "autoValidate": true
    }
  }
}
```

---

## 🎓 Training & Onboarding

### Week 1-3: Persistence
- Internal demo of persistence features
- Documentation review
- Alpha testing with team

### Week 4-5: Convoy
- Convoy system demo
- CLI training
- Beta testing with users

### Week 6-7: Mayor
- Mayor agent demo
- Natural language examples
- User feedback collection

### Week 8: Formulas
- Formula writing workshop
- Template creation
- Production rollout

---

**Document Version**: 1.0
**Last Updated**: 2026-02-03
**Status**: Ready for Implementation
