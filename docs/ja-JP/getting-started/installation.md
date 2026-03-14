---
title: インストールガイド
---

# インストールガイド

このページは、GitHub、npm、ドキュメントサイトで統一したい現在の onboarding パスを説明します。

## 環境要件

開始前に確認してください。

| 要件        | 最低バージョン | 推奨バージョン | 説明                                         |
| ----------- | -------------- | -------------- | -------------------------------------------- |
| **Node.js** | 20.x           | 20.x 以上      | 公開パッケージの要件に合わせる               |
| **npm**     | Node.js に同梱 | 最新版         | `npx` が必要                                 |
| **OS**      | -              | -              | macOS、Linux、Windows PowerShell/WSL、Termux |

必要なら環境確認を行います。

```bash
node --version
npm --version
npx --version
```

Node.js が 20 未満なら先に更新してください。

## 現在の標準パス

CCJK には明確に 2 つの入口があります。

- `npx ccjk`：ガイド付き onboarding
- `npx ccjk init --silent`：CI、スクリプト、自動化

### ガイド付き onboarding

手動で環境を整える場合は、まずこれを使います。

```bash
npx ccjk
```

目的は、すべてのメニュー項目を覚えることではなく、短時間で使える状態まで持っていくことです。

初回実行後の推奨フォローアップ：

```bash
npx ccjk boost
npx ccjk zc --preset dev
```

この順序が現在のドキュメント主線です。

- 先に onboarding
- 次に最適化
- 最後に権限プリセット

### 非対話セットアップ

再現可能な自動化フローが必要な場合はこれを使います。

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent
```

重要な点：

- `ANTHROPIC_API_KEY` が必要です。
- CCJK は smart defaults を自動適用します。
- これは初回ユーザー向けではなく、自動化向けの入口です。

## インストール後に推奨するコマンド

```bash
npx ccjk boost
npx ccjk zc --preset dev
npx ccjk doctor
```

用途：

- `boost`：セットアップ後の環境最適化
- `zc --preset dev`：推奨権限プリセットの適用
- `doctor`：問題がある場合の診断

## 任意で追加する機能

```bash
npx ccjk remote setup
npx ccjk mcp list
npx ccjk agent-teams --on
```

- `remote setup`：ブラウザやモバイルからのリモート操作
- `mcp list`：MCP サービスの確認
- `agent-teams --on`：並列エージェント実行の有効化

## 古いドキュメントを書き換えるときの対応表

| 古い表現                             | 現在の表現                                       |
| ------------------------------------ | ------------------------------------------------ |
| `npx ccjk init` が初心者向けの主入口 | `npx ccjk` が初心者向けの主入口                  |
| API プロバイダープリセット中心の説明 | guided onboarding を先に、silent init を後に説明 |
| 権限設定が後ろに埋もれている         | `npx ccjk zc --preset <id>` を早く見せる         |
| リモートコントロールが別世界の機能   | 主要機能セットの一部として扱う                   |

## 次に読むもの

- [クイックスタート](./index.md)
- [CLI コマンド概要](../cli/index.md)
- [リモートコントロール概要](../../remote-control-summary.md)
