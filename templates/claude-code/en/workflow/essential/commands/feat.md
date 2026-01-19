---
description: 'Feature Development Command - Intelligent Planning, Design, and Implementation Workflow'
argument-hint: <feature description> [--plan] [--design] [--execute] [--quick]
# examples:
#   - /feat user login feature                  # Full flow: Plan → Design → Implement
#   - /feat add dark mode --plan                # Generate planning doc only
#   - /feat shopping cart --design              # Skip planning, go to design
#   - /feat fix form validation --quick         # Quick mode, simplified flow
#   - /feat --execute                           # Continue executing existing plan
---

# Feature Development Command

> **Core Philosophy**: Plan First, Design-Driven, Quality Priority

## Usage

```bash
/feat <feature description> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--plan` | Generate planning document only, don't execute |
| `--design` | Skip planning, go directly to UI design |
| `--execute` | Continue executing existing plan |
| `--quick` | Quick mode, simplified workflow |

---

## Feature Description

$ARGUMENTS

---

## Intelligent Workflow

### Phase 0: Input Analysis

For each input, first perform **type identification** and clearly communicate:

```
📋 Operation Type: [Requirement Planning | Discussion Iteration | Execution Implementation]
```

**Identification Criteria**:

| Type | Trigger Condition | Example Input |
|------|-------------------|---------------|
| 🆕 Requirement Planning | New feature request, project idea | "Add user auth", "Implement cart" |
| 🔄 Discussion Iteration | Modify, refine existing plan | "Adjust the approach", "Continue discussion" |
| ⚡ Execution Implementation | Confirm to start implementation | "Start executing", "Implement as planned" |

---

### Phase 1: Requirement Planning 🆕

**Trigger**: Identified as new feature requirement

**Execution Flow**:

1. **Enable Planner Agent** for deep analysis
2. **Generate planning document** stored in `.ccjk/plan/current/`
3. **Document naming**: `feature-name.md`

**Planning Document Structure**:

```markdown
# Feature Plan: [Feature Name]

## 📋 Overview
- Feature objective
- Expected value
- Impact scope

## 🎯 Feature Breakdown
- [ ] Sub-feature 1
- [ ] Sub-feature 2
- [ ] Sub-feature 3

## 📐 Technical Approach
- Architecture design
- Data model
- API design

## ✅ Acceptance Criteria
- Functional acceptance points
- Performance metrics
- Test coverage

## ⏱️ Implementation Plan
- Phase breakdown
- Time estimation
- Dependencies
```

---

### Phase 2: Discussion Iteration 🔄

**Trigger**: User requests to modify or refine plan

**Execution Flow**:

1. **Retrieve previous plan** from `.ccjk/plan/current/`
2. **Analyze user feedback** identify modification points
3. **Enable Planner Agent** for re-planning
4. **Version management**:
   - Original file: `feature-name.md`
   - Iteration versions: `feature-name-v2.md`, `feature-name-v3.md`

**Iteration Record**:

```markdown
## 📝 Iteration History

### v2 - [timestamp]
- Modification 1
- Modification 2

### v1 - [timestamp]
- Initial version
```

---

### Phase 3: Execution Implementation ⚡

**Trigger**: User confirms plan is complete

**Execution Flow**:

```
┌─────────────────────────────────────────────────────────┐
│  📋 Read Planning Document                              │
│       ↓                                                 │
│  🔍 Identify Subtask Types                              │
│       ↓                                                 │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │ Frontend    │ Backend     │ Other       │           │
│  │ Tasks       │ Tasks       │ Tasks       │           │
│  │     ↓       │     ↓       │     ↓       │           │
│  │ UI Design   │ Direct      │ Direct      │           │
│  │ Check       │ Implement   │ Implement   │           │
│  │     ↓       │             │             │           │
│  │ No Design?  │             │             │           │
│  │     ↓       │             │             │           │
│  │ UI-UX Agent │             │             │           │
│  └─────────────┴─────────────┴─────────────┘           │
│       ↓                                                 │
│  ✅ Complete and Update Status                          │
└─────────────────────────────────────────────────────────┘
```

**Frontend Task Special Handling**:

1. **Check UI Design** - Does design exist?
2. **No Design** - Must invoke `UI-UX-Designer Agent`
3. **After Design** - Proceed with development

---

## Quick Commands

During feature development, use these shortcuts:

| Command | Description |
|---------|-------------|
| `!plan` | View current planning document |
| `!status` | View task completion status |
| `!next` | Execute next subtask |
| `!pause` | Pause execution, save progress |
| `!design` | Invoke UI-UX-Designer |
| `!test` | Generate tests for current feature |

---

## State Management

### Task Status Tracking

```markdown
## 📊 Execution Status

| Subtask | Status | Progress |
|---------|--------|----------|
| Data model design | ✅ Complete | 100% |
| API development | 🔄 In Progress | 60% |
| Frontend implementation | ⏳ Pending | 0% |
| Unit test writing | ⏳ Pending | 0% |
```

### Progress Visualization

```
Overall Progress: [████████░░░░░░░░] 50%

✅ Completed: 2/4 subtasks
🔄 In Progress: 1/4 subtasks
⏳ Pending: 1/4 subtasks
```

---

## Quality Assurance

### Mandatory Checkpoints

1. **Planning Phase** - Must include acceptance criteria
2. **Design Phase** - Frontend tasks must have UI design
3. **Implementation Phase** - Update status after each subtask
4. **Completion Phase** - Verify against acceptance criteria

### Code Quality Requirements

- Follow existing project code style
- Add necessary type definitions
- Write unit tests (coverage > 80%)
- Update relevant documentation

---

## Output Format

### Response Structure

```
📋 Operation Type: [Type]
📍 Current Phase: [Phase]
📊 Overall Progress: [Progress Bar]

---

[Specific Content]

---

💡 Next Step: [Suggested Action]
```

---

## Start Execution

**Feature Request**: $ARGUMENTS

Analyzing input type and initiating appropriate workflow...
