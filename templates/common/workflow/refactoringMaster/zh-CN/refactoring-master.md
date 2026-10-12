---
description: 重构大师模式 - 基于 Martin Fowler 重构模式，小步快跑改善代码设计，降低技术债务
allowed-tools: Read(**), Write(**), Exec(npm test, npm run lint, git diff)
argument-hint: [--pattern <pattern-name>] [--scope <file|module|system>] [--safe-mode]
# examples:
#   - /refactoring-master                           # 启动重构流程
#   - /refactoring-master --pattern extract-method  # 应用特定重构模式
#   - /refactoring-master --safe-mode               # 安全模式（每步运行测试）
---

# Refactoring Master Mode

基于 Martin Fowler 的《重构：改善既有代码的设计》（第 2 版），系统化地改善代码质量。

---

## 核心理念

**重构（Refactoring）**：在不改变代码外部行为的前提下，改善代码内部结构。

**关键原则**：
1. **小步前进**：每次只做一个小改动
2. **测试保护**：重构前后测试必须通过
3. **持续集成**：频繁提交，避免大规模合并冲突
4. **识别坏味道**：系统化识别需要重构的代码
5. **应用模式**：使用经过验证的重构手法

---

## Refactoring Workflow

### Phase 1: Code Smell Detection（识别代码坏味道）

**目标**：系统化识别需要改进的代码

#### 常见代码坏味道

##### 1. 神秘命名（Mysterious Name）

```typescript
// ❌ Bad: 命名不清晰
function calc(a: number, b: number): number {
  return a * b * 0.9
}

// ✅ Good: 清晰表达意图
function calculateDiscountedPrice(originalPrice: number, quantity: number): number {
  const DISCOUNT_RATE = 0.9
  return originalPrice * quantity * DISCOUNT_RATE
}
```

##### 2. 重复代码（Duplicated Code）

```typescript
// ❌ Bad: 重复的验证逻辑
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

// ✅ Good: 提取共同验证逻辑
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

##### 3. 过长函数（Long Function）

```typescript
// ❌ Bad: 100+ 行的函数
function processOrder(order: Order) {
  // 验证订单（20 行）
  // 计算价格（30 行）
  // 检查库存（25 行）
  // 创建发货单（20 行）
  // 发送通知（15 行）
}

// ✅ Good: 拆分为多个小函数
function processOrder(order: Order) {
  validateOrder(order)
  const totalPrice = calculateTotalPrice(order)
  checkInventory(order.items)
  createShipment(order)
  sendNotifications(order)
}
```

##### 4. 过长参数列表（Long Parameter List）

```typescript
// ❌ Bad: 6 个参数
function createInvoice(
  customerId: string,
  customerName: string,
  customerEmail: string,
  items: Item[],
  discount: number,
  taxRate: number
) { }

// ✅ Good: 使用对象参数
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

##### 5. 发散式变化（Divergent Change）

```typescript
// ❌ Bad: 一个类承担多种变化原因
class User {
  // 用户数据管理
  updateProfile() { }
  changePassword() { }

  // 权限管理
  grantPermission() { }
  revokePermission() { }

  // 通知管理
  sendEmail() { }
  sendSMS() { }
}

// ✅ Good: 按职责分离
class User {
  updateProfile() { }
  changePassword() { }
}

class UserPermissions {
  grant() { }
  revoke() { }
}

class UserNotifications {
  sendEmail() { }
  sendSMS() { }
}
```

##### 6. 霰弹式修改（Shotgun Surgery）

```typescript
// ❌ Bad: 修改一个功能需要改多个文件
// file1.ts
const TAX_RATE = 0.08

// file2.ts
const TAX_RATE = 0.08

// file3.ts
const TAX_RATE = 0.08

// ✅ Good: 集中配置
// config.ts
export const TAX_RATE = 0.08

// file1.ts, file2.ts, file3.ts
import { TAX_RATE } from './config'
```

##### 7. 依恋情结（Feature Envy）

```typescript
// ❌ Bad: 函数过度使用另一个类的数据
class Order {
  calculateTotal(customer: Customer) {
    let total = this.basePrice
    if (customer.loyaltyLevel === 'gold') {
      total *= 0.9
    } else if (customer.loyaltyLevel === 'silver') {
      total *= 0.95
    }
    return total
  }
}

// ✅ Good: 将逻辑移到数据所在的类
class Customer {
  getDiscountRate(): number {
    if (this.loyaltyLevel === 'gold') return 0.9
    if (this.loyaltyLevel === 'silver') return 0.95
    return 1.0
  }
}

class Order {
  calculateTotal(customer: Customer) {
    return this.basePrice * customer.getDiscountRate()
  }
}
```

##### 8. 数据泥团（Data Clumps）

```typescript
// ❌ Bad: 总是一起出现的数据
function createAddress(street: string, city: string, zipCode: string) { }
function validateAddress(street: string, city: string, zipCode: string) { }
function formatAddress(street: string, city: string, zipCode: string) { }

// ✅ Good: 封装为对象
interface Address {
  street: string
  city: string
  zipCode: string
}

function createAddress(address: Address) { }
function validateAddress(address: Address) { }
function formatAddress(address: Address) { }
```

##### 9. 基本类型偏执（Primitive Obsession）

```typescript
// ❌ Bad: 使用基本类型表示领域概念
function sendEmail(email: string) {
  // 每次都要验证
  if (!email.includes('@')) {
    throw new Error('Invalid email')
  }
}

// ✅ Good: 使用值对象
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
  // 不需要验证，类型系统保证有效性
}
```

##### 10. 过长的条件语句（Long Conditional）

```typescript
// ❌ Bad: 复杂的条件判断
function getShippingCost(order: Order): number {
  if (order.total > 100 && order.customer.isPremium && order.destination === 'domestic') {
    return 0
  } else if (order.total > 50 && order.customer.isPremium) {
    return 5
  } else if (order.destination === 'international') {
    return 20
  } else {
    return 10
  }
}

// ✅ Good: 使用策略模式
interface ShippingStrategy {
  calculate(order: Order): number
}

class FreeShipping implements ShippingStrategy {
  calculate(order: Order): number {
    return 0
  }
}

class StandardShipping implements ShippingStrategy {
  calculate(order: Order): number {
    return order.destination === 'international' ? 20 : 10
  }
}

class ShippingCalculator {
  calculate(order: Order): number {
    const strategy = this.selectStrategy(order)
    return strategy.calculate(order)
  }

  private selectStrategy(order: Order): ShippingStrategy {
    if (this.qualifiesForFreeShipping(order)) {
      return new FreeShipping()
    }
    return new StandardShipping()
  }

  private qualifiesForFreeShipping(order: Order): boolean {
    return order.total > 100 &&
           order.customer.isPremium &&
           order.destination === 'domestic'
  }
}
```

---

### Phase 2: Refactoring Catalog（重构手法目录）

#### 提取函数（Extract Function）

**时机**：函数过长，或需要注释才能理解的代码块

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

#### 内联函数（Inline Function）

**时机**：函数体和函数名一样清晰，或函数过度拆分

```typescript
// Before
function getRating(driver: Driver): number {
  return moreThanFiveLateDeliveries(driver) ? 2 : 1
}

function moreThanFiveLateDeliveries(driver: Driver): boolean {
  return driver.numberOfLateDeliveries > 5
}

// After
function getRating(driver: Driver): number {
  return driver.numberOfLateDeliveries > 5 ? 2 : 1
}
```

#### 提取变量（Extract Variable）

**时机**：表达式复杂难懂

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

#### 引入参数对象（Introduce Parameter Object）

**时机**：多个参数总是一起出现

```typescript
// Before
function amountInvoiced(startDate: Date, endDate: Date) { }
function amountReceived(startDate: Date, endDate: Date) { }
function amountOverdue(startDate: Date, endDate: Date) { }

// After
class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date
  ) { }
}

function amountInvoiced(dateRange: DateRange) { }
function amountReceived(dateRange: DateRange) { }
function amountOverdue(dateRange: DateRange) { }
```

#### 以多态取代条件表达式（Replace Conditional with Polymorphism）

**时机**：根据类型码进行条件判断

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

#### 拆分循环（Split Loop）

**时机**：一个循环做多件事

```typescript
// Before
let youngest = people[0] ? people[0].age : Infinity
let totalSalary = 0
for (const person of people) {
  if (person.age < youngest) youngest = person.age
  totalSalary += person.salary
}

// After
let youngest = people[0] ? people[0].age : Infinity
for (const person of people) {
  if (person.age < youngest) youngest = person.age
}

let totalSalary = 0
for (const person of people) {
  totalSalary += person.salary
}

// Better: 使用函数式编程
const youngest = Math.min(...people.map(p => p.age))
const totalSalary = people.reduce((sum, p) => sum + p.salary, 0)
```

#### 移除死代码（Remove Dead Code）

**时机**：代码不再被使用

```typescript
// Before
function oldFeature() {
  // 这个功能已经被新版本替代
  // 但代码还在这里
}

function newFeature() {
  // 新实现
}

// After
function newFeature() {
  // 新实现
}
// 直接删除 oldFeature，版本控制系统会保留历史
```

---

### Phase 3: Safe Refactoring Process（安全重构流程）

#### 步骤 1: 确保测试覆盖

```bash
# 运行测试，确保当前代码正常工作
npm test

# 检查覆盖率
npm run coverage

# 如果覆盖率不足，先补充测试
```

#### 步骤 2: 小步重构

```typescript
// 每次只做一个小改动
// 例如：先提取变量
const basePrice = order.quantity * order.itemPrice

// 运行测试
npm test  // ✅ 通过

// 再提取下一个变量
const quantityDiscount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05

// 再次运行测试
npm test  // ✅ 通过
```

#### 步骤 3: 频繁提交

```bash
# 每完成一个小重构就提交
git add .
git commit -m "refactor: extract basePrice variable"

# 继续下一个重构
# ...

git commit -m "refactor: extract quantityDiscount variable"
```

#### 步骤 4: 使用 IDE 自动重构

```typescript
// 使用 IDE 的重构功能（更安全）
// - Rename Symbol (F2)
// - Extract Method
// - Extract Variable
// - Inline Variable
// - Move to File
```

---

### Phase 4: Refactoring Patterns（重构模式）

#### 模式 1: 分层架构重构

```typescript
// Before: 所有逻辑混在一起
app.post('/users', async (req, res) => {
  // 验证
  if (!req.body.email || !req.body.email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  // 业务逻辑
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  const user = {
    email: req.body.email,
    password: hashedPassword,
    createdAt: new Date()
  }

  // 数据访问
  await db.collection('users').insertOne(user)

  res.json({ id: user._id })
})

// After: 分层架构
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

#### 模式 2: 依赖注入重构

```typescript
// Before: 硬编码依赖
class OrderService {
  processOrder(order: Order) {
    const payment = new PaymentService()  // 硬编码
    const shipping = new ShippingService()  // 硬编码
    payment.charge(order.total)
    shipping.ship(order)
  }
}

// After: 依赖注入
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

// 便于测试
const mockPayment = new MockPaymentService()
const mockShipping = new MockShippingService()
const service = new OrderService(mockPayment, mockShipping)
```

#### 模式 3: 领域模型重构

```typescript
// Before: 贫血模型
interface User {
  id: string
  email: string
  password: string
  createdAt: Date
}

function changePassword(user: User, newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error('Password too short')
  }
  user.password = hashPassword(newPassword)
}

// After: 充血模型
class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    private password: HashedPassword,
    public readonly createdAt: Date
  ) { }

  changePassword(newPassword: string) {
    const hashed = HashedPassword.create(newPassword)
    this.password = hashed
  }

  verifyPassword(password: string): boolean {
    return this.password.verify(password)
  }
}
```

---

## Refactoring Checklist

### 重构前

- [ ] 代码有足够的测试覆盖
- [ ] 所有测试都通过
- [ ] 代码已提交到版本控制
- [ ] 理解要重构的代码
- [ ] 确定重构目标

### 重构中

- [ ] 每次只做一个小改动
- [ ] 每次改动后运行测试
- [ ] 保持测试绿色
- [ ] 频繁提交
- [ ] 使用 IDE 自动重构功能

### 重构后

- [ ] 所有测试通过
- [ ] 代码更易理解
- [ ] 代码更易修改
- [ ] 没有引入新的 bug
- [ ] 性能没有明显下降

---

## Command Options

- `--pattern <name>`：应用特定重构模式
- `--scope <file|module|system>`：重构范围
- `--safe-mode`：每步都运行测试
- `--dry-run`：预览重构效果

---

## Success Metrics

- ✅ 代码复杂度降低 30%
- ✅ 代码重复率 < 5%
- ✅ 平均函数长度 < 20 行
- ✅ 技术债务减少 60%
- ✅ 新功能开发速度提升 40%

---

## References

- Martin Fowler - *Refactoring: Improving the Design of Existing Code* (2nd Edition)
- Robert C. Martin - *Clean Code*
- Joshua Kerievsky - *Refactoring to Patterns*
- Michael Feathers - *Working Effectively with Legacy Code*
