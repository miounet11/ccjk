import type {
  InterviewCategory,
  InterviewCategoryId,
  InterviewQuestion,
  InterviewTemplate,
} from './types';

/**
 * Project Foundation Questions
 * Covers: App purpose, target platform, project scope
 */
const projectFoundationQuestions: InterviewQuestion[] = [
  {
    id: 'app-purpose',
    category: 'project-foundation',
    question: {
      'en': 'What is the primary purpose of this application?',
      'zh-CN': '这个应用的主要目的是什么？',
    },
    header: {
      'en': 'App Purpose',
      'zh-CN': '应用目的',
    },
    options: [
      {
        label: { 'en': 'SaaS/Web App', 'zh-CN': 'SaaS/Web应用' },
        description: {
          'en': 'Subscription-based software service with user accounts',
          'zh-CN': '基于订阅的软件服务，带有用户账户系统',
        },
        value: 'saas',
      },
      {
        label: { 'en': 'Marketing/Landing', 'zh-CN': '营销/着陆页' },
        description: {
          'en': 'Promotional website focused on conversion',
          'zh-CN': '专注于转化的推广网站',
        },
        value: 'marketing',
      },
      {
        label: { 'en': 'E-commerce', 'zh-CN': '电商平台' },
        description: {
          'en': 'Online store with products, cart, and checkout',
          'zh-CN': '带有商品、购物车和结算的在线商店',
        },
        value: 'ecommerce',
      },
      {
        label: { 'en': 'Dashboard/Admin', 'zh-CN': '管理后台' },
        description: {
          'en': 'Internal tool for data management and operations',
          'zh-CN': '用于数据管理和运营的内部工具',
        },
        value: 'dashboard',
      },
    ],
    multiSelect: false,
    order: 1,
    required: true,
  },
  {
    id: 'target-platform',
    category: 'project-foundation',
    question: {
      'en': 'What is your target platform?',
      'zh-CN': '目标平台是什么？',
    },
    header: {
      'en': 'Platform',
      'zh-CN': '平台',
    },
    options: [
      {
        label: { 'en': 'Web (Responsive)', 'zh-CN': 'Web（响应式）' },
        description: {
          'en': 'Browser-based, works on desktop and mobile',
          'zh-CN': '基于浏览器，适配桌面和移动设备',
        },
        value: 'web',
      },
      {
        label: { 'en': 'Mobile Native', 'zh-CN': '原生移动应用' },
        description: {
          'en': 'iOS/Android native apps (React Native, Flutter)',
          'zh-CN': 'iOS/Android原生应用（React Native, Flutter）',
        },
        value: 'mobile-native',
      },
      {
        label: { 'en': 'Mobile PWA', 'zh-CN': '移动PWA' },
        description: {
          'en': 'Progressive Web App with offline support',
          'zh-CN': '支持离线的渐进式Web应用',
        },
        value: 'pwa',
      },
      {
        label: { 'en': 'Desktop', 'zh-CN': '桌面应用' },
        description: {
          'en': 'Desktop application (Electron, Tauri)',
          'zh-CN': '桌面应用程序（Electron, Tauri）',
        },
        value: 'desktop',
      },
    ],
    multiSelect: true,
    order: 2,
    required: true,
  },
  {
    id: 'project-stage',
    category: 'project-foundation',
    question: {
      'en': 'What stage is this project at?',
      'zh-CN': '项目目前处于什么阶段？',
    },
    header: {
      'en': 'Stage',
      'zh-CN': '阶段',
    },
    options: [
      {
        label: { 'en': 'New Project', 'zh-CN': '新项目' },
        description: {
          'en': 'Starting from scratch, no existing code',
          'zh-CN': '从零开始，没有现有代码',
        },
        value: 'new',
      },
      {
        label: { 'en': 'MVP/Prototype', 'zh-CN': 'MVP/原型' },
        description: {
          'en': 'Building minimum viable product for validation',
          'zh-CN': '构建用于验证的最小可行产品',
        },
        value: 'mvp',
      },
      {
        label: { 'en': 'Existing Codebase', 'zh-CN': '现有代码库' },
        description: {
          'en': 'Adding features to existing application',
          'zh-CN': '在现有应用上添加功能',
        },
        value: 'existing',
      },
      {
        label: { 'en': 'Refactoring', 'zh-CN': '重构' },
        description: {
          'en': 'Improving/restructuring existing code',
          'zh-CN': '改进/重构现有代码',
        },
        value: 'refactoring',
      },
    ],
    multiSelect: false,
    order: 3,
    required: true,
  },
];

/**
 * Target Audience Questions
 * Covers: Customer segment, geographic focus, user personas
 */
const targetAudienceQuestions: InterviewQuestion[] = [
  {
    id: 'customer-segment',
    category: 'target-audience',
    question: {
      'en': 'What\'s your target customer segment?',
      'zh-CN': '目标客户群是什么？',
    },
    header: {
      'en': 'Customers',
      'zh-CN': '客户',
    },
    options: [
      {
        label: { 'en': 'SMB', 'zh-CN': '中小企业' },
        description: {
          'en': 'Small/Medium Business, 10-500 employees, $50-500/mo typical',
          'zh-CN': '中小型企业，10-500员工，月付$50-500',
        },
        value: 'smb',
      },
      {
        label: { 'en': 'Enterprise', 'zh-CN': '企业级' },
        description: {
          'en': 'Large corporations, $1000+/mo, longer sales cycles',
          'zh-CN': '大型企业，月付$1000+，销售周期更长',
        },
        value: 'enterprise',
      },
      {
        label: { 'en': 'Individual/Prosumer', 'zh-CN': '个人/专业用户' },
        description: {
          'en': 'Solo professionals, $10-50/mo pricing',
          'zh-CN': '独立专业人士，月付$10-50',
        },
        value: 'individual',
      },
      {
        label: { 'en': 'Developers/Technical', 'zh-CN': '开发者/技术人员' },
        description: {
          'en': 'Software engineers, API-first products',
          'zh-CN': '软件工程师，API优先产品',
        },
        value: 'developers',
      },
    ],
    multiSelect: true,
    order: 1,
    required: true,
  },
  {
    id: 'geographic-focus',
    category: 'target-audience',
    question: {
      'en': 'What is your geographic focus?',
      'zh-CN': '地理重点是什么？',
    },
    header: {
      'en': 'Region',
      'zh-CN': '地区',
    },
    options: [
      {
        label: { 'en': 'Global', 'zh-CN': '全球' },
        description: {
          'en': 'Worldwide audience, multi-language support needed',
          'zh-CN': '全球受众，需要多语言支持',
        },
        value: 'global',
      },
      {
        label: { 'en': 'US/EU', 'zh-CN': '美国/欧盟' },
        description: {
          'en': 'Western markets, GDPR compliance required',
          'zh-CN': '西方市场，需要GDPR合规',
        },
        value: 'us-eu',
      },
      {
        label: { 'en': 'Asia', 'zh-CN': '亚洲' },
        description: {
          'en': 'Asian markets, local payment methods',
          'zh-CN': '亚洲市场，本地支付方式',
        },
        value: 'asia',
      },
      {
        label: { 'en': 'Specific Country', 'zh-CN': '特定国家' },
        description: {
          'en': 'Single country focus with local regulations',
          'zh-CN': '单一国家，遵循当地法规',
        },
        value: 'specific',
      },
    ],
    multiSelect: false,
    order: 2,
    required: true,
  },
  {
    id: 'user-volume',
    category: 'target-audience',
    question: {
      'en': 'What user volume do you expect at launch?',
      'zh-CN': '发布时预期的用户量是多少？',
    },
    header: {
      'en': 'Users',
      'zh-CN': '用户量',
    },
    options: [
      {
        label: { 'en': 'Small (< 100)', 'zh-CN': '小规模 (< 100)' },
        description: {
          'en': 'Initial beta users, simple infrastructure',
          'zh-CN': '初始测试用户，简单基础设施',
        },
        value: 'small',
      },
      {
        label: { 'en': 'Medium (100-10K)', 'zh-CN': '中等规模 (100-10K)' },
        description: {
          'en': 'Growing user base, need some scalability',
          'zh-CN': '增长中的用户群，需要一定可扩展性',
        },
        value: 'medium',
      },
      {
        label: { 'en': 'Large (10K-100K)', 'zh-CN': '大规模 (10K-100K)' },
        description: {
          'en': 'Significant traffic, serious infrastructure needed',
          'zh-CN': '大量流量，需要认真的基础设施',
        },
        value: 'large',
      },
      {
        label: { 'en': 'Massive (100K+)', 'zh-CN': '超大规模 (100K+)' },
        description: {
          'en': 'High-scale system, distributed architecture',
          'zh-CN': '高规模系统，分布式架构',
        },
        value: 'massive',
      },
    ],
    multiSelect: false,
    order: 3,
    required: true,
  },
];

/**
 * Technical Implementation Questions
 * Covers: Architecture, database, auth, state management
 */
const technicalImplementationQuestions: InterviewQuestion[] = [
  {
    id: 'auth-strategy',
    category: 'technical-implementation',
    question: {
      'en': 'What authentication strategy do you prefer?',
      'zh-CN': '你偏好什么认证策略？',
    },
    header: {
      'en': 'Auth',
      'zh-CN': '认证',
    },
    options: [
      {
        label: { 'en': 'JWT Tokens', 'zh-CN': 'JWT令牌' },
        description: {
          'en': 'Stateless, good for APIs, client-side storage',
          'zh-CN': '无状态，适合API，客户端存储',
        },
        value: 'jwt',
        recommended: true,
      },
      {
        label: { 'en': 'OAuth 2.0', 'zh-CN': 'OAuth 2.0' },
        description: {
          'en': 'Social login, third-party auth providers',
          'zh-CN': '社交登录，第三方认证提供商',
        },
        value: 'oauth',
      },
      {
        label: { 'en': 'Session-based', 'zh-CN': '基于会话' },
        description: {
          'en': 'Server-side sessions, traditional approach',
          'zh-CN': '服务端会话，传统方式',
        },
        value: 'session',
      },
      {
        label: { 'en': 'Magic Links', 'zh-CN': '魔法链接' },
        description: {
          'en': 'Passwordless email authentication',
          'zh-CN': '无密码邮件认证',
        },
        value: 'magic-link',
      },
    ],
    multiSelect: false,
    order: 1,
    required: true,
  },
  {
    id: 'primary-database',
    category: 'technical-implementation',
    question: {
      'en': 'What is your primary database choice?',
      'zh-CN': '主数据库选择是什么？',
    },
    header: {
      'en': 'Database',
      'zh-CN': '数据库',
    },
    options: [
      {
        label: { 'en': 'PostgreSQL', 'zh-CN': 'PostgreSQL' },
        description: {
          'en': 'Powerful relational DB, great for complex queries',
          'zh-CN': '强大的关系型数据库，适合复杂查询',
        },
        value: 'postgresql',
        recommended: true,
      },
      {
        label: { 'en': 'MySQL', 'zh-CN': 'MySQL' },
        description: {
          'en': 'Popular relational DB, widely supported',
          'zh-CN': '流行的关系型数据库，广泛支持',
        },
        value: 'mysql',
      },
      {
        label: { 'en': 'MongoDB', 'zh-CN': 'MongoDB' },
        description: {
          'en': 'Document DB, flexible schema, good for rapid dev',
          'zh-CN': '文档数据库，灵活模式，适合快速开发',
        },
        value: 'mongodb',
      },
      {
        label: { 'en': 'SQLite', 'zh-CN': 'SQLite' },
        description: {
          'en': 'Embedded DB, great for small apps/prototypes',
          'zh-CN': '嵌入式数据库，适合小应用/原型',
        },
        value: 'sqlite',
      },
    ],
    multiSelect: false,
    order: 2,
    required: true,
  },
  {
    id: 'state-management',
    category: 'technical-implementation',
    question: {
      'en': 'What state management approach do you prefer?',
      'zh-CN': '你偏好什么状态管理方式？',
    },
    header: {
      'en': 'State',
      'zh-CN': '状态',
    },
    options: [
      {
        label: { 'en': 'Server State (React Query/SWR)', 'zh-CN': '服务端状态 (React Query/SWR)' },
        description: {
          'en': 'Cache server data, automatic refetching',
          'zh-CN': '缓存服务端数据，自动重新获取',
        },
        value: 'server-state',
        recommended: true,
      },
      {
        label: { 'en': 'Global Store (Redux/Zustand)', 'zh-CN': '全局存储 (Redux/Zustand)' },
        description: {
          'en': 'Centralized state, time-travel debugging',
          'zh-CN': '集中式状态，时间旅行调试',
        },
        value: 'global-store',
      },
      {
        label: { 'en': 'URL State', 'zh-CN': 'URL状态' },
        description: {
          'en': 'State in URL params, shareable links',
          'zh-CN': 'URL参数中的状态，可分享链接',
        },
        value: 'url-state',
      },
      {
        label: { 'en': 'Local State Only', 'zh-CN': '仅本地状态' },
        description: {
          'en': 'Component-level state, simple apps',
          'zh-CN': '组件级状态，简单应用',
        },
        value: 'local-state',
      },
    ],
    multiSelect: false,
    order: 3,
    required: true,
  },
  {
    id: 'api-design',
    category: 'technical-implementation',
    question: {
      'en': 'What API design approach do you prefer?',
      'zh-CN': '你偏好什么API设计方式？',
    },
    header: {
      'en': 'API',
      'zh-CN': 'API',
    },
    options: [
      {
        label: { 'en': 'REST API', 'zh-CN': 'REST API' },
        description: {
          'en': 'Traditional HTTP endpoints, widely understood',
          'zh-CN': '传统HTTP端点，广泛理解',
        },
        value: 'rest',
        recommended: true,
      },
      {
        label: { 'en': 'GraphQL', 'zh-CN': 'GraphQL' },
        description: {
          'en': 'Flexible queries, single endpoint, typed schema',
          'zh-CN': '灵活查询，单一端点，类型化模式',
        },
        value: 'graphql',
      },
      {
        label: { 'en': 'tRPC', 'zh-CN': 'tRPC' },
        description: {
          'en': 'End-to-end type safety, great for monorepos',
          'zh-CN': '端到端类型安全，适合单仓库',
        },
        value: 'trpc',
      },
      {
        label: { 'en': 'Server Actions', 'zh-CN': 'Server Actions' },
        description: {
          'en': 'Next.js server actions, minimal API surface',
          'zh-CN': 'Next.js服务端动作，最小API表面',
        },
        value: 'server-actions',
      },
    ],
    multiSelect: false,
    order: 4,
    required: true,
  },
];

/**
 * Features & Scope Questions
 * Covers: MVP features, integrations, timeline
 */
const featuresScopeQuestions: InterviewQuestion[] = [
  {
    id: 'mvp-features',
    category: 'features-scope',
    question: {
      'en': 'Which features are must-have for MVP?',
      'zh-CN': 'MVP必须有哪些功能？',
    },
    header: {
      'en': 'MVP',
      'zh-CN': 'MVP',
    },
    options: [
      {
        label: { 'en': 'User Registration/Login', 'zh-CN': '用户注册/登录' },
        description: {
          'en': 'Basic auth flow with email verification',
          'zh-CN': '基本认证流程，带邮件验证',
        },
        value: 'user-auth',
      },
      {
        label: { 'en': 'Payments/Billing', 'zh-CN': '支付/账单' },
        description: {
          'en': 'Stripe/payment integration, subscriptions',
          'zh-CN': 'Stripe/支付集成，订阅功能',
        },
        value: 'payments',
      },
      {
        label: { 'en': 'Admin Dashboard', 'zh-CN': '管理后台' },
        description: {
          'en': 'Internal admin panel for management',
          'zh-CN': '内部管理面板',
        },
        value: 'admin',
      },
      {
        label: { 'en': 'Real-time Updates', 'zh-CN': '实时更新' },
        description: {
          'en': 'WebSocket/SSE for live data',
          'zh-CN': 'WebSocket/SSE实时数据',
        },
        value: 'realtime',
      },
    ],
    multiSelect: true,
    order: 1,
    required: true,
  },
  {
    id: 'third-party-integrations',
    category: 'features-scope',
    question: {
      'en': 'Which third-party integrations are needed?',
      'zh-CN': '需要哪些第三方集成？',
    },
    header: {
      'en': 'Integrations',
      'zh-CN': '集成',
    },
    options: [
      {
        label: { 'en': 'Payment (Stripe)', 'zh-CN': '支付 (Stripe)' },
        description: {
          'en': 'Payment processing and subscriptions',
          'zh-CN': '支付处理和订阅',
        },
        value: 'stripe',
      },
      {
        label: { 'en': 'Email (SendGrid/Resend)', 'zh-CN': '邮件 (SendGrid/Resend)' },
        description: {
          'en': 'Transactional and marketing emails',
          'zh-CN': '事务性和营销邮件',
        },
        value: 'email',
      },
      {
        label: { 'en': 'Analytics (Mixpanel/Amplitude)', 'zh-CN': '分析 (Mixpanel/Amplitude)' },
        description: {
          'en': 'User behavior tracking and analytics',
          'zh-CN': '用户行为跟踪和分析',
        },
        value: 'analytics',
      },
      {
        label: { 'en': 'Storage (S3/Cloudflare)', 'zh-CN': '存储 (S3/Cloudflare)' },
        description: {
          'en': 'File uploads and media storage',
          'zh-CN': '文件上传和媒体存储',
        },
        value: 'storage',
      },
    ],
    multiSelect: true,
    order: 2,
    required: false,
  },
  {
    id: 'data-import-export',
    category: 'features-scope',
    question: {
      'en': 'Do you need data import/export functionality?',
      'zh-CN': '是否需要数据导入/导出功能？',
    },
    header: {
      'en': 'Data',
      'zh-CN': '数据',
    },
    options: [
      {
        label: { 'en': 'CSV Import/Export', 'zh-CN': 'CSV导入/导出' },
        description: {
          'en': 'Spreadsheet-compatible data exchange',
          'zh-CN': '与电子表格兼容的数据交换',
        },
        value: 'csv',
      },
      {
        label: { 'en': 'API Access', 'zh-CN': 'API访问' },
        description: {
          'en': 'Programmatic data access for developers',
          'zh-CN': '开发者程序化数据访问',
        },
        value: 'api',
      },
      {
        label: { 'en': 'PDF Reports', 'zh-CN': 'PDF报告' },
        description: {
          'en': 'Generate downloadable PDF reports',
          'zh-CN': '生成可下载的PDF报告',
        },
        value: 'pdf',
      },
      {
        label: { 'en': 'Not Needed', 'zh-CN': '不需要' },
        description: {
          'en': 'No data import/export required',
          'zh-CN': '不需要数据导入/导出',
        },
        value: 'none',
      },
    ],
    multiSelect: true,
    order: 3,
    required: false,
  },
];

/**
 * UI/UX Questions
 * Covers: Design system, accessibility, responsive design
 */
const uiUxQuestions: InterviewQuestion[] = [
  {
    id: 'design-system',
    category: 'ui-ux',
    question: {
      'en': 'What design system/UI framework do you prefer?',
      'zh-CN': '你偏好什么设计系统/UI框架？',
    },
    header: {
      'en': 'UI System',
      'zh-CN': 'UI系统',
    },
    options: [
      {
        label: { 'en': 'Tailwind + shadcn/ui', 'zh-CN': 'Tailwind + shadcn/ui' },
        description: {
          'en': 'Utility-first with accessible components',
          'zh-CN': '实用优先，带可访问性组件',
        },
        value: 'tailwind-shadcn',
        recommended: true,
      },
      {
        label: { 'en': 'Material UI', 'zh-CN': 'Material UI' },
        description: {
          'en': 'Google Material Design components',
          'zh-CN': 'Google Material Design组件',
        },
        value: 'material-ui',
      },
      {
        label: { 'en': 'Ant Design', 'zh-CN': 'Ant Design' },
        description: {
          'en': 'Enterprise-grade React components',
          'zh-CN': '企业级React组件',
        },
        value: 'antd',
      },
      {
        label: { 'en': 'Custom Design', 'zh-CN': '自定义设计' },
        description: {
          'en': 'Build from scratch with custom styles',
          'zh-CN': '从头构建自定义样式',
        },
        value: 'custom',
      },
    ],
    multiSelect: false,
    order: 1,
    required: true,
  },
  {
    id: 'accessibility-level',
    category: 'ui-ux',
    question: {
      'en': 'What level of accessibility (a11y) is required?',
      'zh-CN': '需要什么级别的无障碍访问？',
    },
    header: {
      'en': 'A11y',
      'zh-CN': '无障碍',
    },
    options: [
      {
        label: { 'en': 'WCAG AA', 'zh-CN': 'WCAG AA' },
        description: {
          'en': 'Standard compliance, recommended baseline',
          'zh-CN': '标准合规，推荐基线',
        },
        value: 'wcag-aa',
        recommended: true,
      },
      {
        label: { 'en': 'WCAG AAA', 'zh-CN': 'WCAG AAA' },
        description: {
          'en': 'Highest compliance, government/enterprise',
          'zh-CN': '最高合规，政府/企业要求',
        },
        value: 'wcag-aaa',
      },
      {
        label: { 'en': 'Basic', 'zh-CN': '基础' },
        description: {
          'en': 'Keyboard navigation, screen reader basics',
          'zh-CN': '键盘导航，屏幕阅读器基础',
        },
        value: 'basic',
      },
      {
        label: { 'en': 'Not Priority', 'zh-CN': '非优先' },
        description: {
          'en': 'Minimal a11y, will improve later',
          'zh-CN': '最少无障碍，后续改进',
        },
        value: 'minimal',
      },
    ],
    multiSelect: false,
    order: 2,
    required: true,
  },
  {
    id: 'dark-mode',
    category: 'ui-ux',
    question: {
      'en': 'Do you need dark mode support?',
      'zh-CN': '是否需要深色模式支持？',
    },
    header: {
      'en': 'Theme',
      'zh-CN': '主题',
    },
    options: [
      {
        label: { 'en': 'Light + Dark', 'zh-CN': '浅色 + 深色' },
        description: {
          'en': 'Both themes with system preference detection',
          'zh-CN': '两种主题，系统偏好检测',
        },
        value: 'both',
        recommended: true,
      },
      {
        label: { 'en': 'Light Only', 'zh-CN': '仅浅色' },
        description: {
          'en': 'Single light theme, simpler to maintain',
          'zh-CN': '单一浅色主题，易于维护',
        },
        value: 'light',
      },
      {
        label: { 'en': 'Dark Only', 'zh-CN': '仅深色' },
        description: {
          'en': 'Single dark theme, developer/gaming focus',
          'zh-CN': '单一深色主题，开发者/游戏风格',
        },
        value: 'dark',
      },
      {
        label: { 'en': 'User Customizable', 'zh-CN': '用户可定制' },
        description: {
          'en': 'Multiple themes, user can choose colors',
          'zh-CN': '多主题，用户可选择颜色',
        },
        value: 'custom',
      },
    ],
    multiSelect: false,
    order: 3,
    required: false,
  },
];

/**
 * Concerns Questions
 * Covers: Performance, security, edge cases
 */
const concernsQuestions: InterviewQuestion[] = [
  {
    id: 'performance-priority',
    category: 'concerns',
    question: {
      'en': 'What is your primary performance concern?',
      'zh-CN': '主要的性能关注点是什么？',
    },
    header: {
      'en': 'Performance',
      'zh-CN': '性能',
    },
    options: [
      {
        label: { 'en': 'Page Load Speed', 'zh-CN': '页面加载速度' },
        description: {
          'en': 'Core Web Vitals, LCP, FCP optimization',
          'zh-CN': 'Core Web Vitals, LCP, FCP优化',
        },
        value: 'page-load',
      },
      {
        label: { 'en': 'API Response Time', 'zh-CN': 'API响应时间' },
        description: {
          'en': 'Backend latency, database optimization',
          'zh-CN': '后端延迟，数据库优化',
        },
        value: 'api-response',
      },
      {
        label: { 'en': 'Real-time Latency', 'zh-CN': '实时延迟' },
        description: {
          'en': 'WebSocket performance, live updates',
          'zh-CN': 'WebSocket性能，实时更新',
        },
        value: 'realtime-latency',
      },
      {
        label: { 'en': 'Bundle Size', 'zh-CN': '包体积' },
        description: {
          'en': 'JavaScript size, code splitting',
          'zh-CN': 'JavaScript大小，代码分割',
        },
        value: 'bundle-size',
      },
    ],
    multiSelect: true,
    order: 1,
    required: true,
  },
  {
    id: 'security-requirements',
    category: 'concerns',
    question: {
      'en': 'What security requirements apply?',
      'zh-CN': '适用什么安全要求？',
    },
    header: {
      'en': 'Security',
      'zh-CN': '安全',
    },
    options: [
      {
        label: { 'en': 'Standard Web Security', 'zh-CN': '标准Web安全' },
        description: {
          'en': 'OWASP basics, HTTPS, input validation',
          'zh-CN': 'OWASP基础，HTTPS，输入验证',
        },
        value: 'standard',
        recommended: true,
      },
      {
        label: { 'en': 'SOC 2 Compliance', 'zh-CN': 'SOC 2合规' },
        description: {
          'en': 'Security controls for enterprise customers',
          'zh-CN': '企业客户的安全控制',
        },
        value: 'soc2',
      },
      {
        label: { 'en': 'HIPAA', 'zh-CN': 'HIPAA' },
        description: {
          'en': 'Healthcare data protection requirements',
          'zh-CN': '医疗数据保护要求',
        },
        value: 'hipaa',
      },
      {
        label: { 'en': 'PCI DSS', 'zh-CN': 'PCI DSS' },
        description: {
          'en': 'Payment card data security standards',
          'zh-CN': '支付卡数据安全标准',
        },
        value: 'pci',
      },
    ],
    multiSelect: true,
    order: 2,
    required: true,
  },
  {
    id: 'error-handling',
    category: 'concerns',
    question: {
      'en': 'How should errors be handled?',
      'zh-CN': '如何处理错误？',
    },
    header: {
      'en': 'Errors',
      'zh-CN': '错误',
    },
    options: [
      {
        label: { 'en': 'User-friendly Messages', 'zh-CN': '用户友好消息' },
        description: {
          'en': 'Clear error messages, actionable guidance',
          'zh-CN': '清晰的错误消息，可操作的指导',
        },
        value: 'user-friendly',
        recommended: true,
      },
      {
        label: { 'en': 'Detailed Logging', 'zh-CN': '详细日志' },
        description: {
          'en': 'Sentry/error tracking, stack traces',
          'zh-CN': 'Sentry/错误跟踪，堆栈跟踪',
        },
        value: 'detailed-logging',
      },
      {
        label: { 'en': 'Graceful Degradation', 'zh-CN': '优雅降级' },
        description: {
          'en': 'Fallback UI, partial functionality',
          'zh-CN': '后备UI，部分功能',
        },
        value: 'graceful',
      },
      {
        label: { 'en': 'Retry Logic', 'zh-CN': '重试逻辑' },
        description: {
          'en': 'Automatic retry for transient failures',
          'zh-CN': '瞬态故障自动重试',
        },
        value: 'retry',
      },
    ],
    multiSelect: true,
    order: 3,
    required: true,
  },
];

/**
 * Tradeoffs Questions
 * Covers: Speed vs quality, build vs buy
 */
const tradeoffsQuestions: InterviewQuestion[] = [
  {
    id: 'speed-vs-quality',
    category: 'tradeoffs',
    question: {
      'en': 'What is your speed vs quality tradeoff preference?',
      'zh-CN': '你对速度和质量的权衡偏好是什么？',
    },
    header: {
      'en': 'Tradeoff',
      'zh-CN': '权衡',
    },
    options: [
      {
        label: { 'en': 'Ship Fast', 'zh-CN': '快速发布' },
        description: {
          'en': 'Get to market quickly, iterate based on feedback',
          'zh-CN': '快速上市，根据反馈迭代',
        },
        value: 'ship-fast',
      },
      {
        label: { 'en': 'Get It Right', 'zh-CN': '做对再发' },
        description: {
          'en': 'Thorough testing, polished before launch',
          'zh-CN': '充分测试，发布前打磨',
        },
        value: 'get-it-right',
      },
      {
        label: { 'en': 'Balanced', 'zh-CN': '平衡方法' },
        description: {
          'en': 'MVP first, then refine incrementally',
          'zh-CN': '先MVP，然后逐步改进',
        },
        value: 'balanced',
        recommended: true,
      },
    ],
    multiSelect: false,
    order: 1,
    required: true,
  },
  {
    id: 'build-vs-buy',
    category: 'tradeoffs',
    question: {
      'en': 'What is your build vs buy preference?',
      'zh-CN': '你对自建和购买的偏好是什么？',
    },
    header: {
      'en': 'Build/Buy',
      'zh-CN': '自建/购买',
    },
    options: [
      {
        label: { 'en': 'Build Custom', 'zh-CN': '自建定制' },
        description: {
          'en': 'Build from scratch, full control',
          'zh-CN': '从头构建，完全控制',
        },
        value: 'build',
      },
      {
        label: { 'en': 'Use Services', 'zh-CN': '使用服务' },
        description: {
          'en': 'Leverage SaaS tools, faster to market',
          'zh-CN': '利用SaaS工具，更快上市',
        },
        value: 'buy',
      },
      {
        label: { 'en': 'Hybrid', 'zh-CN': '混合方式' },
        description: {
          'en': 'Core features custom, utilities from services',
          'zh-CN': '核心功能自建，工具用服务',
        },
        value: 'hybrid',
        recommended: true,
      },
    ],
    multiSelect: false,
    order: 2,
    required: true,
  },
  {
    id: 'complexity-vs-simplicity',
    category: 'tradeoffs',
    question: {
      'en': 'How do you balance complexity vs simplicity?',
      'zh-CN': '如何平衡复杂性和简单性？',
    },
    header: {
      'en': 'Complexity',
      'zh-CN': '复杂度',
    },
    options: [
      {
        label: { 'en': 'KISS Principle', 'zh-CN': 'KISS原则' },
        description: {
          'en': 'Keep it simple, avoid over-engineering',
          'zh-CN': '保持简单，避免过度工程',
        },
        value: 'simple',
        recommended: true,
      },
      {
        label: { 'en': 'Future-proof', 'zh-CN': '面向未来' },
        description: {
          'en': 'Build for scale, anticipate growth',
          'zh-CN': '为规模构建，预期增长',
        },
        value: 'future-proof',
      },
      {
        label: { 'en': 'Pragmatic', 'zh-CN': '务实' },
        description: {
          'en': 'Right-size solutions, refactor when needed',
          'zh-CN': '适度方案，需要时重构',
        },
        value: 'pragmatic',
      },
    ],
    multiSelect: false,
    order: 3,
    required: true,
  },
];

/**
 * Business Logic Questions
 * Covers: Validation rules, workflow states
 */
const businessLogicQuestions: InterviewQuestion[] = [
  {
    id: 'validation-approach',
    category: 'business-logic',
    question: {
      'en': 'How strict should validation be?',
      'zh-CN': '验证应该多严格？',
    },
    header: {
      'en': 'Validation',
      'zh-CN': '验证',
    },
    options: [
      {
        label: { 'en': 'Strict', 'zh-CN': '严格' },
        description: {
          'en': 'Comprehensive validation, fail-fast',
          'zh-CN': '全面验证，快速失败',
        },
        value: 'strict',
      },
      {
        label: { 'en': 'Lenient', 'zh-CN': '宽松' },
        description: {
          'en': 'Accept more inputs, sanitize/normalize',
          'zh-CN': '接受更多输入，清理/规范化',
        },
        value: 'lenient',
      },
      {
        label: { 'en': 'Progressive', 'zh-CN': '渐进式' },
        description: {
          'en': 'Basic at first, stricter over time',
          'zh-CN': '先基础，逐渐严格',
        },
        value: 'progressive',
        recommended: true,
      },
    ],
    multiSelect: false,
    order: 1,
    required: true,
  },
  {
    id: 'workflow-states',
    category: 'business-logic',
    question: {
      'en': 'Do you have complex workflow states?',
      'zh-CN': '是否有复杂的工作流状态？',
    },
    header: {
      'en': 'Workflow',
      'zh-CN': '工作流',
    },
    options: [
      {
        label: { 'en': 'Simple CRUD', 'zh-CN': '简单CRUD' },
        description: {
          'en': 'Create, read, update, delete operations',
          'zh-CN': '创建、读取、更新、删除操作',
        },
        value: 'simple',
      },
      {
        label: { 'en': 'State Machine', 'zh-CN': '状态机' },
        description: {
          'en': 'Defined states and transitions',
          'zh-CN': '定义的状态和转换',
        },
        value: 'state-machine',
      },
      {
        label: { 'en': 'Approval Workflow', 'zh-CN': '审批工作流' },
        description: {
          'en': 'Multi-step approval processes',
          'zh-CN': '多步审批流程',
        },
        value: 'approval',
      },
      {
        label: { 'en': 'Event-driven', 'zh-CN': '事件驱动' },
        description: {
          'en': 'Actions trigger events and side effects',
          'zh-CN': '动作触发事件和副作用',
        },
        value: 'event-driven',
      },
    ],
    multiSelect: true,
    order: 2,
    required: true,
  },
];

/**
 * Security & Compliance Questions
 * Covers: Data privacy, compliance requirements
 */
const securityComplianceQuestions: InterviewQuestion[] = [
  {
    id: 'data-privacy',
    category: 'security-compliance',
    question: {
      'en': 'What data privacy regulations apply?',
      'zh-CN': '适用什么数据隐私法规？',
    },
    header: {
      'en': 'Privacy',
      'zh-CN': '隐私',
    },
    options: [
      {
        label: { 'en': 'GDPR', 'zh-CN': 'GDPR' },
        description: {
          'en': 'EU data protection, consent management',
          'zh-CN': '欧盟数据保护，同意管理',
        },
        value: 'gdpr',
      },
      {
        label: { 'en': 'CCPA', 'zh-CN': 'CCPA' },
        description: {
          'en': 'California consumer privacy',
          'zh-CN': '加州消费者隐私',
        },
        value: 'ccpa',
      },
      {
        label: { 'en': 'None Specific', 'zh-CN': '无特定要求' },
        description: {
          'en': 'General best practices only',
          'zh-CN': '仅一般最佳实践',
        },
        value: 'none',
      },
      {
        label: { 'en': 'Multiple', 'zh-CN': '多项' },
        description: {
          'en': 'Several regulations, complex compliance',
          'zh-CN': '多项法规，复杂合规',
        },
        value: 'multiple',
      },
    ],
    multiSelect: true,
    order: 1,
    required: true,
  },
  {
    id: 'data-retention',
    category: 'security-compliance',
    question: {
      'en': 'What is your data retention policy?',
      'zh-CN': '数据保留策略是什么？',
    },
    header: {
      'en': 'Retention',
      'zh-CN': '保留',
    },
    options: [
      {
        label: { 'en': 'Keep Forever', 'zh-CN': '永久保留' },
        description: {
          'en': 'Never delete data, archive old records',
          'zh-CN': '永不删除数据，归档旧记录',
        },
        value: 'forever',
      },
      {
        label: { 'en': 'Time-based', 'zh-CN': '基于时间' },
        description: {
          'en': 'Delete after X months/years',
          'zh-CN': 'X个月/年后删除',
        },
        value: 'time-based',
      },
      {
        label: { 'en': 'User-controlled', 'zh-CN': '用户控制' },
        description: {
          'en': 'Users can delete their own data',
          'zh-CN': '用户可删除自己的数据',
        },
        value: 'user-controlled',
        recommended: true,
      },
      {
        label: { 'en': 'Legal Requirement', 'zh-CN': '法律要求' },
        description: {
          'en': 'Specific retention period by law',
          'zh-CN': '法律规定的特定保留期',
        },
        value: 'legal',
      },
    ],
    multiSelect: false,
    order: 2,
    required: true,
  },
];

/**
 * All interview categories with their questions
 */
export const INTERVIEW_CATEGORIES: InterviewCategory[] = [
  {
    id: 'project-foundation',
    name: {
      'en': 'Project Foundation',
      'zh-CN': '项目基础',
    },
    description: {
      'en': 'Basic project type, platform, and scope',
      'zh-CN': '基本项目类型、平台和范围',
    },
    questions: projectFoundationQuestions,
    order: 1,
    icon: '🏗️',
  },
  {
    id: 'target-audience',
    name: {
      'en': 'Target Audience',
      'zh-CN': '目标受众',
    },
    description: {
      'en': 'Customer segments and geographic focus',
      'zh-CN': '客户细分和地理重点',
    },
    questions: targetAudienceQuestions,
    order: 2,
    icon: '👥',
  },
  {
    id: 'technical-implementation',
    name: {
      'en': 'Technical Implementation',
      'zh-CN': '技术实现',
    },
    description: {
      'en': 'Architecture, database, and API decisions',
      'zh-CN': '架构、数据库和API决策',
    },
    questions: technicalImplementationQuestions,
    order: 3,
    icon: '⚙️',
  },
  {
    id: 'features-scope',
    name: {
      'en': 'Features & Scope',
      'zh-CN': '功能与范围',
    },
    description: {
      'en': 'MVP features and integrations',
      'zh-CN': 'MVP功能和集成',
    },
    questions: featuresScopeQuestions,
    order: 4,
    icon: '✨',
  },
  {
    id: 'ui-ux',
    name: {
      'en': 'UI & UX',
      'zh-CN': 'UI和UX',
    },
    description: {
      'en': 'Design system and accessibility',
      'zh-CN': '设计系统和无障碍',
    },
    questions: uiUxQuestions,
    order: 5,
    icon: '🎨',
  },
  {
    id: 'concerns',
    name: {
      'en': 'Concerns',
      'zh-CN': '关注点',
    },
    description: {
      'en': 'Performance, security, and error handling',
      'zh-CN': '性能、安全和错误处理',
    },
    questions: concernsQuestions,
    order: 6,
    icon: '⚠️',
  },
  {
    id: 'tradeoffs',
    name: {
      'en': 'Tradeoffs',
      'zh-CN': '权衡',
    },
    description: {
      'en': 'Speed vs quality, build vs buy decisions',
      'zh-CN': '速度与质量、自建与购买决策',
    },
    questions: tradeoffsQuestions,
    order: 7,
    icon: '⚖️',
  },
  {
    id: 'business-logic',
    name: {
      'en': 'Business Logic',
      'zh-CN': '业务逻辑',
    },
    description: {
      'en': 'Validation rules and workflow states',
      'zh-CN': '验证规则和工作流状态',
    },
    questions: businessLogicQuestions,
    order: 8,
    icon: '📋',
  },
  {
    id: 'security-compliance',
    name: {
      'en': 'Security & Compliance',
      'zh-CN': '安全与合规',
    },
    description: {
      'en': 'Data privacy and regulatory requirements',
      'zh-CN': '数据隐私和监管要求',
    },
    questions: securityComplianceQuestions,
    order: 9,
    icon: '🔒',
  },
];

/**
 * Predefined interview templates for common project types
 */
export const INTERVIEW_TEMPLATES: InterviewTemplate[] = [
  {
    id: 'webapp',
    name: {
      'en': 'Web Application',
      'zh-CN': 'Web应用',
    },
    description: {
      'en': 'Standard web application interview template',
      'zh-CN': '标准Web应用访谈模板',
    },
    targetTypes: ['saas', 'dashboard', 'webapp'],
    categories: [
      'project-foundation',
      'target-audience',
      'technical-implementation',
      'features-scope',
      'ui-ux',
      'concerns',
      'tradeoffs',
    ],
    defaultDepth: 'standard',
    estimatedQuestions: 25,
  },
  {
    id: 'api',
    name: {
      'en': 'API Service',
      'zh-CN': 'API服务',
    },
    description: {
      'en': 'Backend API/microservice interview template',
      'zh-CN': '后端API/微服务访谈模板',
    },
    targetTypes: ['api', 'backend', 'microservice'],
    categories: [
      'project-foundation',
      'target-audience',
      'technical-implementation',
      'concerns',
      'security-compliance',
    ],
    defaultDepth: 'standard',
    estimatedQuestions: 20,
  },
  {
    id: 'saas',
    name: {
      'en': 'SaaS Product',
      'zh-CN': 'SaaS产品',
    },
    description: {
      'en': 'Full SaaS product interview with all categories',
      'zh-CN': '包含所有类别的完整SaaS产品访谈',
    },
    targetTypes: ['saas', 'b2b', 'subscription'],
    categories: [
      'project-foundation',
      'target-audience',
      'technical-implementation',
      'features-scope',
      'ui-ux',
      'concerns',
      'tradeoffs',
      'business-logic',
      'security-compliance',
    ],
    defaultDepth: 'deep',
    estimatedQuestions: 40,
  },
  {
    id: 'ecommerce',
    name: {
      'en': 'E-commerce',
      'zh-CN': '电商',
    },
    description: {
      'en': 'Online store interview template',
      'zh-CN': '在线商店访谈模板',
    },
    targetTypes: ['ecommerce', 'shop', 'store'],
    categories: [
      'project-foundation',
      'target-audience',
      'technical-implementation',
      'features-scope',
      'ui-ux',
      'security-compliance',
    ],
    defaultDepth: 'deep',
    estimatedQuestions: 35,
  },
  {
    id: 'quick',
    name: {
      'en': 'Quick Validation',
      'zh-CN': '快速验证',
    },
    description: {
      'en': 'Fast interview for quick project validation',
      'zh-CN': '快速项目验证的快速访谈',
    },
    targetTypes: ['any', 'prototype', 'mvp'],
    categories: [
      'project-foundation',
      'technical-implementation',
      'tradeoffs',
    ],
    defaultDepth: 'quick',
    estimatedQuestions: 10,
  },
];

/**
 * Get all questions for a specific depth level
 */
export function getQuestionsForDepth(depth: 'quick' | 'standard' | 'deep'): InterviewQuestion[] {
  const allQuestions = INTERVIEW_CATEGORIES.flatMap(cat => cat.questions);

  switch (depth) {
    case 'quick':
      // Only required questions from first 3 categories
      return allQuestions
        .filter(q => q.required && ['project-foundation', 'technical-implementation', 'tradeoffs'].includes(q.category))
        .slice(0, 10);

    case 'standard':
      // All required questions
      return allQuestions.filter(q => q.required).slice(0, 25);

    case 'deep':
      // All questions
      return allQuestions;
  }
}

/**
 * Get questions by category ID
 */
export function getQuestionsByCategory(categoryId: InterviewCategoryId): InterviewQuestion[] {
  const category = INTERVIEW_CATEGORIES.find(c => c.id === categoryId);
  return category?.questions ?? [];
}

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: InterviewCategoryId): InterviewCategory | undefined {
  return INTERVIEW_CATEGORIES.find(c => c.id === categoryId);
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): InterviewTemplate | undefined {
  return INTERVIEW_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Calculate total question count for given categories
 */
export function calculateQuestionCount(categoryIds: InterviewCategoryId[]): number {
  return categoryIds.reduce((total, catId) => {
    const category = getCategoryById(catId);
    return total + (category?.questions.length ?? 0);
  }, 0);
}
