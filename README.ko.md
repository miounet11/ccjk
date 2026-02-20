<div align="center">

# CCJK

### Claude Code 파워업 도구

30-50% 토큰 절감 · 제로 설정 · 원커맨드

<br/>

<!-- TODO: 실제 데모 GIF로 교체 -->
<img src="https://raw.githubusercontent.com/miounet11/ccjk/main/assets/demo.gif" alt="CCJK 데모" width="600" />

<br/>

```bash
npx ccjk
```

<br/>

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)

[English](./README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md)

</div>

---

## CCJK란?

CCJK는 [Claude Code](https://github.com/anthropics/claude-code)를 강화합니다:

- **🧠 영구 메모리** — AI가 세션 간 코드베이스를 기억
- **⚡ 30-50% 토큰 절감** — 스마트 컨텍스트 압축
- **🔧 제로 설정** — 프로젝트 타입 자동 감지, 원커맨드 설정
- **☁️ 클라우드 동기화** — 디바이스 및 팀 간 설정 공유

## 빠른 시작

```bash
# 프로젝트 디렉토리에서 실행
npx ccjk

# 완료. Claude Code가 파워업되었습니다.
```

## 왜 CCJK?

| CCJK 없이 | CCJK 사용 |
|:----------|:----------|
| 매번 프로젝트 컨텍스트 반복 | AI가 모든 것을 기억 |
| 60분 이상 수동 설정 | 30초, 원커맨드 |
| 높은 토큰 비용 | 30-50% 절감 |
| 단일 디바이스 설정 | 모든 디바이스에서 클라우드 동기화 |

## 주요 기능

<details>
<summary><b>🧠 스마트 스킬 시스템</b></summary>

워크플로우에 따라 자동 활성화:
- 코드 리뷰 — 프로덕션 전 버그 캐치
- 보안 감사 — OWASP Top 10 스캔
- 성능 분석 — 병목 현상 식별
- 문서 생성 — 코드에서 자동 생성

</details>

<details>
<summary><b>☁️ 클라우드 동기화</b></summary>

어디서나 설정 동기화:
- GitHub Gist (무료)
- WebDAV (셀프 호스팅)
- S3 (엔터프라이즈)

```bash
npx ccjk cloud enable --provider github-gist
```

</details>

<details>
<summary><b>🔌 에코시스템 통합</b></summary>

하나의 툴킷, 통합된 경험:
- **CCR** — 멀티 프로바이더 라우팅
- **CCUsage** — 사용량 분석
- **MCP 마켓** — 플러그인 마켓플레이스

</details>

## 명령어

```bash
npx ccjk           # 인터랙티브 설정
npx ccjk i         # 전체 초기화
npx ccjk u         # 워크플로우 업데이트
npx ccjk sync      # 클라우드 동기화
npx ccjk doctor    # 상태 점검
```

## 문서

전체 문서는 [docs/README.md](./docs/README.md)를 참조하세요.

## 커뮤니티

- [Telegram](https://t.me/ccjk_community) — 채팅
- [Issues](https://github.com/miounet11/ccjk/issues) — 버그 신고 & 기능 요청

## 라이선스

MIT © [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)

---

<div align="center">

**CCJK가 도움이 되었다면, ⭐를 눌러주세요**

</div>
