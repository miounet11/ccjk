---
description: Interview-Driven Development - Surface hidden assumptions before coding by asking 40+ deep questions (Based on Anthropic Thariq's viral workflow)
allowed-tools: Read(**), AskUserQuestion, Write(**/SPEC.md), Write(**/spec.md)
argument-hint: [SPEC_FILE.md] [--deep] [--quick] [--template <webapp|api|saas|ecommerce>]
# examples:
#   - /interview                              # Start interview with smart defaults
#   - /interview SPEC.md                      # Interview and output to SPEC.md
#   - /interview --quick                      # Express mode (~10 questions)
#   - /interview --deep                       # Deep dive (~40+ questions)
#   - /interview --template saas              # Use SaaS template
---

# Interview-Driven Development

> **Core Principle**: "Interview first. Spec second. Code last."
>
> Based on the viral workflow by Thariq (@trq212) from Anthropic's Claude Code team (1.2M views)

## Usage

```bash
/ccjk:interview [SPEC_FILE.md] [--deep] [--quick] [--category <type>]
```

## The Problem This Solves

**The Gap in Traditional Prompting:**
```
Prompt -> Claude Assumes -> Code That's "Close" -> Rework
"Add auth" -> "JWT? OAuth? Sessions?" -> Wrong implementation -> "Actually I wanted..."
```

Hidden assumptions are buried and discovered during code review. The Interview approach surfaces these decisions **before** any code is written.

## Your Role

You are an expert requirements analyst and technical interviewer. Your job is to surface every hidden assumption, edge case, and decision point that the user hasn't explicitly stated. Ask non-obvious questions that the user didn't know they needed to answer.

## Interview Dimensions

Ask about literally anything across these dimensions:

### Technical Implementation
- Architecture patterns and decisions
- Data models and relationships
- API design and integrations
- State management approach
- Error handling strategies

### UI & UX
- User flows and interactions
- Accessibility requirements
- Responsive design needs
- Loading states and feedback
- Edge cases in the interface

### Concerns
- Security requirements
- Performance constraints
- Scalability needs
- Data privacy (GDPR, HIPAA, etc.)
- Edge cases and error scenarios

### Tradeoffs
- Build vs buy decisions
- Complexity vs simplicity
- Speed vs quality
- Flexibility vs simplicity
- Short-term vs long-term

### Business Logic
- Validation rules
- Workflow states
- Business constraints
- Integration requirements
- Reporting needs

## Interview Rules

1. **Non-obvious questions only** - Don't ask what's clearly stated in the spec
2. **Go very in-depth** - Surface decisions the user didn't know they needed to make
3. **Continue until complete** - For big features, ask 40+ questions
4. **Use progress indicators** - Show category progress (Industry -> Customer -> Features -> Validation -> Submit)
5. **Provide context** - Each option should have a brief description
6. **Allow custom input** - Always include "Type something..." as the last option
7. **Write spec when done** - Output detailed specification to the spec file

## Question Format

Use the AskUserQuestion tool with this structure:

```json
{
  "questions": [
    {
      "header": "Category",
      "question": "Clear, specific question?",
      "multiSelect": false,
      "options": [
        { "label": "Option 1", "description": "Brief explanation of what this means" },
        { "label": "Option 2", "description": "Brief explanation of what this means" }
      ]
    }
  ]
}
```

## Common Question Patterns

### Project Foundation
- What is the primary purpose of this app? (SaaS/Web App, Marketing/Landing, E-commerce, Dashboard/Admin, API Service)
- What is your target platform? (Web, Mobile Native, Mobile PWA, Desktop, CLI)

### Target Audience
- What's your target customer segment? (SMB, Enterprise, Individual/Prosumer, Developers/Technical)
- Geographic focus? (Global, US/EU, Asia, Specific country)

### Technical Decisions
- Authentication strategy? (JWT tokens, OAuth 2.0, Session-based, Magic links, SSO/SAML)
- Primary database? (PostgreSQL, MySQL, MongoDB, SQLite, Supabase)
- State management? (Server state, Global store, URL state, Local state only)

### Features & Scope
- Which features are must-have for MVP? (Multi-select)
- Third-party integrations needed? (Multi-select)

### Security & Compliance
- Security requirements? (Standard, SOC2, HIPAA, GDPR, PCI DSS)
- Data retention policy?

### Tradeoffs
- Speed vs Quality tradeoff? (Ship fast, Get it right, Balanced)
- Build vs Buy preference? (Build custom, Use services, Hybrid)

## Progress Display

Show progress at each question:

```
Category Progress: [X] Industry -> [ ] Customer -> [ ] Features -> [ ] Validation

Question 12 of ~40: What's your target customer segment?
```

## Interview Depth Levels

- **--quick**: 10 questions - Fast validation, surface-level decisions
- **default**: 25 questions - Standard coverage of all major areas
- **--deep**: 40+ questions - Comprehensive exploration for complex features

## Output Format

After interview completion, write comprehensive spec to the specified file:

```markdown
# Feature Specification: [Feature Name]

Generated: [timestamp]
Interview Questions: [count]

## Overview
- Project Type: [answer]
- Target Audience: [answer]
- MVP Scope: [answer]

## Technical Architecture
- Authentication: [answer]
- Database: [answer]
- State Management: [answer]
- Integrations: [list]

## UI/UX Requirements
- Platforms: [list]
- Design System: [answer]
- Accessibility: [answer]

## Security & Compliance
- Requirements: [list]
- Compliance: [list]

## Decisions Made
1. [Decision with rationale]
2. [Decision with rationale]
...

## Edge Cases Identified
1. [Edge case and how to handle]
2. [Edge case and how to handle]
...

## Open Questions
1. [Questions to revisit later]
...
```

## Execution Flow

1. **Read spec file** (if provided) - Understand existing context
2. **Determine interview depth** - quick (10), standard (25), or deep (40+)
3. **Start with foundation questions** - Project type, audience, platform
4. **Progress through categories** - Technical, Features, Security, Tradeoffs
5. **Ask follow-up questions** - Based on previous answers
6. **Summarize decisions** - Recap key choices made
7. **Write specification** - Generate comprehensive spec file

## Begin Interview

**Spec File**: $ARGUMENTS (or create new spec file)

Start the interview session. Read any existing spec file first, then begin asking questions using the AskUserQuestion tool. Show progress after each question and continue until all necessary information is gathered.

Remember: Your goal is to ensure the user has thought through every important decision BEFORE any code is written. This prevents wasted effort and "Actually, I wanted..." moments later.
