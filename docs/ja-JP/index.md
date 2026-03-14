---
title: CCJK
---

# CCJK

CCJK は、Claude Code 向けの production-ready AI 開発環境として理解するのが現在の正しい入口です。

- 30 秒 onboarding
- 永続メモリ
- Agent Teams
- リモートコントロール
- capability discovery + presets
- production-ready defaults

## 推奨パス

```bash
# ガイド付き onboarding
npx ccjk

# CI / 自動化
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# 初期設定後の仕上げ
npx ccjk boost
npx ccjk zc --preset dev
```

## 各ステップの役割

- `npx ccjk`：初回ユーザー向けのガイド付きセットアップ
- `npx ccjk init --silent`：CI やスクリプト向けの非対話フロー
- `npx ccjk boost`：導入後に環境を最適化
- `npx ccjk zc --preset dev`：推奨権限プリセットを適用

## ここから読む

- [クイックスタート](./getting-started/index.md)
- [インストールガイド](./getting-started/installation.md)
- [CLI コマンド概要](./cli/index.md)
- [機能特性](./features/index.md)
- [上級ガイド](./advanced/index.md)

## 重要トピック

- [リモートコントロール概要](../remote-control-summary.md)
- [Agent Teams](../agent-teams.md)
- [永続メモリ](../persistence-manager.md)
- [ゼロ設定権限プリセット](../zero-config-permissions.md)

## 外部リンク

- GitHub: <https://github.com/miounet11/ccjk>
- npm: <https://www.npmjs.com/package/ccjk>
- Issues: <https://github.com/miounet11/ccjk/issues>
