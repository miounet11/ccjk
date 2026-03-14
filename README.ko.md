<div align="center">

# CCJK

### Claude Code, Codex, 그리고 현대적인 AI 코딩 워크플로우를 위한 production-ready AI 개발 환경

**30초 onboarding · 영구 메모리 · Agent Teams · 원격 제어**

```bash
npx ccjk
```

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)

[English](./README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md)

</div>

---

## CCJK의 현재 핵심 메시지

- **30초 onboarding**: Claude Code, Codex, MCP, 브라우저 자동화를 빠르게 usable 상태로 만든다
- **영구 메모리**: 세션 사이에서도 프로젝트 문맥을 유지한다
- **Agent Teams**: 큰 작업을 병렬로 진행할 수 있다
- **원격 제어**: 브라우저와 모바일에서 세션에 접속할 수 있다
- **Capability Discovery + Presets**: 추천 기능과 권한 프리셋을 쉽게 적용할 수 있다

## 권장 경로

```bash
# 가이드형 설정
npx ccjk

# CI / 자동화
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# 설치 후 정리
npx ccjk boost
npx ccjk zc --preset dev
```

선택적 다음 단계:

```bash
npx ccjk remote setup
npx ccjk doctor
npx ccjk mcp list
```

## 문서

- 메인 README: [README.md](./README.md)
- 문서 허브: [docs/README.md](./docs/README.md)
- 일본어 문서 시작점: [docs/ja-JP/index.md](./docs/ja-JP/index.md)

## 커뮤니티

- [Telegram](https://t.me/ccjk_community)
- [GitHub Issues](https://github.com/miounet11/ccjk/issues)

## 라이선스

MIT © [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)
