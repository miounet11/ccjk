---
description: Linear Quality Method - Problem validation → Prioritization → Focused building, Linear team's product quality philosophy
allowed-tools: Read(**), Write(**), Exec(npm run dev, npm test)
argument-hint: [--validate] [--prioritize] [--focus-mode]
# examples:
#   - /linear-method                    # Start Linear workflow
#   - /linear-method --validate         # Problem validation phase
#   - /linear-method --prioritize       # Prioritization
#   - /linear-method --focus-mode       # Focused building mode
---

# Linear Quality Method

Based on Linear team's product development philosophy: rigorous problem validation, prioritization, and focused building for high-quality software.

---

## Core Philosophy

Linear is a project management tool known for speed and quality. Their development methodology emphasizes:

**1. Problem-First**
- Understand the problem before considering solutions
- Validate that the problem actually exists
- Assess the problem's impact scope

**2. Quality Over Speed**
- Better to be slow and right than fast and wrong
- Technical debt is the biggest enemy
- Every feature requires careful consideration

**3. Focus on Building**
- Minimize meetings and interruptions
- Long periods of deep work
- Do one thing at a time

**4. User Experience**
- Every detail matters
- Performance is a feature
- Simplicity over complexity

---

## Linear Workflow

### Phase 1: Problem Validation

**Goal**: Ensure we're solving real and important problems

#### 1.1 Problem Statement

Using Linear's problem template:

```markdown
## Problem Statement

### What is the problem?
[Clear description of the problem]

### Who is affected?
- [ ] All users
- [ ] Specific user segment: [describe]
- [ ] Internal team
- [ ] External partners

### How often does this occur?
- [ ] Every time
- [ ] Frequently (daily)
- [ ] Occasionally (weekly)
- [ ] Rarely (monthly)

### What is the impact?
- [ ] Blocker (prevents work)
- [ ] Major (significant friction)
- [ ] Minor (small annoyance)
- [ ] Nice to have

### Evidence
- User feedback: [links]
- Analytics data: [metrics]
- Support tickets: [count]
- Team observations: [notes]
```

#### 1.2 Validation Checklist

```markdown
## Validation Checklist

- [ ] Problem description is clear and specific (not a solution)
- [ ] Supported by real user feedback or data
- [ ] Impact scope is quantified
- [ ] Consequences of not solving are assessed
- [ ] Aligns with product vision
- [ ] Not an XY problem (user wants X, we think they want Y)
```

#### 1.3 Anti-patterns: Fake Problems

```markdown
❌ Bad: "We need to add a new settings page"
→ This is a solution, not a problem

✅ Good: "Users cannot customize notification preferences, leading to
         too many irrelevant notifications. 50+ users complain daily
         in support channels about this issue"

❌ Bad: "Code needs refactoring"
→ Doesn't explain why refactoring is needed

✅ Good: "Current auth module complexity causes each new feature to take
         3 days, while competitors need only half a day, affecting our
         iteration speed"
```

---

### Phase 2: Prioritization

**Goal**: Do the most important things with limited time

#### 2.1 RICE Scoring Framework

Linear uses RICE framework for priority assessment:

```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach: How many users affected?
- 1000+ users = 10
- 100-1000 users = 5
- 10-100 users = 2
- < 10 users = 1

Impact: How much does it affect users?
- Massive (3.0): Core feature, significantly improves experience
- High (2.0): Important feature, clearly improves experience
- Medium (1.0): Useful feature, moderately improves experience
- Low (0.5): Small improvement
- Minimal (0.25): Tiny improvement

Confidence: How certain are we?
- High (100%): Data-supported
- Medium (80%): Some evidence
- Low (50%): Based on assumptions

Effort: How many person-months?
- In person-months (1 person-month = 1 person working 1 month)
```

#### 2.2 Priority Examples

```markdown
## Feature: Keyboard Shortcuts

Reach: 8 (80% of active users)
Impact: 2.0 (High - significantly improves efficiency)
Confidence: 100% (strong user demand)
Effort: 2 person-months

RICE Score = (8 × 2.0 × 1.0) / 2 = 8.0

---

## Feature: Dark Mode

Reach: 10 (all users)
Impact: 1.0 (Medium - improves experience)
Confidence: 80% (some users requested)
Effort: 3 person-months

RICE Score = (10 × 1.0 × 0.8) / 3 = 2.67

---

## Bug: Inaccurate Search Results

Reach: 9 (90% users use search)
Impact: 3.0 (Massive - core feature broken)
Confidence: 100% (clear reproduction steps)
Effort: 1 person-month

RICE Score = (9 × 3.0 × 1.0) / 1 = 27.0  ← Highest priority
```

#### 2.3 Priority Matrix

```
High    │ 🔥 Do Now         │ 📅 Plan to Do
Impact  │ (Quick Wins)     │ (Major Projects)
        │                  │
────────┼──────────────────┼──────────────────
        │                  │
Low     │ 🤔 Consider      │ ❌ Don't Do
Impact  │ (Fill-ins)       │ (Time Sinks)
        │                  │
         Low Effort         High Effort
```

#### 2.4 The Art of Saying No

Linear team is famous for saying "no":

```markdown
## When to Say No

❌ Feature request from single user (unless key customer)
❌ Complex solution with small impact
❌ Doesn't align with product vision
❌ Simpler alternatives exist
❌ Maintenance cost exceeds value

## How to Say No

✅ "Thanks for the feedback! We understand this need, but it's currently
    lower priority as only 2% of users would use it. We'll continue monitoring."

✅ "This is a good idea, but implementation cost is high (3 months),
    and we have higher priority problems to solve."

✅ "We've considered this approach, but it would increase product complexity,
    which conflicts with our 'keep it simple' philosophy."
```

---

### Phase 3: Spec Writing

**Goal**: Clarify all details before coding

#### 3.1 Linear Spec Template

```markdown
# [Feature Name]

## Problem
[Copy problem statement from Phase 1]

## Goals
- Primary goal: [core objective]
- Secondary goals: [secondary objectives]
- Non-goals: [explicitly what we won't do]

## User Stories

As a [role], I want to [action] so that [benefit].

### Example
As a developer, I want to use keyboard shortcuts
so that I can navigate the app without using the mouse.

## Solution

### Overview
[High-level solution description]

### User Flow
1. User presses `Cmd+K`
2. Command palette opens
3. User types "create issue"
4. Matching commands are filtered
5. User presses Enter
6. Issue creation dialog opens

### UI/UX Design
[Figma link or screenshots]

### Technical Approach

#### Architecture
```typescript
// Core interface design
interface KeyboardShortcut {
  key: string
  modifiers: Modifier[]
  action: () => void
  description: string
}

class ShortcutManager {
  register(shortcut: KeyboardShortcut): void
  unregister(key: string): void
  execute(event: KeyboardEvent): void
}
```

#### Data Model
[Database schema or state structure]

#### API Changes
[New or modified APIs]

### Edge Cases
- What if user presses conflicting shortcuts?
- What if shortcut is already used by browser?
- What if user is in an input field?

### Performance Considerations
- Shortcut registration: O(1)
- Shortcut lookup: O(1) using Map
- No impact on initial load time

### Accessibility
- All shortcuts must have mouse alternatives
- Shortcuts must be discoverable (help menu)
- Support for screen readers

### Security
- No security implications

## Success Metrics

- 30% of users adopt keyboard shortcuts within 1 month
- Average task completion time reduces by 20%
- NPS score increases by 5 points

## Rollout Plan

### Phase 1: Internal Beta (Week 1)
- Deploy to team
- Gather feedback
- Fix critical bugs

### Phase 2: Public Beta (Week 2-3)
- Deploy to 10% of users
- Monitor metrics
- Iterate based on feedback

### Phase 3: General Availability (Week 4)
- Deploy to all users
- Announce in changelog
- Create help documentation

## Open Questions

- [ ] Should shortcuts be customizable?
- [ ] Which shortcuts should be enabled by default?
- [ ] How to handle conflicts with browser shortcuts?

## Timeline

- Spec review: 2 days
- Implementation: 1.5 weeks
- Testing: 2 days
- Beta: 1 week
- GA: Week 4

Total: 4 weeks
```

---

### Phase 4: Focused Building

**Goal**: Build features with high quality and efficiency

#### 4.1 Deep Work Principles

Linear team advocates deep work:

```markdown
## Deep Work Principles

### 1. Long Focus Blocks
- Minimum 2 hours uninterrupted work
- Turn off all notifications
- Use Pomodoro technique (optional)

### 2. Minimize Meetings
- Maximum 5 hours of meetings per week
- Async communication first
- Meetings must have clear agenda

### 3. Batch Communication
- Check messages at fixed times (e.g., 10am, 3pm)
- Don't immediately reply to non-urgent messages
- Use status indicators (focused/available)

### 4. Single-Task Mode
- Work on one issue at a time
- Finish before starting next
- Avoid context switching
```

#### 4.2 Code Quality Standards

```typescript
// Linear's code quality standards

// ✅ Good: Clear naming
function calculateMonthlyRecurringRevenue(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + sub.monthlyPrice, 0)
}

// ❌ Bad: Vague naming
function calc(data: any[]): number {
  return data.filter(d => d.s === 'a').reduce((s, d) => s + d.p, 0)
}

// ✅ Good: Small functions, single responsibility
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): boolean {
  return password.length >= 8
}

function validateUser(user: User): ValidationResult {
  const errors: string[] = []
  if (!validateEmail(user.email)) errors.push('Invalid email')
  if (!validatePassword(user.password)) errors.push('Password too short')
  return { valid: errors.length === 0, errors }
}

// ❌ Bad: Large function, multiple responsibilities
function validate(user: any): any {
  // 100 lines of validation logic
}
```

#### 4.3 Performance First

```typescript
// Linear's extreme focus on performance

// ✅ Good: Optimized list rendering
function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <VirtualList
      items={issues}
      itemHeight={48}
      renderItem={(issue) => <IssueRow issue={issue} />}
    />
  )
}

// ❌ Bad: Render all items
function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <div>
      {issues.map(issue => <IssueRow key={issue.id} issue={issue} />)}
    </div>
  )
}

// ✅ Good: Debounced search
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchIssues(query)
  }, 300),
  []
)

// ✅ Good: Optimistic updates
function updateIssue(id: string, data: Partial<Issue>) {
  // Update UI immediately
  setIssues(prev => prev.map(issue =>
    issue.id === id ? { ...issue, ...data } : issue
  ))

  // Sync in background
  api.updateIssue(id, data).catch(() => {
    // Revert on failure
    revertIssue(id)
  })
}
```

---

### Phase 5: Quality Assurance

**Goal**: Ensure released features meet Linear's quality standards

#### 5.1 Testing Checklist

```markdown
## Testing Checklist

### Functional Testing
- [ ] All user scenarios work correctly
- [ ] Edge cases tested
- [ ] Error handling correct

### Performance Testing
- [ ] Page load time < 1s
- [ ] Interaction response time < 100ms
- [ ] No memory leaks

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets standards

### Cross-browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive layout correct
```

---

### Phase 6: Launch & Iterate

**Goal**: Successfully launch and continuously improve

#### 6.1 Launch Checklist

```markdown
## Launch Checklist

### Pre-launch
- [ ] All tests pass
- [ ] Performance metrics meet standards
- [ ] Documentation updated
- [ ] Team trained

### Launch
- [ ] Deploy to production
- [ ] Monitor key metrics
- [ ] Prepare rollback plan

### Post-launch
- [ ] Publish announcement
- [ ] Collect user feedback
- [ ] Monitor error rates
- [ ] Analyze usage data
```

#### 6.2 Success Metrics Tracking

```typescript
// Track key metrics
const metrics = {
  // Usage metrics
  adoptionRate: 0.30,  // 30% users use new feature
  dailyActiveUsers: 1250,
  featureUsagePerUser: 8.5,

  // Performance metrics
  p50Latency: 45,  // ms
  p95Latency: 120,  // ms
  errorRate: 0.001,  // 0.1%

  // Business metrics
  userSatisfaction: 4.8,  // out of 5
  supportTickets: -15,  // 15% reduction
  taskCompletionTime: -20  // 20% reduction
}
```

---

## Linear Principles

### 1. Speed Comes from Quality

```
Low quality → Technical debt → Slower development → More debt → Vicious cycle
High quality → Easy to modify → Faster development → Higher quality → Virtuous cycle
```

### 2. Simplicity Over Complexity

```markdown
❌ Add config options for users to choose
✅ Choose best default

❌ Support all possible use cases
✅ Focus on core use cases

❌ More features is better
✅ Just enough features
```

### 3. Details Matter

```typescript
// Linear's attention to detail

// Animation duration precise to milliseconds
const ANIMATION_DURATION = 150  // ms

// Spacing uses 4px grid system
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
}

// Colors have clear semantics
const COLORS = {
  primary: '#5E6AD2',
  success: '#0FA958',
  warning: '#F2994A',
  error: '#E5484D'
}
```

### 4. UX Everywhere

```markdown
## UX Checklist

- [ ] Loading states (don't make users wait)
- [ ] Error messages (clear error info)
- [ ] Empty states (guide users to start)
- [ ] Keyboard shortcuts (improve efficiency)
- [ ] Undo operations (allow mistakes)
- [ ] Optimistic updates (instant feedback)
- [ ] Progressive enhancement (basic features first)
```

---

## Command Options

- `--validate`: Run problem validation workflow
- `--prioritize`: Use RICE framework for prioritization
- `--focus-mode`: Start focused building mode
- `--quality-check`: Run quality checks

---

## Success Metrics

- ✅ Feature adoption rate > 30%
- ✅ User satisfaction > 4.5/5
- ✅ Performance P95 < 200ms
- ✅ Error rate < 0.1%
- ✅ Technical debt stays low

---

## References

- Linear Blog: "How we build Linear"
- Linear Method: Product development philosophy
- Cal Newport - *Deep Work*
- Basecamp - *Shape Up*
