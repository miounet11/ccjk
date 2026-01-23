平衡的艺术：rust-skills 及其高级 Skills 技艺探索
“
我发现写 Skills 比写代码都难，因为，在自由度和确定性之间寻找平衡是一门艺术。

引子
最初，我以为 Skills 就是写写 Prompt 而已。

直到上周末，我第一次编写了 makepad-skills[1] 给团队使用，于是我第一次理解什么是 Skills ，于是我如此写道：Skills 就是把人的能力赋予 AI Agent。

makepad-skills 明显提升了 Claude Code 编写基于  makepad 跨平台 App 的 UI 能力。但我总感觉我对 Skills 的理解还是停留在表面。

于是这周，我对 Skills 及 Claude Code 提供的 Plugin / SubAgent 等都系统了解了一遍之后，又开始琢磨社区里被推崇的一些知名 Skills。比如 superpower / planning-with-files  等等，对 Skills 的写法又有了进一步的了解。

于是我这周开启了 `rust-skills`[2] 的编写。

起初，我认为 `rust-skills`[3] 会很快完成，但实际上没有那么简单，并且随着编写 rust-skills 的过程，让我对 Skills 的理解进一步加深。

在写 makepad-skills 的时候，我认为 Skills 这种由人类赋能给 AI Agent 的技能包，就是一种知识库。但我现在认为 Skills 不止于知识库。或者也可以说， Skills 不等同于知识库。

我现在对 Skills 的理解就是： Skill 是一个可复用的推理协议，或者说知识框架，它改变 Claude 思考某类问题的方式，而不是它对这些问题的知识。

“
A Skill is a Cognitive Protocol that shapes HOW Claude thinks about a problem, not WHAT it knows.

让我拿 `rust-skills`[4] 为你说明。

介绍 Rust Skills
在深入探索 rust-skills 的实现技巧之前，让我们先了解下它可以干什么。

如果你有 Rust 基础，你可能可以更好的理解 rust-skills 的含金量，如果你没有 Rust 基础，你可以看看原始 claude code 和 使用 rust-skills 之后 claude code 的输出对比。

创作初衷：为什么 AI 写 Rust 需要专门的 Skills？
作为一名 Rust 开发者，我经常使用 AI 辅助编程。我认为 Rust 语言是对 AI 非常友好的语言，因为 AI 可以利用 Rust 编译器和一些配套工具链的静态检查可以让 AI 更好地「验证」生成的代码，只要编译通过，程序就能保证正确性。

“
以防大家不理解这个「正确性」 ：在既定抽象与不变式下，程序不会发生某一类已知的错误。它从来不等价于：程序符合需求、逻辑正确、业务正确。Rust 的「正确性」不是结果正确，而是系统一致性正确。

然而，这并不完美。 AI 写 Rust 代码还面临以下五大问题（尤其是最后一个最为严重）：

1. 大模型知识库陈旧

大语言模型的训练数据有截止日期。当你询问 "Rust 1.84 有什么新特性" 或 "tokio 最新版本是多少" 时，模型可能给出几个月甚至一年前的信息。

Rust 生态系统发展迅速，crate 版本更新频繁。一个在 tokio 1.0 时代正确的用法，可能在 tokio 1.49 中已经被废弃或改变。

2. 缺乏专业工具调用

大多数 AI 编程助手缺乏获取 Rust 生态实时信息的能力：

无法查询 crates.io 获取最新版本
无法访问 docs.rs 获取准确 API 文档
无法获取 Rust 版本 changelog
结果就是 AI 只能依赖训练数据中的"记忆"，而这些记忆往往是不准确的。

3. 没有编码规范指导

Rust 有其独特的编码规范和最佳实践。命名约定（snake_case vs CamelCase）、格式化规则、错误处理模式……这些都有社区共识。

然而，大多数 AI 并没有系统性地学习这些规范。生成的代码可能能跑，但不够"Rustic"。

4. Unsafe 规范缺失

Unsafe Rust 是一个需要特别小心的领域。FFI 绑定、裸指针操作、内存布局控制……这些都需要严格遵循安全规范。

一个错误的 unsafe 使用可能导致未定义行为（UB）、内存泄漏，甚至安全漏洞。然而，AI 往往对 unsafe 代码的审查不够严格。

5. AI 无法理解 Rust 编译错误中的架构设计信号

我们寄希望于 AI 可以全面理解项目架构，遇到 Rust 编译错误，我们希望 AI 利用它庞大的上下文窗口来为我们像人一样解决问题。

但实际上，我们人类开发者解决问题，是通过识别 Rust 的编译错误中的架构设计信号，来从根本上对问题根源做出判断。而架构设计信号就藏在 Rust 编译错误背后的类型系统中，而 Rust 类型系统其实就是 Rust 项目隐含的项目上下文信息。

以上这五大问题，促使我思考：能否打造一套专门的 Skills，让 AI 在写 Rust 时可以识别问题真正的语义，利用 Rust 思维并精准解决问题？

Rust Skills 就是这个问题的答案。

Rust Skills 功能及其完整用法
rust-skills 三大功能分类
中文
英文
作用
元认知类
Meta-Cognition
提升语义识别，追溯问题本质
动态 Skills 类
Dynamic Skills
按需生成 Skills，热加载 crate skills
信息获取类
Info Fetching
获取最新信息，紧跟 Rust 前沿
元认知类 (Meta-Cognition)
核心价值

“
提升 Claude Code 对 Rust 学习和实践中遇到问题的语义识别能力，从表面错误追溯到问题本质。

前面我们提到，AI 无法识别 Rust 编译错误中的架构设计信号，我们寄希望于 AI 利用庞大的上下文窗口全面理解项目架构，在遇到 Rust 编译错误时像人类开发者一样从根本上解决问题。但这个期望忽略了一个关键事实：上下文窗口装的是代码文本，不是架构理解。

我们先来反思人类如何解决 Rust 编译错误，人类开发者不是在"修复错误"，而是在解读信号。

比如，面对这个编译错误：E0382: use of moved value 'record' , 人类开发者会有如下思考：

"record 被移动了"不是问题本身
问题是：为什么我的设计需要在两个地方使用同一个值？
项目上下文来说，这是一个交易记录，交易记录的领域语义是什么？
金融领域要求审计追踪 → 同一记录不能有多个独立副本
所以不是"修复移动"，而是"重新设计所有权模型"
人类开发者对错误信息等信号识别过程：E0382 -> 所有权设计问题 -> 领域约束冲突  ->  架构调整 。

AI 为什么做不到像人类开发者这样思考？AI 会如下思考：

模式匹配：E0382 = "use of moved value"
模式匹配：常见解法 = ".clone()" 或 "Rc/Arc"
输出最短路径修复
这完全不是我们想要的，这就是我前文中所说的，AI 无法读取错误信息中潜在的上下文信号。

人类能看到
AI 看不到
TradeRecord 是金融领域概念
只是一个 struct 名字
金融要求审计追踪
没有领域知识激活
clone() 违反单一事实源
只知道 clone 能编译
应该用 Arc 共享不可变数据
没有追溯到设计层
为什么大的上下文也无法解决 AI 的盲区？

上下文窗口 = [代码文本, 代码文本, 代码文本, ...] 

缺失的是：

类型选择背后的设计意图
领域约束（为什么选择这个类型）
架构决策（这个模块的职责边界）
代码文本不携带设计意图元数据。你看到 struct TradeRecord，但看不到"这是一个需要审计追踪的不可变值对象"。

Rust 类型系统：隐式的架构文档
Rust 的独特之处：类型系统本身就是架构决策的编码。

// 这行代码隐含的架构信息:
// 1. 所有权转移 → 调用者放弃控制
// 2. 非引用 → 可能被修改或消费
// 3. 无 Clone 约束 → 设计者可能不想复制     
fn process(record: TradeRecord)

// 这行代码隐含的架构信息:
// 1. 共享所有权 → 多处需要访问 
// 2. Arc 而非 Rc → 跨线程场景 
// 3. 不可变共享 → 读多写少或不可变
fn process(record: Arc<TradeRecord>)
类型签名 = 压缩的架构决策 ，但 AI 只读类型语法，不解压架构语义。

编译错误是架构反馈，不是语法 bug  。

E0382 的真正含义："你的所有权模型与你的使用模式不匹配" ，不是说："你忘了 clone" ，而是说："请重新思考谁应该拥有这个数据"。

错误码
表面含义
架构信号
E0382
值被移动
所有权模型需要重新设计
E0597
生命周期不够长
数据流边界不清晰
E0277 Send
不能跨线程
并发架构需要调整
E0502
借用冲突
可变性边界设计问题
对此，我引入元认知类 Skill 解决方案：


编译错误 (Layer 1 信号)  
  -> 元问题识别 (这是什么类型的设计问题？)  
  -> 领域约束激活 (Layer 3: 这个领域有什么规则？)
  -> 设计模式选择 (Layer 2: 什么模式满足约束？)
  -> 架构正确的修复 (不是语法修复，是设计修复)
元认知的作用，就是将类型系统中隐式的架构信息显式化，让 AI 能够"解压"类型签名背后的设计意图。Rust 编译错误是架构设计信号，不是语法错误。类型系统是压缩的架构文档。AI 能读代码文本，但无法解压类型语义背后的设计意图。这正是元认知框架要弥补的认知差距。

Sill 组成 路由与框架
Skill
功能
rust-router	
入口路由，识别问题层级和领域
_meta/reasoning-framework	
三层追溯方法论
_meta/layer-definitions	
L1/L2/L3 定义
工作机制：

用户问题: "Web API 报错 Rc cannot be sent"
    │
    ▼
┌─────────────────────────────────────────┐
│ rust-router 语义识别                     │
│ ├─ 检测: "Web API" → 领域: domain-web   │
│ ├─ 检测: "Send" 错误 → 机制: m07        │
│ └─ 决策: 双技能加载                      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 三层追溯                                 │
│ L1: Rc 不是 Send (表面)                 │
│  ↑                                       │
│ L3: Web handlers 在任意线程运行 (约束)   │
│  ↓                                       │
│ L2: 使用 Arc + State extractor (设计)   │
└─────────────────────────────────────────┘
    │
    ▼
领域正确的架构方案
实际效果：

图片
图片
图片


另外一个问题：

图片
图片


动态 Skill 类 (Dynamic Skills)
功能介绍
动态 Skill 是基于 Claude Code 2.1 版本以上支持的「热加载 Skills」特性。这样，就可以不用重启 CC 就可以使用这个 Skill 了。 非常适合用于 长任务处理，如果 CC 需要了解最新的 crate 文档 Skill，就可以动态生成。

“
冷知识： 热重载 Skill 不支持 “符号链接”，即，你必须把 Skills 目录文件完整复制到 CC 主动扫描到指定区域，~/.claude/skills 或 your_project/.claude/skills

核心价值

“
Rust 生态中有大量 crate，无法为每个都预置 skills。利用 Claude Code 的热加载特性，按需生成 crate 专属 skills。

解决的问题

问题
解决方案
Crate 数量庞大
按需生成，而非预置
版本频繁更新
从最新文档生成
项目依赖各异
支持全局和项目级
存储策略

~/.claude/skills/           ← 全局 (常用 crate)
├── tokio/
│   ├── SKILL.md
│   └── references/
├── serde/
├── ratatui/
└── std/                    ← 标准库

项目/.claude/skills/        ← 项目级 (特定依赖)
├── sqlx/
├── sea-orm/
└── my-company-crate/
使用场景
场景
存储位置
示例
常用 crate
全局 ~/.claude/skills/
tokio, serde, ratatui, std
项目特定依赖
项目 .claude/skills/
sqlx, 业务 crate
临时学习
项目级，用完删除
试用新 crate
Skills 组成
Skill
功能
core-dynamic-skills	
动态 skills 生成框架
rust-skill-creator	
从文档生成 skills
命令

命令
功能
/sync-crate-skills	
从 Cargo.toml 批量生成
/update-crate-skill <crate>	
更新指定 crate
/clean-crate-skills	
清理动态 skills
/create-llms-for-skills <urls>	
从 URL 生成 llms.txt
/create-skills-via-llms <crate> <path>	
从 llms.txt 创建 skill
工作流程
方式一：从 Cargo.toml 自动生成
┌─────────────────────────────────────────┐
│ /sync-crate-skills                      │
│     │                                    │
│     ▼                                    │
│ 解析 Cargo.toml 依赖                     │
│     │                                    │
│     ▼                                    │
│ 检查 actionbook 是否有 llms.txt         │
│     │                                    │
│     ├─ 有 → 直接生成 skill              │
│     └─ 无 → 从 docs.rs 抓取生成         │
│     │                                    │
│     ▼                                    │
│ 写入 ~/.claude/skills/{crate}/          │
└─────────────────────────────────────────┘

方式二：手动为特定 crate 生成
┌─────────────────────────────────────────┐
│ /create-llms-for-skills <docs_url>      │
│     │                                    │
│     ▼                                    │
│ 抓取文档，生成 llms.txt                  │
│     │                                    │
│     ▼                                    │
│ /create-skills-via-llms tokio ./llms.txt│
│     │                                    │
│     ▼                                    │
│ 生成高质量 skill                         │
└─────────────────────────────────────────┘
生成的 Skill 结构
~/.claude/skills/tokio/
├── SKILL.md              # 主 skill 文件
│   ├── 触发关键词
│   ├── 核心概念
│   ├── 常用模式
│   └── 文档引用
└── references/           # 详细参考
    ├── runtime.md
    ├── task.md
    ├── sync.md
    └── io.md
我在本地生成了  std / tokio / ratatui  三个 skills，我会将其发布到 github，大家就不需要自己再浪费 token 生成了。

信息获取类 (Info Fetching)
核心价值
“
让 Claude Code 精准获取 Rust 语言和生态的最新信息，让用户紧跟 Rust 最前沿。

解决的问题
问题
解决方案
AI 知识截止日期
实时抓取最新信息
版本更新频繁
后台 agents 定期获取
信息源分散
聚合多个权威来源
Skills 组成

Skill
功能
rust-learner	
版本和 crate 信息路由
rust-daily	
Rust 生态新闻聚合
Agents (后台研究员)
Agent
数据源
获取内容
rust-changelog	
releases.rs
Rust 版本特性、破坏性变更
crate-researcher	
lib.rs, crates.io
Crate 版本、features、依赖
docs-researcher	
docs.rs
第三方 crate API 文档
std-docs-researcher	
doc.rust-lang.org
标准库文档
clippy-researcher	
rust-clippy
Lint 规则解释
rust-daily-reporter	
Reddit, TWIR, Blog
生态动态新闻
命令
命令
功能
/rust-features [version]	
查询 Rust 版本特性
/crate-info <crate>	
查询 crate 信息
/docs <crate> [item]	
获取 API 文档
/rust-daily [day|week|month]	
Rust 生态新闻
信息源
┌─────────────────────────────────────────────────────────┐
│                    信息获取网络                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Rust 官方                    Rust 生态                  │
│  ┌──────────────┐            ┌──────────────┐           │
│  │ releases.rs  │            │ crates.io    │           │
│  │ 版本发布     │            │ lib.rs       │           │
│  └──────┬───────┘            └──────┬───────┘           │
│         │                           │                    │
│  ┌──────┴───────┐            ┌──────┴───────┐           │
│  │doc.rust-lang │            │ docs.rs      │           │
│  │标准库文档     │            │ crate 文档   │           │
│  └──────────────┘            └──────────────┘           │
│                                                          │
│  社区动态                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Reddit       │  │ TWIR         │  │ Blog         │   │
│  │ r/rust       │  │ This Week    │  │ 官方博客     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
缓存策略
数据类型
TTL
说明
Rust 版本
168h
发布不频繁
Crate 信息
24h
更新较频繁
API 文档
72h
相对稳定
Clippy Lints
168h
跟随 Rust 版本
工作流程
用户: "tokio 最新版本有什么新特性？"
    │
    ▼
┌─────────────────────────────────────────┐
│ rust-learner 路由                        │
│ 识别: crate 版本查询 → crate-researcher │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ crate-researcher agent                   │
│ 1. 检查缓存 (24h TTL)                   │
│ 2. 若过期，从 lib.rs 获取               │
│ 3. 返回: 版本、features、changelog      │
└─────────────────────────────────────────┘
    │
    ▼
最新、准确的 crate 信息
下面是展示效果。

在不使用 rust-skills 的情况下：

图片


在使用 rust-skills 之后：

图片


效果肉眼可见不同。

功能协作
三类功能相互配合：

┌─────────────────────────────────────────────────────────┐
│                     用户问题                             │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ 元认知类   │   │ 动态 Skills│   │ 信息获取类 │
    │           │   │           │   │           │
    │ 语义识别   │   │ crate 知识 │   │ 最新信息   │
    │ 追溯本质   │   │ 按需加载   │   │ 实时获取   │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │ 领域正确 + 最新准确的   │
            │ 架构方案                │
            └─────────────────────────┘
协作示例
问题: "用 tokio 1.40 写一个 Web 服务，处理并发请求"

1. 元认知类: 识别 Web + 并发 → 加载 domain-web + m07
2. 动态 Skills: 加载 tokio skill (最新 API 模式)
3. 信息获取类: 确认 tokio 1.40 特性和最佳实践

→ 输出: 基于最新 tokio 版本、符合 Web 领域约束的方案
大家可以试试，相比于未使用 rust-skills 的原始 Claude 创建这个问题的项目，在代码结构化更强（模块拆分、错误类型、校验、优雅关闭、单测）。

总之，rust-skills 的目标是让 Claude Code 成为一个理解问题本质、掌握最新生态、按需扩展知识的 Rust 开发助手。

平衡的艺术：Rust Skills  架构及其高级技巧
Rust-Skills 架构设计
rust-skills 总的来说，是一个完整的 Claude Code Plugin 结构。我在这个基础上做了整个 Skill 架构设计，可以说，我下面的 Skill 基本算得上一个最佳实践了。

┌─────────────────────────────────────────────────────────────────────┐
│                          用户问题                                    │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Hook 触发层                                   │
│  hooks/hooks.json + .claude/hooks/rust-skill-eval-hook.sh           │
│  - 400+ 关键词匹配 (中/英/错误码)                                    │
│  - 强制元认知流程                                                    │
│  - 强制输出格式                                                      │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        路由层 (rust-router)                          │
│  - 识别入口层 (L1/L2/L3)                                            │
│  - 检测领域关键词                                                    │
│  - 决策: 双技能加载                                                  │
└───────────┬─────────────────────────────────┬───────────────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐       ┌───────────────────────────────────┐
│    静态 Skills 层      │       │         动态 Skills 层             │
│                        │       │                                    │
│  skills/               │       │  ~/.claude/skills/ (全局)          │
│  ├── m01-m07 (L1)     │       │  ├── tokio/                        │
│  ├── m09-m15 (L2)     │       │  ├── serde/                        │
│  ├── domain-* (L3)    │       │  └── std/                          │
│  ├── rust-router      │       │                                    │
│  ├── coding-guidelines│       │  .claude/skills/ (项目级)          │
│  └── unsafe-checker   │       │  └── project-specific-crate/       │
└───────────┬───────────┘       └───────────────┬───────────────────┘
            │                                   │
            └─────────────┬─────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Agents 层                                     │
│  agents/                                                             │
│  ├── rust-changelog      (Rust 版本信息)                            │
│  ├── crate-researcher    (Crate 元数据)                             │
│  ├── docs-researcher     (API 文档)                                 │
│  └── rust-daily-reporter (生态新闻)                                 │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        输出层                                        │
│  - 推理链 (Reasoning Chain)                                         │
│  - 领域约束分析                                                      │
│  - 推荐方案                                                          │
└─────────────────────────────────────────────────────────────────────┘
如果你认真看了我前面关于 Rust Skills 创作初衷和功能说明，你应该能看得懂这个架构。

现在你是否可以体会到我说写 Skills 比代码还难的意思了吧。 尤其是 Skills 在 Claude 的宣传中被描述为「自我触发」，但实际上它极度依赖关键字匹配，因为 skill 的触发机制本身并不会使用 AI 进行语义识别。

虽然可以支持手工命令式指定 skills，但「自动触发」才应该是 Skills 的最佳体验。 这里值得一提的是我使用的 Hook 技巧。

简单来说，利用 Hook ，你可以向 Claude Code 注入你自定义的东西，就比如我们的「自动触发」功能，不使用 Hook 的自动触发几率很低，使用了 Hook 才能勉强达到 90% 左右。

架构要点
层级
组件
职责
触发层
hooks/hooks.json
关键词匹配，触发流程
强制层
rust-skill-eval-hook.sh
注入元认知指令
路由层
rust-router
识别层级，双技能加载
知识层
skills/*
认知框架，决策指引
扩展层
~/.claude/skills/
动态生成的 crate skills
数据层
agents/*
实时获取最新信息
缓存层
cache/
减少重复请求
设计原则
Skills 是认知协议，不是知识库
强制追溯，不能停在 Layer 1
领域检测，双技能加载
输出格式强制推理链
扁平目录结构
动态 Skills 按需生成
Agents 获取实时信息
Skill 高级技巧
Hook 机制详解
“
如何利用 Hook 强制触发 Skills

问题背景
没有 Hook 的情况

用户: "Web API 报错 Rc cannot be sent"

Claude 默认行为:
  → 直接从知识库回答
  → "用 Arc 替代 Rc"
  → 不加载任何 Skill
  → 不追溯领域约束
Skill 定义了很好的认知框架，但 Claude 不会主动使用（可以识别，但是概率很低，尤其是 rust skills 这么复杂的 skills ）。

有 Hook 的情况

用户: "Web API 报错 Rc cannot be sent"

Hook 触发:
  → 匹配关键词 "Web API", "Send"
  → 注入元认知指令
  → 强制加载 Skills
  → 强制输出推理链
效果: 确保每次 Rust 问题都经过元认知流程。

Hook 工作原理
触发流程

┌─────────────────────────────────────────────────────────────┐
│                      用户输入                                │
│              "Web API 报错 Rc cannot be sent"               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 hooks/hooks.json                             │
│                                                              │
│  {                                                           │
│    "hooks": {                                                │
│      "UserPromptSubmit": [{                                  │
│        "matcher": "(?i)(rust|Web API|Send|...)",            │
│        "hooks": [{                                           │
│          "type": "command",                                  │
│          "command": "...rust-skill-eval-hook.sh"            │
│        }]                                                    │
│      }]                                                      │
│    }                                                         │
│  }                                                           │
│                                                              │
│  匹配成功! → 执行 hook 脚本                                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           .claude/hooks/rust-skill-eval-hook.sh             │
│                                                              │
│  输出元认知指令:                                             │
│  - 强制识别层级和领域                                        │
│  - 强制加载 Skills                                           │
│  - 强制输出格式                                              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude 执行                               │
│                                                              │
│  1. 收到用户问题 + Hook 注入的指令                           │
│  2. 按指令加载 Skills                                        │
│  3. 按指令执行追溯                                           │
│  4. 按指令格式输出                                           │
└─────────────────────────────────────────────────────────────┘
claude code 关键字识别无法支持正则，所以我利用 Hook 脚本的程序能力，支持正则匹配关键词，极大地扩展了关键字匹配的灵活性。

配置文件详解
1. hooks/hooks.json (触发配置)

{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "(?i)(rust|cargo|rustc|crate|Cargo\\.toml|E0\\d{3}|ownership|borrow|lifetime|Send|Sync|async|await|Arc|Rc|Mutex|trait|generic|Result|Error|panic|unsafe|FFI|Web API|HTTP|axum|actix|所有权|借用|生命周期|异步|并发|怎么|如何|为什么)",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/.claude/hooks/rust-skill-eval-hook.sh"
          }
        ]
      }
    ]
  }
}
关键点:

字段
说明
UserPromptSubmit	
Hook 时机: 用户提交问题时
matcher	
正则表达式，匹配触发条件
(?i)	
忽略大小写
type: command	
执行 shell 命令
${CLAUDE_PLUGIN_ROOT}	
插件根目录变量
2. matcher 关键词设计

(?i)(
  # Rust 基础
  rust|cargo|rustc|crate|Cargo\.toml|

  # 错误码
  E0\d{3}|

  # 所有权系统
  ownership|borrow|lifetime|move|clone|

  # 并发
  Send|Sync|async|await|thread|spawn|

  # 智能指针
  Arc|Rc|Box|RefCell|Cell|Mutex|

  # 类型系统
  trait|generic|impl|dyn|

  # 错误处理
  Result|Error|panic|unwrap|

  # Unsafe
  unsafe|FFI|extern|

  # 领域关键词
  Web API|HTTP|axum|actix|payment|trading|CLI|embedded|

  # 中文
  所有权|借用|生命周期|异步|并发|智能指针|

  # 问题词
  怎么|如何|为什么|what|how|why
)
3. rust-skill-eval-hook.sh (强制脚本)

#!/bin/bash
cat << 'EOF'

=== MANDATORY: META-COGNITION ROUTING ===

CRITICAL: You MUST follow the COMPLETE meta-cognition framework.

## STEP 1: IDENTIFY ENTRY LAYER + DOMAIN

| Keywords in Question | Domain Skill to Load |
|---------------------|---------------------|
| Web API, HTTP, axum | domain-web |
| payment, trading    | domain-fintech |
| CLI, clap, terminal | domain-cli |

**CRITICAL**: If domain keywords present, load BOTH L1 and L3 skills.

## STEP 2: EXECUTE TRACING (MANDATORY)

L1 Error → Trace UP to L3 → Find constraint → Trace DOWN to solution

## STEP 3: MANDATORY OUTPUT FORMAT

### Reasoning Chain
+-- Layer 1: [error]
|       ^
+-- Layer 3: [domain constraint]
|       v
+-- Layer 2: [design decision]

### Domain Constraints Analysis
[Reference domain skill rules]

### Recommended Solution
[Code following best practices]

EOF
关键点:

部分
作用
领域检测表
强制识别领域，加载对应 Skill
双技能加载
同时加载 L1 + L3
追溯指令
强制执行 UP/DOWN 追溯
输出格式
强制要求推理链结构
这里提一下，脚本里使用了约束大模型的一些 Prompt 技巧：

等级
约束词
效果
使用场景
L5 最强	CRITICAL
, MUST, NEVER, MANDATORY
几乎 100% 遵循
核心规则，不可违反
L4 强	IMPORTANT
, REQUIRED, ALWAYS
90%+ 遵循
重要规则
L3 中	should
, recommended, prefer
70%+ 遵循
建议性规则
L2 弱	can
, may, consider
50% 遵循
可选项
L1 最弱	optionally
, if needed
30% 遵循
边缘情况
Hook 类型
Claude Code 支持的 Hook 时机
Hook 类型
触发时机
用途
UserPromptSubmit	
用户提交问题时
主要使用
 - 注入元认知指令
PreToolUse	
调用工具前
可用于工具调用前检查
PostToolUse	
工具调用后
可用于结果后处理
Stop	
会话结束时
可用于清理或总结
rust-skills 使用的 Hook
{
  "UserPromptSubmit": [
    {
      "matcher": "...",
      "hooks": [{ "type": "command", "command": "..." }]
    }
  ]
}
选择 UserPromptSubmit 是为了让 Hook 在最早时机注入，即 Claude 思考前。这样就可以影响整个回答流程，不会遗漏任何匹配的问题（取决于你的匹配关键词覆盖面）。

强制机制设计
1. 关键词覆盖策略
目标: 确保所有 Rust 相关问题都被触发

策略:
├── 语言关键词: rust, cargo, crate, ...
├── 错误码: E0xxx (正则匹配所有错误码)
├── 概念关键词: ownership, borrow, lifetime, ...
├── 类型关键词: Arc, Rc, Mutex, ...
├── 领域关键词: Web API, HTTP, payment, ...
├── 中文关键词: 所有权, 借用, 异步, ...
└── 问题词: 怎么, 如何, 为什么, how, why, ...
2. 双技能加载策略
问题: "Web API 报错 Send not satisfied"

传统方式 (只加载 L1):
  → 检测 "Send" → 加载 m07-concurrency
  → 输出: "用 Arc"
  → 缺失: Web 领域上下文

强制双加载:
  → 检测 "Web API" → 标记领域 = domain-web
  → 检测 "Send" → 标记机制 = m07-concurrency
  → 同时加载两个 Skills
  → 输出: 符合 Web 最佳实践的方案
Hook 脚本中的实现:

| Keywords in Question | Domain Skill to Load |
|---------------------|---------------------|
| Web API, HTTP, axum | domain-web |
| payment, trading    | domain-fintech |

**CRITICAL**: If domain keywords present, load BOTH L1 and L3 skills.
3. 输出格式强制
不强制输出格式的问题:
  → Claude 可能只输出 "用 Arc"
  → 没有推理过程
  → 用户不知道为什么

强制输出格式:
  → 必须输出 Reasoning Chain
  → 必须引用领域约束
  → 必须展示追溯过程
Hook 脚本中的实现:

## STEP 3: MANDATORY OUTPUT FORMAT

Your response MUST include ALL of these sections:

### Reasoning Chain
+-- Layer 1: [specific error]
|       ^
+-- Layer 3: [domain constraint]
|       v
+-- Layer 2: [design decision]

### Domain Constraints Analysis
- MUST reference specific rules from domain-xxx skill

### Recommended Solution
- Not just fixing the compile error
配置位置
插件级 Hook (推荐)
rust-skills/
├── hooks/
│   └── hooks.json           ← Hook 触发配置
├── .claude/
│   └── hooks/
│       └── rust-skill-eval-hook.sh  ← 强制脚本
└── .claude-plugin/
    └── plugin.json          ← 引用 hooks
plugin.json:

{
  "name": "rust-skills",
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"   ← 关键配置
}
项目级 Hook
my-project/
└── .claude/
    ├── hooks/
    │   └── my-hook.sh
    └── settings.json        ← 配置 hooks
全局 Hook
~/.claude/
├── hooks/
│   └── global-hook.sh
└── settings.json            ← 配置 hooks
调试技巧
1. 测试关键词匹配
# tests/hook-matcher-test.py
import re

matcher = r"(?i)(rust|cargo|E0\d{3}|ownership|borrow|Send|Sync|Web API|所有权)"

test_cases = [
    "Web API 报错 Rc cannot be sent",
    "E0382 错误怎么解决",
    "所有权问题",
    "how to use async",
]

for case in test_cases:
    if re.search(matcher, case):
        print(f"✓ 匹配: {case}")
    else:
        print(f"✗ 未匹配: {case}")
2. 查看 Hook 是否触发
在 Claude Code 中，Hook 触发会显示:

⏺ <user-prompt-submit-hook>
  [Hook 脚本输出的内容]
如果没有看到这个，说明:

关键词没匹配
Hook 配置路径错误
plugin.json 没有引用 hooks
3. 检查 Skill 是否加载
触发后应该看到:

⏺ Skill(rust-router)
  ⎿ Successfully loaded skill

⏺ Skill(m07-concurrency)
  ⎿ Successfully loaded skill

⏺ Skill(domain-web)
  ⎿ Successfully loaded skill
常见问题
Q1: Hook 不触发
检查清单:

□ hooks/hooks.json 路径正确
□ plugin.json 中有 "hooks": "./hooks/hooks.json"
□ matcher 正则语法正确
□ 关键词覆盖了用户输入
□ 脚本有执行权限 (chmod +x)
Q2: Skill 没有加载
检查清单:

□ Hook 脚本输出了正确的指令
□ Skill 文件存在于 skills/ 目录
□ SKILL.md 有正确的 name 字段
□ description 格式正确 (CRITICAL: Use for...)
Q3: 输出没有推理链
检查清单:

□ Hook 脚本明确要求了输出格式
□ 输出格式要求足够具体
□ 提供了正确/错误示例对比
Skill 文件结构
SKILL.md 标准格式
---
name: skill-name
description: "CRITICAL: Use for [purpose]. Triggers on: keyword1, keyword2, ..."
globs: ["**/*.rs"]  # 可选
---

# Skill 标题

> Layer X: 类别

## Core Question
[元问题 - 引导思考而非直接给答案]

## Error → Design Question
[错误到设计问题的映射表]

## Trace Up ↑
[向上追溯的指引]

## Trace Down ↓
[向下实现的指引]

## Quick Reference
[快速参考表/决策树]

## Common Errors / Anti-Patterns
[常见错误和反模式]

## Related Skills
[相关技能链接]
description 格式 (关键)
# 正确格式 - 会被自动触发
description: "CRITICAL: Use for [purpose]. Triggers on: keyword1, keyword2, ..."

# 错误格式 - 不会触发
description: "A skill for handling ownership"
组件关系
1. Hook → Router → Skills
hooks/hooks.json
    │
    │ 匹配关键词
    ▼
.claude/hooks/rust-skill-eval-hook.sh
    │
    │ 注入元认知指令
    ▼
skills/rust-router/SKILL.md
    │
    │ 路由决策
    ▼
skills/m0x-* + skills/domain-*
2. 静态 Skills vs 动态 Skills
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  插件 Skills (rust-skills/)      用户 Skills             │
│  ┌────────────────────┐         ┌────────────────────┐  │
│  │ skills/            │         │ ~/.claude/skills/  │  │
│  │ - 元认知框架       │         │ - tokio            │  │
│  │ - 领域约束         │         │ - serde            │  │
│  │ - 编码规范         │         │ - std              │  │
│  └────────────────────┘         └────────────────────┘  │
│                                                          │
│                                  ┌────────────────────┐  │
│                                  │ .claude/skills/    │  │
│                                  │ (项目级)           │  │
│                                  │ - sqlx             │  │
│                                  │ - sea-orm          │  │
│                                  └────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
3. Agents 与 Skills 协作
Skills (知识框架)          Agents (信息获取)
       │                         │
       │                         │
       ▼                         ▼
┌─────────────┐           ┌─────────────┐
│ rust-learner│ ────────► │ crate-      │
│ (路由)      │           │ researcher  │
└─────────────┘           └─────────────┘
       │                         │
       │                         │
       ▼                         ▼
┌─────────────┐           ┌─────────────┐
│ 决策框架    │           │ 实时数据    │
│ 如何思考    │           │ 最新信息    │
└─────────────┘           └─────────────┘
       │                         │
       └───────────┬─────────────┘
                   │
                   ▼
            ┌─────────────┐
            │ 准确且符合  │
            │ 最佳实践的  │
            │ 回答        │
            └─────────────┘
数据流
完整请求流程
1. 用户输入
   "Web API 报错 Rc cannot be sent"
        │
        ▼
2. Hook 触发 (hooks/hooks.json)
   匹配: "Web API", "Rc", "Send"
        │
        ▼
3. Hook 脚本 (rust-skill-eval-hook.sh)
   注入: 元认知指令 + 输出格式要求
        │
        ▼
4. Router (rust-router)
   识别: L1 = m07-concurrency
         L3 = domain-web
   决策: 双技能加载
        │
        ▼
5. Skill 加载
   Skill(m07-concurrency) → Send/Sync 机制
   Skill(domain-web) → Web 领域约束
        │
        ▼
6. 追溯推理
   L1: Rc 不是 Send
    ↑
   L3: Web handlers 在任意线程运行
    ↓
   L2: 使用 Arc + State extractor
        │
        ▼
7. 输出
   - 推理链
   - 领域约束分析
   - 推荐方案 (符合 Web 最佳实践)
扩展指南
添加新的 Layer 1 Skill
---
name: m08-new-skill
description: "CRITICAL: Use for [topic]. Triggers on: keyword1, keyword2"
---

# New Skill Title

> Layer 1: Language Mechanics

## Core Question
**[引导性问题]?**

## Trace Up ↑
[什么时候向上追溯到 L2/L3]

## Trace Down ↓
[从设计决策如何实现]
添加新的 Domain Skill
---
name: domain-new
description: "CRITICAL: Use for [domain]. Triggers on: keyword1, keyword2"
---

# Domain Name

> Layer 3: Domain Constraints

## Domain Constraints → Design Implications
| 领域规则 | 设计约束 | Rust 实现 |

## Trace Down ↓
[从约束到设计到实现]
添加新的 Agent
# agent-name.md

## Purpose
[获取什么信息]

## Data Source
[从哪里获取]

## Output Format
[返回什么格式]

## Cache Strategy
[缓存多久]
Skill 继承
对于复杂的 crate，采用 父子 Skill 结构：

~/.claude/skills/
├── tokio/                     # 父 Skill (入口)
│   ├── SKILL.md              # 广泛触发词，概览性内容
│   └── references/
│       └── rust-defaults.md  # 共享规则
│
├── tokio-task/               # 子 Skill (专门领域)
│   ├── SKILL.md
│   └── references/
│       └── rust-defaults.md  → symlink to ../tokio/references/
│
├── tokio-sync/               # 子 Skill
├── tokio-time/               # 子 Skill
├── tokio-io/                 # 子 Skill
└── tokio-net/                # 子 Skill
父 Skill (tokio/SKILL.md):

---
name: tokio
description: |
  CRITICAL: Use for tokio async runtime questions. Triggers on:
  tokio, spawn, select!, join!, mpsc, timeout, sleep, ...
---
# 广泛的触发词，覆盖整个 crate
# 概览性内容：核心概念、模块列表
# 引导到子 Skills
子 Skill (tokio-task/SKILL.md):

---
name: tokio-task
description: |
  CRITICAL: Use for tokio task management. Triggers on:
  tokio::spawn, JoinHandle, JoinSet, spawn_blocking, abort, ...
---
# 专门领域的深入内容
# 更具体的触发词
# 引用共享规则
共享规则 (references/rust-defaults.md):

# Rust Code Generation Defaults

## Cargo.toml Defaults
edition = "2024"   # 所有子 Skill 共享

## Common Dependencies
| Crate | Version |
|-------|---------|
| tokio | 1.49    |

## Code Style
...
继承优势:

问题
继承方案
触发精度
父 Skill 广泛匹配，子 Skill 精确匹配
内容深度
父 Skill 概览，子 Skill 深入
规则复用
共享 rust-defaults.md
维护成本
更新共享规则自动生效
上下文节省
只加载需要的子 Skill
实现步骤:

# 1. 创建父 Skill
~/.claude/skills/tokio/SKILL.md
~/.claude/skills/tokio/references/rust-defaults.md

# 2. 创建子 Skills，symlink 共享规则
cd ~/.claude/skills/tokio-task/references
ln -s ../../tokio/references/rust-defaults.md .

# 3. 子 Skill 引用共享规则
# 在 SKILL.md 中：
# **IMPORTANT: Before generating any Rust code,
#  read `./references/rust-defaults.md` for shared rules.**
注意：Claude Code 热重载 Skill 机制不支持「符号链接」，但是，在 SKILL.md 中引用符号链接没有问题，这样就实现了 「Skill 继承」机制。

核心依赖 Skill 介绍
rust-learner 是信息获取类的核心路由 Skill，负责调度后台 Agents 获取实时信息。rust-learner skill 依赖 actionbook skill 和 agent-browser skill。

用户问题 (版本/文档/特性)
        │
        ▼
┌───────────────────────────────────────────┐
│           rust-learner (路由层)            │
│                                            │
│  识别查询类型 → 选择对应 Agent → 后台执行  │
└───────────────────────────────────────────┘
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│rust-changelog│  │crate-        │  │docs-         │
│              │  │researcher    │  │researcher    │
│ releases.rs  │  │ lib.rs       │  │ docs.rs      │
└──────────────┘  └──────────────┘  └──────────────┘
Agent 路由表:

查询类型
调度的 Agent
数据源
Rust 版本特性
rust-changelog	
releases.rs
Crate 版本/信息
crate-researcher	
lib.rs, crates.io
标准库文档 (Send, Arc...)
std-docs-researcher	
doc.rust-lang.org
第三方 crate 文档
docs-researcher	
docs.rs
Clippy lint 规则
clippy-researcher	
rust-clippy
Rust 生态新闻
rust-daily-reporter	
Reddit, TWIR
触发关键词:

# 英文
latest version, what's new, changelog, Rust 1.x,
crate info, docs.rs, API documentation, which crate

# 中文
最新版本, 版本号, 新特性, crate 信息, 文档, 依赖
关键设计原则:

原则
说明
后台执行	
所有 Agent 用 run_in_background: true
不猜版本	
永远通过 Agent 获取真实数据
禁用 WebSearch	
不用 WebSearch 查 crate 信息
Fallback 机制	
actionbook → agent-browser → WebFetch
核心依赖：Actionbook MCP
**Actionbook**[5] 是 rust-skills 的核心基础设施，提供预计算的网页选择器。actionbook 也提供 actionbook skill ，可独立使用。

为什么 Actionbook 是核心依赖？
传统方式 (无 Actionbook):
┌─────────────────────────────────────────────────────────┐
│ 1. 访问 lib.rs                                           │
│ 2. 获取整个 HTML (可能 100KB+)                           │
│ 3. 解析 DOM，猜测选择器                                  │
│ 4. 提取数据 (可能失败，选择器不对)                        │
│ 5. 重试... 消耗大量 tokens 和时间                        │
└─────────────────────────────────────────────────────────┘

有 Actionbook:
┌─────────────────────────────────────────────────────────┐
│ 1. 查询 actionbook: "lib.rs crate info"                 │
│ 2. 获得精确选择器:                                       │
│    {                                                     │
│      "version": ".crate-version",                       │
│      "description": ".crate-description",               │
│      "features": ".crate-features li"                   │
│    }                                                     │
│ 3. 直接用选择器提取数据                                  │
│ 4. 一次成功，高效准确                                    │
└─────────────────────────────────────────────────────────┘
Actionbook 工作机制
┌─────────────────────────────────────────────────────────┐
│                    Actionbook MCP                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  预计算选择器数据库                                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ lib.rs:                                          │    │
│  │   version: ".crate-version"                      │    │
│  │   features: ".crate-features li"                 │    │
│  │                                                  │    │
│  │ docs.rs:                                         │    │
│  │   signature: ".fn-signature"                     │    │
│  │   description: ".docblock"                       │    │
│  │                                                  │    │
│  │ releases.rs:                                     │    │
│  │   changelog: ".release-notes"                    │    │
│  │   features: ".language-features li"              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  MCP 接口                                                │
│  ├── search_actions(query) → 搜索匹配的站点             │
│  └── get_action_by_id(id) → 获取完整选择器              │
│                                                          │
└─────────────────────────────────────────────────────────┘
MCP 工具:

工具
参数
返回
search_actions	
query, type, limit
action IDs, 预览, 相关度
get_action_by_id	
id
URL, 选择器, 元素类型
为什么是"核心依赖"？
维度
无 Actionbook
有 Actionbook
准确性	
选择器可能失效
预计算，经过验证
效率	
解析整页 HTML
精确选择器提取
Token 消耗	
高 (传输大量 HTML)
低 (只传选择器)
可靠性	
网站改版就失败
集中维护，快速更新
可扩展性	
每个站点单独适配
统一接口，一次接入
rust-skills 依赖 Actionbook 的场景:

rust-learner
    ├── crate-researcher → actionbook: lib.rs 选择器
    ├── docs-researcher → actionbook: docs.rs 选择器
    ├── rust-changelog → actionbook: releases.rs 选择器
    └── std-docs-researcher → actionbook: doc.rust-lang.org 选择器
agent-browser 浏览器自动化
agent-browser 是执行层工具，配合 Actionbook 的选择器进行数据提取。

# 基本工作流
agent-browser open <url>           # 打开页面
agent-browser get text <selector>  # 用 actionbook 选择器提取
agent-browser close                # 关闭
核心命令:

命令
功能
open <url>	
导航到页面
snapshot -i	
获取可交互元素 (带 ref)
get text <selector>	
提取文本
click @ref	
点击元素
fill @ref "text"	
填充输入
screenshot	
截图
工具链协作
三层工具链形成完整的信息获取管道：

┌─────────────────────────────────────────────────────────┐
│                     信息获取管道                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: 路由决策 (rust-learner)                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 用户: "tokio 最新版本"                            │    │
│  │ 决策: crate 查询 → crate-researcher agent        │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  Layer 2: 选择器获取 (Actionbook MCP)                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ search_actions("lib.rs crate")                   │    │
│  │ get_action_by_id("lib.rs/crates")               │    │
│  │ 返回: { version: ".crate-version", ... }        │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  Layer 3: 数据提取 (agent-browser)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ agent-browser open lib.rs/crates/tokio          │    │
│  │ agent-browser get text ".crate-version"         │    │
│  │ 返回: "1.49.0"                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  输出: tokio 1.49.0, features, 文档链接                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
优先级 Fallback:

actionbook MCP → agent-browser CLI → WebFetch (仅备用)
     │                  │                │
     ▼                  ▼                ▼
获取预计算选择器   执行浏览器抓取    最后手段 (无选择器)
为什么这个顺序？

工具
优点
缺点
Actionbook + agent-browser
精确、高效、可靠
需要预计算选择器
WebFetch
简单、无依赖
获取整页、解析困难
小结
以上，我介绍了 rust-skills 的创作初衷、设计架构和在这个过程中所学所用的 Skill 高级技巧，希望能抛砖引玉，能激发大家对 Skills 技巧的探索热情。

最后也希望大家能共建 rust-skills，目前只是初始版本，后续完善还需要靠大家一起。

在创作 rust-skills 的过程中，我也创建了其他 skills，比较值得分享的是一个把我创建 skills 经验融合的 best-skill-creator 和 借鉴动态 Skill 的思路创作的轻量级 memory-skills，我回头分享出来。

感谢阅读。