# Orchestrators Module

**Last Updated**: 2026-01-24

## Overview

The orchestrators module contains high-level coordination logic for complex multi-step operations in CCJK. These orchestrators manage the execution flow, error handling, and integration between different subsystems.

## Cloud Setup Orchestrator

The `CloudSetupOrchestrator` is the flagship component of CCJK v8.0.0, providing:

- **Cloud-Powered Recommendations**: AI-driven resource recommendations based on project analysis
- **Intelligent Fallback**: Seamless fallback to local recommendations when cloud is unavailable
- **Parallel Execution**: Optimized installation of skills, MCP services, agents, and hooks
- **Telemetry Integration**: Anonymous usage statistics for continuous improvement
- **Comprehensive Reporting**: Detailed setup reports with insights and recommendations

### Key Features

1. **Project Analysis**: Deep inspection including fingerprinting, dependency analysis, and team metrics
2. **Cloud Integration**: Full integration with CCJK Cloud API for personalized recommendations
3. **Multi-Resource Coordination**: Manages installation of skills, MCP services, agents, and hooks
4. **Performance Optimization**: Caching strategies and parallel execution for fast setup
5. **User Experience**: Interactive confirmation with detailed insights and confidence scores

### Usage

```typescript
import { CloudSetupOrchestrator } from '../orchestrators/cloud-setup-orchestrator'

const orchestrator = new CloudSetupOrchestrator({
  strategy: 'cloud-smart',
  useCloud: true,
  cacheStrategy: 'normal',
  lang: 'en'
})

const result = await orchestrator.executeCloudSetup({
  interactive: true,
  generateReport: true,
  submitTelemetry: true
})
```

## Architecture

```
CloudSetupOrchestrator
├── analyzeProject() - Deep project analysis with fingerprinting
├── getCloudRecommendations() - AI-powered recommendations from cloud
├── displayRecommendationInsights() - User-friendly recommendation display
├── downloadTemplates() - Batch template download with caching
├── executeInstallation() - Parallel installation coordination
│   ├── installSkills() - Skills installation via ccjk:skills
│   ├── installMcpServices() - MCP services via ccjk:mcp
│   ├── installAgents() - Agents via ccjk:agents
│   └── installHooks() - Hooks via ccjk:hooks
├── uploadTelemetry() - Anonymous telemetry submission
└── generateReport() - Comprehensive setup report generation
```

## Integration Points

- **Cloud Client**: Uses `createCompleteCloudClient` for API communication
- **Project Analyzer**: Leverages `analyzeProject` for deep project inspection
- **Individual Commands**: Coordinates `ccjk:skills`, `ccjk:mcp`, `ccjk:agents`, `ccjk:hooks`
- **Telemetry System**: Integrates with CCJK telemetry for usage analytics
- **I18n System**: Full bilingual support (en/zh-CN) throughout the orchestration

## Performance Targets

- Cloud connection: < 500ms
- Project analysis: < 2s
- Recommendation generation: < 1s
- Template download: < 3s
- Total setup time: < 10s

## Error Handling

- Graceful cloud fallback with user notification
- Individual resource installation failures don't stop the entire process
- Comprehensive error logging with user-friendly messages
- Recovery suggestions for common failure scenarios