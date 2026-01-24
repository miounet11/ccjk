---
id: post-test-coverage
type: PostToolUse
name: Test Coverage Post-test Hook
description: Generate test coverage reports after running tests
priority: 5
matcher: Bash(*test*)
command: npx vitest --coverage
timeout: 60000
enabled: true
applicableTo: [all]
---

# Test Coverage Post-test Hook

## Description

This hook automatically generates test coverage reports after running any test command. It helps maintain code quality by providing visibility into test coverage metrics and identifying untested code paths.

## 描述

此钩子在运行任何测试命令后自动生成测试覆盖率报告。它通过提供测试覆盖率指标的可见性和识别未测试的代码路径来帮助维护代码质量。

## When it runs

- **Trigger**: After any command containing "test" (e.g., `npm test`, `yarn test`, `vitest`, `jest`)
- **Condition**: When test configuration is detected (vitest.config.js, jest.config.js, etc.)
- **Scope**: Generates coverage for all tested files

## 运行时机

- **触发器**: 任何包含 "test" 的命令之后（例如 `npm test`、`yarn test`、`vitest`、`jest`）
- **条件**: 检测到测试配置时（vitest.config.js、jest.config.js 等）
- **范围**: 为所有测试文件生成覆盖率

## Configuration

### Prerequisites for Vitest
```bash
# Install Vitest with coverage support
npm install --save-dev vitest @vitest/ui c8

# Or with specific coverage provider
npm install --save-dev vitest @vitest/coverage-v8
```

### Prerequisites for Jest
```bash
# Install Jest with coverage support
npm install --save-dev jest @types/jest

# Or with additional coverage tools
npm install --save-dev jest babel-jest @babel/preset-env
```

### Vitest Configuration
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'c8'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/test/**',
        '**/*.test.{js,ts,jsx,tsx}'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

### Jest Configuration
```json
// package.json
{
  "jest": {
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov", "html"],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    },
    "collectCoverageFrom": [
      "src/**/*.{js,ts,jsx,tsx}",
      "!src/**/*.d.ts",
      "!src/**/*.test.{js,ts,jsx,tsx}"
    ]
  }
}
```

### Hook Configuration
```yaml
# In your CCJK configuration
hooks:
  post-test-coverage:
    enabled: true
    command: "npx vitest --coverage"
    timeout: 60000
    generateReport: true
    openReport: false
```

## 配置

### Vitest 前置条件
```bash
# 安装支持覆盖率的 Vitest
npm install --save-dev vitest @vitest/ui c8

# 或使用特定的覆盖率提供程序
npm install --save-dev vitest @vitest/coverage-v8
```

### Jest 前置条件
```bash
# 安装支持覆盖率的 Jest
npm install --save-dev jest @types/jest

# 或使用额外的覆盖率工具
npm install --save-dev jest babel-jest @babel/preset-env
```

## Customization

### Different Coverage Providers
```yaml
# For Vitest with v8
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --coverage.provider=v8"

# For Vitest with c8
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --coverage.provider=c8"

# For Jest
hooks:
  post-test-coverage:
    command: "npx jest --coverage"
```

### Custom Coverage Thresholds
```yaml
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --coverage.thresholds.lines=90 --coverage.thresholds.functions=90"
    failOnThreshold: true
```

### Multiple Test Frameworks
```yaml
hooks:
  post-test-coverage-unit:
    matcher: "Bash(*unit*test*)"
    command: "npx vitest --coverage --config vitest.unit.config.js"
    priority: 5
  post-test-coverage-integration:
    matcher: "Bash(*integration*test*)"
    command: "npx jest --coverage --config jest.integration.config.js"
    priority: 5
```

### Coverage Report Formats
```yaml
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --coverage.reporter=text --coverage.reporter=html --coverage.reporter=json"
    artifacts: ["coverage/index.html", "coverage/coverage-final.json"]
```

### Conditional Coverage Generation
```yaml
hooks:
  post-test-coverage:
    command: |
      if [ "$CI" = "true" ]; then
        npx vitest --coverage --coverage.reporter=lcov
      else
        npx vitest --coverage --coverage.reporter=html
      fi
    description: "Generate different coverage formats for CI vs local"
```

## 自定义

### 不同的覆盖率提供程序
```yaml
# 使用 v8 的 Vitest
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --coverage.provider=v8"

# 使用 c8 的 Vitest
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --coverage.provider=c8"

# Jest
hooks:
  post-test-coverage:
    command: "npx jest --coverage"
```

### 自定义覆盖率阈值
```yaml
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --coverage.thresholds.lines=90 --coverage.thresholds.functions=90"
    failOnThreshold: true
```

## Error Handling

- **Coverage below threshold**: Hook fails with detailed coverage report
- **No tests found**: Hook is skipped with informational message
- **Coverage tool missing**: Hook is skipped with installation instructions
- **Timeout**: Hook fails after 60 seconds (configurable)
- **Report generation failure**: Hook continues but logs warning

## 错误处理

- **覆盖率低于阈值**: 钩子失败并显示详细的覆盖率报告
- **未找到测试**: 跳过钩子并显示信息消息
- **缺少覆盖率工具**: 跳过钩子并显示安装说明
- **超时**: 60 秒后钩子失败（可配置）
- **报告生成失败**: 钩子继续但记录警告

## Advanced Configuration

### Coverage Exclusions
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/vendor/**',
        '**/generated/**'
      ]
    }
  }
})
```

### Branch-specific Coverage
```yaml
hooks:
  post-test-coverage-main:
    matcher: "Bash(*test*)"
    command: |
      if [ "$(git branch --show-current)" = "main" ]; then
        npx vitest --coverage --coverage.thresholds.lines=95
      else
        npx vitest --coverage --coverage.thresholds.lines=80
      fi
```

### Coverage Badges Generation
```yaml
hooks:
  post-test-coverage:
    command: |
      npx vitest --coverage
      npx coverage-badges-cli --output ./badges/coverage.svg
    artifacts: ["badges/coverage.svg"]
```

### Integration with SonarQube
```yaml
hooks:
  post-test-coverage:
    command: |
      npx vitest --coverage --coverage.reporter=lcov
      sonar-scanner -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
```

## 高级配置

### 覆盖率排除
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/vendor/**',
        '**/generated/**'
      ]
    }
  }
})
```

### 分支特定覆盖率
```yaml
hooks:
  post-test-coverage-main:
    matcher: "Bash(*test*)"
    command: |
      if [ "$(git branch --show-current)" = "main" ]; then
        npx vitest --coverage --coverage.thresholds.lines=95
      else
        npx vitest --coverage --coverage.thresholds.lines=80
      fi
```

## Performance Tips

### Incremental Coverage
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      skipFull: true, // Skip files with 100% coverage
      clean: false,   // Don't clean coverage directory
      cleanOnRerun: false
    }
  }
})
```

### Parallel Coverage Generation
```yaml
hooks:
  post-test-coverage:
    command: "npx vitest --coverage --reporter=verbose --threads"
    parallel: true
```

## 性能提示

### 增量覆盖率
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      skipFull: true, // 跳过 100% 覆盖率的文件
      clean: false,   // 不清理覆盖率目录
      cleanOnRerun: false
    }
  }
})
```

## Integration with CI/CD

### GitHub Actions
```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm test

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### GitLab CI
```yaml
# .gitlab-ci.yml
test:
  script:
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## 与 CI/CD 集成

### GitHub Actions
```yaml
# .github/workflows/test.yml
- name: 运行带覆盖率的测试
  run: npm test

- name: 上传覆盖率到 Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```