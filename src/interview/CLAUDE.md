# Interview Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../) › **interview**

**Last Updated**: 2026-03-04

---

## 📦 Module Overview

The Interview module provides an interactive question-and-answer system for gathering user configuration preferences. It creates a conversational flow for complex setup processes.

## 🎯 Core Responsibilities

- **Interactive Prompts**: Present questions to users in a structured flow
- **Input Validation**: Validate user responses in real-time
- **Conditional Logic**: Show/hide questions based on previous answers
- **Progress Tracking**: Display progress through multi-step interviews
- **Response Storage**: Collect and structure user responses

## 📁 Module Structure

```
src/interview/
├── index.ts              # Interview orchestrator
└── (question definitions and flow logic)
```

## 🔗 Dependencies

### Internal Dependencies
- `src/i18n` - Internationalized question text
- `src/utils` - Input validation utilities

### External Dependencies
- `inquirer` or similar prompt library
- Terminal interaction utilities

## 🚀 Key Interfaces

```typescript
interface Interview {
  start(): Promise<InterviewResult>
  addQuestion(question: Question): void
  validate(answer: any): boolean
}

interface Question {
  id: string
  type: 'text' | 'select' | 'multiselect' | 'confirm'
  message: string
  validate?: (answer: any) => boolean | string
  when?: (answers: Record<string, any>) => boolean
}

interface InterviewResult {
  answers: Record<string, any>
  completed: boolean
}
```

## 📊 Performance Metrics

- **Response Time**: Instant feedback on validation
- **User Experience**: Clear, concise questions

## 🧪 Testing

Test files: None yet (needs coverage)

### Test Strategy
- Unit tests for question validation logic
- Integration tests for interview flows
- Mock terminal input for automated testing
- Edge case testing for conditional questions

## 📝 Usage Example

```typescript
import { Interview } from '@/interview'

const interview = new Interview()

interview.addQuestion({
  id: 'apiProvider',
  type: 'select',
  message: 'Select your API provider',
  choices: ['OpenAI', 'Anthropic', 'Custom']
})

const result = await interview.start()
console.log(result.answers)
```

## 🚧 Future Enhancements

- [ ] Add question templates for common scenarios
- [ ] Implement interview state persistence
- [ ] Add support for async validation
- [ ] Create visual progress indicators

---

**📊 Coverage**: Low (needs tests)
**🎯 Priority**: Low
**🔄 Status**: Stable
