<!--
  SEO Meta: CCJK - Claude Code JinKu | #1 AI 코딩 어시스턴트 | 스마트 스킬 시스템 | 11+ AI 에이전트 | 핫 리로드 | 제로 설정
  Description: CCJK 2.0은 가장 고급 AI 코딩 툴킷입니다. 핫 리로드 스마트 스킬, 11+ AI 에이전트, 지능형 컨텍스트 인식, 서브에이전트 오케스트레이션, 권한 시스템을 갖추고 있습니다. AI 지원 개발의 미래입니다.
  Keywords: claude code, ai 코딩 어시스턴트, claude code 확장, ai 개발자 도구, 코드 자동화, ai 에이전트, copilot 대체, cursor 대체, 무료 ai 코딩, 오픈소스 ai 도구
-->

<div align="center">

<!-- Logo & Badges - GitHub 소셜 미리보기 최적화 -->
<img src="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png" alt="CCJK Logo" width="180" />

# CCJK - Claude Code JinKu

### 🚀 가장 고급 AI 코딩 어시스턴트 향상 툴킷

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![GitHub stars][stars-src]][stars-href]
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/miounet11/ccjk/pulls)

**[English](README.md)** | **[简体中文](README.zh-CN.md)** | **[日本語](README.ja.md)** | **[한국어](README.ko.md)**

<br/>

## 🎉 v2.0.0 - 혁명적인 스킬 시스템! (2025년 1월)

> **🧠 지능형 스킬 아키텍처 - AI 코딩의 미래**
>
> - 🔥 **스마트 스킬 핫 리로드** - 스킬 편집, 즉시 활성화, 재시작 불필요
> - 🤖 **서브에이전트 오케스트레이션** - AI 에이전트를 통한 병렬/순차 작업 실행
> - 🛡️ **권한 시스템** - 와일드카드 패턴을 사용한 세밀한 접근 제어
> - ⚡ **라이프사이클 훅** - 완전한 제어를 위한 before/after/error 콜백
> - 🎯 **컨텍스트 인식 활성화** - 작업 기반 스킬 자동 활성화
> - 📦 **22+ 내장 스킬 템플릿** - PR 검토, 보안 감사, 리팩토링 등
>
> **⭐ GitHub에서 우리를 팔로우하여 프로젝트를 지원해주세요!**

<br/>

> 💡 **AI 코딩 경험을 강화하는 한 가지 명령**
>
> ```bash
> npx ccjk
> ```

<br/>

[📖 문서](#-빠른-시작) · [🚀 기능](#-혁명적인-기능) · [💬 커뮤니티](#-커뮤니티--지원) · [🤝 기여](#-기여)

</div>

---

## 🎯 CCJK란 무엇인가요?

**CCJK (Claude Code JinKu)**는 Claude Code를 단순한 AI 어시스턴트에서 **완전한 AI 개발 강력한 도구**로 변환합니다. 혁명적인 **스마트 스킬 시스템**, 11+ 전문 AI 에이전트, 지능형 자동화를 통해 CCJK는 더 나은 코드를 10배 빠르게 작성하도록 도와줍니다.

<table>
<tr>
<td width="25%" align="center">
<h3>🧠 스마트 스킬</h3>
<p>핫 리로드, 컨텍스트 인식, 자동 활성화</p>
</td>
<td width="25%" align="center">
<h3>🤖 11+ AI 에이전트</h3>
<p>보안, 성능, 테스팅, DevOps</p>
</td>
<td width="25%" align="center">
<h3>⚡ 제로 설정</h3>
<p>한 가지 명령. 즉시 작동.</p>
</td>
<td width="25%" align="center">
<h3>🆓 100% 무료</h3>
<p>오픈소스. MIT 라이선스.</p>
</td>
</tr>
</table>

---

## 🚀 빠른 시작

### 원클릭 설치

```bash
# 권장: 대화형 설정
npx ccjk

# 또는 전역 설치
npm install -g ccjk
```

### 🇰🇷 한국 사용자 설치

```bash
# npm 미러 사용
npm install -g ccjk --registry https://registry.npmmirror.com

# 또는 ghproxy 사용
curl -fsSL https://ghproxy.com/https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | bash
```

### 사용 시작

```bash
# 대화형 메뉴 실행
ccjk

# 또는 향상된 Claude Code 직접 시작
claude
```

---

## ✨ 혁명적인 기능

### 🧠 스마트 스킬 시스템 2.0 (신규!)

AI 코딩 어시스턴트를 위한 가장 고급 스킬 시스템:

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 CCJK 스마트 스킬 아키텍처                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   훅        │  │  서브에이전트│  │     권한 시스템         │ │
│  │   시스템    │  │  관리자      │  │                         │ │
│  │             │  │             │  │                         │ │
│  │ • before    │  │ • 병렬      │  │ • 허용/거부 규칙        │ │
│  │ • after     │  │ • 순차      │  │ • 와일드카드 패턴       │ │
│  │ • error     │  │ • 트랜스크립트│ │ • 파일/명령 제어        │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │               │
│         └────────────────┼─────────────────────┘               │
│                          │                                     │
│              ┌───────────▼───────────┐                         │
│              │   핫 리로드 엔진      │                         │
│              │                       │                         │
│              │  • 파일 감시          │                         │
│              │  • 스마트 캐싱        │                         │
│              │  • 자동 발견          │                         │
│              │  • 즉시 활성화        │                         │
│              └───────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 🔥 핫 리로드 - 스킬 편집, 즉시 효과

```yaml
# 스킬 파일을 편집하면 변경 사항이 즉시 적용됩니다!
# 재시작 필요 없음. 설정 필요 없음.

# 예: ~/.ccjk/skills/my-skill.md
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

스킬 지침을 여기에 입력하세요...
```

#### 🤖 서브에이전트 오케스트레이션

여러 AI 에이전트를 병렬 또는 순차로 실행:

```yaml
subagents:
  - name: security-scan
    model: sonnet
    task: "취약점 스캔"
  - name: performance-check
    model: haiku
    task: "성능 분석"
    depends_on: security-scan  # 순차 실행
```

#### 🛡️ 권한 시스템

세밀한 접근 제어:

```yaml
permissions:
  allow:
    - "src/**/*.ts"           # 모든 TypeScript 파일 허용
    - "!src/**/*.test.ts"     # 테스트 파일 제외
  deny:
    - ".env*"                 # 환경 파일 금지
    - "node_modules/**"       # node_modules 건너뛰기
  commands:
    allow: ["npm test", "npm run build"]
    deny: ["rm -rf", "sudo *"]
```

### 📦 22+ 내장 스킬 템플릿

| 카테고리 | 스킬 | 설명 |
|----------|--------|-------------|
| **코드 품질** | `pr-review`, `code-review`, `refactoring` | 포괄적인 코드 분석 |
| **보안** | `security-audit`, `vulnerability-scan` | OWASP, CVE 감지 |
| **성능** | `performance-profiling`, `optimization` | 속도 및 메모리 분석 |
| **문서** | `documentation-gen`, `api-docs` | 자동 문서 생성 |
| **테스팅** | `tdd-workflow`, `test-generation` | 테스트 주도 개발 |
| **DevOps** | `git-commit`, `ci-cd-setup` | 자동화 워크플로우 |
| **마이그레이션** | `migration-assistant`, `upgrade-helper` | 프레임워크 마이그레이션 |
| **계획** | `writing-plans`, `executing-plans` | 프로젝트 계획 |

### 🤖 AI 에이전트 군단

24/7 사용 가능한 개인 AI 개발 팀:

| 에이전트 | 전문 분야 | 사용 사례 |
|-------|-----------|----------|
| 🛡️ **보안 전문가** | 취약점, OWASP | "인증 코드 보안 검토" |
| ⚡ **성능 전문가** | 속도, 메모리 | "앱이 느린 이유는?" |
| 🧪 **테스팅 전문가** | 단위 테스트, 커버리지 | "이 함수에 테스트 추가" |
| 🚀 **DevOps 전문가** | CI/CD, Docker, K8s | "GitHub Actions 워크플로우 생성" |
| 📝 **코드 리뷰어** | 모범 사례 | "이 PR 검토" |
| 🏗️ **API 아키텍트** | REST, GraphQL | "사용자 관리 API 설계" |
| 💾 **데이터베이스 전문가** | 쿼리 최적화 | "이 SQL 쿼리 최적화" |
| 🎨 **프론트엔드 아키텍트** | React, Vue, A11y | "이 컴포넌트 리팩토링" |
| ⚙️ **백엔드 아키텍트** | 마이크로서비스 | "확장 가능한 백엔드 설계" |
| 📚 **문서 전문가** | API 문서, README | "이 코드베이스 문서화" |
| 🔄 **리팩토링 전문가** | 클린 코드, SOLID | "디자인 패턴 적용" |

### 🔍 ShenCha - AI 코드 감사자

완전히 자동화된 AI 코드 감사자:

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 ShenCha 감사 엔진                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣  스캔    → AI가 문제 발견 (미리 정의된 규칙 없음)      │
│  2️⃣  분석    → 컨텍스트 및 영향 이해                       │
│  3️⃣  수정    → 자동으로 수정 생성 및 적용                  │
│  4️⃣  검증    → 수정이 올바르게 작동하는지 확인             │
│                                                             │
│  ✅ 72시간 주기로 지속적으로 실행                            │
│  ✅ 포괄적인 보고서 생성                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🎤 인터뷰 주도 개발

> **"인터뷰 먼저. 사양 둘째. 코드 셋째."**

```bash
ccjk interview          # 스마트 모드 선택기
ccjk interview --quick  # 10가지 필수 질문
ccjk interview --deep   # 40+ 포괄적인 질문
```

### 🌐 13+ API 제공자

| 제공자 | 유형 | 무료 티어 |
|----------|------|:---------:|
| **Anthropic** | 공식 | - |
| **OpenRouter** | 다중 모델 | ✅ |
| **DeepSeek** | 비용 효율적 | ✅ |
| **Groq** | 빠른 추론 | ✅ |
| **Gemini** | Google AI | ✅ |
| **Ollama** | 로컬/프라이빗 | ✅ |
| 302.AI, Qwen, SiliconFlow... | 중국 제공자 | 다양함 |

---

## 📊 CCJK가 #1인 이유

| 기능 | CCJK 2.0 | Cursor | Copilot | 기타 |
|---------|:--------:|:------:|:-------:|:------:|
| **스마트 스킬** | ✅ 핫 리로드 | ❌ | ❌ | ❌ |
| **AI 에이전트** | **11+** | 2 | 1 | 0-2 |
| **서브에이전트 시스템** | ✅ | ❌ | ❌ | ❌ |
| **권한 제어** | ✅ | ❌ | ❌ | ❌ |
| **라이프사이클 훅** | ✅ | ❌ | ❌ | ❌ |
| **다중 제공자** | **13+** | 1 | 1 | 1-3 |
| **컨텍스트 인식** | ✅ | 부분 | ❌ | ❌ |
| **제로 설정** | ✅ | ❌ | ❌ | ❌ |
| **오픈소스** | ✅ | ❌ | ❌ | 다양함 |
| **무료** | ✅ | ❌ | ❌ | 다양함 |

---

## 📖 명령 참조

### 필수 명령

```bash
npx ccjk              # 대화형 설정 메뉴
ccjk setup            # 안내 온보딩
ccjk doctor           # 상태 확인
ccjk upgrade          # 모든 것 업데이트
```

### 스킬 관리

```bash
ccjk skills list                    # 모든 스킬 나열
ccjk skills create my-skill         # 새 스킬 생성
ccjk skills enable <skill>          # 스킬 활성화
ccjk skills create-batch --lang ts  # TypeScript 스킬 생성
```

### API 설정

```bash
ccjk api wizard       # 대화형 API 설정
ccjk api list         # 제공자 표시
ccjk api test         # 연결 테스트
```

---

## 🌍 다국어 지원

```bash
ccjk init --lang en      # 영어
ccjk init --lang zh-CN   # 간체 중국어
ccjk init --lang ja      # 일본어
ccjk init --lang ko      # 한국어
```

---

## 💻 플랫폼 지원

| 플랫폼 | 상태 |
|----------|:------:|
| **macOS** | ✅ Intel & Apple Silicon |
| **Linux** | ✅ 모든 배포판 |
| **Windows** | ✅ Win10/11, WSL2 |
| **Termux** | ✅ Android |

---

## 💬 커뮤니티 & 지원

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/GitHub-Discussions-333?style=for-the-badge&logo=github)](https://github.com/miounet11/ccjk/discussions)
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/ccjk)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/anthropaboratory)

</div>

---

## 🤝 기여

```bash
git clone https://github.com/miounet11/ccjk.git
cd ccjk
pnpm install
pnpm dev
```

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

---

## 📄 라이선스

MIT © [CCJK Team](https://github.com/miounet11/ccjk)

---

<div align="center">

## ⭐ GitHub에서 우리를 팔로우하세요

CCJK가 더 나은 코드 작성에 도움이 된다면 별을 주세요!

[![Star History Chart](https://api.star-history.com/svg?repos=anthropics/claude-code&type=Date)](https://star-history.com/#anthropics/claude-code&Date)

<br/>

**개발자에 의해, 개발자를 위해 만들어졌습니다 ❤️**

<br/>

### 🔍 SEO 키워드

`claude-code` `ai-코딩-어시스턴트` `claude-code-확장` `ai-개발자-도구` `claude-ai` `anthropic` `llm-코딩` `ai-에이전트` `코드-자동화` `스마트-스킬` `핫-리로드` `서브에이전트` `devops-ai` `보안-감사` `성능-최적화` `typescript` `python` `javascript` `react` `vue` `nodejs` `docker` `kubernetes` `github-actions` `ci-cd` `코드-품질` `모범-사례` `클린-코드` `copilot-대체` `cursor-대체` `windsurf-대체` `무료-ai-코딩` `오픈소스-ai` `vscode-확장` `코드-리뷰-ai` `ai-페어-프로그래밍` `지능형-코딩` `개발자-생산성` `코딩-어시스턴트` `ai-도구-2025`

</div>

<!-- 배지 링크 -->
[npm-version-src]: https://img.shields.io/npm/v/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/ccjk
[npm-downloads-src]: https://img.shields.io/npm/dm/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/ccjk
[license-src]: https://img.shields.io/github/license/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/miounet11/ccjk/blob/main/LICENSE
[stars-src]: https://img.shields.io/github/stars/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[stars-href]: https://github.com/miounet11/ccjk/stargazers
