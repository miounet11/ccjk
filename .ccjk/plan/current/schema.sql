-- ============================================================================
-- CCJK Provider Registry - Database Schema
-- Version: 1.0.0
-- Database: Cloudflare D1 (SQLite compatible)
-- ============================================================================

-- 删除已存在的表（开发环境使用）
-- DROP TABLE IF EXISTS providers;

-- ============================================================================
-- 供应商表
-- ============================================================================
CREATE TABLE IF NOT EXISTS providers (
    -- 主键
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 核心字段
    shortcode TEXT NOT NULL UNIQUE,      -- 短码，唯一标识 (2-20字符)
    name TEXT NOT NULL,                   -- 显示名称 (1-50字符)
    api_url TEXT NOT NULL,                -- API 基础 URL

    -- 可选字段
    description TEXT,                     -- 描述信息 (最多200字符)
    models TEXT,                          -- 推荐模型列表 (JSON 数组)

    -- 分类和状态
    category TEXT DEFAULT 'custom',       -- 分类: official/relay/domestic/custom
    status TEXT DEFAULT 'active',         -- 状态: active/maintenance/deprecated/testing
    verified INTEGER DEFAULT 0,           -- 是否官方验证: 0=否, 1=是

    -- 元数据
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,                      -- 创建者标识
    updated_at TEXT DEFAULT (datetime('now')),

    -- 统计
    usage_count INTEGER DEFAULT 0,        -- 使用次数

    -- 约束
    CHECK (length(shortcode) >= 2 AND length(shortcode) <= 20),
    CHECK (length(name) >= 1 AND length(name) <= 50),
    CHECK (category IN ('official', 'relay', 'domestic', 'custom')),
    CHECK (status IN ('active', 'maintenance', 'deprecated', 'testing'))
);

-- ============================================================================
-- 索引
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_shortcode ON providers(shortcode);
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category);
CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON providers(verified);
CREATE INDEX IF NOT EXISTS idx_providers_created_at ON providers(created_at);

-- ============================================================================
-- 初始数据 - 官方验证的供应商
-- ============================================================================
INSERT OR IGNORE INTO providers (shortcode, name, api_url, description, models, category, verified) VALUES
-- 中转服务
('302', '302.AI', 'https://api.302.ai', '302.AI 中转服务 - 支持多种模型', '["gpt-4","gpt-4-turbo","gpt-3.5-turbo","claude-3-opus","claude-3-sonnet","claude-3-haiku"]', 'relay', 1),

-- 国内大模型
('glm', '智谱AI', 'https://open.bigmodel.cn/api/paas/v4', '智谱 GLM 大模型', '["glm-4","glm-4-plus","glm-3-turbo"]', 'domestic', 1),
('kimi', '月之暗面 Kimi', 'https://api.moonshot.cn/v1', 'Moonshot Kimi 大模型', '["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-128k"]', 'domestic', 1),
('minimax', 'MiniMax', 'https://api.minimax.chat/v1', 'MiniMax 大模型', '["abab5.5-chat","abab6-chat","abab6.5-chat"]', 'domestic', 1),
('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'DeepSeek 大模型', '["deepseek-chat","deepseek-coder"]', 'domestic', 1),
('qwen', '通义千问', 'https://dashscope.aliyuncs.com/compatible-mode/v1', '阿里通义千问大模型', '["qwen-turbo","qwen-plus","qwen-max"]', 'domestic', 1),
('doubao', '豆包', 'https://ark.cn-beijing.volces.com/api/v3', '字节跳动豆包大模型', '["doubao-pro-4k","doubao-pro-32k","doubao-lite-4k"]', 'domestic', 1),
('baichuan', '百川', 'https://api.baichuan-ai.com/v1', '百川大模型', '["Baichuan2-Turbo","Baichuan2-Turbo-192k"]', 'domestic', 1),
('yi', '零一万物', 'https://api.lingyiwanwu.com/v1', '零一万物 Yi 大模型', '["yi-large","yi-medium","yi-spark"]', 'domestic', 1),
('hunyuan', '腾讯混元', 'https://hunyuan.tencentcloudapi.com', '腾讯混元大模型', '["hunyuan-lite","hunyuan-standard","hunyuan-pro"]', 'domestic', 1),

-- 官方 API
('anthropic', 'Anthropic', 'https://api.anthropic.com', 'Claude 官方 API', '["claude-3-opus-20240229","claude-3-sonnet-20240229","claude-3-haiku-20240307"]', 'official', 1),
('openai', 'OpenAI', 'https://api.openai.com/v1', 'OpenAI 官方 API', '["gpt-4-turbo","gpt-4","gpt-3.5-turbo"]', 'official', 1);

-- ============================================================================
-- 验证数据
-- ============================================================================
-- SELECT * FROM providers ORDER BY category, shortcode;
