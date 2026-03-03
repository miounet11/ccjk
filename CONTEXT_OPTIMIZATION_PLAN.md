# 🧠 AI History Manager - 智能上下文优化方案

> **核心理念**：用 CPU 和内存换取更高效的 Token 使用

---

## 📊 当前问题分析

### 问题 1: 上下文爆炸
```
典型对话流程：
- 初始 system 消息: ~50K tokens
- 10 轮对话后: ~150K tokens
- 20 轮对话后: 超过 200K 限制 ❌
```

### 问题 2: 简单截断损失上下文
```python
# 当前做法
messages = messages[-20:]  # 丢失历史上下文
```

### 问题 3: Tool Result 占用大量空间
```
- 读取大文件: 50KB+
- Grep 搜索结果: 30KB+
- 执行日志: 20KB+
```

---

## 🎯 解决方案架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI History Manager                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户请求 ──→ [智能路由] ──→ [上下文构建] ──→ Anthropic API    │
│                    │              │                             │
│                    │              ├─→ [记忆树查询]              │
│                    │              ├─→ [语义压缩]                │
│                    │              └─→ [Tool Result 沙盒]        │
│                    │                                            │
│                    └─→ [后台处理]                               │
│                         ├─→ [索引构建] (FTS5)                   │
│                         ├─→ [置信度更新]                        │
│                         └─→ [自动衰减] (定时任务)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 核心模块设计

### 模块 1: 记忆树系统 (Memory Tree)

**文件**: `app/services/memory_tree.py`

```python
class MemoryNode:
    """记忆节点"""
    id: str
    content: str              # 原始内容
    summary: str              # 摘要（用于上下文）
    confidence: float         # 置信度 (0.0-1.0)
    priority: str             # P0/P1/P2
    last_accessed: datetime   # 最后访问时间
    access_count: int         # 访问次数
    embedding: Optional[List[float]]  # 向量（可选）

class MemoryTree:
    """记忆树管理器"""

    def add_memory(self, content: str, priority: str = "P2") -> MemoryNode:
        """添加新记忆（初始置信度 0.7）"""

    def search(self, query: str, top_k: int = 5) -> List[MemoryNode]:
        """搜索记忆（FTS5 + BM25）"""
        # 搜索命中后自动提升置信度 +0.03

    def decay(self) -> Dict[str, int]:
        """衰减未使用的记忆"""
        # P2: -0.008/天
        # P1: -0.004/天
        # P0: 不衰减

    def archive_low_confidence(self, threshold: float = 0.3):
        """归档低置信度记忆，提取精华"""
```

**数据库**: SQLite + FTS5

```sql
CREATE VIRTUAL TABLE memory_fts USING fts5(
    content,
    summary,
    tokenize='porter unicode61'
);

CREATE TABLE memory_nodes (
    id TEXT PRIMARY KEY,
    content TEXT,
    summary TEXT,
    confidence REAL,
    priority TEXT,
    last_accessed TIMESTAMP,
    access_count INTEGER,
    created_at TIMESTAMP
);
```

---

### 模块 2: Tool Result 沙盒 (Sandbox)

**文件**: `app/services/tool_sandbox.py`

```python
class ToolSandbox:
    """Tool Result 智能处理"""

    def process_tool_result(self, tool_name: str, result: str) -> str:
        """处理 Tool 结果，返回压缩后的摘要"""

        # 1. 检测结果类型
        result_type = self._detect_type(result)

        # 2. 根据类型选择策略
        if result_type == "code":
            return self._summarize_code(result)
        elif result_type == "json":
            return self._summarize_json(result)
        elif result_type == "log":
            return self._summarize_log(result)
        elif result_type == "text":
            return self._summarize_text(result)

        # 3. 原始内容存入记忆树（低优先级）
        self.memory_tree.add_memory(
            content=result,
            priority="P2",
            metadata={"tool": tool_name, "type": result_type}
        )

        return summary

    def _summarize_code(self, code: str) -> str:
        """代码摘要：保留结构，压缩细节"""
        # 提取：函数签名、类定义、关键注释
        # 压缩：函数体 → "..."

    def _summarize_json(self, json_str: str) -> str:
        """JSON 摘要：保留结构，压缩数组"""
        data = json.loads(json_str)
        return self._compress_json(data, max_depth=2)

    def _summarize_log(self, log: str) -> str:
        """日志摘要：提取错误、警告、关键信息"""
        lines = log.split('\n')
        errors = [l for l in lines if 'ERROR' in l or 'FATAL' in l]
        warnings = [l for l in lines if 'WARN' in l]
        return f"Errors: {len(errors)}, Warnings: {len(warnings)}\n" + \
               "\n".join(errors[:5])  # 只保留前 5 个错误
```

**压缩效果**:
```
原始 Tool Result (50KB):
{
  "users": [
    {"id": 1, "name": "Alice", "email": "alice@example.com", ...},
    {"id": 2, "name": "Bob", "email": "bob@example.com", ...},
    ... (1000 条)
  ]
}

压缩后 (500B):
{
  "users": "<Array[1000]>",
  "_summary": "1000 users, fields: id, name, email, ...",
  "_sample": [{"id": 1, "name": "Alice", ...}]
}
```

---

### 模块 3: 语义压缩器 (Semantic Compressor)

**文件**: `app/services/semantic_compressor.py`

```python
class SemanticCompressor:
    """语义级别的消息压缩"""

    def compress_messages(self, messages: List[Dict]) -> List[Dict]:
        """
        智能压缩消息历史

        策略：
        1. 保留最近 N 条完整消息（N=5）
        2. 中间消息提取摘要
        3. Tool 调用保留结构，压缩内容
        4. 相似消息合并
        """

        recent_messages = messages[-5:]  # 保留最近 5 条
        old_messages = messages[:-5]

        # 压缩旧消息
        compressed = []
        for msg in old_messages:
            if msg["role"] == "user":
                # 用户消息：提取意图
                compressed.append({
                    "role": "user",
                    "content": self._extract_intent(msg["content"])
                })
            elif msg["role"] == "assistant":
                # 助手消息：保留关键决策
                compressed.append({
                    "role": "assistant",
                    "content": self._extract_key_decisions(msg["content"])
                })

        # 合并相似消息
        compressed = self._merge_similar(compressed)

        return compressed + recent_messages

    def _extract_intent(self, content: str) -> str:
        """提取用户意图（使用简单规则或小模型）"""
        # 方案 1: 规则提取（快速）
        # 方案 2: 调用小模型（Haiku）生成摘要

    def _merge_similar(self, messages: List[Dict]) -> List[Dict]:
        """合并相似消息（基于编辑距离或向量相似度）"""
```

---

### 模块 4: 智能索引器 (Smart Indexer)

**文件**: `app/services/smart_indexer.py`

```python
class SmartIndexer:
    """后台索引构建器"""

    def __init__(self):
        self.db = sqlite3.connect("memory.db")
        self._init_fts5()

    def index_conversation(self, session_id: str, messages: List[Dict]):
        """索引对话内容"""
        for msg in messages:
            if msg["role"] == "user":
                # 用户问题 → P1 记忆
                self.memory_tree.add_memory(
                    content=msg["content"],
                    priority="P1",
                    metadata={"type": "user_query", "session": session_id}
                )
            elif msg["role"] == "assistant":
                # 助手回答 → P2 记忆
                self.memory_tree.add_memory(
                    content=msg["content"],
                    priority="P2",
                    metadata={"type": "assistant_response", "session": session_id}
                )

    def search_memory(self, query: str, top_k: int = 5) -> List[Dict]:
        """FTS5 全文搜索 + BM25 排序"""
        cursor = self.db.execute("""
            SELECT
                m.id, m.content, m.summary, m.confidence,
                bm25(memory_fts) as score
            FROM memory_fts
            JOIN memory_nodes m ON memory_fts.rowid = m.rowid
            WHERE memory_fts MATCH ?
            ORDER BY score DESC
            LIMIT ?
        """, (query, top_k))

        results = cursor.fetchall()

        # 更新置信度
        for row in results:
            self._boost_confidence(row[0], delta=0.03)

        return results
```

---

## 🔄 工作流程

### 请求处理流程

```python
# app/api/anthropic.py

async def chat_completion(request: ChatRequest):
    """
    1. 接收用户请求
    2. 查询记忆树（相关历史）
    3. 构建优化后的上下文
    4. 调用 Anthropic API
    5. 处理响应（Tool Result 沙盒化）
    6. 更新记忆树
    """

    # 1. 查询相关记忆
    relevant_memories = memory_tree.search(
        query=request.messages[-1]["content"],
        top_k=3
    )

    # 2. 构建上下文
    context_messages = [
        {"role": "system", "content": build_system_prompt()},
        *[{"role": "user", "content": m.summary} for m in relevant_memories],
        *semantic_compressor.compress_messages(request.messages)
    ]

    # 3. 调用 API
    response = await anthropic_client.messages.create(
        model=request.model,
        messages=context_messages,
        max_tokens=request.max_tokens
    )

    # 4. 处理 Tool Results
    if response.stop_reason == "tool_use":
        for tool_call in response.content:
            if tool_call.type == "tool_use":
                # 执行 Tool
                result = execute_tool(tool_call)

                # 沙盒处理
                compressed_result = tool_sandbox.process_tool_result(
                    tool_name=tool_call.name,
                    result=result
                )

                # 返回压缩后的结果
                tool_call.result = compressed_result

    # 5. 索引对话（异步）
    asyncio.create_task(
        smart_indexer.index_conversation(
            session_id=request.session_id,
            messages=context_messages + [response]
        )
    )

    return response
```

---

## 📈 预期效果

### 压缩率对比

| 场景 | 原始大小 | 压缩后 | 压缩率 |
|------|----------|--------|--------|
| 读取大文件 (50KB) | 50KB | 2KB | 96% |
| Grep 搜索 (30KB) | 30KB | 1.5KB | 95% |
| JSON API (100KB) | 100KB | 3KB | 97% |
| 历史对话 (200KB) | 200KB | 20KB | 90% |
| **总体** | **380KB** | **26.5KB** | **93%** |

### 上下文容量提升

```
原方案：
- 20 轮对话后达到 200K 限制
- 需要截断历史

新方案：
- 100+ 轮对话仍在 150K 以内
- 保留完整上下文
- 智能检索历史记忆
```

---

## 🚀 实施计划

### Phase 1: 基础设施 (1 周)

- [ ] 创建 SQLite + FTS5 数据库
- [ ] 实现 MemoryTree 基础类
- [ ] 实现 SmartIndexer
- [ ] 单元测试

### Phase 2: Tool 沙盒 (1 周)

- [ ] 实现 ToolSandbox 基础框架
- [ ] 实现各类型压缩器（code/json/log/text）
- [ ] 集成到 API 流程
- [ ] 压缩率测试

### Phase 3: 语义压缩 (1 周)

- [ ] 实现 SemanticCompressor
- [ ] 意图提取（规则 + 小模型）
- [ ] 消息合并算法
- [ ] A/B 测试

### Phase 4: 自动化 (3 天)

- [ ] 置信度衰减定时任务
- [ ] 自动归档低置信度记忆
- [ ] 监控面板
- [ ] 性能优化

### Phase 5: 优化迭代 (持续)

- [ ] 收集压缩效果数据
- [ ] 调整压缩策略
- [ ] 优化搜索算法
- [ ] 用户反馈迭代

---

## 🎛️ 配置参数

```bash
# .env.context_optimization

# 记忆树配置
MEMORY_TREE_ENABLED=true
MEMORY_TREE_DB_PATH=/var/lib/ai-history-manager/memory.db
MEMORY_INITIAL_CONFIDENCE=0.7
MEMORY_DECAY_P2_RATE=0.008  # P2 每天衰减
MEMORY_DECAY_P1_RATE=0.004  # P1 每天衰减
MEMORY_ARCHIVE_THRESHOLD=0.3

# Tool 沙盒配置
TOOL_SANDBOX_ENABLED=true
TOOL_RESULT_MAX_SIZE=2048  # 压缩后最大 2KB
TOOL_SANDBOX_STORE_ORIGINAL=true  # 原始内容存入记忆树

# 语义压缩配置
SEMANTIC_COMPRESSION_ENABLED=true
SEMANTIC_KEEP_RECENT_N=5  # 保留最近 5 条完整消息
SEMANTIC_USE_SMALL_MODEL=false  # 是否用小模型生成摘要

# 索引配置
SMART_INDEX_ENABLED=true
SMART_INDEX_INTERVAL=300  # 每 5 分钟索引一次
FTS5_TOKENIZER=porter  # Porter 词干提取

# 衰减任务配置
DECAY_CRON_ENABLED=true
DECAY_CRON_SCHEDULE="0 2 * * *"  # 每天凌晨 2 点
```

---

## 📊 监控指标

### 实时监控

```bash
curl http://127.0.0.1:8100/admin/context/stats
```

```json
{
  "memory_tree": {
    "total_nodes": 1523,
    "green_leaves": 456,  // 置信度 >= 0.8
    "yellow_leaves": 789,  // 0.5-0.8
    "brown_leaves": 234,   // 0.3-0.5
    "archived": 44,
    "avg_confidence": 0.72
  },
  "compression": {
    "total_requests": 1234,
    "total_original_size": "45.6MB",
    "total_compressed_size": "3.2MB",
    "compression_ratio": 0.93,
    "avg_compression_time_ms": 12.3
  },
  "tool_sandbox": {
    "total_tool_calls": 567,
    "sandboxed_results": 543,
    "avg_compression_ratio": 0.96
  }
}
```

---

## 🔍 调试工具

### 1. 查看记忆树

```bash
python -m app.cli.memory tree visualize
```

### 2. 搜索记忆

```bash
python -m app.cli.memory search "如何优化性能"
```

### 3. 手动触发衰减

```bash
python -m app.cli.memory decay --dry-run
python -m app.cli.memory decay --run
```

### 4. 查看压缩效果

```bash
python -m app.cli.context analyze-compression --session-id <id>
```

---

## 💡 关键创新点

### 1. 零配置自动优化

用户无需手动管理上下文，系统自动：
- 索引对话历史
- 压缩 Tool Results
- 衰减不用的记忆
- 检索相关上下文

### 2. 渐进式降级

```
优先级 1: 完整内容（最近 5 条消息）
优先级 2: 摘要内容（中间消息）
优先级 3: 检索内容（记忆树搜索）
优先级 4: 归档内容（低置信度）
```

### 3. 自适应压缩

根据内容类型选择最优压缩策略：
- 代码 → 保留结构
- JSON → 保留 schema
- 日志 → 提取错误
- 文本 → 提取关键句

### 4. 置信度驱动

不是简单的 LRU，而是基于：
- 访问频率
- 访问时间
- 优先级
- 用户反馈

---

## 🎓 参考资料

- **claude-context-mode**: https://github.com/mksglu/claude-context-mode
- **Memory-Like-A-Tree**: https://github.com/miounet11/Memory-Like-A-Tree
- **SQLite FTS5**: https://www.sqlite.org/fts5.html
- **BM25 算法**: https://en.wikipedia.org/wiki/Okapi_BM25
- **Claude Code 文章**: CLAUDE_CODE_INSIGHTS.md

---

## ✅ 成功标准

1. **压缩率**: 平均 90%+ 的 token 节省
2. **响应速度**: 压缩处理 < 50ms
3. **准确性**: 检索相关记忆准确率 > 85%
4. **稳定性**: 100+ 轮对话不超限
5. **用户体验**: 零感知，自动优化

---

**让 AI 拥有真正的长期记忆，而不是简单的上下文窗口。** 🧠
