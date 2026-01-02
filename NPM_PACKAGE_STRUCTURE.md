# ShenCha NPM 包结构

## 发布为 NPX 工具的结构

```
shencha/
├── package.json
├── README.md
├── LICENSE
├── bin/
│   └── shencha.js          # CLI 入口
├── src/
│   ├── index.ts            # 主入口
│   ├── cli.ts              # CLI 实现
│   ├── config.ts           # 配置管理
│   ├── scheduler.ts        # 调度器
│   ├── scanners/
│   │   ├── index.ts
│   │   ├── page-scanner.ts
│   │   ├── api-scanner.ts
│   │   ├── error-log-scanner.ts
│   │   └── user-behavior-scanner.ts
│   ├── analyzers/
│   │   ├── index.ts
│   │   └── code-analyzer.ts
│   ├── fixers/
│   │   ├── index.ts
│   │   └── auto-fixer.ts
│   ├── reporters/
│   │   ├── index.ts
│   │   └── audit-reporter.ts
│   └── utils/
│       ├── llm-client.ts
│       └── env-loader.ts
├── templates/
│   ├── shenchaconfig.js.template
│   └── env.template
└── dist/                    # 编译输出
```

## package.json

```json
{
  "name": "shencha",
  "version": "1.0.0",
  "description": "AI-Powered Autonomous Code Audit System",
  "keywords": [
    "code-audit",
    "ai",
    "llm",
    "claude",
    "gemini",
    "automation",
    "code-review",
    "security"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/shencha.git"
  },
  "homepage": "https://github.com/your-org/shencha#readme",
  "bugs": {
    "url": "https://github.com/your-org/shencha/issues"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "shencha": "./bin/shencha.js"
  },
  "files": [
    "bin",
    "dist",
    "templates",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/cli.ts",
    "start": "node dist/cli.js",
    "test": "vitest",
    "lint": "eslint src/",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "glob": "^10.3.10",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "inquirer": "^9.2.12",
    "table": "^6.8.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0",
    "eslint": "^8.55.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## bin/shencha.js

```javascript
#!/usr/bin/env node
require('../dist/cli.js');
```

## 发布步骤

```bash
# 1. 构建
npm run build

# 2. 测试本地安装
npm link
shencha --version

# 3. 登录 npm
npm login

# 4. 发布
npm publish

# 5. 验证
npx shencha --version
```

## 使用方式

```bash
# 全局安装
npm install -g shencha
shencha start

# 或直接使用 npx
npx shencha init
npx shencha start

# 项目内安装
npm install --save-dev shencha
npx shencha start
```
