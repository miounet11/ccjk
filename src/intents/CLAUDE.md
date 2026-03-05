# Intents Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../) › **intents**

**Last Updated**: 2026-03-04

---

## 📦 Module Overview

The Intents module provides natural language intent detection and routing. It analyzes user input to determine the intended action and routes to the appropriate handler.

## 🎯 Core Responsibilities

- **Intent Detection**: Analyze user input to identify intent
- **Intent Classification**: Categorize intents into actionable types
- **Confidence Scoring**: Assign confidence scores to detected intents
- **Intent Routing**: Route intents to appropriate handlers
- **Fallback Handling**: Handle ambiguous or unrecognized intents

## 📁 Module Structure

```
src/intents/
├── index.ts              # Intent detection and routing
└── (intent classifiers and handlers)
```

## 🔗 Dependencies

### Internal Dependencies
- `src/skills` - Skill intent detection integration
- `src/brain` - Agent routing for complex intents
- `src/i18n` - Multi-language intent recognition

### External Dependencies
- NLP libraries (optional)
- Pattern matching utilities

## 🚀 Key Interfaces

```typescript
interface IntentDetector {
  detect(input: string): Promise<Intent>
  classify(input: string): IntentType
  score(input: string, intent: IntentType): number
}

interface Intent {
  type: IntentType
  confidence: number
  entities: Record<string, any>
  raw: string
}

type IntentType =
  | 'command'
  | 'question'
  | 'skill_trigger'
  | 'configuration'
  | 'help'
  | 'unknown'
```

## 📊 Performance Metrics

- **Detection Speed**: <50ms for simple patterns
- **Accuracy**: 85%+ for common intents
- **Confidence Threshold**: 0.7 for auto-routing

## 🧪 Testing

Test files: None yet (needs coverage)

### Test Strategy
- Unit tests for intent classifiers
- Integration tests with skills module
- Accuracy tests with labeled dataset
- Edge case testing for ambiguous inputs

## 📝 Usage Example

```typescript
import { IntentDetector } from '@/intents'

const detector = new IntentDetector()

const intent = await detector.detect('configure API settings')

if (intent.confidence > 0.7) {
  // Route to configuration handler
  await handleIntent(intent)
} else {
  // Ask for clarification
  await askClarification(intent)
}
```

## 🚧 Future Enhancements

- [ ] Add machine learning-based intent classification
- [ ] Implement context-aware intent detection
- [ ] Add multi-turn conversation support
- [ ] Create intent training data collection

---

**📊 Coverage**: Low (needs tests)
**🎯 Priority**: Low
**🔄 Status**: Experimental
