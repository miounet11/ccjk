---
title: CLI コマンド概要
---

# CLI コマンド概要

CCJK CLI は `npx ccjk <command>` で利用できます。現在優先して見せるべきコマンドは次のとおりです。

- `ccjk`：ガイド付き onboarding とインタラクティブメニュー
- `ccjk init --silent`：CI / スクリプト向け非対話セットアップ
- `ccjk boost`：導入後のワンクリック最適化
- `ccjk zc --preset <id>`：ゼロ設定権限プリセットの適用
- `ccjk remote setup`：リモートコントロール設定
- `ccjk doctor`：環境診断
- `ccjk mcp list`：MCP サービス確認
- `ccjk agent-teams --on`：Agent Teams の有効化
- `ccjk memory`：永続メモリ管理
- `ccjk update`：ワークフローとテンプレートの更新

推奨デフォルトパス：

```bash
npx ccjk
npx ccjk boost
npx ccjk zc --preset dev
```

`init --silent` は自動化が必要な場合にのみ使います。
