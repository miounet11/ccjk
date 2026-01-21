-- CCJK Cloud Backend Database Migration
-- Version: 1.0.0
-- Date: 2026-01-20
-- Database: PostgreSQL 15+

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建枚举类型
CREATE TYPE user_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE device_status AS ENUM ('online', 'offline', 'busy', 'error', 'maintenance');
CREATE TYPE task_status AS ENUM ('pending', 'queued', 'assigned', 'running', 'completed', 'failed', 'cancelled', 'timeout');
CREATE TYPE task_type AS ENUM ('bash', 'workflow', 'custom');
CREATE TYPE task_source AS ENUM ('api', 'email', 'web', 'cli');
CREATE TYPE message_type AS ENUM ('task_created', 'task_completed', 'task_failed', 'device_online', 'device_offline', 'system');

-- =====================================================
-- 用户表
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    plan user_plan DEFAULT 'free',
    storage_quota BIGINT DEFAULT 1073741824, -- 1GB
    storage_used BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_created ON users(created_at DESC);

-- =====================================================
-- 设备表 (Daemon 实例)
-- =====================================================
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    os_type VARCHAR(50),
    os_version VARCHAR(50),
    arch VARCHAR(20),
    hostname VARCHAR(100),
    ccjk_version VARCHAR(20),
    daemon_status device_status DEFAULT 'offline',
    daemon_status_message TEXT,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    location VARCHAR(100),
    timezone VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_status ON devices(daemon_status);
CREATE INDEX idx_devices_heartbeat ON devices(last_heartbeat DESC);
CREATE INDEX idx_devices_user_status ON devices(user_id, daemon_status);

-- =====================================================
-- API 密钥表
-- =====================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- 用于识别，前 8 位
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_device_id ON api_keys(device_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- =====================================================
-- 会话表
-- =====================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =====================================================
-- 任务表
-- =====================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    task_type task_type NOT NULL,
    command TEXT NOT NULL,
    args JSONB DEFAULT '{}'::jsonb,
    status task_status DEFAULT 'pending',
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    timeout_seconds INTEGER DEFAULT 300,
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,

    -- 执行结果
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    error_message TEXT,
    error_stack TEXT,

    -- 时间跟踪
    scheduled_at TIMESTAMP WITH TIME ZONE,
    queued_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- 元数据
    source task_source DEFAULT 'api',
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    batch_id UUID,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_device_id ON tasks(device_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority DESC);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_device_status ON tasks(device_id, status);
CREATE INDEX idx_tasks_parent_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_batch_id ON tasks(batch_id);

-- 任务队列索引 (用于优先级获取)
CREATE INDEX idx_tasks_queue ON tasks(status, priority DESC, created_at)
    WHERE status IN ('pending', 'queued');

-- =====================================================
-- 邮件配置表
-- =====================================================
CREATE TABLE email_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    config_name VARCHAR(100) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    imap_host VARCHAR(255),
    imap_port INTEGER,
    imap_secure BOOLEAN DEFAULT true,
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_secure BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_check_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_configs_user_id ON email_configs(user_id);
CREATE INDEX idx_email_configs_device_id ON email_configs(device_id);
CREATE INDEX idx_email_configs_active ON email_configs(is_active);

-- =====================================================
-- 邮件消息表 (Incoming Email Webhook 记录)
-- =====================================================
CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_config_id UUID REFERENCES email_configs(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- 邮件信息
    message_id VARCHAR(255) UNIQUE NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT,
    body_html TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 处理状态
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX idx_email_messages_config_id ON email_messages(email_config_id);
CREATE INDEX idx_email_messages_task_id ON email_messages(task_id);
CREATE INDEX idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX idx_email_messages_processed ON email_messages(processed);
CREATE INDEX idx_email_messages_received_at ON email_messages(received_at DESC);

-- =====================================================
-- 消息通知表
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    message_type message_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}'::jsonb,

    -- 状态
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,

    -- 发送状态
    sent_via_email BOOLEAN DEFAULT false,
    sent_via_push BOOLEAN DEFAULT false,
    sent_via_websocket BOOLEAN DEFAULT false,

    -- 过期时间
    expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_task_id ON messages(task_id);
CREATE INDEX idx_messages_read ON messages(user_id, read);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- =====================================================
-- 配置备份表
-- =====================================================
CREATE TABLE config_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    config_name VARCHAR(100) NOT NULL,
    config_type VARCHAR(50), -- claude-code, codex, ccjk, etc.
    config_data JSONB NOT NULL,
    file_size BIGINT,
    is_auto BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_config_backups_user_id ON config_backups(user_id);
CREATE INDEX idx_config_backups_device_id ON config_backups(device_id);
CREATE INDEX idx_config_backups_type ON config_backups(config_type);
CREATE INDEX idx_config_backups_created_at ON config_backups(created_at DESC);

-- =====================================================
-- 日志存储表 (元数据，实际日志存 S3)
-- =====================================================
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    log_type VARCHAR(50) NOT NULL, -- daemon, task, system
    log_level VARCHAR(20), -- debug, info, warn, error

    -- 文件信息
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    file_url TEXT, -- S3 URL

    -- 时间范围
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,

    -- 统计
    line_count INTEGER,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_log_range CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX idx_log_entries_user_id ON log_entries(user_id);
CREATE INDEX idx_log_entries_device_id ON log_entries(device_id);
CREATE INDEX idx_log_entries_task_id ON log_entries(task_id);
CREATE INDEX idx_log_entries_type ON log_entries(log_type);
CREATE INDEX idx_log_entries_created_at ON log_entries(created_at DESC);

-- =====================================================
-- 统计表
-- =====================================================
CREATE TABLE statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    stat_date DATE NOT NULL,
    stat_type VARCHAR(50) NOT NULL,
    stat_value BIGINT NOT NULL DEFAULT 0,
    stat_value2 BIGINT, -- 用于范围统计
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, device_id, stat_date, stat_type)
);

CREATE INDEX idx_statistics_user_id ON statistics(user_id);
CREATE INDEX idx_statistics_device_id ON statistics(device_id);
CREATE INDEX idx_statistics_date ON statistics(stat_date DESC);
CREATE INDEX idx_statistics_type ON statistics(stat_type);

-- =====================================================
-- 审计日志表
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,

    -- 变更信息
    old_values JSONB,
    new_values JSONB,

    -- 请求信息
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_device_id ON audit_logs(device_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- Webhook 配置表
-- =====================================================
CREATE TABLE webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(255),

    -- 事件过滤
    events TEXT[] NOT NULL, -- ['task.completed', 'task.failed', ...]

    -- 配置
    is_active BOOLEAN DEFAULT true,
    timeout_seconds INTEGER DEFAULT 10,

    -- 统计
    total_sent BIGINT DEFAULT 0,
    total_failed BIGINT DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_configs_user_id ON webhook_configs(user_id);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(is_active) WHERE is_active = true;

-- =====================================================
-- Webhook 事件日志表
-- =====================================================
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,

    -- 发送状态
    status VARCHAR(50) NOT NULL, -- pending, success, failed
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,

    -- 重试
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_next_retry ON webhook_events(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- =====================================================
-- 定时任务表 (Cron Jobs)
-- =====================================================
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- 任务定义
    task_type task_type NOT NULL,
    command TEXT NOT NULL,
    args JSONB DEFAULT '{}'::jsonb,

    -- 调度配置
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- 状态
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,

    -- 执行策略
    timeout_seconds INTEGER DEFAULT 300,
    max_retries INTEGER DEFAULT 3,
    overlap BOOLEAN DEFAULT false, -- 是否允许重叠执行

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX idx_scheduled_tasks_device_id ON scheduled_tasks(device_id);
CREATE INDEX idx_scheduled_tasks_active ON scheduled_tasks(is_active) WHERE is_active = true;
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at) WHERE next_run_at IS NOT NULL;

-- =====================================================
-- 函数和触发器
-- =====================================================

-- 更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_configs_updated_at BEFORE UPDATE ON email_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at BEFORE UPDATE ON webhook_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 视图
-- =====================================================

-- 设备状态汇总视图
CREATE VIEW device_status_summary AS
SELECT
    d.user_id,
    d.id AS device_id,
    d.device_name,
    d.daemon_status,
    d.last_heartbeat,
    COUNT(t.id) FILTER (WHERE t.status IN ('running', 'queued')) AS active_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'running') AS running_tasks,
    MAX(t.created_at) FILTER (WHERE t.status = 'running') AS last_task_start
FROM devices d
LEFT JOIN tasks t ON d.id = t.device_id
GROUP BY d.id, d.user_id, d.device_name, d.daemon_status, d.last_heartbeat;

-- 用户任务统计视图
CREATE VIEW user_task_stats AS
SELECT
    user_id,
    DATE_TRUNC('day', created_at) AS stat_date,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE status = 'running') AS running_count,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE completed_at IS NOT NULL) AS avg_duration_seconds
FROM tasks
GROUP BY user_id, DATE_TRUNC('day', created_at);

-- =====================================================
-- 初始数据
-- =====================================================

-- 插入默认系统配置（通过元数据表或配置表）
INSERT INTO users (email, password_hash, display_name, plan, is_verified)
VALUES ('system@claudehome.cn', '*', 'System', 'enterprise', true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 完成
-- =====================================================

-- 添加注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE devices IS '设备表 - Daemon 实例';
COMMENT ON TABLE api_keys IS 'API 密钥表';
COMMENT ON TABLE sessions IS '会话表';
COMMENT ON TABLE tasks IS '任务表';
COMMENT ON TABLE email_configs IS '邮件配置表';
COMMENT ON TABLE email_messages IS '邮件消息表';
COMMENT ON TABLE messages IS '消息通知表';
COMMENT ON TABLE config_backups IS '配置备份表';
COMMENT ON TABLE log_entries IS '日志元数据表';
COMMENT ON TABLE statistics IS '统计数据表';
COMMENT ON TABLE audit_logs IS '审计日志表';
COMMENT ON TABLE webhook_configs IS 'Webhook 配置表';
COMMENT ON TABLE webhook_events IS 'Webhook 事件日志表';
COMMENT ON TABLE scheduled_tasks IS '定时任务表';
