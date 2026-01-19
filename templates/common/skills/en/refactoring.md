---
name: refactoring
description: Intelligent code refactoring with safety checks and best practices
version: 1.0.0
author: CCJK
category: dev
triggers:
  - /refactor
  - /rf
  - /cleanup
use_when:
  - "User wants to refactor code"
  - "Code needs cleanup"
  - "Improve code structure"
  - "User mentions refactoring"
auto_activate: true
priority: 7
difficulty: intermediate
tags:
  - refactoring
  - code-quality
  - cleanup
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - mcp__ide__getDiagnostics
  - Bash(npm test)
  - Bash(pnpm test)
  - Bash(yarn test)
context: fork
user-invocable: true
hooks:
  - type: PreToolUse
    matcher: Edit
    command: echo "Creating backup before edit..."
  - type: PostToolUse
    matcher: Edit
    command: echo "Edit completed, verifying..."
---

# Refactoring

## Context
$ARGUMENTS

## Instructions

Follow safe and systematic refactoring practices:

### Safety First

Before any refactoring:

1. **Verify Tests Exist**
   - Check for existing test coverage
   - Run tests to ensure they pass
   - If no tests exist, write them first

2. **Create Backup**
   - Git commit current state
   - Or create manual backup of files

3. **Small Steps**
   - Make one change at a time
   - Test after each change
   - Commit frequently

### Refactoring Catalog

Choose the appropriate refactoring technique:

#### 1. Extract Method
**When**: Function is too long or has duplicated code
**How**:
```typescript
// Before
function processOrder(order) {
  // validate order
  if (!order.items || order.items.length === 0) {
    throw new Error('Empty order')
  }
  // calculate total
  let total = 0
  for (const item of order.items) {
    total += item.price * item.quantity
  }
  // apply discount
  if (order.coupon) {
    total *= (1 - order.coupon.discount)
  }
  return total
}

// After
function processOrder(order) {
  validateOrder(order)
  const subtotal = calculateSubtotal(order.items)
  return applyDiscount(subtotal, order.coupon)
}

function validateOrder(order) {
  if (!order.items || order.items.length === 0) {
    throw new Error('Empty order')
  }
}

function calculateSubtotal(items) {
  return items.reduce((sum, item) =>
    sum + item.price * item.quantity, 0)
}

function applyDiscount(amount, coupon) {
  return coupon ? amount * (1 - coupon.discount) : amount
}
```

#### 2. Rename Symbol
**When**: Name doesn't clearly express intent
**How**:
- Use IDE refactoring tools when possible
- Search and replace carefully
- Update documentation and comments

```typescript
// Before
function calc(x, y) { return x * y }

// After
function calculateArea(width, height) {
  return width * height
}
```

#### 3. Move to Module
**When**: Code belongs in different module
**How**:
- Identify logical grouping
- Move related functions together
- Update imports/exports

```typescript
// Before: utils.ts
export function validateEmail(email) { ... }
export function sendEmail(to, subject) { ... }
export function formatDate(date) { ... }

// After: email.ts
export function validateEmail(email) { ... }
export function sendEmail(to, subject) { ... }

// After: date.ts
export function formatDate(date) { ... }
```

#### 4. Inline Variable
**When**: Variable doesn't add clarity
**How**:
```typescript
// Before
const isValid = user.age >= 18
return isValid

// After
return user.age >= 18
```

#### 5. Extract Interface
**When**: Multiple implementations share behavior
**How**:
```typescript
// Before
class FileLogger {
  log(message: string) { ... }
}
class ConsoleLogger {
  log(message: string) { ... }
}

// After
interface Logger {
  log(message: string): void
}

class FileLogger implements Logger {
  log(message: string) { ... }
}

class ConsoleLogger implements Logger {
  log(message: string) { ... }
}
```

#### 6. Replace Conditional with Polymorphism
**When**: Complex conditionals based on type
**How**:
```typescript
// Before
function getSpeed(vehicle) {
  if (vehicle.type === 'car') {
    return vehicle.enginePower * 2
  } else if (vehicle.type === 'bike') {
    return vehicle.gears * 10
  } else if (vehicle.type === 'plane') {
    return vehicle.thrust * 100
  }
}

// After
interface Vehicle {
  getSpeed(): number
}

class Car implements Vehicle {
  getSpeed() { return this.enginePower * 2 }
}

class Bike implements Vehicle {
  getSpeed() { return this.gears * 10 }
}

class Plane implements Vehicle {
  getSpeed() { return this.thrust * 100 }
}
```

#### 7. Simplify Conditional
**When**: Complex boolean logic
**How**:
```typescript
// Before
if (user.age >= 18 && user.hasLicense && !user.isSuspended) {
  allowDriving()
}

// After
function canDrive(user) {
  return user.age >= 18
    && user.hasLicense
    && !user.isSuspended
}

if (canDrive(user)) {
  allowDriving()
}
```

#### 8. Remove Dead Code
**When**: Code is never executed
**How**:
- Use coverage tools to identify
- Check git history for context
- Remove confidently with version control

### Step-by-Step Process

```markdown
## Refactoring Session: [Target]

### 1. Pre-Refactoring
- [ ] Tests exist and pass
- [ ] Code committed to git
- [ ] Refactoring goal identified

### 2. Refactoring Steps
**Step 1**: [Refactoring technique]
- Files affected: [list]
- Changes: [description]
- Tests: ✅ Passing

**Step 2**: [Next technique]
- Files affected: [list]
- Changes: [description]
- Tests: ✅ Passing

### 3. Post-Refactoring
- [ ] All tests still pass
- [ ] Code is cleaner/clearer
- [ ] No functionality changed
- [ ] Documentation updated
- [ ] Changes committed
```

### Verification Checklist

After refactoring, verify:

- [ ] **Tests Pass**: All existing tests still pass
- [ ] **Behavior Unchanged**: Functionality is identical
- [ ] **Code Quality Improved**: Code is cleaner/clearer
- [ ] **No New Issues**: No new bugs introduced
- [ ] **Documentation Updated**: Comments and docs reflect changes
- [ ] **Performance Maintained**: No performance regression

### Red Flags - Stop Refactoring If:

- Tests start failing unexpectedly
- You're changing behavior, not structure
- You're adding features (that's not refactoring)
- You've been refactoring for hours without committing
- You're not sure what the code does

### Best Practices

1. **Refactor OR Add Features, Never Both**
   - Separate refactoring commits from feature commits
   - Makes code review easier
   - Easier to revert if needed

2. **Keep Tests Green**
   - Run tests frequently
   - Fix failing tests immediately
   - Don't continue if tests are red

3. **Small, Focused Changes**
   - One refactoring technique at a time
   - Commit after each successful refactoring
   - Easy to review and understand

4. **Use IDE Tools**
   - Automated refactoring is safer
   - Less prone to typos
   - Updates all references automatically

5. **Code Smells to Watch For**
   - Long functions (>20 lines)
   - Duplicated code
   - Large classes (>300 lines)
   - Long parameter lists (>3 params)
   - Complex conditionals
   - Magic numbers/strings

### Common Refactoring Patterns

**Pattern 1: Extract and Compose**
```
Long function → Extract methods → Compose readable flow
```

**Pattern 2: Consolidate Duplication**
```
Duplicated code → Extract common logic → Reuse
```

**Pattern 3: Simplify Complexity**
```
Complex logic → Break into steps → Clear intent
```

**Pattern 4: Improve Names**
```
Unclear names → Rename → Self-documenting code
```

### Output Format

```markdown
## Refactoring Complete: [Target]

### Changes Made
1. **[Technique]**: [Description]
   - Files: [list]
   - Reason: [why this refactoring]

2. **[Technique]**: [Description]
   - Files: [list]
   - Reason: [why this refactoring]

### Metrics
- Lines of code: [before] → [after]
- Functions: [before] → [after]
- Complexity: [before] → [after]

### Verification
- ✅ All tests pass
- ✅ Behavior unchanged
- ✅ Code quality improved
- ✅ Documentation updated

### Next Steps
- [Optional follow-up refactorings]
```
