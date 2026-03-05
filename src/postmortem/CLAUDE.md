# Postmortem Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../) › **postmortem**

**Last Updated**: 2026-03-04

---

## 📦 Module Overview

The Postmortem module provides post-execution analysis and reporting. It analyzes completed operations, identifies issues, and generates actionable insights for improvement.

## 🎯 Core Responsibilities

- **Execution Analysis**: Analyze completed operations and workflows
- **Error Reporting**: Detailed error analysis and root cause identification
- **Performance Analysis**: Identify performance bottlenecks and optimization opportunities
- **Report Generation**: Create structured postmortem reports
- **Recommendations**: Suggest improvements based on analysis

## 📁 Module Structure

```
src/postmortem/
├── index.ts              # Postmortem orchestrator
└── (analysis and reporting logic)
```

## 🔗 Dependencies

### Internal Dependencies
- `src/monitoring` - Metrics and performance data
- `src/health` - Health check results
- `src/brain` - Agent execution logs

### External Dependencies
- Log parsing utilities
- Report generation libraries

## 🚀 Key Interfaces

```typescript
interface Postmortem {
  analyze(executionId: string): Promise<PostmortemReport>
  generateReport(analysis: Analysis): PostmortemReport
  getRecommendations(report: PostmortemReport): Recommendation[]
}

interface PostmortemReport {
  executionId: string
  timestamp: number
  duration: number
  status: 'success' | 'failure' | 'partial'
  errors: Error[]
  performance: PerformanceMetrics
  recommendations: Recommendation[]
}

interface Recommendation {
  type: 'optimization' | 'fix' | 'enhancement'
  priority: 'high' | 'medium' | 'low'
  description: string
  action: string
}
```

## 📊 Performance Metrics

- **Analysis Time**: <1s for typical operations
- **Report Generation**: <500ms

## 🧪 Testing

Test files: None yet (needs coverage)

### Test Strategy
- Unit tests for analysis logic
- Integration tests with monitoring module
- Mock tests for report generation
- Edge case testing for error scenarios

## 📝 Usage Example

```typescript
import { Postmortem } from '@/postmortem'

const postmortem = new Postmortem()

// Analyze a completed operation
const report = await postmortem.analyze('exec-123')

console.log(`Status: ${report.status}`)
console.log(`Duration: ${report.duration}ms`)
console.log(`Recommendations: ${report.recommendations.length}`)

// Get actionable recommendations
const recommendations = postmortem.getRecommendations(report)
recommendations.forEach(rec => {
  console.log(`[${rec.priority}] ${rec.description}`)
})
```

## 🚧 Future Enhancements

- [ ] Add trend analysis across multiple executions
- [ ] Implement automated issue detection
- [ ] Create visual report dashboards
- [ ] Add integration with issue tracking systems

---

**📊 Coverage**: Low (needs tests)
**🎯 Priority**: Low
**🔄 Status**: Experimental
