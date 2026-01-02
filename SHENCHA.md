# ShenCha (审查) - AI 驱动的全自动代码审核系统

```
   _____ _                  _____ _
  / ____| |                / ____| |
 | (___ | |__   ___ _ __  | |    | |__   __ _
  \___ \| '_ \ / _ \ '_ \ | |    | '_ \ / _` |
  ____) | | | |  __/ | | || |____| | | | (_| |
 |_____/|_| |_|\___|_| |_| \_____|_| |_|\__,_|

 AI-Powered Autonomous Code Audit System
```

[![npm version](https://badge.fury.io/js/shencha.svg)](https://www.npmjs.com/package/shencha)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 概述

**ShenCha (审查)** 是一个 AI 驱动的全自动代码审核系统，能够：

- 🔍 **持续监控** - 72小时不间断审核周期，每3小时执行一次
- 🧠 **多模型 AI 分析** - 集成 Claude、Gemini、Grok 多模型智能分析
- 🔧 **自动修复** - 安全地自动修复可修复的问题
- 📊 **用户行为分析** - 监控线上用户对话和行为数据
- 📝 **详细报告** - 生成 Markdown/JSON 格式的审核报告
- 🎯 **产品力挖掘** - 持续发现优化机会和创新建议

## 快速开始

### 安装

```bash
# 全局安装
npm install -g shencha

# 或使用 npx 直接运行
npx shencha init
```

### 初始化

```bash
# 在项目根目录初始化
shencha init

# 交互式配置
shencha config
```

### 运行

```bash
# 启动72小时审核周期
shencha start

# 运行单次审核
shencha run

# 查看状态
shencha status

# 停止审核
shencha stop
```

## 配置

### 配置文件 `.shenchaconfig.js`

```javascript
module.exports = {
  // 调度配置
  schedule: {
    intervalHours: 3,        // 执行间隔（小时）
    totalDurationHours: 72,  // 总持续时间（小时）
  },

  // LLM 配置 - 支持 OpenAI 兼容接口
  llm: {
    baseUrl: 'https://api.example.com/v1/chat/completions',
    apiKey: process.env.SHENCHA_API_KEY,
    models: {
      claude: 'claude-opus-4-5-20251101',
      gemini: 'gemini-3-pro-preview',
      grok: 'grok-4-1-thinking-1129',
    },
  },

  // 扫描配置
  scanners: {
    page: {
      enabled: true,
      criticalPages: ['/', '/chat', '/dashboard'],
    },
    api: {
      enabled: true,
      endpoints: ['/api/health', '/api/users'],
    },
    errorLog: {
      enabled: true,
      lookbackHours: 3,
    },
    userBehavior: {
      enabled: true,
      database: process.env.DATABASE_URL,
    },
  },

  // 自动修复配置
  fixer: {
    enabled: true,
    autoCommit: true,
    safetyChecks: {
      requireTypeCheck: true,
      requireLintPass: true,
      maxFilesPerFix: 5,
    },
  },

  // 报告配置
  reporter: {
    outputDir: './shencha-reports',
    formats: ['markdown', 'json'],
  },
};
```

### 环境变量

```bash
# .env 或 .env.shencha
SHENCHA_API_KEY=sk-your-api-key
DATABASE_URL=postgresql://user:pass@host:5432/db
SHENCHA_BASE_URL=https://your-app.com
```

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      ShenCha System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                            │
│  │  Scheduler  │──── 每3小时触发 ────┐                      │
│  └─────────────┘                     │                      │
│                                      ▼                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Scanners                           │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐ │  │
│  │  │  Page  │ │  API   │ │ Error  │ │ User Behavior  │ │  │
│  │  │Scanner │ │Scanner │ │  Log   │ │    Scanner     │ │  │
│  │  └────────┘ └────────┘ └────────┘ └────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Analyzers                          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │              Multi-Model LLM Engine              │ │  │
│  │  │  ┌────────┐  ┌────────┐  ┌────────┐            │ │  │
│  │  │  │ Claude │  │ Gemini │  │  Grok  │            │ │  │
│  │  │  │  代码  │  │  性能  │  │  创意  │            │ │  │
│  │  │  └────────┘  └────────┘  └────────┘            │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Auto Fixer                         │  │
│  │  安全检查 → 修复 → 验证 → 提交                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Reporter                           │  │
│  │  Markdown + JSON + Console                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## CLI 命令

### `shencha init`

初始化 ShenCha 配置文件。

```bash
shencha init [options]

Options:
  --template <type>  使用模板 (nextjs|express|default)
  --force           覆盖现有配置
```

### `shencha start`

启动完整审核周期。

```bash
shencha start [options]

Options:
  --duration <hours>   持续时间 (默认: 72)
  --interval <hours>   执行间隔 (默认: 3)
  --daemon             后台运行
```

### `shencha run`

运行单次审核。

```bash
shencha run [options]

Options:
  --scanners <list>   指定扫描器 (page,api,error,behavior)
  --no-fix            禁用自动修复
  --verbose           详细输出
```

### `shencha status`

查看运行状态。

```bash
shencha status [options]

Options:
  --json    JSON 格式输出
  --watch   持续监控
```

### `shencha report`

查看或导出报告。

```bash
shencha report [options]

Options:
  --latest          最新报告
  --cycle <number>  指定周期
  --format <type>   输出格式 (md|json|html)
  --open            在浏览器中打开
```

### `shencha config`

管理配置。

```bash
shencha config [action] [key] [value]

Actions:
  get <key>          获取配置值
  set <key> <value>  设置配置值
  list               列出所有配置
  edit               打开配置文件编辑
```

## 状态栏集成

### VS Code 扩展

ShenCha 提供 VS Code 状态栏集成：

```
┌────────────────────────────────────────────────────────────────┐
│  [ShenCha] ● Cycle #5/24 | Issues: 3 | Fixed: 12 | Score: 95  │
└────────────────────────────────────────────────────────────────┘
```

安装：
```bash
code --install-extension shencha.vscode-shencha
```

### 终端状态栏

在 `.bashrc` 或 `.zshrc` 中添加：

```bash
# ShenCha 状态栏
shencha_status() {
  local status=$(shencha status --json 2>/dev/null)
  if [ -n "$status" ]; then
    local cycle=$(echo $status | jq -r '.currentCycle')
    local issues=$(echo $status | jq -r '.totalIssues')
    echo "[审查 #$cycle | Issues: $issues]"
  fi
}

# 添加到 PS1
export PS1="\$(shencha_status) $PS1"
```

## 扫描器详解

### Page Scanner

检查页面加载状态和错误。

```javascript
// 自定义页面检查
scanners: {
  page: {
    enabled: true,
    timeout: 30000,
    criticalPages: [
      '/',
      '/dashboard',
      { path: '/api-docs', expectStatus: 200 },
    ],
    checks: [
      { selector: '#app', exists: true },
      { selector: '.error', exists: false },
    ],
  },
}
```

### API Scanner

验证 API 端点健康状态。

```javascript
scanners: {
  api: {
    enabled: true,
    timeout: 10000,
    endpoints: [
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/users', auth: true },
      { method: 'POST', path: '/api/auth/login', body: { test: true } },
    ],
    thresholds: {
      responseTime: 2000,  // ms
      errorRate: 0.05,     // 5%
    },
  },
}
```

### Error Log Scanner

收集和分析错误日志。

```javascript
scanners: {
  errorLog: {
    enabled: true,
    lookbackHours: 3,
    sources: [
      { type: 'database', table: 'SystemLog' },
      { type: 'file', path: '/var/log/app/error.log' },
      { type: 'pm2', process: 'my-app' },
    ],
    severityThreshold: 'error',  // error | warn | info
  },
}
```

### User Behavior Scanner

分析用户行为数据。

```javascript
scanners: {
  userBehavior: {
    enabled: true,
    database: process.env.DATABASE_URL,
    metrics: [
      'activeUsers',
      'messageCount',
      'errorRate',
      'responseTime',
      'conversionRate',
      'retentionRate',
    ],
    alerts: {
      errorRateThreshold: 0.05,
      responseTimeThreshold: 5000,
    },
  },
}
```

## LLM 分析器

### 任务分配

| 任务类型 | 模型 | 说明 |
|---------|------|------|
| 代码分析 | Claude | 代码质量、逻辑错误 |
| 安全审计 | Claude | 漏洞检测、安全问题 |
| Bug 修复 | Claude | 错误诊断、修复建议 |
| 性能优化 | Gemini | 性能瓶颈、优化建议 |
| UI/UX 审查 | Gemini | 用户体验改进 |
| 创意功能 | Grok | 创新功能建议 |

### 自定义模型

```javascript
llm: {
  baseUrl: 'https://your-api.com/v1/chat/completions',
  apiKey: process.env.API_KEY,
  models: {
    // 使用自定义模型
    claude: 'your-custom-model',
    gemini: 'another-model',
    grok: 'creative-model',
  },
  // 自定义任务映射
  taskMapping: {
    codeAnalysis: 'claude',
    securityAudit: 'claude',
    performanceOptimization: 'gemini',
    featureIdeas: 'grok',
  },
}
```

## 自动修复

### 允许自动修复的问题

- ✅ 拼写错误 (typo)
- ✅ 未使用的导入 (unused-import)
- ✅ 缺失类型 (missing-type)
- ✅ console.log 移除 (console-log-removal)
- ✅ 简单重构 (simple-refactor)
- ✅ 错误处理 (error-handling)

### 需要人工审核的问题

- ⚠️ 破坏性变更 (breaking-change)
- ⚠️ 数据库 Schema (database-schema)
- ⚠️ API 契约 (api-contract)
- ⚠️ 安全修复 (security-fix)

### 安全检查

```javascript
fixer: {
  enabled: true,
  autoCommit: true,
  safetyChecks: {
    requireTypeCheck: true,   // 修复后必须通过类型检查
    requireLintPass: true,    // 修复后必须通过 lint
    requireTestPass: false,   // 可选：运行测试
    maxFilesPerFix: 5,        // 单次最多修改文件数
    maxLineChanges: 100,      // 单次最大行数变更
    requireReview: ['security-fix'],  // 需要人工审核的类型
  },
}
```

## 报告输出

### 报告结构

```
shencha-reports/
├── audit-report-cycle-1-2024-01-01T00-00-00.md
├── audit-report-cycle-1-2024-01-01T00-00-00.json
├── audit-report-cycle-2-2024-01-01T03-00-00.md
├── ...
└── cycle-summary-2024-01-04T00-00-00.md  # 最终汇总
```

### 报告内容

```markdown
# 自动审核报告

## 概览
| 周期 | #5 of 24 |
| 状态 | ✅ completed |

## 评分
| 安全性 | 95/100 |
| 性能 | 88/100 |
| 代码质量 | 92/100 |

## 问题统计
- 总问题: 12
- 已修复: 8
- 待处理: 4

## 严重问题
...

## 改进建议
...
```

## API 集成

### HTTP API

```bash
# 启动审核
POST /api/shencha/start
{ "duration": 72, "interval": 3 }

# 运行单次
POST /api/shencha/run

# 获取状态
GET /api/shencha/status

# 停止审核
POST /api/shencha/stop

# 获取报告
GET /api/shencha/reports
GET /api/shencha/reports/:cycle
```

### Node.js SDK

```javascript
import { ShenCha } from 'shencha';

const shencha = new ShenCha({
  config: './.shenchaconfig.js',
});

// 启动审核
await shencha.start();

// 运行单次
const result = await shencha.runCycle();
console.log(result.summary);

// 获取状态
const status = shencha.getStatus();

// 监听事件
shencha.on('cycleComplete', (result) => {
  console.log(`Cycle ${result.cycleNumber} completed`);
});

shencha.on('issueFound', (issue) => {
  console.log(`Found: ${issue.title}`);
});

shencha.on('issueFiixed', (fix) => {
  console.log(`Fixed: ${fix.issueId}`);
});
```

## 高级功能

### Webhook 通知

```javascript
reporter: {
  webhooks: [
    {
      url: 'https://hooks.slack.com/...',
      events: ['cycleComplete', 'criticalIssue'],
    },
    {
      url: 'https://your-api.com/webhook',
      events: ['*'],
      headers: { 'X-API-Key': 'secret' },
    },
  ],
}
```

### 自定义扫描器

```javascript
// custom-scanner.js
export class CustomScanner {
  constructor(config) {
    this.config = config;
  }

  async scan() {
    // 自定义扫描逻辑
    const issues = [];

    // ... 扫描代码 ...

    return {
      scanner: 'CustomScanner',
      timestamp: new Date(),
      success: true,
      issues,
      metrics: { customMetric: 42 },
    };
  }
}

// 配置中注册
scanners: {
  custom: {
    enabled: true,
    module: './custom-scanner.js',
    options: { /* ... */ },
  },
}
```

### 自定义分析器

```javascript
// custom-analyzer.js
export class CustomAnalyzer {
  constructor(config, llmClient) {
    this.config = config;
    this.llm = llmClient;
  }

  async analyze() {
    const response = await this.llm.call('claude', [
      { role: 'system', content: 'Your custom prompt...' },
      { role: 'user', content: 'Analyze this...' },
    ]);

    return {
      analyzer: 'CustomAnalyzer',
      timestamp: new Date(),
      findings: [],
      recommendations: [],
    };
  }
}
```

## CI/CD 集成

### GitHub Actions

```yaml
name: ShenCha Audit

on:
  schedule:
    - cron: '0 */3 * * *'  # 每3小时
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ShenCha
        run: npm install -g shencha

      - name: Run Audit
        env:
          SHENCHA_API_KEY: ${{ secrets.SHENCHA_API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: shencha run --verbose

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: shencha-report
          path: shencha-reports/
```

### GitLab CI

```yaml
shencha-audit:
  image: node:20
  script:
    - npm install -g shencha
    - shencha run --verbose
  artifacts:
    paths:
      - shencha-reports/
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## 故障排除

### 常见问题

**Q: DATABASE_URL 未找到**
```bash
# 创建环境变量文件
echo "DATABASE_URL=postgresql://..." > .env.shencha
```

**Q: LLM API 调用失败**
```bash
# 检查 API Key
shencha config get llm.apiKey

# 测试连接
shencha test-llm
```

**Q: 扫描器超时**
```bash
# 增加超时时间
shencha config set scanners.page.timeout 60000
```

### 调试模式

```bash
# 启用调试输出
DEBUG=shencha:* shencha run

# 只运行特定扫描器
shencha run --scanners page,api

# 跳过 LLM 分析
shencha run --no-analyze

# 干运行（不修复）
shencha run --dry-run
```

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

**ShenCha** - 让代码审查自动化，让产品持续进化。

```
审查不止，进化不息
```
