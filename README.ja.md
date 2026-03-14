<div align="center">

# CCJK

### Claude Code・Codex・現代的な AI コーディングワークフロー向けの production-ready AI 開発環境

**30 秒 onboarding · 永続メモリ · Agent Teams · リモートコントロール**

```bash
npx ccjk
```

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)

[English](./README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md)

</div>

---

## CCJK の現在の主張

- **30 秒 onboarding**：Claude Code、Codex、MCP、ブラウザ自動化をすばやく利用可能にする
- **永続メモリ**：セッションをまたいでプロジェクト文脈を保持する
- **Agent Teams**：大きな作業を並列で進められる
- **リモートコントロール**：ブラウザやモバイルから接続できる
- **Capability Discovery + Presets**：推奨能力と権限プリセットを見つけやすい

## 推奨パス

```bash
# ガイド付きセットアップ
npx ccjk

# CI / 自動化
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# 導入後の最適化
npx ccjk boost
npx ccjk zc --preset dev
```

任意の次ステップ：

```bash
npx ccjk remote setup
npx ccjk doctor
npx ccjk mcp list
```

## ドキュメント

- メイン README: [README.md](./README.md)
- ドキュメントハブ: [docs/README.md](./docs/README.md)
- 日本語ドキュメント入口: [docs/ja-JP/index.md](./docs/ja-JP/index.md)

## コミュニティ

- [Telegram](https://t.me/ccjk_community)
- [GitHub Issues](https://github.com/miounet11/ccjk/issues)

## ライセンス

MIT © [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)
