---
description: Refactoring Master Mode - Apply Martin Fowler's refactoring patterns, small steps to improve code design and reduce technical debt
allowed-tools: Read(**), Write(**), Exec(npm test, npm run lint, git diff)
argument-hint: [--pattern <pattern-name>] [--scope <file|module|system>] [--safe-mode]
# examples:
#   - /refactoring-master                           # Start refactoring workflow
#   - /refactoring-master --pattern extract-method  # Apply specific pattern
#   - /refactoring-master --safe-mode               # Safe mode (run tests each step)
---

# Refactoring Master Mode

Based on Martin Fowler's *Refactoring: Improving the Design of Existing Code* (2nd Edition) for systematic code quality improvement.

---

## Core Philosophy

**Refactoring**: Improving code's internal structure without changing its external behavior.

**Key Principles**:
1. **Small Steps**: Make one small change at a time
2. **Test Protection**: Tests must pass before and after refactoring
3. **Continuous Integration**: Commit frequently to avoid merge conflicts
4. **Identify Smells**: Systematically identify code that needs refactoring
5. **Apply Patterns**: Use proven refactoring techniques

---

## Refactoring Workflow

### Phase 1: Code Smell Detection

**Goal**: Systematically identify code that needs improvement

#### Common Code Smells

##### 1. Mysterious Name

```typescript
// ❌ Bad: Unclear naming
function calc(a: number, b: number): number {
  return a * b * 0.9
}

// ✅ Good: Clear intent
function calculateDiscountedPrice(originalPrice: number, quantity: number): number {
  const DISCOUNT_RATE = 0.9
  return originalPrice * quantity * DISCOUNT_RATE
}
```

##### 2. Duplicated Code

```typescript
// ❌ Bad: Repeated validation logic
function createUser(data: UserData) {
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Invalid email')
  }
  if (!data.password || data.password.length < 8) {
    throw new Error('Password too short')
  }
  // ...
}

function updateUser(id: string, data: UserData) {
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Invalid email')
  }
  if (!data.password || data.password.length < 8) {
    throw new Error('Password too short')
  }
  // ...
}

// ✅ Good: Extract common validation
function validateUserData(data: UserData) {
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Invalid email')
  }
  if (!data.password || data.password.length < 8) {
    throw new Error('Password too short')
  }
}

function createUser(data: UserData) {
  validateUserData(data)
  // ...
}

function updateUser(id: string, data: UserData) {
  validateUserData(data)
  // ...
}
```

##### 3. Long Function

```typescript
// ❌ Bad: 100+ line function
function processOrder(order: Order) {
  // Validate order (20 lines)
  // Calculate price (30 lines)
  // Check inventory (25 lines)
  // Create shipment (20 lines)
  // Send notifications (15 lines)
}

// ✅ Good: Split into smaller functions
function processOrder(order: Order) {
  validateOrder(order)
  const totalPrice = calculateTotalPrice(order)
  checkInventory(order.items)
  createShipment(order)
  sendNotifications(order)
}
```

##### 4. Long Parameter List

```typescript
// ❌ Bad: 6 parameters
function createInvoice(
  customerId: string,
  customerName: string,
  customerEmail: string,
  items: Item[],
  discount: number,
  taxRate: number
) { }

// ✅ Good: Use parameter object
interface InvoiceParams {
  customer: {
    id: string
    name: string
    email: string
  }
  items: Item[]
  pricing: {
    discount: number
    taxRate: number
  }
}

function createInvoice(params: InvoiceParams) { }
```

##### 5. Primitive Obsession

```typescript
// ❌ Bad: Using primitives for domain concepts
function sendEmail(email: string) {
  // Must validate every time
  if (!email.includes('@')) {
    throw new Error('Invalid email')
  }
}

// ✅ Good: Use value objects
class Email {
  private constructor(private readonly value: string) {
    if (!value.includes('@')) {
      throw new Error('Invalid email')
    }
  }

  static create(value: string): Email {
    return new Email(value)
  }

  toString(): string {
    return this.value
  }
}

function sendEmail(email: Email) {
  // No validation needed, type system guarantees validity
}
```

---

### Phase 2: Refactoring Catalog

#### Extract Function

**When**: Function is too long, or code block needs comments to understand

```typescript
// Before
function printOwing(invoice: Invoice) {
  let outstanding = 0

  console.log('***********************')
  console.log('**** Customer Owes ****')
  console.log('***********************')

  // calculate outstanding
  for (const order of invoice.orders) {
    outstanding += order.amount
  }

  // record due date
  const today = new Date()
  invoice.dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)

  // print details
  console.log(`name: ${invoice.customer}`)
  console.log(`amount: ${outstanding}`)
  console.log(`due: ${invoice.dueDate.toLocaleDateString()}`)
}

// After
function printOwing(invoice: Invoice) {
  printBanner()
  const outstanding = calculateOutstanding(invoice)
  recordDueDate(invoice)
  printDetails(invoice, outstanding)
}

function printBanner() {
  console.log('***********************')
  console.log('**** Customer Owes ****')
  console.log('***********************')
}

function calculateOutstanding(invoice: Invoice): number {
  return invoice.orders.reduce((sum, order) => sum + order.amount, 0)
}

function recordDueDate(invoice: Invoice) {
  const today = new Date()
  invoice.dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)
}

function printDetails(invoice: Invoice, outstanding: number) {
  console.log(`name: ${invoice.customer}`)
  console.log(`amount: ${outstanding}`)
  console.log(`due: ${invoice.dueDate.toLocaleDateString()}`)
}
```

#### Extract Variable

**When**: Expression is complex and hard to understand

```typescript
// Before
function price(order: Order): number {
  return order.quantity * order.itemPrice -
    Math.max(0, order.quantity - 500) * order.itemPrice * 0.05 +
    Math.min(order.quantity * order.itemPrice * 0.1, 100)
}

// After
function price(order: Order): number {
  const basePrice = order.quantity * order.itemPrice
  const quantityDiscount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05
  const shipping = Math.min(basePrice * 0.1, 100)
  return basePrice - quantityDiscount + shipping
}
```

#### Replace Conditional with Polymorphism

**When**: Conditional logic based on type codes

```typescript
// Before
class Bird {
  constructor(public type: string) { }

  getSpeed(): number {
    switch (this.type) {
      case 'european':
        return 35
      case 'african':
        return 40
      case 'norwegian-blue':
        return this.isNailed ? 0 : 10
      default:
        throw new Error('Unknown bird type')
    }
  }
}

// After
abstract class Bird {
  abstract getSpeed(): number
}

class EuropeanBird extends Bird {
  getSpeed(): number {
    return 35
  }
}

class AfricanBird extends Bird {
  getSpeed(): number {
    return 40
  }
}

class NorwegianBlueBird extends Bird {
  constructor(private isNailed: boolean) {
    super()
  }

  getSpeed(): number {
    return this.isNailed ? 0 : 10
  }
}
```

---

### Phase 3: Safe Refactoring Process

#### Step 1: Ensure Test Coverage

```bash
# Run tests to ensure current code works
npm test

# Check coverage
npm run coverage

# If coverage insufficient, add tests first
```

#### Step 2: Small Refactoring Steps

```typescript
// Make one small change at a time
// Example: First extract variable
const basePrice = order.quantity * order.itemPrice

// Run tests
npm test  // ✅ Pass

// Then extract next variable
const quantityDiscount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05

// Run tests again
npm test  // ✅ Pass
```

#### Step 3: Commit Frequently

```bash
# Commit after each small refactoring
git add .
git commit -m "refactor: extract basePrice variable"

# Continue next refactoring
# ...

git commit -m "refactor: extract quantityDiscount variable"
```

#### Step 4: Use IDE Automated Refactoring

```typescript
// Use IDE refactoring features (safer)
// - Rename Symbol (F2)
// - Extract Method
// - Extract Variable
// - Inline Variable
// - Move to File
```

---

### Phase 4: Refactoring Patterns

#### Pattern 1: Layered Architecture Refactoring

```typescript
// Before: All logic mixed together
app.post('/users', async (req, res) => {
  // Validation
  if (!req.body.email || !req.body.email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  // Business logic
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  const user = {
    email: req.body.email,
    password: hashedPassword,
    createdAt: new Date()
  }

  // Data access
  await db.collection('users').insertOne(user)

  res.json({ id: user._id })
})

// After: Layered architecture
// Controller Layer
class UserController {
  async create(req: Request, res: Response) {
    const dto = CreateUserDto.from(req.body)
    const user = await this.userService.create(dto)
    res.json({ id: user.id })
  }
}

// Service Layer
class UserService {
  async create(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await this.passwordHasher.hash(dto.password)
    const user = User.create(dto.email, hashedPassword)
    return await this.userRepository.save(user)
  }
}

// Repository Layer
class UserRepository {
  async save(user: User): Promise<User> {
    await this.db.collection('users').insertOne(user)
    return user
  }
}
```

#### Pattern 2: Dependency Injection Refactoring

```typescript
// Before: Hardcoded dependencies
class OrderService {
  processOrder(order: Order) {
    const payment = new PaymentService()  // Hardcoded
    const shipping = new ShippingService()  // Hardcoded
    payment.charge(order.total)
    shipping.ship(order)
  }
}

// After: Dependency injection
class OrderService {
  constructor(
    private paymentService: PaymentService,
    private shippingService: ShippingService
  ) { }

  processOrder(order: Order) {
    this.paymentService.charge(order.total)
    this.shippingService.ship(order)
  }
}

// Easy to test
const mockPayment = new MockPaymentService()
const mockShipping = new MockShippingService()
const service = new OrderService(mockPayment, mockShipping)
```

---

## Refactoring Checklist

### Before Refactoring

- [ ] Code has sufficient test coverage
- [ ] All tests pass
- [ ] Code committed to version control
- [ ] Understand the code to refactor
- [ ] Define refactoring goals

### During Refactoring

- [ ] Make one small change at a time
- [ ] Run tests after each change
- [ ] Keep tests green
- [ ] Commit frequently
- [ ] Use IDE automated refactoring

### After Refactoring

- [ ] All tests pass
- [ ] Code is more understandable
- [ ] Code is easier to modify
- [ ] No new bugs introduced
- [ ] No significant performance degradation

---

## Command Options

- `--pattern <name>`: Apply specific refactoring pattern
- `--scope <file|module|system>`: Refactoring scope
- `--safe-mode`: Run tests after each step
- `--dry-run`: Preview refactoring effects

---

## Success Metrics

- ✅ Code complexity reduced by 30%
- ✅ Code duplication < 5%
- ✅ Average function length < 20 lines
- ✅ Technical debt reduced by 60%
- ✅ New feature development speed increased by 40%

---

## References

- Martin Fowler - *Refactoring: Improving the Design of Existing Code* (2nd Edition)
- Robert C. Martin - *Clean Code*
- Joshua Kerievsky - *Refactoring to Patterns*
- Michael Feathers - *Working Effectively with Legacy Code*
