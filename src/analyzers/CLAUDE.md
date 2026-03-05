# Analyzers Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../) › **analyzers**

**Last Updated**: 2026-03-04

---

## 📦 Module Overview

The Analyzers module provides code and project analysis utilities. It performs static analysis, dependency scanning, and project structure analysis to support intelligent recommendations.

## 🎯 Core Responsibilities

- **Code Analysis**: Parse and analyze source code structure
- **Dependency Analysis**: Scan and analyze project dependencies
- **Project Structure**: Analyze directory structure and file organization
- **Language Detection**: Identify programming languages and frameworks
- **Complexity Metrics**: Calculate code complexity and quality metrics

## 📁 Module Structure

```
src/analyzers/
├── index.ts              # Analyzer orchestrator
└── (language-specific analyzers)
```

## 🔗 Dependencies

### Internal Dependencies
- `src/discovery` - Project discovery integration
- `src/generation` - Analysis results for generation

### External Dependencies
- AST parsers for various languages
- Dependency graph libraries
- File system utilities

## 🚀 Key Interfaces

```typescript
interface Analyzer {
  analyze(path: string): Promise<AnalysisResult>
  detectLanguages(path: string): Promise<Language[]>
  analyzeDependencies(path: string): Promise<Dependency[]>
  calculateMetrics(path: string): Promise<Metrics>
}

interface AnalysisResult {
  languages: Language[]
  dependencies: Dependency[]
  structure: ProjectStructure
  metrics: Metrics
}

interface Language {
  name: string
  version?: string
  fileCount: number
  percentage: number
}

interface Dependency {
  name: string
  version: string
  type: 'production' | 'development'
  source: string
}

interface Metrics {
  totalFiles: number
  totalLines: number
  complexity: number
  maintainability: number
}
```

## 📊 Performance Metrics

- **Analysis Speed**: <5s for medium projects
- **Memory Usage**: <100MB for large projects
- **Accuracy**: 95%+ for language detection

## 🧪 Testing

Test files: None yet (needs coverage)

### Test Strategy
- Unit tests for each analyzer type
- Integration tests with discovery module
- Accuracy tests with known projects
- Performance tests for large codebases

## 📝 Usage Example

```typescript
import { Analyzer } from '@/analyzers'

const analyzer = new Analyzer()

// Analyze a project
const result = await analyzer.analyze('/path/to/project')

console.log('Languages:', result.languages)
console.log('Dependencies:', result.dependencies.length)
console.log('Complexity:', result.metrics.complexity)

// Detect languages only
const languages = await analyzer.detectLanguages('/path/to/project')
languages.forEach(lang => {
  console.log(`${lang.name}: ${lang.percentage}%`)
})
```

## 🚧 Future Enhancements

- [ ] Add support for more programming languages
- [ ] Implement security vulnerability scanning
- [ ] Add code quality scoring
- [ ] Create analysis caching for performance

---

**📊 Coverage**: Low (needs tests)
**🎯 Priority**: Low
**🔄 Status**: Active Development
