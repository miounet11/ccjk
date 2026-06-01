# CCJK Provider Registry API

供应商注册表云服务后端实现。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库

```bash
npm run db:create
```

执行后会返回 `database_id`，将其填入 `wrangler.toml` 中。

### 3. 初始化数据库

```bash
npm run db:init
```

### 4. 本地开发

```bash
npm run dev
```

访问 http://localhost:8787 测试 API。

### 5. 部署

```bash
npm run deploy
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/providers/:shortcode` | 查询供应商 |
| POST | `/v1/providers` | 创建供应商 |
| GET | `/v1/providers` | 供应商列表 |

## 测试

```bash
# 查询供应商
curl http://localhost:8787/v1/providers/302

# 创建供应商
curl -X POST http://localhost:8787/v1/providers \
  -H "Content-Type: application/json" \
  -d '{"shortcode":"test","name":"Test API","apiUrl":"https://api.test.com/v1"}'

# 供应商列表
curl "http://localhost:8787/v1/providers?category=domestic&verified=true"
```

## 文件结构

```
backend-src/
├── src/
│   └── index.ts      # 主入口文件
├── schema.sql        # 数据库 schema
├── package.json      # 依赖配置
├── wrangler.toml     # Cloudflare 配置
└── README.md         # 本文件
```
