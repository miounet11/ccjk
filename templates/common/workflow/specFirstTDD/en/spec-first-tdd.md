---
description: SPEC-First TDD Workflow - Specification-first test-driven development with AI-assisted RED-GREEN-REFACTOR cycle
allowed-tools: Read(**), Write(**), Exec(npm test, npm run test:watch, npm run coverage)
argument-hint: [--watch] [--coverage] [--unit-only] [--integration-only]
# examples:
#   - /spec-first-tdd                    # Start complete TDD cycle
#   - /spec-first-tdd --watch            # Watch mode for continuous testing
#   - /spec-first-tdd --coverage         # Generate test coverage report
#   - /spec-first-tdd --unit-only        # Run unit tests only
---

# SPEC-First TDD Workflow

Based on Kent Beck's *Test-Driven Development* and Robert C. Martin's *Clean Code*, enhanced with AI capabilities for modern TDD workflow.

---

## Core Philosophy

**SPEC-First**: Before writing any code, define in natural language:
- **What**: What functionality to implement
- **Why**: Why this functionality is needed
- **How**: How to verify correctness

**RED-GREEN-REFACTOR**:
1. 🔴 **RED**: Write a failing test (define expected behavior)
2. 🟢 **GREEN**: Write simplest code to make test pass
3. ♻️ **REFACTOR**: Improve code design under test protection

---

## Workflow Steps

### Phase 1: SPEC Definition

**Goal**: Clearly define requirements and acceptance criteria in natural language

```markdown
## Feature Specification

### User Story
As a [role], I want [feature] so that [benefit]

### Acceptance Criteria
- Given [context]
- When [action]
- Then [expected outcome]

### Edge Cases
- What if [edge case 1]?
- What if [edge case 2]?

### Non-Functional Requirements
- Performance: [requirement]
- Security: [requirement]
- Accessibility: [requirement]
```

**AI Assistance**:
- Identify missing edge cases
- Suggest test scenario priorities
- Generate test data examples

---

### Phase 2: Test-First

**Goal**: Transform SPEC into executable test cases

#### 2.1 Write Test Skeleton

```typescript
describe('UserAuthentication', () => {
  describe('login', () => {
    it('should return token when credentials are valid', async () => {
      // Arrange
      const credentials = { email: 'user@example.com', password: 'secret' }

      // Act
      const result = await auth.login(credentials)

      // Assert
      expect(result.token).toBeDefined()
      expect(result.user.email).toBe(credentials.email)
    })

    it('should throw error when credentials are invalid', async () => {
      // Arrange
      const credentials = { email: 'user@example.com', password: 'wrong' }

      // Act & Assert
      await expect(auth.login(credentials)).rejects.toThrow('Invalid credentials')
    })
  })
})
```

#### 2.2 Run Tests (Expected to Fail)

```bash
npm test
# ❌ FAIL: UserAuthentication › login › should return token when credentials are valid
# ReferenceError: auth is not defined
```

**Key Principles**:
- Tests must fail first (proves test is valid)
- Failure reason should be clear
- Focus on one test case at a time

---

### Phase 3: Minimal Implementation

**Goal**: Write just enough code to make tests pass (no more, no less)

```typescript
class UserAuthentication {
  async login(credentials: Credentials): Promise<AuthResult> {
    // Simplest implementation: hardcoded return
    if (credentials.email === 'user@example.com' && credentials.password === 'secret') {
      return {
        token: 'fake-token',
        user: { email: credentials.email }
      }
    }
    throw new Error('Invalid credentials')
  }
}
```

#### Run Tests (Expected to Pass)

```bash
npm test
# ✅ PASS: UserAuthentication › login › should return token when credentials are valid
# ✅ PASS: UserAuthentication › login › should throw error when credentials are invalid
```

**Key Principles**:
- Don't over-engineer
- Don't optimize prematurely
- Only write code that makes tests pass

---

### Phase 4: Refactor

**Goal**: Improve code design under test protection

#### 4.1 Identify Code Smells

- Hardcoded values
- Duplicated code
- Long functions
- Unclear naming
- Missing abstractions

#### 4.2 Apply Refactoring Patterns

```typescript
class UserAuthentication {
  constructor(
    private userRepository: UserRepository,
    private tokenService: TokenService,
    private passwordHasher: PasswordHasher
  ) {}

  async login(credentials: Credentials): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(credentials.email)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isPasswordValid = await this.passwordHasher.verify(
      credentials.password,
      user.passwordHash
    )

    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    const token = await this.tokenService.generate(user.id)

    return {
      token,
      user: { email: user.email }
    }
  }
}
```

#### 4.3 Continuous Testing

```bash
npm test -- --watch
# ✅ All tests passing
```

**Key Principles**:
- Small refactoring steps (run tests after each change)
- Keep tests green
- Refactoring doesn't change behavior

---

### Phase 5: Expand Coverage

**Goal**: Add more test cases to cover edge cases

```typescript
describe('UserAuthentication', () => {
  describe('login', () => {
    // ... existing tests ...

    it('should handle database connection errors gracefully', async () => {
      // Test infrastructure failures
    })

    it('should rate-limit failed login attempts', async () => {
      // Test security protections
    })

    it('should log security events', async () => {
      // Test audit requirements
    })
  })
})
```

#### Check Coverage

```bash
npm run coverage
# Statements   : 95.2% ( 120/126 )
# Branches     : 88.9% ( 24/27 )
# Functions    : 100% ( 15/15 )
# Lines        : 94.8% ( 110/116 )
```

---

## TDD Best Practices

### 1. Test Naming Convention

```typescript
// ✅ Good: Clear description of behavior and expectation
it('should return 400 when email format is invalid')
it('should cache user data for 5 minutes after successful login')

// ❌ Bad: Vague
it('test login')
it('should work')
```

### 2. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate total price with discount', () => {
  // Arrange: Prepare test data
  const cart = new ShoppingCart()
  cart.addItem({ price: 100, quantity: 2 })
  const discount = new PercentageDiscount(10)

  // Act: Execute the operation being tested
  const total = cart.calculateTotal(discount)

  // Assert: Verify the result
  expect(total).toBe(180) // 200 - 10% = 180
})
```

### 3. Test Isolation

```typescript
// ✅ Good: Each test is independent
beforeEach(() => {
  database.clear()
  cache.flush()
})

// ❌ Bad: Tests depend on each other
let userId: string
it('should create user', () => {
  userId = createUser() // Later tests depend on this ID
})
```

### 4. Test Pyramid

```
        /\
       /  \      E2E Tests (10%)
      /____\     - Critical user flows
     /      \    Integration Tests (20%)
    /        \   - Module interactions
   /__________\  Unit Tests (70%)
                 - Individual functions/classes
```

---

## AI-Assisted TDD Workflow

### AI's Role

1. **SPEC Phase**
   - Help refine requirements
   - Identify edge cases
   - Generate test scenarios

2. **Test Writing**
   - Generate test skeletons
   - Suggest test data
   - Add missing assertions

3. **Implementation**
   - Provide minimal implementation
   - Suggest design patterns
   - Identify potential issues

4. **Refactoring**
   - Detect code smells
   - Suggest refactoring techniques
   - Verify refactoring safety

### Human's Role

- Define business value and priorities
- Review test coverage completeness
- Judge code design reasonableness
- Make architectural and technology decisions

---

## Command Options

- `--watch`: Watch mode, auto-run tests on file changes
- `--coverage`: Generate test coverage report
- `--unit-only`: Run unit tests only (fast feedback)
- `--integration-only`: Run integration tests only
- `--verbose`: Show detailed test output

---

## Success Metrics

- ✅ Test coverage > 80% (critical paths 100%)
- ✅ All tests complete in < 10 seconds
- ✅ Every feature has corresponding tests
- ✅ Test failures quickly pinpoint issues
- ✅ Refactoring doesn't break existing functionality

---

## References

- Kent Beck - *Test-Driven Development: By Example*
- Robert C. Martin - *Clean Code* & *Clean Architecture*
- Martin Fowler - *Refactoring: Improving the Design of Existing Code*
- Growing Object-Oriented Software, Guided by Tests
