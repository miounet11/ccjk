import { existsSync } from 'node:fs';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { i18n } from './index.mjs';
import { h as handleExitPromptError, a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
import { randomUUID } from 'node:crypto';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';

const projectFoundationQuestions = [
  {
    id: "app-purpose",
    category: "project-foundation",
    question: {
      "en": "What is the primary purpose of this application?",
      "zh-CN": "\u8FD9\u4E2A\u5E94\u7528\u7684\u4E3B\u8981\u76EE\u7684\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "App Purpose",
      "zh-CN": "\u5E94\u7528\u76EE\u7684"
    },
    options: [
      {
        label: { "en": "SaaS/Web App", "zh-CN": "SaaS/Web\u5E94\u7528" },
        description: {
          "en": "Subscription-based software service with user accounts",
          "zh-CN": "\u57FA\u4E8E\u8BA2\u9605\u7684\u8F6F\u4EF6\u670D\u52A1\uFF0C\u5E26\u6709\u7528\u6237\u8D26\u6237\u7CFB\u7EDF"
        },
        value: "saas"
      },
      {
        label: { "en": "Marketing/Landing", "zh-CN": "\u8425\u9500/\u7740\u9646\u9875" },
        description: {
          "en": "Promotional website focused on conversion",
          "zh-CN": "\u4E13\u6CE8\u4E8E\u8F6C\u5316\u7684\u63A8\u5E7F\u7F51\u7AD9"
        },
        value: "marketing"
      },
      {
        label: { "en": "E-commerce", "zh-CN": "\u7535\u5546\u5E73\u53F0" },
        description: {
          "en": "Online store with products, cart, and checkout",
          "zh-CN": "\u5E26\u6709\u5546\u54C1\u3001\u8D2D\u7269\u8F66\u548C\u7ED3\u7B97\u7684\u5728\u7EBF\u5546\u5E97"
        },
        value: "ecommerce"
      },
      {
        label: { "en": "Dashboard/Admin", "zh-CN": "\u7BA1\u7406\u540E\u53F0" },
        description: {
          "en": "Internal tool for data management and operations",
          "zh-CN": "\u7528\u4E8E\u6570\u636E\u7BA1\u7406\u548C\u8FD0\u8425\u7684\u5185\u90E8\u5DE5\u5177"
        },
        value: "dashboard"
      }
    ],
    multiSelect: false,
    order: 1,
    required: true
  },
  {
    id: "target-platform",
    category: "project-foundation",
    question: {
      "en": "What is your target platform?",
      "zh-CN": "\u76EE\u6807\u5E73\u53F0\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Platform",
      "zh-CN": "\u5E73\u53F0"
    },
    options: [
      {
        label: { "en": "Web (Responsive)", "zh-CN": "Web\uFF08\u54CD\u5E94\u5F0F\uFF09" },
        description: {
          "en": "Browser-based, works on desktop and mobile",
          "zh-CN": "\u57FA\u4E8E\u6D4F\u89C8\u5668\uFF0C\u9002\u914D\u684C\u9762\u548C\u79FB\u52A8\u8BBE\u5907"
        },
        value: "web"
      },
      {
        label: { "en": "Mobile Native", "zh-CN": "\u539F\u751F\u79FB\u52A8\u5E94\u7528" },
        description: {
          "en": "iOS/Android native apps (React Native, Flutter)",
          "zh-CN": "iOS/Android\u539F\u751F\u5E94\u7528\uFF08React Native, Flutter\uFF09"
        },
        value: "mobile-native"
      },
      {
        label: { "en": "Mobile PWA", "zh-CN": "\u79FB\u52A8PWA" },
        description: {
          "en": "Progressive Web App with offline support",
          "zh-CN": "\u652F\u6301\u79BB\u7EBF\u7684\u6E10\u8FDB\u5F0FWeb\u5E94\u7528"
        },
        value: "pwa"
      },
      {
        label: { "en": "Desktop", "zh-CN": "\u684C\u9762\u5E94\u7528" },
        description: {
          "en": "Desktop application (Electron, Tauri)",
          "zh-CN": "\u684C\u9762\u5E94\u7528\u7A0B\u5E8F\uFF08Electron, Tauri\uFF09"
        },
        value: "desktop"
      }
    ],
    multiSelect: true,
    order: 2,
    required: true
  },
  {
    id: "project-stage",
    category: "project-foundation",
    question: {
      "en": "What stage is this project at?",
      "zh-CN": "\u9879\u76EE\u76EE\u524D\u5904\u4E8E\u4EC0\u4E48\u9636\u6BB5\uFF1F"
    },
    header: {
      "en": "Stage",
      "zh-CN": "\u9636\u6BB5"
    },
    options: [
      {
        label: { "en": "New Project", "zh-CN": "\u65B0\u9879\u76EE" },
        description: {
          "en": "Starting from scratch, no existing code",
          "zh-CN": "\u4ECE\u96F6\u5F00\u59CB\uFF0C\u6CA1\u6709\u73B0\u6709\u4EE3\u7801"
        },
        value: "new"
      },
      {
        label: { "en": "MVP/Prototype", "zh-CN": "MVP/\u539F\u578B" },
        description: {
          "en": "Building minimum viable product for validation",
          "zh-CN": "\u6784\u5EFA\u7528\u4E8E\u9A8C\u8BC1\u7684\u6700\u5C0F\u53EF\u884C\u4EA7\u54C1"
        },
        value: "mvp"
      },
      {
        label: { "en": "Existing Codebase", "zh-CN": "\u73B0\u6709\u4EE3\u7801\u5E93" },
        description: {
          "en": "Adding features to existing application",
          "zh-CN": "\u5728\u73B0\u6709\u5E94\u7528\u4E0A\u6DFB\u52A0\u529F\u80FD"
        },
        value: "existing"
      },
      {
        label: { "en": "Refactoring", "zh-CN": "\u91CD\u6784" },
        description: {
          "en": "Improving/restructuring existing code",
          "zh-CN": "\u6539\u8FDB/\u91CD\u6784\u73B0\u6709\u4EE3\u7801"
        },
        value: "refactoring"
      }
    ],
    multiSelect: false,
    order: 3,
    required: true
  }
];
const targetAudienceQuestions = [
  {
    id: "customer-segment",
    category: "target-audience",
    question: {
      "en": "What's your target customer segment?",
      "zh-CN": "\u76EE\u6807\u5BA2\u6237\u7FA4\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Customers",
      "zh-CN": "\u5BA2\u6237"
    },
    options: [
      {
        label: { "en": "SMB", "zh-CN": "\u4E2D\u5C0F\u4F01\u4E1A" },
        description: {
          "en": "Small/Medium Business, 10-500 employees, $50-500/mo typical",
          "zh-CN": "\u4E2D\u5C0F\u578B\u4F01\u4E1A\uFF0C10-500\u5458\u5DE5\uFF0C\u6708\u4ED8$50-500"
        },
        value: "smb"
      },
      {
        label: { "en": "Enterprise", "zh-CN": "\u4F01\u4E1A\u7EA7" },
        description: {
          "en": "Large corporations, $1000+/mo, longer sales cycles",
          "zh-CN": "\u5927\u578B\u4F01\u4E1A\uFF0C\u6708\u4ED8$1000+\uFF0C\u9500\u552E\u5468\u671F\u66F4\u957F"
        },
        value: "enterprise"
      },
      {
        label: { "en": "Individual/Prosumer", "zh-CN": "\u4E2A\u4EBA/\u4E13\u4E1A\u7528\u6237" },
        description: {
          "en": "Solo professionals, $10-50/mo pricing",
          "zh-CN": "\u72EC\u7ACB\u4E13\u4E1A\u4EBA\u58EB\uFF0C\u6708\u4ED8$10-50"
        },
        value: "individual"
      },
      {
        label: { "en": "Developers/Technical", "zh-CN": "\u5F00\u53D1\u8005/\u6280\u672F\u4EBA\u5458" },
        description: {
          "en": "Software engineers, API-first products",
          "zh-CN": "\u8F6F\u4EF6\u5DE5\u7A0B\u5E08\uFF0CAPI\u4F18\u5148\u4EA7\u54C1"
        },
        value: "developers"
      }
    ],
    multiSelect: true,
    order: 1,
    required: true
  },
  {
    id: "geographic-focus",
    category: "target-audience",
    question: {
      "en": "What is your geographic focus?",
      "zh-CN": "\u5730\u7406\u91CD\u70B9\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Region",
      "zh-CN": "\u5730\u533A"
    },
    options: [
      {
        label: { "en": "Global", "zh-CN": "\u5168\u7403" },
        description: {
          "en": "Worldwide audience, multi-language support needed",
          "zh-CN": "\u5168\u7403\u53D7\u4F17\uFF0C\u9700\u8981\u591A\u8BED\u8A00\u652F\u6301"
        },
        value: "global"
      },
      {
        label: { "en": "US/EU", "zh-CN": "\u7F8E\u56FD/\u6B27\u76DF" },
        description: {
          "en": "Western markets, GDPR compliance required",
          "zh-CN": "\u897F\u65B9\u5E02\u573A\uFF0C\u9700\u8981GDPR\u5408\u89C4"
        },
        value: "us-eu"
      },
      {
        label: { "en": "Asia", "zh-CN": "\u4E9A\u6D32" },
        description: {
          "en": "Asian markets, local payment methods",
          "zh-CN": "\u4E9A\u6D32\u5E02\u573A\uFF0C\u672C\u5730\u652F\u4ED8\u65B9\u5F0F"
        },
        value: "asia"
      },
      {
        label: { "en": "Specific Country", "zh-CN": "\u7279\u5B9A\u56FD\u5BB6" },
        description: {
          "en": "Single country focus with local regulations",
          "zh-CN": "\u5355\u4E00\u56FD\u5BB6\uFF0C\u9075\u5FAA\u5F53\u5730\u6CD5\u89C4"
        },
        value: "specific"
      }
    ],
    multiSelect: false,
    order: 2,
    required: true
  },
  {
    id: "user-volume",
    category: "target-audience",
    question: {
      "en": "What user volume do you expect at launch?",
      "zh-CN": "\u53D1\u5E03\u65F6\u9884\u671F\u7684\u7528\u6237\u91CF\u662F\u591A\u5C11\uFF1F"
    },
    header: {
      "en": "Users",
      "zh-CN": "\u7528\u6237\u91CF"
    },
    options: [
      {
        label: { "en": "Small (< 100)", "zh-CN": "\u5C0F\u89C4\u6A21 (< 100)" },
        description: {
          "en": "Initial beta users, simple infrastructure",
          "zh-CN": "\u521D\u59CB\u6D4B\u8BD5\u7528\u6237\uFF0C\u7B80\u5355\u57FA\u7840\u8BBE\u65BD"
        },
        value: "small"
      },
      {
        label: { "en": "Medium (100-10K)", "zh-CN": "\u4E2D\u7B49\u89C4\u6A21 (100-10K)" },
        description: {
          "en": "Growing user base, need some scalability",
          "zh-CN": "\u589E\u957F\u4E2D\u7684\u7528\u6237\u7FA4\uFF0C\u9700\u8981\u4E00\u5B9A\u53EF\u6269\u5C55\u6027"
        },
        value: "medium"
      },
      {
        label: { "en": "Large (10K-100K)", "zh-CN": "\u5927\u89C4\u6A21 (10K-100K)" },
        description: {
          "en": "Significant traffic, serious infrastructure needed",
          "zh-CN": "\u5927\u91CF\u6D41\u91CF\uFF0C\u9700\u8981\u8BA4\u771F\u7684\u57FA\u7840\u8BBE\u65BD"
        },
        value: "large"
      },
      {
        label: { "en": "Massive (100K+)", "zh-CN": "\u8D85\u5927\u89C4\u6A21 (100K+)" },
        description: {
          "en": "High-scale system, distributed architecture",
          "zh-CN": "\u9AD8\u89C4\u6A21\u7CFB\u7EDF\uFF0C\u5206\u5E03\u5F0F\u67B6\u6784"
        },
        value: "massive"
      }
    ],
    multiSelect: false,
    order: 3,
    required: true
  }
];
const technicalImplementationQuestions = [
  {
    id: "auth-strategy",
    category: "technical-implementation",
    question: {
      "en": "What authentication strategy do you prefer?",
      "zh-CN": "\u4F60\u504F\u597D\u4EC0\u4E48\u8BA4\u8BC1\u7B56\u7565\uFF1F"
    },
    header: {
      "en": "Auth",
      "zh-CN": "\u8BA4\u8BC1"
    },
    options: [
      {
        label: { "en": "JWT Tokens", "zh-CN": "JWT\u4EE4\u724C" },
        description: {
          "en": "Stateless, good for APIs, client-side storage",
          "zh-CN": "\u65E0\u72B6\u6001\uFF0C\u9002\u5408API\uFF0C\u5BA2\u6237\u7AEF\u5B58\u50A8"
        },
        value: "jwt",
        recommended: true
      },
      {
        label: { "en": "OAuth 2.0", "zh-CN": "OAuth 2.0" },
        description: {
          "en": "Social login, third-party auth providers",
          "zh-CN": "\u793E\u4EA4\u767B\u5F55\uFF0C\u7B2C\u4E09\u65B9\u8BA4\u8BC1\u63D0\u4F9B\u5546"
        },
        value: "oauth"
      },
      {
        label: { "en": "Session-based", "zh-CN": "\u57FA\u4E8E\u4F1A\u8BDD" },
        description: {
          "en": "Server-side sessions, traditional approach",
          "zh-CN": "\u670D\u52A1\u7AEF\u4F1A\u8BDD\uFF0C\u4F20\u7EDF\u65B9\u5F0F"
        },
        value: "session"
      },
      {
        label: { "en": "Magic Links", "zh-CN": "\u9B54\u6CD5\u94FE\u63A5" },
        description: {
          "en": "Passwordless email authentication",
          "zh-CN": "\u65E0\u5BC6\u7801\u90AE\u4EF6\u8BA4\u8BC1"
        },
        value: "magic-link"
      }
    ],
    multiSelect: false,
    order: 1,
    required: true
  },
  {
    id: "primary-database",
    category: "technical-implementation",
    question: {
      "en": "What is your primary database choice?",
      "zh-CN": "\u4E3B\u6570\u636E\u5E93\u9009\u62E9\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Database",
      "zh-CN": "\u6570\u636E\u5E93"
    },
    options: [
      {
        label: { "en": "PostgreSQL", "zh-CN": "PostgreSQL" },
        description: {
          "en": "Powerful relational DB, great for complex queries",
          "zh-CN": "\u5F3A\u5927\u7684\u5173\u7CFB\u578B\u6570\u636E\u5E93\uFF0C\u9002\u5408\u590D\u6742\u67E5\u8BE2"
        },
        value: "postgresql",
        recommended: true
      },
      {
        label: { "en": "MySQL", "zh-CN": "MySQL" },
        description: {
          "en": "Popular relational DB, widely supported",
          "zh-CN": "\u6D41\u884C\u7684\u5173\u7CFB\u578B\u6570\u636E\u5E93\uFF0C\u5E7F\u6CDB\u652F\u6301"
        },
        value: "mysql"
      },
      {
        label: { "en": "MongoDB", "zh-CN": "MongoDB" },
        description: {
          "en": "Document DB, flexible schema, good for rapid dev",
          "zh-CN": "\u6587\u6863\u6570\u636E\u5E93\uFF0C\u7075\u6D3B\u6A21\u5F0F\uFF0C\u9002\u5408\u5FEB\u901F\u5F00\u53D1"
        },
        value: "mongodb"
      },
      {
        label: { "en": "SQLite", "zh-CN": "SQLite" },
        description: {
          "en": "Embedded DB, great for small apps/prototypes",
          "zh-CN": "\u5D4C\u5165\u5F0F\u6570\u636E\u5E93\uFF0C\u9002\u5408\u5C0F\u5E94\u7528/\u539F\u578B"
        },
        value: "sqlite"
      }
    ],
    multiSelect: false,
    order: 2,
    required: true
  },
  {
    id: "state-management",
    category: "technical-implementation",
    question: {
      "en": "What state management approach do you prefer?",
      "zh-CN": "\u4F60\u504F\u597D\u4EC0\u4E48\u72B6\u6001\u7BA1\u7406\u65B9\u5F0F\uFF1F"
    },
    header: {
      "en": "State",
      "zh-CN": "\u72B6\u6001"
    },
    options: [
      {
        label: { "en": "Server State (React Query/SWR)", "zh-CN": "\u670D\u52A1\u7AEF\u72B6\u6001 (React Query/SWR)" },
        description: {
          "en": "Cache server data, automatic refetching",
          "zh-CN": "\u7F13\u5B58\u670D\u52A1\u7AEF\u6570\u636E\uFF0C\u81EA\u52A8\u91CD\u65B0\u83B7\u53D6"
        },
        value: "server-state",
        recommended: true
      },
      {
        label: { "en": "Global Store (Redux/Zustand)", "zh-CN": "\u5168\u5C40\u5B58\u50A8 (Redux/Zustand)" },
        description: {
          "en": "Centralized state, time-travel debugging",
          "zh-CN": "\u96C6\u4E2D\u5F0F\u72B6\u6001\uFF0C\u65F6\u95F4\u65C5\u884C\u8C03\u8BD5"
        },
        value: "global-store"
      },
      {
        label: { "en": "URL State", "zh-CN": "URL\u72B6\u6001" },
        description: {
          "en": "State in URL params, shareable links",
          "zh-CN": "URL\u53C2\u6570\u4E2D\u7684\u72B6\u6001\uFF0C\u53EF\u5206\u4EAB\u94FE\u63A5"
        },
        value: "url-state"
      },
      {
        label: { "en": "Local State Only", "zh-CN": "\u4EC5\u672C\u5730\u72B6\u6001" },
        description: {
          "en": "Component-level state, simple apps",
          "zh-CN": "\u7EC4\u4EF6\u7EA7\u72B6\u6001\uFF0C\u7B80\u5355\u5E94\u7528"
        },
        value: "local-state"
      }
    ],
    multiSelect: false,
    order: 3,
    required: true
  },
  {
    id: "api-design",
    category: "technical-implementation",
    question: {
      "en": "What API design approach do you prefer?",
      "zh-CN": "\u4F60\u504F\u597D\u4EC0\u4E48API\u8BBE\u8BA1\u65B9\u5F0F\uFF1F"
    },
    header: {
      "en": "API",
      "zh-CN": "API"
    },
    options: [
      {
        label: { "en": "REST API", "zh-CN": "REST API" },
        description: {
          "en": "Traditional HTTP endpoints, widely understood",
          "zh-CN": "\u4F20\u7EDFHTTP\u7AEF\u70B9\uFF0C\u5E7F\u6CDB\u7406\u89E3"
        },
        value: "rest",
        recommended: true
      },
      {
        label: { "en": "GraphQL", "zh-CN": "GraphQL" },
        description: {
          "en": "Flexible queries, single endpoint, typed schema",
          "zh-CN": "\u7075\u6D3B\u67E5\u8BE2\uFF0C\u5355\u4E00\u7AEF\u70B9\uFF0C\u7C7B\u578B\u5316\u6A21\u5F0F"
        },
        value: "graphql"
      },
      {
        label: { "en": "tRPC", "zh-CN": "tRPC" },
        description: {
          "en": "End-to-end type safety, great for monorepos",
          "zh-CN": "\u7AEF\u5230\u7AEF\u7C7B\u578B\u5B89\u5168\uFF0C\u9002\u5408\u5355\u4ED3\u5E93"
        },
        value: "trpc"
      },
      {
        label: { "en": "Server Actions", "zh-CN": "Server Actions" },
        description: {
          "en": "Next.js server actions, minimal API surface",
          "zh-CN": "Next.js\u670D\u52A1\u7AEF\u52A8\u4F5C\uFF0C\u6700\u5C0FAPI\u8868\u9762"
        },
        value: "server-actions"
      }
    ],
    multiSelect: false,
    order: 4,
    required: true
  }
];
const featuresScopeQuestions = [
  {
    id: "mvp-features",
    category: "features-scope",
    question: {
      "en": "Which features are must-have for MVP?",
      "zh-CN": "MVP\u5FC5\u987B\u6709\u54EA\u4E9B\u529F\u80FD\uFF1F"
    },
    header: {
      "en": "MVP",
      "zh-CN": "MVP"
    },
    options: [
      {
        label: { "en": "User Registration/Login", "zh-CN": "\u7528\u6237\u6CE8\u518C/\u767B\u5F55" },
        description: {
          "en": "Basic auth flow with email verification",
          "zh-CN": "\u57FA\u672C\u8BA4\u8BC1\u6D41\u7A0B\uFF0C\u5E26\u90AE\u4EF6\u9A8C\u8BC1"
        },
        value: "user-auth"
      },
      {
        label: { "en": "Payments/Billing", "zh-CN": "\u652F\u4ED8/\u8D26\u5355" },
        description: {
          "en": "Stripe/payment integration, subscriptions",
          "zh-CN": "Stripe/\u652F\u4ED8\u96C6\u6210\uFF0C\u8BA2\u9605\u529F\u80FD"
        },
        value: "payments"
      },
      {
        label: { "en": "Admin Dashboard", "zh-CN": "\u7BA1\u7406\u540E\u53F0" },
        description: {
          "en": "Internal admin panel for management",
          "zh-CN": "\u5185\u90E8\u7BA1\u7406\u9762\u677F"
        },
        value: "admin"
      },
      {
        label: { "en": "Real-time Updates", "zh-CN": "\u5B9E\u65F6\u66F4\u65B0" },
        description: {
          "en": "WebSocket/SSE for live data",
          "zh-CN": "WebSocket/SSE\u5B9E\u65F6\u6570\u636E"
        },
        value: "realtime"
      }
    ],
    multiSelect: true,
    order: 1,
    required: true
  },
  {
    id: "third-party-integrations",
    category: "features-scope",
    question: {
      "en": "Which third-party integrations are needed?",
      "zh-CN": "\u9700\u8981\u54EA\u4E9B\u7B2C\u4E09\u65B9\u96C6\u6210\uFF1F"
    },
    header: {
      "en": "Integrations",
      "zh-CN": "\u96C6\u6210"
    },
    options: [
      {
        label: { "en": "Payment (Stripe)", "zh-CN": "\u652F\u4ED8 (Stripe)" },
        description: {
          "en": "Payment processing and subscriptions",
          "zh-CN": "\u652F\u4ED8\u5904\u7406\u548C\u8BA2\u9605"
        },
        value: "stripe"
      },
      {
        label: { "en": "Email (SendGrid/Resend)", "zh-CN": "\u90AE\u4EF6 (SendGrid/Resend)" },
        description: {
          "en": "Transactional and marketing emails",
          "zh-CN": "\u4E8B\u52A1\u6027\u548C\u8425\u9500\u90AE\u4EF6"
        },
        value: "email"
      },
      {
        label: { "en": "Analytics (Mixpanel/Amplitude)", "zh-CN": "\u5206\u6790 (Mixpanel/Amplitude)" },
        description: {
          "en": "User behavior tracking and analytics",
          "zh-CN": "\u7528\u6237\u884C\u4E3A\u8DDF\u8E2A\u548C\u5206\u6790"
        },
        value: "analytics"
      },
      {
        label: { "en": "Storage (S3/Cloudflare)", "zh-CN": "\u5B58\u50A8 (S3/Cloudflare)" },
        description: {
          "en": "File uploads and media storage",
          "zh-CN": "\u6587\u4EF6\u4E0A\u4F20\u548C\u5A92\u4F53\u5B58\u50A8"
        },
        value: "storage"
      }
    ],
    multiSelect: true,
    order: 2,
    required: false
  },
  {
    id: "data-import-export",
    category: "features-scope",
    question: {
      "en": "Do you need data import/export functionality?",
      "zh-CN": "\u662F\u5426\u9700\u8981\u6570\u636E\u5BFC\u5165/\u5BFC\u51FA\u529F\u80FD\uFF1F"
    },
    header: {
      "en": "Data",
      "zh-CN": "\u6570\u636E"
    },
    options: [
      {
        label: { "en": "CSV Import/Export", "zh-CN": "CSV\u5BFC\u5165/\u5BFC\u51FA" },
        description: {
          "en": "Spreadsheet-compatible data exchange",
          "zh-CN": "\u4E0E\u7535\u5B50\u8868\u683C\u517C\u5BB9\u7684\u6570\u636E\u4EA4\u6362"
        },
        value: "csv"
      },
      {
        label: { "en": "API Access", "zh-CN": "API\u8BBF\u95EE" },
        description: {
          "en": "Programmatic data access for developers",
          "zh-CN": "\u5F00\u53D1\u8005\u7A0B\u5E8F\u5316\u6570\u636E\u8BBF\u95EE"
        },
        value: "api"
      },
      {
        label: { "en": "PDF Reports", "zh-CN": "PDF\u62A5\u544A" },
        description: {
          "en": "Generate downloadable PDF reports",
          "zh-CN": "\u751F\u6210\u53EF\u4E0B\u8F7D\u7684PDF\u62A5\u544A"
        },
        value: "pdf"
      },
      {
        label: { "en": "Not Needed", "zh-CN": "\u4E0D\u9700\u8981" },
        description: {
          "en": "No data import/export required",
          "zh-CN": "\u4E0D\u9700\u8981\u6570\u636E\u5BFC\u5165/\u5BFC\u51FA"
        },
        value: "none"
      }
    ],
    multiSelect: true,
    order: 3,
    required: false
  }
];
const uiUxQuestions = [
  {
    id: "design-system",
    category: "ui-ux",
    question: {
      "en": "What design system/UI framework do you prefer?",
      "zh-CN": "\u4F60\u504F\u597D\u4EC0\u4E48\u8BBE\u8BA1\u7CFB\u7EDF/UI\u6846\u67B6\uFF1F"
    },
    header: {
      "en": "UI System",
      "zh-CN": "UI\u7CFB\u7EDF"
    },
    options: [
      {
        label: { "en": "Tailwind + shadcn/ui", "zh-CN": "Tailwind + shadcn/ui" },
        description: {
          "en": "Utility-first with accessible components",
          "zh-CN": "\u5B9E\u7528\u4F18\u5148\uFF0C\u5E26\u53EF\u8BBF\u95EE\u6027\u7EC4\u4EF6"
        },
        value: "tailwind-shadcn",
        recommended: true
      },
      {
        label: { "en": "Material UI", "zh-CN": "Material UI" },
        description: {
          "en": "Google Material Design components",
          "zh-CN": "Google Material Design\u7EC4\u4EF6"
        },
        value: "material-ui"
      },
      {
        label: { "en": "Ant Design", "zh-CN": "Ant Design" },
        description: {
          "en": "Enterprise-grade React components",
          "zh-CN": "\u4F01\u4E1A\u7EA7React\u7EC4\u4EF6"
        },
        value: "antd"
      },
      {
        label: { "en": "Custom Design", "zh-CN": "\u81EA\u5B9A\u4E49\u8BBE\u8BA1" },
        description: {
          "en": "Build from scratch with custom styles",
          "zh-CN": "\u4ECE\u5934\u6784\u5EFA\u81EA\u5B9A\u4E49\u6837\u5F0F"
        },
        value: "custom"
      }
    ],
    multiSelect: false,
    order: 1,
    required: true
  },
  {
    id: "accessibility-level",
    category: "ui-ux",
    question: {
      "en": "What level of accessibility (a11y) is required?",
      "zh-CN": "\u9700\u8981\u4EC0\u4E48\u7EA7\u522B\u7684\u65E0\u969C\u788D\u8BBF\u95EE\uFF1F"
    },
    header: {
      "en": "A11y",
      "zh-CN": "\u65E0\u969C\u788D"
    },
    options: [
      {
        label: { "en": "WCAG AA", "zh-CN": "WCAG AA" },
        description: {
          "en": "Standard compliance, recommended baseline",
          "zh-CN": "\u6807\u51C6\u5408\u89C4\uFF0C\u63A8\u8350\u57FA\u7EBF"
        },
        value: "wcag-aa",
        recommended: true
      },
      {
        label: { "en": "WCAG AAA", "zh-CN": "WCAG AAA" },
        description: {
          "en": "Highest compliance, government/enterprise",
          "zh-CN": "\u6700\u9AD8\u5408\u89C4\uFF0C\u653F\u5E9C/\u4F01\u4E1A\u8981\u6C42"
        },
        value: "wcag-aaa"
      },
      {
        label: { "en": "Basic", "zh-CN": "\u57FA\u7840" },
        description: {
          "en": "Keyboard navigation, screen reader basics",
          "zh-CN": "\u952E\u76D8\u5BFC\u822A\uFF0C\u5C4F\u5E55\u9605\u8BFB\u5668\u57FA\u7840"
        },
        value: "basic"
      },
      {
        label: { "en": "Not Priority", "zh-CN": "\u975E\u4F18\u5148" },
        description: {
          "en": "Minimal a11y, will improve later",
          "zh-CN": "\u6700\u5C11\u65E0\u969C\u788D\uFF0C\u540E\u7EED\u6539\u8FDB"
        },
        value: "minimal"
      }
    ],
    multiSelect: false,
    order: 2,
    required: true
  },
  {
    id: "dark-mode",
    category: "ui-ux",
    question: {
      "en": "Do you need dark mode support?",
      "zh-CN": "\u662F\u5426\u9700\u8981\u6DF1\u8272\u6A21\u5F0F\u652F\u6301\uFF1F"
    },
    header: {
      "en": "Theme",
      "zh-CN": "\u4E3B\u9898"
    },
    options: [
      {
        label: { "en": "Light + Dark", "zh-CN": "\u6D45\u8272 + \u6DF1\u8272" },
        description: {
          "en": "Both themes with system preference detection",
          "zh-CN": "\u4E24\u79CD\u4E3B\u9898\uFF0C\u7CFB\u7EDF\u504F\u597D\u68C0\u6D4B"
        },
        value: "both",
        recommended: true
      },
      {
        label: { "en": "Light Only", "zh-CN": "\u4EC5\u6D45\u8272" },
        description: {
          "en": "Single light theme, simpler to maintain",
          "zh-CN": "\u5355\u4E00\u6D45\u8272\u4E3B\u9898\uFF0C\u6613\u4E8E\u7EF4\u62A4"
        },
        value: "light"
      },
      {
        label: { "en": "Dark Only", "zh-CN": "\u4EC5\u6DF1\u8272" },
        description: {
          "en": "Single dark theme, developer/gaming focus",
          "zh-CN": "\u5355\u4E00\u6DF1\u8272\u4E3B\u9898\uFF0C\u5F00\u53D1\u8005/\u6E38\u620F\u98CE\u683C"
        },
        value: "dark"
      },
      {
        label: { "en": "User Customizable", "zh-CN": "\u7528\u6237\u53EF\u5B9A\u5236" },
        description: {
          "en": "Multiple themes, user can choose colors",
          "zh-CN": "\u591A\u4E3B\u9898\uFF0C\u7528\u6237\u53EF\u9009\u62E9\u989C\u8272"
        },
        value: "custom"
      }
    ],
    multiSelect: false,
    order: 3,
    required: false
  }
];
const concernsQuestions = [
  {
    id: "performance-priority",
    category: "concerns",
    question: {
      "en": "What is your primary performance concern?",
      "zh-CN": "\u4E3B\u8981\u7684\u6027\u80FD\u5173\u6CE8\u70B9\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Performance",
      "zh-CN": "\u6027\u80FD"
    },
    options: [
      {
        label: { "en": "Page Load Speed", "zh-CN": "\u9875\u9762\u52A0\u8F7D\u901F\u5EA6" },
        description: {
          "en": "Core Web Vitals, LCP, FCP optimization",
          "zh-CN": "Core Web Vitals, LCP, FCP\u4F18\u5316"
        },
        value: "page-load"
      },
      {
        label: { "en": "API Response Time", "zh-CN": "API\u54CD\u5E94\u65F6\u95F4" },
        description: {
          "en": "Backend latency, database optimization",
          "zh-CN": "\u540E\u7AEF\u5EF6\u8FDF\uFF0C\u6570\u636E\u5E93\u4F18\u5316"
        },
        value: "api-response"
      },
      {
        label: { "en": "Real-time Latency", "zh-CN": "\u5B9E\u65F6\u5EF6\u8FDF" },
        description: {
          "en": "WebSocket performance, live updates",
          "zh-CN": "WebSocket\u6027\u80FD\uFF0C\u5B9E\u65F6\u66F4\u65B0"
        },
        value: "realtime-latency"
      },
      {
        label: { "en": "Bundle Size", "zh-CN": "\u5305\u4F53\u79EF" },
        description: {
          "en": "JavaScript size, code splitting",
          "zh-CN": "JavaScript\u5927\u5C0F\uFF0C\u4EE3\u7801\u5206\u5272"
        },
        value: "bundle-size"
      }
    ],
    multiSelect: true,
    order: 1,
    required: true
  },
  {
    id: "security-requirements",
    category: "concerns",
    question: {
      "en": "What security requirements apply?",
      "zh-CN": "\u9002\u7528\u4EC0\u4E48\u5B89\u5168\u8981\u6C42\uFF1F"
    },
    header: {
      "en": "Security",
      "zh-CN": "\u5B89\u5168"
    },
    options: [
      {
        label: { "en": "Standard Web Security", "zh-CN": "\u6807\u51C6Web\u5B89\u5168" },
        description: {
          "en": "OWASP basics, HTTPS, input validation",
          "zh-CN": "OWASP\u57FA\u7840\uFF0CHTTPS\uFF0C\u8F93\u5165\u9A8C\u8BC1"
        },
        value: "standard",
        recommended: true
      },
      {
        label: { "en": "SOC 2 Compliance", "zh-CN": "SOC 2\u5408\u89C4" },
        description: {
          "en": "Security controls for enterprise customers",
          "zh-CN": "\u4F01\u4E1A\u5BA2\u6237\u7684\u5B89\u5168\u63A7\u5236"
        },
        value: "soc2"
      },
      {
        label: { "en": "HIPAA", "zh-CN": "HIPAA" },
        description: {
          "en": "Healthcare data protection requirements",
          "zh-CN": "\u533B\u7597\u6570\u636E\u4FDD\u62A4\u8981\u6C42"
        },
        value: "hipaa"
      },
      {
        label: { "en": "PCI DSS", "zh-CN": "PCI DSS" },
        description: {
          "en": "Payment card data security standards",
          "zh-CN": "\u652F\u4ED8\u5361\u6570\u636E\u5B89\u5168\u6807\u51C6"
        },
        value: "pci"
      }
    ],
    multiSelect: true,
    order: 2,
    required: true
  },
  {
    id: "error-handling",
    category: "concerns",
    question: {
      "en": "How should errors be handled?",
      "zh-CN": "\u5982\u4F55\u5904\u7406\u9519\u8BEF\uFF1F"
    },
    header: {
      "en": "Errors",
      "zh-CN": "\u9519\u8BEF"
    },
    options: [
      {
        label: { "en": "User-friendly Messages", "zh-CN": "\u7528\u6237\u53CB\u597D\u6D88\u606F" },
        description: {
          "en": "Clear error messages, actionable guidance",
          "zh-CN": "\u6E05\u6670\u7684\u9519\u8BEF\u6D88\u606F\uFF0C\u53EF\u64CD\u4F5C\u7684\u6307\u5BFC"
        },
        value: "user-friendly",
        recommended: true
      },
      {
        label: { "en": "Detailed Logging", "zh-CN": "\u8BE6\u7EC6\u65E5\u5FD7" },
        description: {
          "en": "Sentry/error tracking, stack traces",
          "zh-CN": "Sentry/\u9519\u8BEF\u8DDF\u8E2A\uFF0C\u5806\u6808\u8DDF\u8E2A"
        },
        value: "detailed-logging"
      },
      {
        label: { "en": "Graceful Degradation", "zh-CN": "\u4F18\u96C5\u964D\u7EA7" },
        description: {
          "en": "Fallback UI, partial functionality",
          "zh-CN": "\u540E\u5907UI\uFF0C\u90E8\u5206\u529F\u80FD"
        },
        value: "graceful"
      },
      {
        label: { "en": "Retry Logic", "zh-CN": "\u91CD\u8BD5\u903B\u8F91" },
        description: {
          "en": "Automatic retry for transient failures",
          "zh-CN": "\u77AC\u6001\u6545\u969C\u81EA\u52A8\u91CD\u8BD5"
        },
        value: "retry"
      }
    ],
    multiSelect: true,
    order: 3,
    required: true
  }
];
const tradeoffsQuestions = [
  {
    id: "speed-vs-quality",
    category: "tradeoffs",
    question: {
      "en": "What is your speed vs quality tradeoff preference?",
      "zh-CN": "\u4F60\u5BF9\u901F\u5EA6\u548C\u8D28\u91CF\u7684\u6743\u8861\u504F\u597D\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Tradeoff",
      "zh-CN": "\u6743\u8861"
    },
    options: [
      {
        label: { "en": "Ship Fast", "zh-CN": "\u5FEB\u901F\u53D1\u5E03" },
        description: {
          "en": "Get to market quickly, iterate based on feedback",
          "zh-CN": "\u5FEB\u901F\u4E0A\u5E02\uFF0C\u6839\u636E\u53CD\u9988\u8FED\u4EE3"
        },
        value: "ship-fast"
      },
      {
        label: { "en": "Get It Right", "zh-CN": "\u505A\u5BF9\u518D\u53D1" },
        description: {
          "en": "Thorough testing, polished before launch",
          "zh-CN": "\u5145\u5206\u6D4B\u8BD5\uFF0C\u53D1\u5E03\u524D\u6253\u78E8"
        },
        value: "get-it-right"
      },
      {
        label: { "en": "Balanced", "zh-CN": "\u5E73\u8861\u65B9\u6CD5" },
        description: {
          "en": "MVP first, then refine incrementally",
          "zh-CN": "\u5148MVP\uFF0C\u7136\u540E\u9010\u6B65\u6539\u8FDB"
        },
        value: "balanced",
        recommended: true
      }
    ],
    multiSelect: false,
    order: 1,
    required: true
  },
  {
    id: "build-vs-buy",
    category: "tradeoffs",
    question: {
      "en": "What is your build vs buy preference?",
      "zh-CN": "\u4F60\u5BF9\u81EA\u5EFA\u548C\u8D2D\u4E70\u7684\u504F\u597D\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Build/Buy",
      "zh-CN": "\u81EA\u5EFA/\u8D2D\u4E70"
    },
    options: [
      {
        label: { "en": "Build Custom", "zh-CN": "\u81EA\u5EFA\u5B9A\u5236" },
        description: {
          "en": "Build from scratch, full control",
          "zh-CN": "\u4ECE\u5934\u6784\u5EFA\uFF0C\u5B8C\u5168\u63A7\u5236"
        },
        value: "build"
      },
      {
        label: { "en": "Use Services", "zh-CN": "\u4F7F\u7528\u670D\u52A1" },
        description: {
          "en": "Leverage SaaS tools, faster to market",
          "zh-CN": "\u5229\u7528SaaS\u5DE5\u5177\uFF0C\u66F4\u5FEB\u4E0A\u5E02"
        },
        value: "buy"
      },
      {
        label: { "en": "Hybrid", "zh-CN": "\u6DF7\u5408\u65B9\u5F0F" },
        description: {
          "en": "Core features custom, utilities from services",
          "zh-CN": "\u6838\u5FC3\u529F\u80FD\u81EA\u5EFA\uFF0C\u5DE5\u5177\u7528\u670D\u52A1"
        },
        value: "hybrid",
        recommended: true
      }
    ],
    multiSelect: false,
    order: 2,
    required: true
  },
  {
    id: "complexity-vs-simplicity",
    category: "tradeoffs",
    question: {
      "en": "How do you balance complexity vs simplicity?",
      "zh-CN": "\u5982\u4F55\u5E73\u8861\u590D\u6742\u6027\u548C\u7B80\u5355\u6027\uFF1F"
    },
    header: {
      "en": "Complexity",
      "zh-CN": "\u590D\u6742\u5EA6"
    },
    options: [
      {
        label: { "en": "KISS Principle", "zh-CN": "KISS\u539F\u5219" },
        description: {
          "en": "Keep it simple, avoid over-engineering",
          "zh-CN": "\u4FDD\u6301\u7B80\u5355\uFF0C\u907F\u514D\u8FC7\u5EA6\u5DE5\u7A0B"
        },
        value: "simple",
        recommended: true
      },
      {
        label: { "en": "Future-proof", "zh-CN": "\u9762\u5411\u672A\u6765" },
        description: {
          "en": "Build for scale, anticipate growth",
          "zh-CN": "\u4E3A\u89C4\u6A21\u6784\u5EFA\uFF0C\u9884\u671F\u589E\u957F"
        },
        value: "future-proof"
      },
      {
        label: { "en": "Pragmatic", "zh-CN": "\u52A1\u5B9E" },
        description: {
          "en": "Right-size solutions, refactor when needed",
          "zh-CN": "\u9002\u5EA6\u65B9\u6848\uFF0C\u9700\u8981\u65F6\u91CD\u6784"
        },
        value: "pragmatic"
      }
    ],
    multiSelect: false,
    order: 3,
    required: true
  }
];
const businessLogicQuestions = [
  {
    id: "validation-approach",
    category: "business-logic",
    question: {
      "en": "How strict should validation be?",
      "zh-CN": "\u9A8C\u8BC1\u5E94\u8BE5\u591A\u4E25\u683C\uFF1F"
    },
    header: {
      "en": "Validation",
      "zh-CN": "\u9A8C\u8BC1"
    },
    options: [
      {
        label: { "en": "Strict", "zh-CN": "\u4E25\u683C" },
        description: {
          "en": "Comprehensive validation, fail-fast",
          "zh-CN": "\u5168\u9762\u9A8C\u8BC1\uFF0C\u5FEB\u901F\u5931\u8D25"
        },
        value: "strict"
      },
      {
        label: { "en": "Lenient", "zh-CN": "\u5BBD\u677E" },
        description: {
          "en": "Accept more inputs, sanitize/normalize",
          "zh-CN": "\u63A5\u53D7\u66F4\u591A\u8F93\u5165\uFF0C\u6E05\u7406/\u89C4\u8303\u5316"
        },
        value: "lenient"
      },
      {
        label: { "en": "Progressive", "zh-CN": "\u6E10\u8FDB\u5F0F" },
        description: {
          "en": "Basic at first, stricter over time",
          "zh-CN": "\u5148\u57FA\u7840\uFF0C\u9010\u6E10\u4E25\u683C"
        },
        value: "progressive",
        recommended: true
      }
    ],
    multiSelect: false,
    order: 1,
    required: true
  },
  {
    id: "workflow-states",
    category: "business-logic",
    question: {
      "en": "Do you have complex workflow states?",
      "zh-CN": "\u662F\u5426\u6709\u590D\u6742\u7684\u5DE5\u4F5C\u6D41\u72B6\u6001\uFF1F"
    },
    header: {
      "en": "Workflow",
      "zh-CN": "\u5DE5\u4F5C\u6D41"
    },
    options: [
      {
        label: { "en": "Simple CRUD", "zh-CN": "\u7B80\u5355CRUD" },
        description: {
          "en": "Create, read, update, delete operations",
          "zh-CN": "\u521B\u5EFA\u3001\u8BFB\u53D6\u3001\u66F4\u65B0\u3001\u5220\u9664\u64CD\u4F5C"
        },
        value: "simple"
      },
      {
        label: { "en": "State Machine", "zh-CN": "\u72B6\u6001\u673A" },
        description: {
          "en": "Defined states and transitions",
          "zh-CN": "\u5B9A\u4E49\u7684\u72B6\u6001\u548C\u8F6C\u6362"
        },
        value: "state-machine"
      },
      {
        label: { "en": "Approval Workflow", "zh-CN": "\u5BA1\u6279\u5DE5\u4F5C\u6D41" },
        description: {
          "en": "Multi-step approval processes",
          "zh-CN": "\u591A\u6B65\u5BA1\u6279\u6D41\u7A0B"
        },
        value: "approval"
      },
      {
        label: { "en": "Event-driven", "zh-CN": "\u4E8B\u4EF6\u9A71\u52A8" },
        description: {
          "en": "Actions trigger events and side effects",
          "zh-CN": "\u52A8\u4F5C\u89E6\u53D1\u4E8B\u4EF6\u548C\u526F\u4F5C\u7528"
        },
        value: "event-driven"
      }
    ],
    multiSelect: true,
    order: 2,
    required: true
  }
];
const securityComplianceQuestions = [
  {
    id: "data-privacy",
    category: "security-compliance",
    question: {
      "en": "What data privacy regulations apply?",
      "zh-CN": "\u9002\u7528\u4EC0\u4E48\u6570\u636E\u9690\u79C1\u6CD5\u89C4\uFF1F"
    },
    header: {
      "en": "Privacy",
      "zh-CN": "\u9690\u79C1"
    },
    options: [
      {
        label: { "en": "GDPR", "zh-CN": "GDPR" },
        description: {
          "en": "EU data protection, consent management",
          "zh-CN": "\u6B27\u76DF\u6570\u636E\u4FDD\u62A4\uFF0C\u540C\u610F\u7BA1\u7406"
        },
        value: "gdpr"
      },
      {
        label: { "en": "CCPA", "zh-CN": "CCPA" },
        description: {
          "en": "California consumer privacy",
          "zh-CN": "\u52A0\u5DDE\u6D88\u8D39\u8005\u9690\u79C1"
        },
        value: "ccpa"
      },
      {
        label: { "en": "None Specific", "zh-CN": "\u65E0\u7279\u5B9A\u8981\u6C42" },
        description: {
          "en": "General best practices only",
          "zh-CN": "\u4EC5\u4E00\u822C\u6700\u4F73\u5B9E\u8DF5"
        },
        value: "none"
      },
      {
        label: { "en": "Multiple", "zh-CN": "\u591A\u9879" },
        description: {
          "en": "Several regulations, complex compliance",
          "zh-CN": "\u591A\u9879\u6CD5\u89C4\uFF0C\u590D\u6742\u5408\u89C4"
        },
        value: "multiple"
      }
    ],
    multiSelect: true,
    order: 1,
    required: true
  },
  {
    id: "data-retention",
    category: "security-compliance",
    question: {
      "en": "What is your data retention policy?",
      "zh-CN": "\u6570\u636E\u4FDD\u7559\u7B56\u7565\u662F\u4EC0\u4E48\uFF1F"
    },
    header: {
      "en": "Retention",
      "zh-CN": "\u4FDD\u7559"
    },
    options: [
      {
        label: { "en": "Keep Forever", "zh-CN": "\u6C38\u4E45\u4FDD\u7559" },
        description: {
          "en": "Never delete data, archive old records",
          "zh-CN": "\u6C38\u4E0D\u5220\u9664\u6570\u636E\uFF0C\u5F52\u6863\u65E7\u8BB0\u5F55"
        },
        value: "forever"
      },
      {
        label: { "en": "Time-based", "zh-CN": "\u57FA\u4E8E\u65F6\u95F4" },
        description: {
          "en": "Delete after X months/years",
          "zh-CN": "X\u4E2A\u6708/\u5E74\u540E\u5220\u9664"
        },
        value: "time-based"
      },
      {
        label: { "en": "User-controlled", "zh-CN": "\u7528\u6237\u63A7\u5236" },
        description: {
          "en": "Users can delete their own data",
          "zh-CN": "\u7528\u6237\u53EF\u5220\u9664\u81EA\u5DF1\u7684\u6570\u636E"
        },
        value: "user-controlled",
        recommended: true
      },
      {
        label: { "en": "Legal Requirement", "zh-CN": "\u6CD5\u5F8B\u8981\u6C42" },
        description: {
          "en": "Specific retention period by law",
          "zh-CN": "\u6CD5\u5F8B\u89C4\u5B9A\u7684\u7279\u5B9A\u4FDD\u7559\u671F"
        },
        value: "legal"
      }
    ],
    multiSelect: false,
    order: 2,
    required: true
  }
];
const INTERVIEW_CATEGORIES = [
  {
    id: "project-foundation",
    name: {
      "en": "Project Foundation",
      "zh-CN": "\u9879\u76EE\u57FA\u7840"
    },
    description: {
      "en": "Basic project type, platform, and scope",
      "zh-CN": "\u57FA\u672C\u9879\u76EE\u7C7B\u578B\u3001\u5E73\u53F0\u548C\u8303\u56F4"
    },
    questions: projectFoundationQuestions,
    order: 1,
    icon: "\u{1F3D7}\uFE0F"
  },
  {
    id: "target-audience",
    name: {
      "en": "Target Audience",
      "zh-CN": "\u76EE\u6807\u53D7\u4F17"
    },
    description: {
      "en": "Customer segments and geographic focus",
      "zh-CN": "\u5BA2\u6237\u7EC6\u5206\u548C\u5730\u7406\u91CD\u70B9"
    },
    questions: targetAudienceQuestions,
    order: 2,
    icon: "\u{1F465}"
  },
  {
    id: "technical-implementation",
    name: {
      "en": "Technical Implementation",
      "zh-CN": "\u6280\u672F\u5B9E\u73B0"
    },
    description: {
      "en": "Architecture, database, and API decisions",
      "zh-CN": "\u67B6\u6784\u3001\u6570\u636E\u5E93\u548CAPI\u51B3\u7B56"
    },
    questions: technicalImplementationQuestions,
    order: 3,
    icon: "\u2699\uFE0F"
  },
  {
    id: "features-scope",
    name: {
      "en": "Features & Scope",
      "zh-CN": "\u529F\u80FD\u4E0E\u8303\u56F4"
    },
    description: {
      "en": "MVP features and integrations",
      "zh-CN": "MVP\u529F\u80FD\u548C\u96C6\u6210"
    },
    questions: featuresScopeQuestions,
    order: 4,
    icon: "\u2728"
  },
  {
    id: "ui-ux",
    name: {
      "en": "UI & UX",
      "zh-CN": "UI\u548CUX"
    },
    description: {
      "en": "Design system and accessibility",
      "zh-CN": "\u8BBE\u8BA1\u7CFB\u7EDF\u548C\u65E0\u969C\u788D"
    },
    questions: uiUxQuestions,
    order: 5,
    icon: "\u{1F3A8}"
  },
  {
    id: "concerns",
    name: {
      "en": "Concerns",
      "zh-CN": "\u5173\u6CE8\u70B9"
    },
    description: {
      "en": "Performance, security, and error handling",
      "zh-CN": "\u6027\u80FD\u3001\u5B89\u5168\u548C\u9519\u8BEF\u5904\u7406"
    },
    questions: concernsQuestions,
    order: 6,
    icon: "\u26A0\uFE0F"
  },
  {
    id: "tradeoffs",
    name: {
      "en": "Tradeoffs",
      "zh-CN": "\u6743\u8861"
    },
    description: {
      "en": "Speed vs quality, build vs buy decisions",
      "zh-CN": "\u901F\u5EA6\u4E0E\u8D28\u91CF\u3001\u81EA\u5EFA\u4E0E\u8D2D\u4E70\u51B3\u7B56"
    },
    questions: tradeoffsQuestions,
    order: 7,
    icon: "\u2696\uFE0F"
  },
  {
    id: "business-logic",
    name: {
      "en": "Business Logic",
      "zh-CN": "\u4E1A\u52A1\u903B\u8F91"
    },
    description: {
      "en": "Validation rules and workflow states",
      "zh-CN": "\u9A8C\u8BC1\u89C4\u5219\u548C\u5DE5\u4F5C\u6D41\u72B6\u6001"
    },
    questions: businessLogicQuestions,
    order: 8,
    icon: "\u{1F4CB}"
  },
  {
    id: "security-compliance",
    name: {
      "en": "Security & Compliance",
      "zh-CN": "\u5B89\u5168\u4E0E\u5408\u89C4"
    },
    description: {
      "en": "Data privacy and regulatory requirements",
      "zh-CN": "\u6570\u636E\u9690\u79C1\u548C\u76D1\u7BA1\u8981\u6C42"
    },
    questions: securityComplianceQuestions,
    order: 9,
    icon: "\u{1F512}"
  }
];
const INTERVIEW_TEMPLATES = [
  {
    id: "webapp",
    name: {
      "en": "Web Application",
      "zh-CN": "Web\u5E94\u7528"
    },
    description: {
      "en": "Standard web application interview template",
      "zh-CN": "\u6807\u51C6Web\u5E94\u7528\u8BBF\u8C08\u6A21\u677F"
    },
    targetTypes: ["saas", "dashboard", "webapp"],
    categories: [
      "project-foundation",
      "target-audience",
      "technical-implementation",
      "features-scope",
      "ui-ux",
      "concerns",
      "tradeoffs"
    ],
    defaultDepth: "standard",
    estimatedQuestions: 25
  },
  {
    id: "api",
    name: {
      "en": "API Service",
      "zh-CN": "API\u670D\u52A1"
    },
    description: {
      "en": "Backend API/microservice interview template",
      "zh-CN": "\u540E\u7AEFAPI/\u5FAE\u670D\u52A1\u8BBF\u8C08\u6A21\u677F"
    },
    targetTypes: ["api", "backend", "microservice"],
    categories: [
      "project-foundation",
      "target-audience",
      "technical-implementation",
      "concerns",
      "security-compliance"
    ],
    defaultDepth: "standard",
    estimatedQuestions: 20
  },
  {
    id: "saas",
    name: {
      "en": "SaaS Product",
      "zh-CN": "SaaS\u4EA7\u54C1"
    },
    description: {
      "en": "Full SaaS product interview with all categories",
      "zh-CN": "\u5305\u542B\u6240\u6709\u7C7B\u522B\u7684\u5B8C\u6574SaaS\u4EA7\u54C1\u8BBF\u8C08"
    },
    targetTypes: ["saas", "b2b", "subscription"],
    categories: [
      "project-foundation",
      "target-audience",
      "technical-implementation",
      "features-scope",
      "ui-ux",
      "concerns",
      "tradeoffs",
      "business-logic",
      "security-compliance"
    ],
    defaultDepth: "deep",
    estimatedQuestions: 40
  },
  {
    id: "ecommerce",
    name: {
      "en": "E-commerce",
      "zh-CN": "\u7535\u5546"
    },
    description: {
      "en": "Online store interview template",
      "zh-CN": "\u5728\u7EBF\u5546\u5E97\u8BBF\u8C08\u6A21\u677F"
    },
    targetTypes: ["ecommerce", "shop", "store"],
    categories: [
      "project-foundation",
      "target-audience",
      "technical-implementation",
      "features-scope",
      "ui-ux",
      "security-compliance"
    ],
    defaultDepth: "deep",
    estimatedQuestions: 35
  },
  {
    id: "quick",
    name: {
      "en": "Quick Validation",
      "zh-CN": "\u5FEB\u901F\u9A8C\u8BC1"
    },
    description: {
      "en": "Fast interview for quick project validation",
      "zh-CN": "\u5FEB\u901F\u9879\u76EE\u9A8C\u8BC1\u7684\u5FEB\u901F\u8BBF\u8C08"
    },
    targetTypes: ["any", "prototype", "mvp"],
    categories: [
      "project-foundation",
      "technical-implementation",
      "tradeoffs"
    ],
    defaultDepth: "quick",
    estimatedQuestions: 10
  }
];
function getQuestionsByCategory(categoryId) {
  const category = INTERVIEW_CATEGORIES.find((c) => c.id === categoryId);
  return category?.questions ?? [];
}
function getCategoryById(categoryId) {
  return INTERVIEW_CATEGORIES.find((c) => c.id === categoryId);
}
function getTemplateById(templateId) {
  return INTERVIEW_TEMPLATES.find((t) => t.id === templateId);
}
function calculateQuestionCount(categoryIds) {
  return categoryIds.reduce((total, catId) => {
    const category = getCategoryById(catId);
    return total + (category?.questions.length ?? 0);
  }, 0);
}

const DEFAULT_OPTIONS = {
  depth: "standard",
  categories: [],
  skipObvious: true,
  outputFile: "SPEC.md",
  language: "en"
};
class InterviewEngine {
  sessions = /* @__PURE__ */ new Map();
  language = "en";
  constructor(language = "en") {
    this.language = language;
  }
  /**
   * Start a new interview session
   */
  async startInterview(specFile, options = {}) {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const sessionId = randomUUID();
    let categories = mergedOptions.categories;
    if (categories.length === 0) {
      categories = this.getCategoriesForDepth(mergedOptions.depth);
    }
    const totalQuestions = calculateQuestionCount(categories);
    const progress = categories.map((catId, index) => {
      const category = getCategoryById(catId);
      return {
        categoryId: catId,
        name: category?.name[this.language] ?? catId,
        answered: 0,
        total: category?.questions.length ?? 0,
        percentage: 0,
        isComplete: false,
        isCurrent: index === 0
      };
    });
    const session = {
      id: sessionId,
      specFile,
      depth: mergedOptions.depth,
      currentCategory: categories[0],
      currentQuestionIndex: 0,
      questionsAsked: 0,
      questionsRemaining: totalQuestions,
      answers: [],
      progress,
      startedAt: /* @__PURE__ */ new Date(),
      lastActivityAt: /* @__PURE__ */ new Date(),
      status: "in_progress",
      includedCategories: categories,
      context: mergedOptions.context
    };
    this.sessions.set(sessionId, session);
    return session;
  }
  /**
   * Get categories based on depth level
   */
  getCategoriesForDepth(depth) {
    switch (depth) {
      case "quick":
        return ["project-foundation", "technical-implementation", "tradeoffs"];
      case "standard":
        return [
          "project-foundation",
          "target-audience",
          "technical-implementation",
          "features-scope",
          "ui-ux",
          "concerns",
          "tradeoffs"
        ];
      case "deep":
        return INTERVIEW_CATEGORIES.map((c) => c.id);
    }
  }
  /**
   * Get the next question to ask
   */
  async getNextQuestion(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "in_progress") {
      return null;
    }
    const categoryQuestions = getQuestionsByCategory(session.currentCategory);
    while (session.currentQuestionIndex < categoryQuestions.length) {
      const question = categoryQuestions[session.currentQuestionIndex];
      if (this.shouldSkipQuestion(session, question)) {
        session.currentQuestionIndex++;
        continue;
      }
      return this.formatQuestionForDisplay(session, question);
    }
    const currentCatIndex = session.includedCategories.indexOf(session.currentCategory);
    if (currentCatIndex < session.includedCategories.length - 1) {
      this.updateCategoryProgress(session, session.currentCategory, true);
      session.currentCategory = session.includedCategories[currentCatIndex + 1];
      session.currentQuestionIndex = 0;
      session.progress.forEach((p) => {
        p.isCurrent = p.categoryId === session.currentCategory;
      });
      return this.getNextQuestion(sessionId);
    }
    session.status = "completed";
    this.updateCategoryProgress(session, session.currentCategory, true);
    return null;
  }
  /**
   * Check if a question should be skipped based on conditional logic
   */
  shouldSkipQuestion(session, question) {
    if (!question.conditional) {
      return false;
    }
    const { dependsOn, whenValues, action } = question.conditional;
    const dependentAnswer = session.answers.find((a) => a.questionId === dependsOn);
    if (!dependentAnswer) {
      return action === "show";
    }
    const hasMatchingValue = dependentAnswer.values.some((v) => whenValues.includes(v));
    if (action === "show") {
      return !hasMatchingValue;
    } else {
      return hasMatchingValue;
    }
  }
  /**
   * Format a question for display
   */
  formatQuestionForDisplay(session, question) {
    const estimatedTotal = this.getEstimatedTotal(session);
    return {
      question,
      progressText: this.formatProgressText(session),
      categoryBreadcrumb: this.formatCategoryBreadcrumb(session),
      questionNumber: session.questionsAsked + 1,
      estimatedTotal,
      options: question.options.map((opt) => ({
        label: opt.label[this.language],
        description: opt.description[this.language],
        value: opt.value ?? opt.label[this.language],
        isRecommended: opt.recommended ?? false
      }))
    };
  }
  /**
   * Format progress text
   */
  formatProgressText(session) {
    const estimatedTotal = this.getEstimatedTotal(session);
    return `Question ${session.questionsAsked + 1} of ~${estimatedTotal}`;
  }
  /**
   * Format category breadcrumb
   */
  formatCategoryBreadcrumb(session) {
    return session.progress.map((p) => {
      if (p.isComplete) {
        return `[X] ${p.name}`;
      }
      if (p.isCurrent) {
        return `[>] ${p.name}`;
      }
      return `[ ] ${p.name}`;
    }).join(" -> ");
  }
  /**
   * Get estimated total questions
   */
  getEstimatedTotal(session) {
    switch (session.depth) {
      case "quick":
        return 10;
      case "standard":
        return 25;
      case "deep":
        return 40;
    }
  }
  /**
   * Process user's answer to a question
   */
  async processAnswer(sessionId, questionId, values, customInput) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "in_progress") {
      return false;
    }
    const categoryQuestions = getQuestionsByCategory(session.currentCategory);
    const question = categoryQuestions.find((q) => q.id === questionId);
    if (!question) {
      return false;
    }
    const answer = {
      questionId,
      categoryId: session.currentCategory,
      values,
      customInput,
      answeredAt: /* @__PURE__ */ new Date()
    };
    session.answers.push(answer);
    session.questionsAsked++;
    session.questionsRemaining--;
    session.currentQuestionIndex++;
    session.lastActivityAt = /* @__PURE__ */ new Date();
    this.updateCategoryProgress(session, session.currentCategory, false);
    return true;
  }
  /**
   * Update category progress
   */
  updateCategoryProgress(session, categoryId, isComplete) {
    const progressItem = session.progress.find((p) => p.categoryId === categoryId);
    if (progressItem) {
      const categoryAnswers = session.answers.filter((a) => a.categoryId === categoryId);
      progressItem.answered = categoryAnswers.length;
      progressItem.percentage = Math.round(progressItem.answered / progressItem.total * 100);
      progressItem.isComplete = isComplete || progressItem.answered >= progressItem.total;
    }
  }
  /**
   * Pause an interview session
   */
  async pauseInterview(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "in_progress") {
      return false;
    }
    session.status = "paused";
    session.lastActivityAt = /* @__PURE__ */ new Date();
    return true;
  }
  /**
   * Resume a paused interview session
   */
  async resumeInterview(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "paused") {
      return null;
    }
    session.status = "in_progress";
    session.lastActivityAt = /* @__PURE__ */ new Date();
    return session;
  }
  /**
   * Cancel an interview session
   */
  async cancelInterview(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.status = "cancelled";
    session.lastActivityAt = /* @__PURE__ */ new Date();
    return true;
  }
  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === "in_progress" || s.status === "paused"
    );
  }
  /**
   * Check if interview is complete
   */
  isComplete(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.status === "completed";
  }
  /**
   * Get interview result
   */
  async getResult(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        session: null,
        error: "Session not found"
      };
    }
    if (session.status !== "completed") {
      return {
        success: false,
        session,
        error: `Interview not complete. Status: ${session.status}`
      };
    }
    return {
      success: true,
      session
    };
  }
  /**
   * Get answers grouped by category
   */
  getAnswersByCategory(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return /* @__PURE__ */ new Map();
    }
    const grouped = /* @__PURE__ */ new Map();
    for (const answer of session.answers) {
      const existing = grouped.get(answer.categoryId) ?? [];
      existing.push(answer);
      grouped.set(answer.categoryId, existing);
    }
    return grouped;
  }
  /**
   * Get answer for a specific question
   */
  getAnswerForQuestion(sessionId, questionId) {
    const session = this.sessions.get(sessionId);
    return session?.answers.find((a) => a.questionId === questionId);
  }
  /**
   * Get interview statistics
   */
  getStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    const duration = Math.round(
      (session.lastActivityAt.getTime() - session.startedAt.getTime()) / 1e3
    );
    const total = session.questionsAsked + session.questionsRemaining;
    const percentage = Math.round(session.questionsAsked / total * 100);
    return {
      answered: session.questionsAsked,
      remaining: session.questionsRemaining,
      percentage,
      duration
    };
  }
  /**
   * Export session to JSON
   */
  exportSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    return JSON.stringify(session, null, 2);
  }
  /**
   * Import session from JSON
   */
  importSession(json) {
    try {
      const session = JSON.parse(json);
      session.startedAt = new Date(session.startedAt);
      session.lastActivityAt = new Date(session.lastActivityAt);
      session.answers.forEach((a) => {
        a.answeredAt = new Date(a.answeredAt);
      });
      this.sessions.set(session.id, session);
      return session;
    } catch {
      return null;
    }
  }
  /**
   * Clear all sessions
   */
  clearAllSessions() {
    this.sessions.clear();
  }
  /**
   * Set language for the engine
   */
  setLanguage(language) {
    this.language = language;
  }
  /**
   * Get current language
   */
  getLanguage() {
    return this.language;
  }
}
function createInterviewEngine(language = "en") {
  return new InterviewEngine(language);
}

class SpecGenerator {
  language = "en";
  constructor(language = "en") {
    this.language = language;
  }
  /**
   * Generate spec from completed interview session
   */
  async generateSpec(session) {
    const answersByCategory = this.groupAnswersByCategory(session.answers);
    const spec = {
      title: this.extractTitle(session),
      generatedAt: /* @__PURE__ */ new Date(),
      sessionId: session.id,
      questionCount: session.questionsAsked,
      depth: session.depth,
      overview: this.generateOverview(answersByCategory),
      technical: this.generateTechnical(answersByCategory),
      uiux: this.generateUIUX(answersByCategory),
      security: this.generateSecurity(answersByCategory),
      business: this.generateBusiness(answersByCategory),
      decisions: this.extractDecisions(session.answers),
      edgeCases: this.identifyEdgeCases(session.answers),
      openQuestions: this.identifyOpenQuestions(session),
      rawAnswers: session.answers
    };
    return spec;
  }
  /**
   * Write spec to file
   */
  async writeSpecToFile(spec, filePath) {
    const markdown = this.formatSpecAsMarkdown(spec);
    await writeFile(filePath, markdown, "utf-8");
  }
  /**
   * Group answers by category
   */
  groupAnswersByCategory(answers) {
    const grouped = /* @__PURE__ */ new Map();
    for (const answer of answers) {
      const existing = grouped.get(answer.categoryId) ?? [];
      existing.push(answer);
      grouped.set(answer.categoryId, existing);
    }
    return grouped;
  }
  /**
   * Extract title from session context or answers
   */
  extractTitle(session) {
    if (session.context) {
      const match = session.context.match(/(?:build|create|implement)\s+(?:a\s+)?(\w+(?:\s+\w+)*)/i);
      if (match) {
        return match[1].trim();
      }
      return session.context.slice(0, 50);
    }
    const fileName = session.specFile.replace(/\.md$/i, "").replace(/[-_]/g, " ");
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }
  /**
   * Generate overview section
   */
  generateOverview(answersByCategory) {
    const foundationAnswers = answersByCategory.get("project-foundation") ?? [];
    const audienceAnswers = answersByCategory.get("target-audience") ?? [];
    const featureAnswers = answersByCategory.get("features-scope") ?? [];
    return {
      projectType: this.getAnswerValue(foundationAnswers, "app-purpose") ?? "Not specified",
      targetAudience: this.getAnswerValue(audienceAnswers, "customer-segment") ?? "Not specified",
      mvpScope: this.getAnswerValues(featureAnswers, "mvp-features"),
      platforms: this.getAnswerValues(foundationAnswers, "target-platform")
    };
  }
  /**
   * Generate technical section
   */
  generateTechnical(answersByCategory) {
    const techAnswers = answersByCategory.get("technical-implementation") ?? [];
    const featureAnswers = answersByCategory.get("features-scope") ?? [];
    return {
      architecture: this.getAnswerValue(techAnswers, "api-design") ?? "Not specified",
      database: this.getAnswerValue(techAnswers, "primary-database") ?? "Not specified",
      authentication: this.getAnswerValue(techAnswers, "auth-strategy") ?? "Not specified",
      stateManagement: this.getAnswerValue(techAnswers, "state-management") ?? "Not specified",
      integrations: this.getAnswerValues(featureAnswers, "third-party-integrations"),
      apiDesign: this.getAnswerValue(techAnswers, "api-design")
    };
  }
  /**
   * Generate UI/UX section
   */
  generateUIUX(answersByCategory) {
    const uiuxAnswers = answersByCategory.get("ui-ux") ?? [];
    const foundationAnswers = answersByCategory.get("project-foundation") ?? [];
    return {
      platforms: this.getAnswerValues(foundationAnswers, "target-platform"),
      designSystem: this.getAnswerValue(uiuxAnswers, "design-system") ?? "Not specified",
      accessibility: this.getAnswerValue(uiuxAnswers, "accessibility-level") ?? "Basic",
      responsiveDesign: this.getAnswerValues(foundationAnswers, "target-platform").includes("web") ? "Required" : "Platform-specific",
      keyFlows: []
      // Will be populated from user flows if asked
    };
  }
  /**
   * Generate security section
   */
  generateSecurity(answersByCategory) {
    const concernAnswers = answersByCategory.get("concerns") ?? [];
    const complianceAnswers = answersByCategory.get("security-compliance") ?? [];
    return {
      requirements: this.getAnswerValues(concernAnswers, "security-requirements"),
      compliance: this.getAnswerValues(complianceAnswers, "data-privacy"),
      dataPrivacy: [
        this.getAnswerValue(complianceAnswers, "data-retention") ?? "Standard"
      ]
    };
  }
  /**
   * Generate business logic section
   */
  generateBusiness(answersByCategory) {
    const businessAnswers = answersByCategory.get("business-logic") ?? [];
    return {
      validationRules: [
        this.getAnswerValue(businessAnswers, "validation-approach") ?? "Progressive"
      ],
      workflowStates: this.getAnswerValues(businessAnswers, "workflow-states"),
      constraints: []
    };
  }
  /**
   * Extract decisions from answers
   */
  extractDecisions(answers) {
    const decisions = [];
    for (const answer of answers) {
      const questions = getQuestionsByCategory(answer.categoryId);
      const question = questions.find((q) => q.id === answer.questionId);
      if (question && answer.values.length > 0) {
        const category = getCategoryById(answer.categoryId);
        const selectedOptions = question.options.filter(
          (opt) => answer.values.includes(opt.value ?? opt.label[this.language])
        );
        const rationale = selectedOptions.map((opt) => opt.description[this.language]).join("; ");
        decisions.push({
          decision: `${question.header[this.language]}: ${answer.values.join(", ")}`,
          rationale: rationale || "User preference",
          relatedQuestions: [answer.questionId],
          category: category?.name[this.language] ?? answer.categoryId
        });
      }
    }
    return decisions;
  }
  /**
   * Identify potential edge cases based on answers
   */
  identifyEdgeCases(answers) {
    const edgeCases = [];
    const geoAnswer = answers.find((a) => a.questionId === "geographic-focus");
    if (geoAnswer?.values.includes("global")) {
      edgeCases.push({
        description: "Multi-language and localization support needed",
        handling: "Implement i18n framework, RTL support, date/number formatting",
        severity: "high",
        relatedQuestions: ["geographic-focus"]
      });
    }
    const mvpAnswer = answers.find((a) => a.questionId === "mvp-features");
    if (mvpAnswer?.values.includes("realtime")) {
      edgeCases.push({
        description: "WebSocket connection handling edge cases",
        handling: "Implement reconnection logic, offline queue, connection state management",
        severity: "high",
        relatedQuestions: ["mvp-features"]
      });
    }
    const customerAnswer = answers.find((a) => a.questionId === "customer-segment");
    if (customerAnswer?.values.includes("enterprise")) {
      edgeCases.push({
        description: "Enterprise SSO and SAML integration",
        handling: "Plan for custom identity provider integration, session management",
        severity: "medium",
        relatedQuestions: ["customer-segment", "auth-strategy"]
      });
    }
    const integrationAnswer = answers.find((a) => a.questionId === "third-party-integrations");
    if (integrationAnswer?.values.includes("stripe")) {
      edgeCases.push({
        description: "Payment failure and retry handling",
        handling: "Implement webhook handlers, failed payment recovery flow, dunning management",
        severity: "high",
        relatedQuestions: ["third-party-integrations", "mvp-features"]
      });
    }
    const volumeAnswer = answers.find((a) => a.questionId === "user-volume");
    if (volumeAnswer?.values.includes("large") || volumeAnswer?.values.includes("massive")) {
      edgeCases.push({
        description: "Database scaling and caching strategy",
        handling: "Implement read replicas, caching layer, query optimization",
        severity: "high",
        relatedQuestions: ["user-volume", "primary-database"]
      });
    }
    return edgeCases;
  }
  /**
   * Identify open questions for future consideration
   */
  identifyOpenQuestions(session) {
    const openQuestions = [];
    const criticalQuestions = ["auth-strategy", "primary-database", "mvp-features"];
    const answeredQuestions = new Set(session.answers.map((a) => a.questionId));
    for (const qId of criticalQuestions) {
      if (!answeredQuestions.has(qId)) {
        openQuestions.push({
          question: `${qId} was not determined during interview`,
          reason: "Critical decision needs to be made",
          suggestedApproach: "Conduct follow-up discussion",
          priority: "high"
        });
      }
    }
    const projectType = session.answers.find((a) => a.questionId === "app-purpose")?.values[0];
    if (projectType === "saas") {
      openQuestions.push({
        question: "How will pricing tiers be structured?",
        reason: "Pricing strategy affects feature gating implementation",
        suggestedApproach: "Define feature matrix and usage limits per tier",
        priority: "medium"
      });
    }
    openQuestions.push({
      question: "What testing strategy will be used?",
      reason: "Testing approach affects CI/CD setup and development workflow",
      suggestedApproach: "Define unit test, integration test, and E2E test coverage targets",
      priority: "medium"
    });
    return openQuestions;
  }
  /**
   * Get single answer value
   */
  getAnswerValue(answers, questionId) {
    const answer = answers.find((a) => a.questionId === questionId);
    return answer?.values[0] ?? answer?.customInput;
  }
  /**
   * Get multiple answer values
   */
  getAnswerValues(answers, questionId) {
    const answer = answers.find((a) => a.questionId === questionId);
    if (!answer) {
      return [];
    }
    const values = [...answer.values];
    if (answer.customInput) {
      values.push(answer.customInput);
    }
    return values;
  }
  /**
   * Format spec as Markdown
   */
  formatSpecAsMarkdown(spec) {
    const lines = [];
    lines.push(`# Feature Specification: ${spec.title}`);
    lines.push("");
    lines.push(`Generated: ${spec.generatedAt.toISOString()}`);
    lines.push(`Interview Questions: ${spec.questionCount}`);
    lines.push(`Interview Depth: ${spec.depth}`);
    lines.push("");
    lines.push("## Overview");
    lines.push("");
    lines.push(`- **Project Type**: ${spec.overview.projectType}`);
    lines.push(`- **Target Audience**: ${spec.overview.targetAudience}`);
    lines.push(`- **Platforms**: ${spec.overview.platforms.join(", ") || "Not specified"}`);
    lines.push(`- **MVP Scope**: ${spec.overview.mvpScope.join(", ") || "Not specified"}`);
    lines.push("");
    lines.push("## Technical Architecture");
    lines.push("");
    lines.push(`- **Architecture**: ${spec.technical.architecture}`);
    lines.push(`- **Database**: ${spec.technical.database}`);
    lines.push(`- **Authentication**: ${spec.technical.authentication}`);
    lines.push(`- **State Management**: ${spec.technical.stateManagement}`);
    lines.push(`- **Integrations**: ${spec.technical.integrations.join(", ") || "None"}`);
    lines.push("");
    lines.push("## UI/UX Requirements");
    lines.push("");
    lines.push(`- **Platforms**: ${spec.uiux.platforms.join(", ") || "Web"}`);
    lines.push(`- **Design System**: ${spec.uiux.designSystem}`);
    lines.push(`- **Accessibility**: ${spec.uiux.accessibility}`);
    lines.push(`- **Responsive Design**: ${spec.uiux.responsiveDesign}`);
    lines.push("");
    lines.push("## Security & Compliance");
    lines.push("");
    lines.push(`- **Requirements**: ${spec.security.requirements.join(", ") || "Standard"}`);
    lines.push(`- **Compliance**: ${spec.security.compliance.join(", ") || "None specific"}`);
    lines.push(`- **Data Privacy**: ${spec.security.dataPrivacy.join(", ") || "Standard"}`);
    lines.push("");
    if (spec.business.validationRules.length > 0 || spec.business.workflowStates.length > 0) {
      lines.push("## Business Logic");
      lines.push("");
      if (spec.business.validationRules.length > 0) {
        lines.push(`- **Validation**: ${spec.business.validationRules.join(", ")}`);
      }
      if (spec.business.workflowStates.length > 0) {
        lines.push(`- **Workflow States**: ${spec.business.workflowStates.join(", ")}`);
      }
      lines.push("");
    }
    lines.push("## Decisions Made");
    lines.push("");
    if (spec.decisions.length > 0) {
      spec.decisions.forEach((decision, index) => {
        lines.push(`${index + 1}. **${decision.decision}**`);
        lines.push(`   - Rationale: ${decision.rationale}`);
        lines.push(`   - Category: ${decision.category}`);
        lines.push("");
      });
    } else {
      lines.push("No explicit decisions recorded.");
      lines.push("");
    }
    lines.push("## Edge Cases Identified");
    lines.push("");
    if (spec.edgeCases.length > 0) {
      spec.edgeCases.forEach((edgeCase, index) => {
        lines.push(`${index + 1}. **${edgeCase.description}** (${edgeCase.severity})`);
        lines.push(`   - Handling: ${edgeCase.handling}`);
        lines.push("");
      });
    } else {
      lines.push("No edge cases identified during interview.");
      lines.push("");
    }
    lines.push("## Open Questions");
    lines.push("");
    if (spec.openQuestions.length > 0) {
      spec.openQuestions.forEach((question, index) => {
        lines.push(`${index + 1}. **${question.question}** (${question.priority})`);
        lines.push(`   - Reason: ${question.reason}`);
        if (question.suggestedApproach) {
          lines.push(`   - Suggested: ${question.suggestedApproach}`);
        }
        lines.push("");
      });
    } else {
      lines.push("No open questions remaining.");
      lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push(`*Generated by CCJK Interview-Driven Development*`);
    lines.push(`*Session ID: ${spec.sessionId}*`);
    return lines.join("\n");
  }
  /**
   * Set language
   */
  setLanguage(language) {
    this.language = language;
  }
}
function createSpecGenerator(language = "en") {
  return new SpecGenerator(language);
}

function displayInterviewBanner(compact = false) {
  console.log("");
  if (compact) {
    console.log(ansis.green.bold("  \u{1F3A4} Interview-Driven Development"));
    console.log(ansis.gray('  "Interview first. Spec second. Code last."'));
  } else {
    console.log(ansis.green("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
    console.log(ansis.green("\u2551") + ansis.bold.white("       \u{1F3A4} Interview-Driven Development (IDD)                  ") + ansis.green("\u2551"));
    console.log(ansis.green("\u2551") + ansis.gray('  "Interview first. Spec second. Code last."                  ') + ansis.green("\u2551"));
    console.log(ansis.green("\u2551") + ansis.gray("  Based on Thariq (@trq212) workflow from Anthropic           ") + ansis.green("\u2551"));
    console.log(ansis.green("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"));
  }
  console.log("");
}
async function detectProjectType() {
  const { existsSync: existsSync2 } = await import('node:fs');
  const cwd = process__default.cwd();
  const indicators = {
    saas: ["prisma", "drizzle", "stripe", "auth", "subscription"].some(
      (dir) => existsSync2(join(cwd, dir)) || existsSync2(join(cwd, "src", dir))
    ),
    ecommerce: ["cart", "checkout", "products", "shop"].some(
      (dir) => existsSync2(join(cwd, dir)) || existsSync2(join(cwd, "src", dir))
    ),
    api: existsSync2(join(cwd, "routes")) || existsSync2(join(cwd, "api")) || existsSync2(join(cwd, "src/routes")) || existsSync2(join(cwd, "src/api")),
    webapp: existsSync2(join(cwd, "pages")) || existsSync2(join(cwd, "app")) || existsSync2(join(cwd, "src/pages")) || existsSync2(join(cwd, "src/app")) || existsSync2(join(cwd, "components"))
  };
  if (indicators.saas)
    return "saas";
  if (indicators.ecommerce)
    return "ecommerce";
  if (indicators.api)
    return "api";
  if (indicators.webapp)
    return "webapp";
  return "webapp";
}
function displayProgressBar(session) {
  const total = session.questionsAsked + session.questionsRemaining;
  const percentage = Math.round(session.questionsAsked / total * 100);
  const barWidth = 30;
  const filled = Math.round(percentage / 100 * barWidth);
  const empty = barWidth - filled;
  const bar = ansis.green("\u2588".repeat(filled)) + ansis.gray("\u2591".repeat(empty));
  console.log("");
  console.log(ansis.gray(`  Progress: [${bar}] ${percentage}%`));
}
function displayCategoryBreadcrumb(session) {
  const breadcrumb = session.progress.map((p) => {
    const category = getCategoryById(p.categoryId);
    const icon = category?.icon || "\u{1F4CC}";
    if (p.isComplete) {
      return ansis.green(`${icon} ${p.name} \u2713`);
    }
    if (p.isCurrent) {
      return ansis.green.bold(`${icon} ${p.name} \u25C0`);
    }
    return ansis.gray(`${icon} ${p.name}`);
  }).join(ansis.gray(" \u2192 "));
  console.log("");
  console.log(`  ${breadcrumb}`);
}
function displayQuestion(display, lang) {
  const questionText = display.question.question[lang];
  const headerText = display.question.header[lang];
  console.log("");
  console.log(ansis.gray("\u2500".repeat(65)));
  console.log("");
  console.log(ansis.green.bold(`  Q${display.questionNumber}`) + ansis.gray(` of ~${display.estimatedTotal}`) + ansis.gray(` \u2502 `) + ansis.yellow(headerText));
  console.log("");
  console.log(ansis.white.bold(`  ${questionText}`));
  console.log("");
}
async function askQuestion(display, lang) {
  displayQuestion(display, lang);
  const choices = display.options.map((opt, index) => {
    const label = opt.isRecommended ? `${opt.label} ${ansis.green("(Recommended)")}` : opt.label;
    return {
      name: `${ansis.green(`${index + 1}.`)} ${label}
     ${ansis.gray(opt.description)}`,
      value: opt.value,
      short: opt.label
    };
  });
  choices.push({
    name: `${ansis.green(`${choices.length + 1}.`)} ${ansis.italic("Type something else...")}`,
    value: "__custom__",
    short: "Custom"
  });
  try {
    if (display.question.multiSelect) {
      const { selected } = await inquirer.prompt({
        type: "checkbox",
        name: "selected",
        message: ansis.gray("Select all that apply (space to select, enter to confirm):"),
        choices: choices.map((c) => ({
          name: c.name,
          value: c.value,
          short: c.short
        })),
        pageSize: 10
      });
      if (selected.includes("__custom__")) {
        const { customValue } = await inquirer.prompt({
          type: "input",
          name: "customValue",
          message: ansis.gray("Enter your custom answer:")
        });
        const filtered = selected.filter((s) => s !== "__custom__");
        return { values: filtered, customInput: customValue };
      }
      return { values: selected };
    } else {
      const { selected } = await inquirer.prompt({
        type: "list",
        name: "selected",
        message: ansis.gray("Select one:"),
        choices,
        pageSize: 10
      });
      if (selected === "__custom__") {
        const { customValue } = await inquirer.prompt({
          type: "input",
          name: "customValue",
          message: ansis.gray("Enter your custom answer:")
        });
        return { values: [], customInput: customValue };
      }
      return { values: [selected] };
    }
  } catch {
    return null;
  }
}
async function selectTemplate(lang) {
  console.log("");
  console.log(ansis.green.bold("  \u{1F4CB} Select Interview Template"));
  console.log("");
  const choices = INTERVIEW_TEMPLATES.map((template, index) => ({
    name: `${ansis.green(`${index + 1}.`)} ${ansis.bold(template.name[lang])}
     ${ansis.gray(template.description[lang])}
     ${ansis.gray(`~${template.estimatedQuestions} questions, ${template.defaultDepth} depth`)}`,
    value: template.id,
    short: template.name[lang]
  }));
  try {
    const { templateId } = await inquirer.prompt({
      type: "list",
      name: "templateId",
      message: ansis.gray("Choose a template:"),
      choices,
      pageSize: 10
    });
    return templateId;
  } catch {
    return null;
  }
}
async function quickStartConfig(_lang) {
  const detectedType = await detectProjectType();
  const detectedTemplate = getTemplateById(detectedType);
  console.log(ansis.gray(`  Detected project type: ${ansis.white(detectedType)}`));
  console.log("");
  console.log(ansis.green.bold("  How would you like to proceed?"));
  console.log("");
  const quickChoices = [
    {
      name: `${ansis.green("1.")} ${ansis.green("\u26A1 Quick Start")} ${ansis.gray("(Recommended)")}
     ${ansis.gray(`Use ${detectedType} template, ~${detectedTemplate?.estimatedQuestions || 25} questions \u2192 SPEC.md`)}`,
      value: "quick-start",
      short: "Quick Start"
    },
    {
      name: `${ansis.green("2.")} ${ansis.yellow("\u{1F52C} Deep Dive")}
     ${ansis.gray("40+ comprehensive questions for complex features")}`,
      value: "deep",
      short: "Deep Dive"
    },
    {
      name: `${ansis.green("3.")} ${ansis.green("\u2699\uFE0F  Custom Setup")}
     ${ansis.gray("Choose template, depth, and output file")}`,
      value: "custom",
      short: "Custom"
    },
    {
      name: `${ansis.green("4.")} ${ansis.magenta("\u{1F4A8} Express Mode")}
     ${ansis.gray("~10 essential questions only")}`,
      value: "express",
      short: "Express"
    }
  ];
  try {
    const { mode } = await inquirer.prompt({
      type: "list",
      name: "mode",
      message: ansis.gray("Select mode (press number or use arrows):"),
      choices: quickChoices,
      pageSize: 8
    });
    switch (mode) {
      case "quick-start":
        return {
          template: detectedType,
          depth: "standard",
          specFile: "SPEC.md"
        };
      case "deep":
        return {
          template: detectedType,
          depth: "deep",
          specFile: "SPEC.md"
        };
      case "express":
        return {
          template: "quick",
          depth: "quick",
          specFile: "SPEC.md"
        };
      case "custom":
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
async function getSpecFilePath(defaultPath) {
  try {
    const { specFile } = await inquirer.prompt({
      type: "input",
      name: "specFile",
      message: ansis.gray("Spec file path (where to save the specification):"),
      default: defaultPath,
      validate: (value) => {
        if (!value.trim()) {
          return "Please enter a file path";
        }
        if (!value.endsWith(".md")) {
          return "File should have .md extension";
        }
        return true;
      }
    });
    return specFile;
  } catch {
    return null;
  }
}
function displayCompletionSummary(session, specFile) {
  const duration = Math.round(
    (session.lastActivityAt.getTime() - session.startedAt.getTime()) / 1e3 / 60
  );
  console.log("");
  console.log(ansis.green("\u2550".repeat(65)));
  console.log("");
  console.log(ansis.green.bold("  \u2713 Interview Complete!"));
  console.log("");
  console.log(`  ${ansis.gray("Questions answered:")} ${ansis.white(String(session.questionsAsked))}`);
  console.log(`  ${ansis.gray("Duration:")}           ${ansis.white(`${duration} minutes`)}`);
  console.log(`  ${ansis.gray("Spec file:")}          ${ansis.green(specFile)}`);
  console.log("");
  console.log(ansis.gray("  Category Summary:"));
  for (const progress of session.progress) {
    const category = getCategoryById(progress.categoryId);
    const icon = category?.icon || "\u{1F4CC}";
    const status = progress.isComplete ? ansis.green("\u2713") : ansis.yellow("\u25CB");
    console.log(`    ${status} ${icon} ${progress.name}: ${progress.answered}/${progress.total}`);
  }
  console.log("");
  console.log(ansis.green("\u2550".repeat(65)));
  console.log("");
  console.log(ansis.green("  Next steps:"));
  console.log(ansis.gray(`    1. Review the spec: ${ansis.white(`cat ${specFile}`)}`));
  console.log(ansis.gray(`    2. Start planning:  ${ansis.white("/plan")}`));
  console.log(ansis.gray(`    3. Begin coding:    ${ansis.white("Use the spec as context")}`));
  console.log("");
}
function listTemplates(lang) {
  console.log("");
  console.log(ansis.green.bold("  Available Interview Templates:"));
  console.log("");
  for (const template of INTERVIEW_TEMPLATES) {
    console.log(ansis.green(`  ${template.id}`));
    console.log(`    ${ansis.white(template.name[lang])}`);
    console.log(`    ${ansis.gray(template.description[lang])}`);
    console.log(`    ${ansis.gray(`~${template.estimatedQuestions} questions, ${template.defaultDepth} depth`)}`);
    console.log("");
  }
  console.log(ansis.gray("  Usage: ccjk interview --template <template-id> [SPEC.md]"));
  console.log("");
}
async function interview(options = {}) {
  try {
    const lang = options.lang || i18n.language || "en";
    if (options.list) {
      listTemplates(lang);
      return;
    }
    const hasPresetOptions = options.template || options.depth;
    displayInterviewBanner(!hasPresetOptions);
    let templateId;
    let depth;
    let specFile;
    if (!hasPresetOptions) {
      const quickConfig = await quickStartConfig(lang);
      if (quickConfig) {
        templateId = quickConfig.template;
        depth = quickConfig.depth;
        specFile = quickConfig.specFile;
      } else {
        const selectedTemplate = await selectTemplate(lang);
        if (!selectedTemplate) {
          console.log(ansis.yellow("\n  Interview cancelled.\n"));
          return;
        }
        templateId = selectedTemplate;
        const template2 = getTemplateById(templateId);
        if (!template2) {
          console.log(ansis.red(`
  Template not found: ${templateId}
`));
          return;
        }
        const { selectedDepth } = await inquirer.prompt({
          type: "list",
          name: "selectedDepth",
          message: ansis.gray("Interview depth:"),
          choices: [
            {
              name: `${ansis.green("1.")} \u26A1 Quick (~10 questions)`,
              value: "quick",
              short: "Quick"
            },
            {
              name: `${ansis.green("2.")} \u{1F4CA} Standard (~25 questions) ${template2.defaultDepth === "standard" ? ansis.green("(Recommended)") : ""}`,
              value: "standard",
              short: "Standard"
            },
            {
              name: `${ansis.green("3.")} \u{1F52C} Deep (~40+ questions) ${template2.defaultDepth === "deep" ? ansis.green("(Recommended)") : ""}`,
              value: "deep",
              short: "Deep"
            }
          ],
          default: template2.defaultDepth,
          pageSize: 6
        });
        depth = selectedDepth;
        const selectedSpecFile = await getSpecFilePath("SPEC.md");
        if (!selectedSpecFile) {
          console.log(ansis.yellow("\n  Interview cancelled.\n"));
          return;
        }
        specFile = selectedSpecFile;
      }
    } else {
      templateId = options.template || "webapp";
      depth = options.depth || "standard";
      specFile = options.specFile || "SPEC.md";
    }
    const template = getTemplateById(templateId);
    if (!template) {
      console.log(ansis.red(`
  Template not found: ${templateId}
`));
      console.log(ansis.gray("  Available templates:"));
      INTERVIEW_TEMPLATES.forEach((t) => console.log(ansis.gray(`    - ${t.id}`)));
      return;
    }
    const absoluteSpecFile = resolve(process__default.cwd(), specFile);
    console.log("");
    console.log(ansis.gray("\u2500".repeat(50)));
    console.log(`  ${ansis.gray("Template:")} ${ansis.white(template.name[lang])}`);
    console.log(`  ${ansis.gray("Depth:")} ${ansis.white(depth)} ${ansis.gray(`(~${depth === "quick" ? 10 : depth === "standard" ? 25 : 40}+ questions)`)}`);
    console.log(`  ${ansis.gray("Output:")} ${ansis.green(specFile)}`);
    console.log(ansis.gray("\u2500".repeat(50)));
    console.log("");
    console.log(ansis.green("  Starting interview..."));
    console.log(ansis.gray("  Press Ctrl+C to pause | Enter to select | Type for custom"));
    console.log("");
    const engine = createInterviewEngine(lang);
    const session = await engine.startInterview(absoluteSpecFile, {
      depth,
      categories: template.categories,
      skipObvious: true,
      outputFile: absoluteSpecFile,
      language: lang,
      context: options.context
    });
    let questionDisplay = await engine.getNextQuestion(session.id);
    while (questionDisplay) {
      displayProgressBar(session);
      displayCategoryBreadcrumb(session);
      const answer = await askQuestion(questionDisplay, lang);
      if (answer === null) {
        console.log("");
        console.log(ansis.yellow("  Interview paused."));
        try {
          const { saveProgress } = await inquirer.prompt({
            type: "confirm",
            name: "saveProgress",
            message: "Save progress for later?",
            default: true
          });
          if (saveProgress) {
            await engine.pauseInterview(session.id);
            const sessionJson = engine.exportSession(session.id);
            if (sessionJson) {
              const sessionFile = absoluteSpecFile.replace(".md", ".session.json");
              await writeFile(sessionFile, sessionJson, "utf-8");
              console.log(ansis.gray(`  Session saved to: ${sessionFile}`));
              console.log(ansis.gray(`  Resume with: ccjk interview --resume`));
            }
          }
        } catch {
        }
        return;
      }
      const values = answer.customInput && answer.values.length === 0 ? [answer.customInput] : answer.values;
      await engine.processAnswer(
        session.id,
        questionDisplay.question.id,
        values,
        answer.customInput
      );
      questionDisplay = await engine.getNextQuestion(session.id);
    }
    console.log("");
    console.log(ansis.green("  Generating specification..."));
    const specGenerator = createSpecGenerator(lang);
    const spec = await specGenerator.generateSpec(session);
    const specDir = dirname(absoluteSpecFile);
    if (!existsSync(specDir)) {
      await mkdir(specDir, { recursive: true });
    }
    await specGenerator.writeSpecToFile(spec, absoluteSpecFile);
    displayCompletionSummary(session, specFile);
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
async function resumeInterview(sessionFile, options = {}) {
  try {
    const lang = options.lang || i18n.language || "en";
    let targetSessionFile = sessionFile;
    if (!targetSessionFile) {
      const { readdir, stat } = await import('node:fs/promises');
      const { homedir } = await import('node:os');
      const searchDirs = [
        process__default.cwd(),
        join(homedir(), ".ccjk", "sessions")
      ];
      const sessions = [];
      for (const dir of searchDirs) {
        try {
          const files = await readdir(dir);
          const sessionFiles = files.filter((f) => f.endsWith(".session.json"));
          for (const file of sessionFiles) {
            const filePath = join(dir, file);
            const fileStats = await stat(filePath);
            sessions.push({
              name: file,
              path: filePath,
              modified: fileStats.mtime
            });
          }
        } catch {
        }
      }
      if (sessions.length === 0) {
        console.log(ansis.yellow("\n  No saved sessions found.\n"));
        console.log(ansis.gray("  Start a new interview with: ccjk interview"));
        return;
      }
      sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
      const { selectedSession } = await inquirer.prompt({
        type: "list",
        name: "selectedSession",
        message: ansis.gray("Select a session to resume:"),
        choices: sessions.map((s, i) => ({
          name: `${ansis.green(`${i + 1}.`)} ${ansis.white(s.name)}
     ${ansis.gray(`Modified: ${s.modified.toLocaleString()}`)}`,
          value: s.path,
          short: s.name
        })),
        pageSize: 10
      });
      targetSessionFile = selectedSession;
    }
    if (!existsSync(targetSessionFile)) {
      console.log(ansis.red(`
  Session file not found: ${targetSessionFile}
`));
      return;
    }
    const sessionJson = await readFile(targetSessionFile, "utf-8");
    const engine = createInterviewEngine(lang);
    const session = engine.importSession(sessionJson);
    if (!session) {
      console.log(ansis.red("\n  Failed to load session file.\n"));
      return;
    }
    displayInterviewBanner();
    console.log(ansis.green("  Resuming interview session..."));
    console.log(ansis.gray(`  Session ID: ${session.id}`));
    console.log(ansis.gray(`  Progress: ${session.questionsAsked} questions answered`));
    console.log("");
    const resumed = await engine.resumeInterview(session.id);
    if (!resumed) {
      console.log(ansis.red("\n  Failed to resume session.\n"));
      return;
    }
    let questionDisplay = await engine.getNextQuestion(session.id);
    while (questionDisplay) {
      displayProgressBar(session);
      displayCategoryBreadcrumb(session);
      const answer = await askQuestion(questionDisplay, lang);
      if (answer === null) {
        console.log("");
        console.log(ansis.yellow("  Interview paused."));
        await engine.pauseInterview(session.id);
        const updatedSessionJson = engine.exportSession(session.id);
        if (updatedSessionJson) {
          await writeFile(targetSessionFile, updatedSessionJson, "utf-8");
          console.log(ansis.gray(`  Progress saved to: ${targetSessionFile}`));
        }
        return;
      }
      const values = answer.customInput && answer.values.length === 0 ? [answer.customInput] : answer.values;
      await engine.processAnswer(
        session.id,
        questionDisplay.question.id,
        values,
        answer.customInput
      );
      questionDisplay = await engine.getNextQuestion(session.id);
    }
    console.log("");
    console.log(ansis.green("  Generating specification..."));
    const specGenerator = createSpecGenerator(lang);
    const spec = await specGenerator.generateSpec(session);
    await specGenerator.writeSpecToFile(spec, session.specFile);
    displayCompletionSummary(session, session.specFile);
    const { unlink } = await import('node:fs/promises');
    await unlink(targetSessionFile).catch(() => {
    });
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
async function quickInterview(specFile, options = {}) {
  await interview({
    ...options,
    template: "quick",
    depth: "quick",
    specFile: specFile || options.specFile || "SPEC.md"
  });
}
async function deepInterview(specFile, options = {}) {
  await interview({
    ...options,
    template: "saas",
    depth: "deep",
    specFile: specFile || options.specFile || "SPEC.md"
  });
}
async function listInterviewSessions() {
  const { readdir, stat } = await import('node:fs/promises');
  const { homedir } = await import('node:os');
  console.log("");
  console.log(ansis.green.bold("  Saved Interview Sessions:"));
  console.log("");
  const searchDirs = [
    process__default.cwd(),
    join(homedir(), ".ccjk", "sessions")
  ];
  let foundAny = false;
  for (const dir of searchDirs) {
    try {
      const files = await readdir(dir);
      const sessionFiles = files.filter((f) => f.endsWith(".session.json"));
      for (const file of sessionFiles) {
        const filePath = join(dir, file);
        const fileStats = await stat(filePath);
        const modified = fileStats.mtime.toLocaleString();
        console.log(`  ${ansis.green("\u2022")} ${ansis.white(file)}`);
        console.log(`    ${ansis.gray("Path:")} ${filePath}`);
        console.log(`    ${ansis.gray("Modified:")} ${modified}`);
        console.log("");
        foundAny = true;
      }
    } catch {
    }
  }
  if (!foundAny) {
    console.log(ansis.gray("  No saved sessions found."));
    console.log("");
    console.log(ansis.gray("  Start a new interview with: ccjk interview"));
  }
  console.log("");
}

export { deepInterview, interview, listInterviewSessions, quickInterview, resumeInterview };
