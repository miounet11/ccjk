---
title: クイックスタート
---

# クイックスタート

ここでは、現在の CCJK の標準 onboarding パスを簡潔に示します。

## 推奨順序

1. まず `npx ccjk` を実行してガイド付き onboarding を進める。
2. CI やスクリプトでは `npx ccjk init --silent` を使う。
3. セットアップ後に `npx ccjk boost` を実行する。
4. `npx ccjk zc --preset dev` で推奨権限プリセットを適用する。
5. リモート操作が必要な場合だけ `npx ccjk remote setup` を追加する。

## この順序を推奨する理由

- 現在の README と npm のストーリーに合っている。
- `npx ccjk` を初回ユーザーの主入口として維持できる。
- `init --silent` を自動化向けの位置づけに限定できる。
- capability discovery と権限プリセットを早い段階で見せられる。

## 続きを読む

- [インストールガイド](installation.md)
- [CLI コマンド概要](../cli/index.md)
- [機能特性](../features/index.md)
