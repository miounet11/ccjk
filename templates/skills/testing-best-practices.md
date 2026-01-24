---
name: testing-best-practices
description: TDD workflow, test organization, mocking strategies, and comprehensive testing approaches
description_zh: TDD 工作流、测试组织、模拟策略和全面测试方法
version: 1.0.0
category: testing
triggers: ['/testing-best-practices', '/tdd', '/testing', '/test-patterns']
use_when:
  - Implementing test-driven development workflows
  - Organizing test suites and improving test coverage
  - Setting up mocking and testing strategies
  - Code review for testing practices
use_when_zh:
  - 实现测试驱动开发工作流
  - 组织测试套件和提高测试覆盖率
  - 设置模拟和测试策略
  - 测试实践代码审查
auto_activate: true
priority: 8
agents: [testing-expert, qa-engineer]
tags: [testing, tdd, mocking, coverage, quality-assurance]
---

# Testing Best Practices | 测试最佳实践

## Context | 上下文

Use this skill when implementing comprehensive testing strategies, following TDD principles, and ensuring high-quality code through effective testing practices. Essential for maintainable and reliable software development.

在实现全面测试策略、遵循 TDD 原则并通过有效测试实践确保高质量代码时使用此技能。对于可维护和可靠的软件开发至关重要。

## Test-Driven Development (TDD) | 测试驱动开发

### 1. TDD Cycle: Red-Green-Refactor | TDD 循环：红-绿-重构

```javascript
// ✅ Good: TDD Example - Building a Calculator

// Step 1: RED - Write failing test first
describe('Calculator', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      const calculator = new Calculator();
      const result = calculator.add(2, 3);
      expect(result).toBe(5);
    });

    it('should handle negative numbers', () => {
      const calculator = new Calculator();
      const result = calculator.add(-2, 3);
      expect(result).toBe(1);
    });

    it('should handle zero', () => {
      const calculator = new Calculator();
      const result = calculator.add(0, 5);
      expect(result).toBe(5);
    });

    it('should handle decimal numbers', () => {
      const calculator = new Calculator();
      const result = calculator.add(0.1, 0.2);
      expect(result).toBeCloseTo(0.3);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      const calculator = new Calculator();
      const result = calculator.divide(10, 2);
      expect(result).toBe(5);
    });

    it('should throw error when dividing by zero', () => {
      const calculator = new Calculator();
      expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
    });

    it('should handle decimal division', () => {
      const calculator = new Calculator();
      const result = calculator.divide(1, 3);
      expect(result).toBeCloseTo(0.333, 3);
    });
  });
});

// Step 2: GREEN - Write minimal code to make tests pass
class Calculator {
  add(a, b) {
    return a + b;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}

// Step 3: REFACTOR - Improve code while keeping tests green
class Calculator {
  add(a, b) {
    this._validateNumbers(a, b);
    return a + b;
  }

  subtract(a, b) {
    this._validateNumbers(a, b);
    return a - b;
  }

  multiply(a, b) {
    this._validateNumbers(a, b);
    return a * b;
  }

  divide(a, b) {
    this._validateNumbers(a, b);
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }

  _validateNumbers(...numbers) {
    for (const num of numbers) {
      if (typeof num !== 'number' || isNaN(num)) {
        throw new Error('Invalid number provided');
      }
    }
  }
}

// ✅ Good: TDD for User Service
describe('UserService', () => {
  let userService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByEmail: jest.fn(),
    };
    userService = new UserService(mockRepository);
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };
      const expectedUser = { id: 1, ...userData };

      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(mockRepository.save).toHaveBeenCalledWith(userData);
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };
      const existingUser = { id: 2, ...userData };

      mockRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Email already exists');

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidUserData = {
        name: '',
        email: 'john@example.com',
        age: 30
      };

      // Act & Assert
      await expect(userService.createUser(invalidUserData))
        .rejects
        .toThrow('Name is required');

      expect(mockRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});

// Implementation following TDD
class UserService {
  constructor(repository) {
    this.repository = repository;
  }

  async createUser(userData) {
    // Validation
    if (!userData.name || userData.name.trim() === '') {
      throw new Error('Name is required');
    }

    if (!userData.email || !this._isValidEmail(userData.email)) {
      throw new Error('Valid email is required');
    }

    if (!userData.age || userData.age < 0) {
      throw new Error('Valid age is required');
    }

    // Check for existing user
    const existingUser = await this.repository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Save user
    return await this.repository.save(userData);
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### 2. Test Organization and Structure | 测试组织和结构

```javascript
// ✅ Good: Well-organized test structure

// tests/unit/services/UserService.test.js
describe('UserService', () => {
  // Setup and teardown
  let userService;
  let mockRepository;
  let mockEmailService;
  let mockLogger;

  beforeEach(() => {
    // Fresh mocks for each test
    mockRepository = createMockRepository();
    mockEmailService = createMockEmailService();
    mockLogger = createMockLogger();

    userService = new UserService(mockRepository, mockEmailService, mockLogger);
  });

  afterEach(() => {
    // Cleanup if needed
    jest.clearAllMocks();
  });

  // Group related tests
  describe('User Creation', () => {
    describe('when valid data is provided', () => {
      it('should create user successfully', async () => {
        // Test implementation
      });

      it('should send welcome email', async () => {
        // Test implementation
      });

      it('should log user creation', async () => {
        // Test implementation
      });
    });

    describe('when invalid data is provided', () => {
      it('should reject empty name', async () => {
        // Test implementation
      });

      it('should reject invalid email format', async () => {
        // Test implementation
      });

      it('should reject negative age', async () => {
        // Test implementation
      });
    });

    describe('when email already exists', () => {
      it('should throw appropriate error', async () => {
        // Test implementation
      });

      it('should not send welcome email', async () => {
        // Test implementation
      });
    });
  });

  describe('User Retrieval', () => {
    describe('when user exists', () => {
      it('should return user data', async () => {
        // Test implementation
      });

      it('should not include sensitive data', async () => {
        // Test implementation
      });
    });

    describe('when user does not exist', () => {
      it('should return null', async () => {
        // Test implementation
      });

      it('should log access attempt', async () => {
        // Test implementation
      });
    });
  });
});

// ✅ Good: Test helpers and utilities
// tests/helpers/mockFactories.js
export function createMockRepository() {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

export function createMockEmailService() {
  return {
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
}

export function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// tests/helpers/testData.js
export const validUserData = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
};

export const invalidUserData = {
  emptyName: { ...validUserData, name: '' },
  invalidEmail: { ...validUserData, email: 'invalid-email' },
  negativeAge: { ...validUserData, age: -5 },
};

export function createUser(overrides = {}) {
  return {
    id: 1,
    ...validUserData,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ✅ Good: Custom matchers for better assertions
// tests/helpers/customMatchers.js
expect.extend({
  toBeValidUser(received) {
    const pass = received &&
      typeof received.id === 'number' &&
      typeof received.name === 'string' &&
      typeof received.email === 'string' &&
      received.email.includes('@') &&
      typeof received.age === 'number' &&
      received.age >= 0;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid user`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid user`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledWithValidUser(received) {
    const calls = received.mock.calls;
    const pass = calls.some(call => {
      const user = call[0];
      return user && typeof user.name === 'string' && user.name.length > 0;
    });

    return {
      message: () => pass
        ? `expected function not to have been called with valid user`
        : `expected function to have been called with valid user`,
      pass,
    };
  },
});
```

## Mocking and Test Doubles | 模拟和测试替身

### 1. Mocking Strategies | 模拟策略

```javascript
// ✅ Good: Different types of test doubles

// Dummy - objects passed around but never used
class DummyLogger {
  info() {}
  warn() {}
  error() {}
}

// Fake - working implementation with shortcuts
class FakeUserRepository {
  constructor() {
    this.users = new Map();
    this.nextId = 1;
  }

  async save(user) {
    const id = this.nextId++;
    const savedUser = { ...user, id };
    this.users.set(id, savedUser);
    return savedUser;
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async findByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  clear() {
    this.users.clear();
    this.nextId = 1;
  }
}

// Stub - provides canned answers
class StubEmailService {
  constructor(shouldSucceed = true) {
    this.shouldSucceed = shouldSucceed;
    this.sentEmails = [];
  }

  async sendWelcomeEmail(user) {
    this.sentEmails.push({
      to: user.email,
      type: 'welcome',
      timestamp: new Date(),
    });

    if (!this.shouldSucceed) {
      throw new Error('Email service unavailable');
    }

    return { messageId: 'fake-message-id' };
  }

  getSentEmails() {
    return [...this.sentEmails];
  }
}

// Mock - objects with expectations
describe('UserService with different test doubles', () => {
  describe('using Fake repository', () => {
    let userService;
    let fakeRepository;

    beforeEach(() => {
      fakeRepository = new FakeUserRepository();
      userService = new UserService(fakeRepository, new DummyLogger());
    });

    afterEach(() => {
      fakeRepository.clear();
    });

    it('should persist user data', async () => {
      const userData = { name: 'John', email: 'john@example.com', age: 30 };

      const createdUser = await userService.createUser(userData);
      const retrievedUser = await userService.getUserById(createdUser.id);

      expect(retrievedUser).toEqual(createdUser);
    });
  });

  describe('using Stub email service', () => {
    let userService;
    let stubEmailService;

    beforeEach(() => {
      stubEmailService = new StubEmailService();
      userService = new UserService(
        new FakeUserRepository(),
        stubEmailService,
        new DummyLogger()
      );
    });

    it('should send welcome email on user creation', async () => {
      const userData = { name: 'John', email: 'john@example.com', age: 30 };

      await userService.createUser(userData);

      const sentEmails = stubEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe('john@example.com');
      expect(sentEmails[0].type).toBe('welcome');
    });
  });

  describe('using Mock with Jest', () => {
    let userService;
    let mockRepository;
    let mockEmailService;

    beforeEach(() => {
      mockRepository = {
        save: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
      };

      mockEmailService = {
        sendWelcomeEmail: jest.fn(),
      };

      userService = new UserService(mockRepository, mockEmailService);
    });

    it('should call repository and email service with correct parameters', async () => {
      const userData = { name: 'John', email: 'john@example.com', age: 30 };
      const savedUser = { id: 1, ...userData };

      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(savedUser);
      mockEmailService.sendWelcomeEmail.mockResolvedValue({ messageId: 'test' });

      await userService.createUser(userData);

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(mockRepository.save).toHaveBeenCalledWith(userData);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(savedUser);
    });
  });
});

// ✅ Good: Mocking external dependencies
describe('WeatherService', () => {
  let weatherService;
  let mockHttpClient;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
    };
    weatherService = new WeatherService(mockHttpClient);
  });

  it('should fetch weather data from API', async () => {
    const mockWeatherData = {
      temperature: 25,
      humidity: 60,
      conditions: 'sunny',
    };

    mockHttpClient.get.mockResolvedValue({
      data: mockWeatherData,
      status: 200,
    });

    const result = await weatherService.getCurrentWeather('New York');

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'https://api.weather.com/current',
      { params: { city: 'New York' } }
    );
    expect(result).toEqual(mockWeatherData);
  });

  it('should handle API errors gracefully', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('Network error'));

    await expect(weatherService.getCurrentWeather('New York'))
      .rejects
      .toThrow('Failed to fetch weather data');
  });

  it('should retry on temporary failures', async () => {
    mockHttpClient.get
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValue({ data: { temperature: 20 }, status: 200 });

    const result = await weatherService.getCurrentWeather('London');

    expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    expect(result.temperature).toBe(20);
  });
});
```

### 2. Integration Testing | 集成测试

```javascript
// ✅ Good: Integration tests with real dependencies

// tests/integration/UserService.integration.test.js
describe('UserService Integration Tests', () => {
  let userService;
  let database;
  let emailService;

  beforeAll(async () => {
    // Setup test database
    database = await setupTestDatabase();
    emailService = new EmailService({
      provider: 'test',
      apiKey: 'test-key',
    });

    userService = new UserService(
      new UserRepository(database),
      emailService,
      new Logger({ level: 'silent' })
    );
  });

  afterAll(async () => {
    await teardownTestDatabase(database);
  });

  beforeEach(async () => {
    await clearTestData(database);
  });

  describe('User lifecycle', () => {
    it('should handle complete user creation flow', async () => {
      const userData = {
        name: 'Integration Test User',
        email: 'integration@test.com',
        age: 25,
      };

      // Create user
      const createdUser = await userService.createUser(userData);
      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(userData.name);

      // Verify user exists in database
      const retrievedUser = await userService.getUserById(createdUser.id);
      expect(retrievedUser).toEqual(createdUser);

      // Verify email was sent
      const sentEmails = await emailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe(userData.email);
    });

    it('should handle user update flow', async () => {
      // Create user first
      const user = await userService.createUser({
        name: 'Original Name',
        email: 'original@test.com',
        age: 30,
      });

      // Update user
      const updatedData = {
        name: 'Updated Name',
        age: 31,
      };

      const updatedUser = await userService.updateUser(user.id, updatedData);

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.age).toBe(31);
      expect(updatedUser.email).toBe('original@test.com'); // Unchanged

      // Verify in database
      const retrievedUser = await userService.getUserById(user.id);
      expect(retrievedUser.name).toBe('Updated Name');
    });
  });

  describe('Error scenarios', () => {
    it('should handle database connection failures', async () => {
      // Simulate database failure
      await database.close();

      await expect(userService.createUser({
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
      })).rejects.toThrow('Database connection failed');

      // Restore connection for cleanup
      database = await setupTestDatabase();
    });
  });
});

// ✅ Good: API integration tests
describe('User API Integration', () => {
  let app;
  let server;
  let database;

  beforeAll(async () => {
    database = await setupTestDatabase();
    app = createApp({ database });
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    await server.close();
    await teardownTestDatabase(database);
  });

  beforeEach(async () => {
    await clearTestData(database);
  });

  describe('POST /users', () => {
    it('should create user via API', async () => {
      const userData = {
        name: 'API Test User',
        email: 'api@test.com',
        age: 28,
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.id).toBeDefined();

      // Verify in database
      const user = await database.users.findById(response.body.user.id);
      expect(user).toBeTruthy();
    });

    it('should return validation errors', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: -5,
      };

      const response = await request(app)
        .post('/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toHaveLength(3);
      expect(response.body.errors).toContainEqual({
        field: 'name',
        message: 'Name is required',
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should retrieve user by ID', async () => {
      // Create user first
      const user = await database.users.create({
        name: 'Retrieve Test User',
        email: 'retrieve@test.com',
        age: 35,
      });

      const response = await request(app)
        .get(`/users/${user.id}`)
        .expect(200);

      expect(response.body.user.name).toBe(user.name);
      expect(response.body.user.email).toBe(user.email);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/999999')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });
});
```

## Test Coverage and Quality | 测试覆盖率和质量

### 1. Coverage Strategies | 覆盖率策略

```javascript
// ✅ Good: Comprehensive test coverage

// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/index.js',
    '!src/config/*.js',
  ],
};

// ✅ Good: Testing edge cases and error paths
describe('PaymentProcessor', () => {
  let paymentProcessor;
  let mockPaymentGateway;

  beforeEach(() => {
    mockPaymentGateway = {
      processPayment: jest.fn(),
      refundPayment: jest.fn(),
    };
    paymentProcessor = new PaymentProcessor(mockPaymentGateway);
  });

  describe('processPayment', () => {
    // Happy path
    it('should process valid payment successfully', async () => {
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      mockPaymentGateway.processPayment.mockResolvedValue({
        transactionId: 'txn_123',
        status: 'success',
      });

      const result = await paymentProcessor.processPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn_123');
    });

    // Edge cases
    it('should handle minimum payment amount', async () => {
      const paymentData = {
        amount: 0.01, // Minimum amount
        currency: 'USD',
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      mockPaymentGateway.processPayment.mockResolvedValue({
        transactionId: 'txn_124',
        status: 'success',
      });

      const result = await paymentProcessor.processPayment(paymentData);
      expect(result.success).toBe(true);
    });

    it('should reject zero amount', async () => {
      const paymentData = {
        amount: 0,
        currency: 'USD',
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      await expect(paymentProcessor.processPayment(paymentData))
        .rejects
        .toThrow('Amount must be greater than zero');
    });

    it('should handle expired card', async () => {
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        cardNumber: '4111111111111111',
        expiryMonth: 1,
        expiryYear: 2020, // Expired
        cvv: '123',
      };

      await expect(paymentProcessor.processPayment(paymentData))
        .rejects
        .toThrow('Card has expired');
    });

    // Error paths
    it('should handle gateway timeout', async () => {
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      mockPaymentGateway.processPayment.mockRejectedValue(
        new Error('Gateway timeout')
      );

      const result = await paymentProcessor.processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment processing failed');
    });

    it('should handle insufficient funds', async () => {
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        cardNumber: '4000000000000002', // Declined card
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      mockPaymentGateway.processPayment.mockResolvedValue({
        status: 'declined',
        reason: 'insufficient_funds',
      });

      const result = await paymentProcessor.processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient_funds');
    });

    // Boundary conditions
    it('should handle maximum payment amount', async () => {
      const paymentData = {
        amount: 999999.99, // Maximum amount
        currency: 'USD',
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      mockPaymentGateway.processPayment.mockResolvedValue({
        transactionId: 'txn_125',
        status: 'success',
      });

      const result = await paymentProcessor.processPayment(paymentData);
      expect(result.success).toBe(true);
    });

    it('should reject amount exceeding maximum', async () => {
      const paymentData = {
        amount: 1000000.00, // Exceeds maximum
        currency: 'USD',
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      await expect(paymentProcessor.processPayment(paymentData))
        .rejects
        .toThrow('Amount exceeds maximum limit');
    });
  });
});

// ✅ Good: Property-based testing for comprehensive coverage
const fc = require('fast-check');

describe('StringUtils', () => {
  describe('reverse', () => {
    it('should reverse any string correctly', () => {
      fc.assert(fc.property(fc.string(), (str) => {
        const reversed = StringUtils.reverse(str);
        const doubleReversed = StringUtils.reverse(reversed);
        return doubleReversed === str;
      }));
    });

    it('should maintain string length', () => {
      fc.assert(fc.property(fc.string(), (str) => {
        const reversed = StringUtils.reverse(str);
        return reversed.length === str.length;
      }));
    });
  });

  describe('isPalindrome', () => {
    it('should correctly identify palindromes', () => {
      fc.assert(fc.property(fc.string(), (str) => {
        const palindrome = str + StringUtils.reverse(str);
        return StringUtils.isPalindrome(palindrome);
      }));
    });
  });
});
```

### 2. Performance and Load Testing | 性能和负载测试

```javascript
// ✅ Good: Performance testing
describe('Performance Tests', () => {
  describe('UserService', () => {
    let userService;

    beforeEach(() => {
      userService = new UserService(new FakeUserRepository());
    });

    it('should handle bulk user creation efficiently', async () => {
      const startTime = Date.now();
      const userPromises = [];

      // Create 1000 users concurrently
      for (let i = 0; i < 1000; i++) {
        userPromises.push(userService.createUser({
          name: `User ${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
        }));
      }

      await Promise.all(userPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should maintain performance with large datasets', async () => {
      // Pre-populate with 10,000 users
      const users = [];
      for (let i = 0; i < 10000; i++) {
        users.push({
          name: `User ${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
        });
      }

      await Promise.all(users.map(user => userService.createUser(user)));

      // Test search performance
      const startTime = Date.now();
      const results = await userService.searchUsers('User 5000');
      const endTime = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});

// ✅ Good: Memory leak testing
describe('Memory Tests', () => {
  it('should not leak memory during repeated operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const userService = new UserService(new FakeUserRepository());

    // Perform many operations
    for (let i = 0; i < 1000; i++) {
      const user = await userService.createUser({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: 25,
      });

      await userService.getUserById(user.id);
      await userService.updateUser(user.id, { age: 26 });
      await userService.deleteUser(user.id);

      // Force garbage collection periodically
      if (i % 100 === 0 && global.gc) {
        global.gc();
      }
    }

    // Force final garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## Testing Anti-Patterns | 测试反模式

### 1. Common Testing Mistakes | 常见测试错误

```javascript
// ❌ Bad: Testing implementation details
describe('UserService - Bad Examples', () => {
  it('should call _validateEmail method', async () => {
    const userService = new UserService();
    const spy = jest.spyOn(userService, '_validateEmail');

    await userService.createUser({
      name: 'John',
      email: 'john@example.com',
      age: 30,
    });

    expect(spy).toHaveBeenCalled(); // Testing private method
  });

  // ✅ Good: Test behavior, not implementation
  it('should reject invalid email addresses', async () => {
    const userService = new UserService();

    await expect(userService.createUser({
      name: 'John',
      email: 'invalid-email',
      age: 30,
    })).rejects.toThrow('Invalid email address');
  });
});

// ❌ Bad: Fragile tests that break with minor changes
describe('UserComponent - Bad Examples', () => {
  it('should have specific DOM structure', () => {
    const wrapper = mount(<UserComponent user={mockUser} />);

    expect(wrapper.find('div').at(0).hasClass('user-container')).toBe(true);
    expect(wrapper.find('span').at(2).text()).toBe(mockUser.name);
    expect(wrapper.find('button').at(1).prop('onClick')).toBeDefined();
  });

  // ✅ Good: Test user-visible behavior
  it('should display user information and allow editing', () => {
    const mockUser = { name: 'John Doe', email: 'john@example.com' };
    const onEdit = jest.fn();

    const wrapper = mount(<UserComponent user={mockUser} onEdit={onEdit} />);

    expect(wrapper.text()).toContain('John Doe');
    expect(wrapper.text()).toContain('john@example.com');

    wrapper.find('[data-testid="edit-button"]').simulate('click');
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });
});

// ❌ Bad: Tests that depend on each other
describe('UserService - Bad Test Dependencies', () => {
  let createdUserId;

  it('should create a user', async () => {
    const user = await userService.createUser({
      name: 'John',
      email: 'john@example.com',
      age: 30,
    });
    createdUserId = user.id; // Storing state between tests
  });

  it('should retrieve the created user', async () => {
    const user = await userService.getUserById(createdUserId); // Depends on previous test
    expect(user.name).toBe('John');
  });

  // ✅ Good: Independent tests
  describe('UserService - Good Independent Tests', () => {
    it('should create a user', async () => {
      const user = await userService.createUser({
        name: 'John',
        email: 'john@example.com',
        age: 30,
      });
      expect(user.id).toBeDefined();
      expect(user.name).toBe('John');
    });

    it('should retrieve a user by ID', async () => {
      // Setup for this specific test
      const createdUser = await userService.createUser({
        name: 'Jane',
        email: 'jane@example.com',
        age: 25,
      });

      const retrievedUser = await userService.getUserById(createdUser.id);
      expect(retrievedUser.name).toBe('Jane');
    });
  });
});

// ❌ Bad: Over-mocking
describe('OrderService - Over-mocked', () => {
  it('should calculate total price', () => {
    const mockItem1 = { getPrice: jest.fn().mockReturnValue(10) };
    const mockItem2 = { getPrice: jest.fn().mockReturnValue(20) };
    const mockItems = [mockItem1, mockItem2];

    const total = OrderService.calculateTotal(mockItems);

    expect(total).toBe(30);
    expect(mockItem1.getPrice).toHaveBeenCalled();
    expect(mockItem2.getPrice).toHaveBeenCalled();
  });

  // ✅ Good: Use real objects when possible
  it('should calculate total price with real items', () => {
    const items = [
      new Item('Product 1', 10),
      new Item('Product 2', 20),
    ];

    const total = OrderService.calculateTotal(items);
    expect(total).toBe(30);
  });
});
```

## Testing Checklist | 测试检查清单

- [ ] Tests follow the AAA pattern (Arrange, Act, Assert)
- [ ] Each test has a clear, descriptive name
- [ ] Tests are independent and can run in any order
- [ ] Happy path, edge cases, and error scenarios are covered
- [ ] Mocks are used appropriately (not over-mocked)
- [ ] Test data is realistic and representative
- [ ] Tests focus on behavior, not implementation details
- [ ] Code coverage meets established thresholds
- [ ] Integration tests cover critical user journeys
- [ ] Performance tests validate non-functional requirements
- [ ] Tests are maintainable and easy to understand
- [ ] Flaky tests are identified and fixed

## 测试检查清单

- [ ] 测试遵循 AAA 模式（准备、执行、断言）
- [ ] 每个测试都有清晰、描述性的名称
- [ ] 测试独立且可以任意顺序运行
- [ ] 覆盖正常路径、边界情况和错误场景
- [ ] 适当使用模拟（不过度模拟）
- [ ] 测试数据真实且具有代表性
- [ ] 测试关注行为，而非实现细节
- [ ] 代码覆盖率达到既定阈值
- [ ] 集成测试覆盖关键用户旅程
- [ ] 性能测试验证非功能性需求
- [ ] 测试可维护且易于理解
- [ ] 识别并修复不稳定的测试