<!--
  SEO Meta: CCJK - Claude Code JinKu | #1 AI コーディングアシスタント | スマートスキルシステム | 11+ AI エージェント | ホットリロード | ゼロコンフィグ
  Description: CCJK 2.0 は最も高度な AI コーディングツールキットです。ホットリロード機能を備えたスマートスキル、11+ の AI エージェント、インテリジェントなコンテキスト認識、サブエージェント オーケストレーション、権限システムを搭載しています。AI 支援開発の未来です。
  Keywords: claude code, ai コーディングアシスタント, claude code 拡張機能, ai 開発者ツール, コード自動化,
  ai エージェント, copilot 代替, cursor 代替, 無料 ai コーディング, オープンソース ai ツール
-->

<div align="center">

<!-- Logo & Badges - Optimized for GitHub Social Preview -->
<img src="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png" alt="CCJK Logo" width="180" />

# CCJK - Claude Code JinKu

### 🚀 最も高度な AI コーディングアシスタント拡張ツールキット

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![GitHub stars][stars-src]][stars-href]
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/miounet11/ccjk/pulls)

**[English](README.md)** | **[简体中文](README.zh-CN.md)** | **[日本語](README.ja.md)** | **[한국어](README.ko.md)**

<br/>

## 🎉 v2.0.0 - 革新的なスキルシステム！(2025年1月)

> **🧠 インテリジェントスキルアーキテクチャ - AI コーディングの未来**
>
> - 🔥 **スマートスキルホットリロード** - スキルを編集して即座に有効化、再起動不要
> - 🤖 **サブエージェント オーケストレーション** - AI エージェントによる並列/順序実行
> - 🛡️ **権限システム** - ワイルドカードパターンを使用した細粒度アクセス制御
> - ⚡ **ライフサイクルフック** - before/after/error コールバックで完全制御
> - 🎯 **コンテキスト認識の自動有効化** - 作業内容に基づいてスキルが自動的に有効化
> - 📦 **22+ 組み込みスキルテンプレート** - PR レビュー、セキュリティ監査、リファクタリングなど
>
> **⭐ GitHub でスターをお願いします！**

<br/>

> 💡 **AI コーディング体験をスーパーチャージする 1 つのコマンド**
>
> ```bash
> npx ccjk
> ```

<br/>

[📖 ドキュメント](#-クイックスタート) · [🚀 機能](#-革新的な機能) · [💬 コミュニティ](#-コミュニティとサポート) · [🤝 貢献](#-貢献)

</div>

---

## 🎯 CCJK とは？

**CCJK (Claude Code JinKu)** は Claude Code をシンプルな AI アシスタントから**完全な AI 開発パワーハウス**に変換します。革新的な**スマートスキルシステム**、11+ の専門 AI エージェント、インテリジェント自動化により、CCJK はあなたが 10 倍高速でより良いコードを書くのを支援します。

<table>
<tr>
<td width="25%" align="center">
<h3>🧠 スマートスキル</h3>
<p>ホットリロード、コンテキスト認識、自動有効化</p>
</td>
<td width="25%" align="center">
<h3>🤖 11+ AI エージェント</h3>
<p>セキュリティ、パフォーマンス、テスト、DevOps</p>
</td>
<td width="25%" align="center">
<h3>⚡ ゼロコンフィグ</h3>
<p>1 つのコマンド。すぐに動作。</p>
</td>
<td width="25%" align="center">
<h3>🆓 100% 無料</h3>
<p>オープンソース。MIT ライセンス。</p>
</td>
</tr>
</table>

---

## 🚀 クイックスタート

### ワンクリックインストール

```bash
# 推奨: インタラクティブセットアップ
npx ccjk

# またはグローバルにインストール
npm install -g ccjk
```

### 🇯🇵 日本ユーザー向けインストール

```bash
# npm レジストリを使用
npm install -g ccjk

# または GitHub から直接インストール
curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | bash
```

### 使用開始

```bash
# インタラクティブメニューを実行
ccjk

# または拡張機能付きで Claude Code を直接起動
claude
```

---

## ✨ 革新的な機能

### 🧠 スマートスキルシステム 2.0 (新機能!)

AI コーディングアシスタント向けの最も高度なスキルシステム:

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 CCJK スマートスキルアーキテクチャ                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   フック    │  │  サブエージェント│  │     権限システム        │ │
│  │   システム  │  │   マネージャー  │  │                       │ │
│  │             │  │             │  │                         │ │
│  │ • before    │  │ • 並列実行  │  │ • 許可/拒否ルール      │ │
│  │ • after     │  │ • 順序実行  │  │ • ワイルドカードパターン│ │
│  │ • error     │  │ • トランスクリプト│ • ファイル/コマンド制御│ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │               │
│         └────────────────┼─────────────────────┘               │
│                          │                                     │
│              ┌───────────▼───────────┐                         │
│              │   ホットリロードエンジン   │                         │
│              │                       │                         │
│              │  • ファイル監視        │                         │
│              │  • スマートキャッシング  │                         │
│              │  • 自動検出           │                         │
│              │  • 即座に有効化       │                         │
│              └───────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 🔥 ホットリロード - スキルを編集して即座に反映

```yaml
# スキルファイルを編集すると、変更が即座に適用されます！
# 再起動は不要です。設定も不要です。

# 例: ~/.ccjk/skills/my-skill.md
---
name: my-custom-skill
trigger: /my-skill
auto_activate:
  file_patterns: ["*.ts", "*.tsx"]
  keywords: ["refactor", "optimize"]
hooks:
  before: validate-context
  after: generate-report
---

スキルの説明をここに記入...
```

#### 🤖 サブエージェント オーケストレーション

複数の AI エージェントを並列または順序で実行:

```yaml
subagents:
  - name: security-scan
    model: sonnet
    task: "脆弱性をスキャン"
  - name: performance-check
    model: haiku
    task: "パフォーマンスを分析"
    depends_on: security-scan  # 順序実行
```

#### 🛡️ 権限システム

細粒度アクセス制御:

```yaml
permissions:
  allow:
    - "src/**/*.ts"           # すべての TypeScript ファイルを許可
    - "!src/**/*.test.ts"     # テストファイルを除外
  deny:
    - ".env*"                 # env ファイルには触らない
    - "node_modules/**"       # node_modules をスキップ
  commands:
    allow: ["npm test", "npm run build"]
    deny: ["rm -rf", "sudo *"]
```

### 📦 22+ 組み込みスキルテンプレート

| カテゴリ | スキル | 説明 |
|----------|--------|-------------|
| **コード品質** | `pr-review`, `code-review`, `refactoring` | 包括的なコード分析 |
| **セキュリティ** | `security-audit`, `vulnerability-scan` | OWASP、CVE 検出 |
| **パフォーマンス** | `performance-profiling`, `optimization` | 速度とメモリ分析 |
| **ドキュメント** | `documentation-gen`, `api-docs` | 自動ドキュメント生成 |
| **テスト** | `tdd-workflow`, `test-generation` | テスト駆動開発 |
| **DevOps** | `git-commit`, `ci-cd-setup` | 自動化ワークフロー |
| **マイグレーション** | `migration-assistant`, `upgrade-helper` | フレームワークマイグレーション |
| **計画** | `writing-plans`, `executing-plans` | プロジェクト計画 |

### 🤖 AI エージェント軍団

24/7 利用可能な個人用 AI 開発チーム:

| エージェント | 専門分野 | 使用例 |
|-------|-----------|----------|
| 🛡️ **セキュリティエキスパート** | 脆弱性、OWASP | "認証コードをセキュリティレビュー" |
| ⚡ **パフォーマンスエキスパート** | 速度、メモリ | "アプリが遅い理由は？" |
| 🧪 **テストスペシャリスト** | ユニットテスト、カバレッジ | "この関数にテストを追加" |
| 🚀 **DevOps エキスパート** | CI/CD、Docker、K8s | "GitHub Actions ワークフローを作成" |
| 📝 **コードレビュアー** | ベストプラクティス | "このPRをレビュー" |
| 🏗️ **API アーキテクト** | REST、GraphQL | "ユーザー管理 API を設計" |
| 💾 **データベースエキスパート** | クエリ最適化 | "この SQL クエリを最適化" |
| 🎨 **フロントエンドアーキテクト** | React、Vue、A11y | "このコンポーネントをリファクタリング" |
| ⚙️ **バックエンドアーキテクト** | マイクロサービス | "スケーラブルなバックエンドを設計" |
| 📚 **ドキュメントエキスパート** | API ドキュメント、README | "このコードベースをドキュメント化" |
| 🔄 **リファクタリングエキスパート** | クリーンコード、SOLID | "デザインパターンを適用" |

### 🔍 ShenCha - AI コード監査ツール

完全自動 AI コード監査ツール:

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 ShenCha 監査エンジン                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣  スキャン    → AI が問題を発見（事前定義ルールなし）   │
│  2️⃣  分析       → コンテキストと影響を理解                │
│  3️⃣  修正       → 修正を自動生成・適用                   │
│  4️⃣  検証       → 修正が正しく機能することを確認         │
│                                                             │
│  ✅ 72 時間サイクルで継続実行                               │
│  ✅ 包括的なレポートを生成                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🎤 インタビュー駆動開発

> **"インタビュー第一。仕様書第二。コード第三。"**

```bash
ccjk interview          # スマートモード選択
ccjk interview --quick  # 10 の重要な質問
ccjk interview --deep   # 40+ の包括的な質問
```

### 🌐 13+ API プロバイダー

| プロバイダー | タイプ | 無料枠 |
|----------|------|:---------:|
| **Anthropic** | 公式 | - |
| **OpenRouter** | マルチモデル | ✅ |
| **DeepSeek** | コスト効率的 | ✅ |
| **Groq** | 高速推論 | ✅ |
| **Gemini** | Google AI | ✅ |
| **Ollama** | ローカル/プライベート | ✅ |
| 302.AI、Qwen、SiliconFlow... | 中国プロバイダー | 異なる |

---

## 📖 コマンドリファレンス

### 必須コマンド

```bash
npx ccjk              # インタラクティブセットアップメニュー
ccjk setup            # ガイド付きオンボーディング
ccjk doctor           # ヘルスチェック
ccjk upgrade          # すべてをアップデート
```

### スキル管理

```bash
ccjk skills list                    # すべてのスキルをリスト表示
ccjk skills create my-skill         # 新しいスキルを作成
ccjk skills enable <skill>          # スキルを有効化
ccjk skills create-batch --lang ts  # TypeScript スキルを作成
```

### API 設定

```bash
ccjk api wizard       # インタラクティブ API セットアップ
ccjk api list         # プロバイダーを表示
ccjk api test         # 接続をテスト
```

---

## 🌍 多言語サポート

```bash
ccjk init --lang en      # 英語
ccjk init --lang zh-CN   # 簡体字中国語
ccjk init --lang ja      # 日本語
ccjk init --lang ko      # 韓国語
```

---

## 💻 プラットフォームサポート

| プラットフォーム | ステータス |
|----------|:------:|
| **macOS** | ✅ Intel & Apple Silicon |
| **Linux** | ✅ すべてのディストロ |
| **Windows** | ✅ Win10/11、WSL2 |
| **Termux** | ✅ Android |

---

## 📊 CCJK が #1 である理由

| 機能 | CCJK 2.0 | Cursor | Copilot | その他 |
|---------|:--------:|:------:|:-------:|:------:|
| **スマートスキル** | ✅ ホットリロード | ❌ | ❌ | ❌ |
| **AI エージェント** | **11+** | 2 | 1 | 0-2 |
| **サブエージェントシステム** | ✅ | ❌ | ❌ | ❌ |
| **権限制御** | ✅ | ❌ | ❌ | ❌ |
| **ライフサイクルフック** | ✅ | ❌ | ❌ | ❌ |
| **マルチプロバイダー** | **13+** | 1 | 1 | 1-3 |
| **コンテキスト認識** | ✅ | 部分的 | ❌ | ❌ |
| **ゼロコンフィグ** | ✅ | ❌ | ❌ | ❌ |
| **オープンソース** | ✅ | ❌ | ❌ | 異なる |
| **無料** | ✅ | ❌ | ❌ | 異なる |

---

## 💬 コミュニティとサポート

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/GitHub-Discussions-333?style=for-the-badge&logo=github)](https://github.com/miounet11/ccjk/discussions)
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/ccjk)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/anthropaboratory)

</div>

---

## 🤝 貢献

```bash
git clone https://github.com/miounet11/ccjk.git
cd ccjk
pnpm install
pnpm dev
```

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

---

## 📄 ライセンス

MIT © [CCJK Team](https://github.com/miounet11/ccjk)

---

<div align="center">

## ⭐ GitHub でスターをお願いします

CCJK があなたのコーディングを改善するのに役立つ場合は、スターをお願いします！

[![Star History Chart](https://api.star-history.com/svg?repos=anthropics/claude-code&type=Date)](https://star-history.com/#anthropics/claude-code&Date)

<br/>

**開発者による、開発者のための、愛を込めて作成**

<br/>

### 🔍 SEO キーワード

`claude-code` `ai-コーディングアシスタント` `claude-code-拡張機能` `ai-開発者ツール` `claude-ai` `anthropic` `llm-コーディング` `ai-エージェント` `コード自動化` `スマートスキル` `ホットリロード` `サブエージェント` `devops-ai` `セキュリティ監査` `パフォーマンス最適化` `typescript` `python` `javascript` `react` `vue` `nodejs` `docker` `kubernetes` `github-actions` `ci-cd` `コード品質` `ベストプラクティス` `クリーンコード` `copilot-代替` `cursor-代替` `windsurf-代替` `無料-ai-コーディング` `オープンソース-ai` `vscode-拡張機能` `コードレビュー-ai` `ai-ペアプログラミング` `インテリジェント-コーディング` `開発者生産性` `コーディングアシスタント` `ai-ツール-2025`

</div>

<!-- Badge Links -->
[npm-version-src]: https://img.shields.io/npm/v/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/ccjk
[npm-downloads-src]: https://img.shields.io/npm/dm/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/ccjk
[license-src]: https://img.shields.io/github/license/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/miounet11/ccjk/blob/main/LICENSE
[stars-src]: https://img.shields.io/github/stars/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[stars-href]: https://github.com/miounet11/ccjk/stargazers
