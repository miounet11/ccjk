# Intelligent Agent and Skills Generation System - Planning Document

**Project**: CCJK v9.4.1+
**Module**: Intelligent Agent & Skills Generation
**Status**: Planning Phase
**Created**: 2026-02-04
**Last Updated**: 2026-02-04

---

## Executive Summary

This document outlines the design and implementation plan for an intelligent Agent and Skills generation system in CCJK. The system will analyze project codebases, understand their architecture and requirements, and automatically generate contextually relevant AI agents and skills that are optimized for the specific project.

### Key Objectives

1. **Intelligent Analysis**: Deep project understanding through multi-dimensional analysis
2. **Context-Aware Generation**: Generate agents/skills tailored to project needs
3. **Quality Assurance**: Ensure generated artifacts are production-ready
4. **Seamless Integration**: Work with existing CCJK infrastructure
5. **User Experience**: Provide both interactive and automated workflows

---

## 1. Current State Analysis

### 1.1 Existing Infrastructure

#### Project Analysis Capabilities

**Location**: `/Users/lu/ccjk-public/src/analyzers/`

- **ProjectAnalyzer** (`project-detector.ts`): Comprehensive project detection
  - Language detection (TypeScript, Python, Go, Rust, Java, etc.)
  - Framework detection (Next.js, React, Django, FastAPI, etc.)
  - Package manager detection (pnpm, npm, yarn, pip, cargo, etc.)
  - Build system detection (webpack, vite, rollup, etc.)
  - Configuration file discovery
  - Confidence scoring system

- **Language-Specific Analyzers**:
  - `typescript-analyzer.ts`: Framework detection, dependency analysis
  - `python-analyzer.ts`: Framework and library detection
  - `go-analyzer.ts`: Module and framework analysis
  - `rust-analyzer.ts`: Crate and framework detection

#### Agent System

**Location**: `/Users/lu/ccjk-public/src/brain/agents/`

- **BaseAgent** (`base-agent.ts`): Abstract base class with:
  - State management (IDLE, THINKING, EXECUTING, WAITING, ERROR, COMPLETED)
  - Message history tracking
  - Retry logic with exponential backoff
  - Timeout handling
  - Input validation
  - Lifecycle methods (initialize, process, cleanup)

- **Specialized Agents**:
  - `code-agent.ts`: Code execution and analysis
  - `executor-agent.ts`: Task execution
  - `research-agent.ts`: Research and information gathering
  - `architecture-agent.ts`: Architecture design
  - `testing-agent.ts`: Testing strategies
  - `security-agent.ts`: Security analysis
  - `performance-agent.ts`: Performance optimization
  - `devops-agent.ts`: DevOps workflows
  - `data-agent.ts`: Data processing
  - `ai-ml-agent.ts`: AI/ML workflows

- **Agent Registry** (`/Users/lu/ccjk-public/src/agents/registry.ts`):
  - 10 predefined agents with expertise areas
  - Cost-based selection
  - Collaboration mapping
  - Capability-based filtering

#### Skills System

**Location**: `/Users/lu/ccjk-public/src/skills/`

- **SkillManager** (`manager.ts`):
  - Built-in skills (cloud-sync, browser, marketplace, workflow)
  - Skill registry with category indexing
  - Search and filter capabilities
  - Import/export functionality
  - Batch skill creation templates
  - Claude Code compatible output (`.claude/commands/*.md`)

- **Skill Categories**:
  - `git`: Version control workflows
  - `dev`: Development patterns and practices
  - `testing`: Testing strategies
  - `docs`: Documentation generation
  - `review`: Code review
  - `seo`: SEO optimization
  - `devops`: DevOps automation
  - `custom`: Custom skills
  - `debug`: Debugging workflows

#### Existing Commands

**Location**: `/Users/lu/ccjk-public/src/commands/`

- **ccjk-agents.ts**: Current agent creation command
  - Project analysis integration
  - Cloud API integration for templates
  - Local template fallback
  - Agent validation and registration
  - Dry-run mode

- **ccjk-skills.ts**: Current skills installation command
  - Project-based skill recommendations
  - Cloud template integration
  - Interactive selection
  - Batch installation
  - Claude Code compatible output

### 1.2 Current Limitations

#### Agent Generation

1. **Limited Intelligence**: Current system uses simple template matching
2. **No Deep Analysis**: Doesn't analyze actual code patterns or architecture
3. **Static Templates**: Pre-defined templates don't adapt to project specifics
4. **No Learning**: Doesn't learn from project structure or existing code
5. **Generic Output**: Generated agents lack project-specific context

#### Skills Generation

1. **Template-Based Only**: Relies on pre-written templates
2. **No Code Understanding**: Doesn't analyze existing code patterns
3. **Limited Customization**: Skills are generic, not project-specific
4. **No Dependency Analysis**: Doesn't consider project dependencies
5. **Manual Curation**: Requires manual template creation

#### Integration Gaps

1. **No Feedback Loop**: No mechanism to improve based on usage
2. **Limited Context**: Doesn't consider team practices or conventions
3. **No Validation**: Generated artifacts not validated against project
4. **Static Recommendations**: Recommendations don't evolve with project

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Interface Layer                         │
│  (CLI Commands: ccjk:agents-gen, ccjk:skills-gen)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  Orchestration Layer                            │
│  - Generation Orchestrator                                      │
│  - Workflow Manager                                             │
│  - Quality Assurance Pipeline                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│   Analysis   │  │ Generation │  │ Validation │
│    Engine    │  │   Engine   │  │   Engine   │
└───────┬──────┘  └─────┬──────┘  └─────┬──────┘
        │                │                │
┌───────▼──────────────────────────────────▼──────┐
│            Knowledge Base Layer                  │
│  - Project Analysis Cache                        │
│  - Template Library                              │
│  - Pattern Database                              │
│  - Best Practices Repository                     │
└──────────────────────────────────────────────────┘
```

### 2.2 Core Components

#### 2.2.1 Analysis Engine

**Purpose**: Deep project understanding through multi-dimensional analysis

**Location**: `/Users/lu/ccjk-public/src/generation/analysis/`

**Components**:

1. **CodeAnalyzer** (`code-analyzer.ts`)
   - AST parsing for code structure understanding
   - Pattern detection (design patterns, architectural patterns)
   - Dependency graph construction
   - Code complexity metrics
   - API surface analysis

2. **ArchitectureAnalyzer** (`architecture-analyzer.ts`)
   - Layer detection (presentation, business, data)
   - Module boundary identification
   - Communication pattern analysis
   - State management detection
   - Error handling patterns

3. **DependencyAnalyzer** (`dependency-analyzer.ts`)
   - Direct and transitive dependencies
   - Version compatibility analysis
   - Security vulnerability scanning
   - License compliance checking
   - Dependency usage patterns

4. **PracticeAnalyzer** (`practice-analyzer.ts`)
   - Coding style detection
   - Testing strategy identification
   - Documentation patterns
   - Git workflow analysis
   - CI/CD pipeline detection

5. **ContextBuilder** (`context-builder.ts`)
   - Aggregate analysis results
   - Build comprehensive project context
   - Identify gaps and opportunities
   - Generate recommendations

**Interfaces**:

```typescript
interface AnalysisEngine {
  analyze(projectPath: string, options: AnalysisOptions): Promise<ProjectContext>
  getCodePatterns(): CodePattern[]
  getArchitecture(): ArchitectureInfo
  getDependencies(): DependencyGraph
  getPractices(): PracticeInfo
}

interface ProjectContext {
  // Basic info
  projectPath: string
  projectType: string
  languages: LanguageInfo[]
  frameworks: FrameworkInfo[]

  // Deep analysis
  architecture: ArchitectureInfo
  codePatterns: CodePattern[]
  dependencies: DependencyGraph
  practices: PracticeInfo

  // Insights
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  recommendations: Recommendation[]

  // Metadata
  confidence: number
  analysisDate: Date
  version: string
}

interface ArchitectureInfo {
  layers: Layer[]
  modules: Module[]
  patterns: ArchitecturalPattern[]
  stateManagement: StateManagementInfo
  errorHandling: ErrorHandlingInfo
  apiDesign: ApiDesignInfo
}

interface CodePattern {
  type: 'design-pattern' | 'architectural-pattern' | 'idiom'
  name: string
  locations: string[]
  frequency: number
  confidence: number
}

interface PracticeInfo {
  codingStyle: CodingStyleInfo
  testingStrategy: TestingStrategyInfo
  documentation: DocumentationInfo
  gitWorkflow: GitWorkflowInfo
  cicd: CicdInfo
}
```

#### 2.2.2 Generation Engine

**Purpose**: Generate contextually relevant agents and skills

**Location**: `/Users/lu/ccjk-public/src/generation/engine/`

**Components**:

1. **AgentGenerator** (`agent-generator.ts`)
   - Analyze project needs
   - Select relevant capabilities
   - Generate agent definitions
   - Customize instructions based on context
   - Assign appropriate skills and MCP servers

2. **SkillGenerator** (`skill-generator.ts`)
   - Identify skill opportunities
   - Generate skill templates
   - Customize for project patterns
   - Create trigger commands
   - Generate documentation

3. **TemplateEngine** (`template-engine.ts`)
   - Template rendering with context
   - Variable substitution
   - Conditional logic
   - Template composition
   - Output formatting

4. **InstructionBuilder** (`instruction-builder.ts`)
   - Build agent instructions from context
   - Include project-specific examples
   - Add relevant constraints
   - Incorporate best practices
   - Format for Claude Code

5. **CapabilityMapper** (`capability-mapper.ts`)
   - Map project needs to agent capabilities
   - Prioritize capabilities
   - Resolve capability conflicts
   - Suggest capability combinations

**Interfaces**:

```typescript
interface GenerationEngine {
  generateAgents(context: ProjectContext, options: GenerationOptions): Promise<GeneratedAgent[]>
  generateSkills(context: ProjectContext, options: GenerationOptions): Promise<GeneratedSkill[]>
  customizeTemplate(template: Template, context: ProjectContext): string
}

interface GeneratedAgent {
  id: string
  name: MultilingualString
  description: MultilingualString
  persona: string
  instructions: string
  capabilities: AgentCapability[]
  skills: SkillReference[]
  mcpServers: McpServerReference[]

  // Generation metadata
  generatedFrom: 'analysis' | 'template' | 'hybrid'
  confidence: number
  reasoning: string
  customizations: Customization[]
}

interface GeneratedSkill {
  id: string
  name: MultilingualString
  description: MultilingualString
  category: SkillCategory
  triggers: string[]
  template: string
  tags: string[]

  // Generation metadata
  generatedFrom: 'analysis' | 'template' | 'hybrid'
  confidence: number
  reasoning: string
  examples: string[]
}

interface GenerationOptions {
  mode: 'auto' | 'interactive' | 'guided'
  maxAgents?: number
  maxSkills?: number
  includeExperimental?: boolean
  customizationLevel: 'minimal' | 'moderate' | 'extensive'
  language: SupportedLang
}
```

#### 2.2.3 Validation Engine

**Purpose**: Ensure generated artifacts are production-ready

**Location**: `/Users/lu/ccjk-public/src/generation/validation/`

**Components**:

1. **AgentValidator** (`agent-validator.ts`)
   - Schema validation
   - Instruction quality check
   - Capability consistency
   - Skill reference validation
   - MCP server availability

2. **SkillValidator** (`skill-validator.ts`)
   - Template syntax validation
   - Trigger uniqueness check
   - Category appropriateness
   - Documentation completeness
   - Example validity

3. **QualityChecker** (`quality-checker.ts`)
   - Instruction clarity scoring
   - Example relevance checking
   - Documentation completeness
   - Naming convention compliance
   - Best practice adherence

4. **ConflictDetector** (`conflict-detector.ts`)
   - Duplicate detection
   - Trigger conflicts
   - Capability overlaps
   - Dependency conflicts

**Interfaces**:

```typescript
interface ValidationEngine {
  validateAgent(agent: GeneratedAgent): ValidationResult
  validateSkill(skill: GeneratedSkill): ValidationResult
  checkQuality(artifact: GeneratedAgent | GeneratedSkill): QualityScore
  detectConflicts(artifacts: (GeneratedAgent | GeneratedSkill)[]): Conflict[]
}

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: string[]
}

interface QualityScore {
  overall: number // 0-100
  clarity: number
  completeness: number
  relevance: number
  consistency: number
  details: QualityDetail[]
}

interface Conflict {
  type: 'duplicate' | 'trigger' | 'capability' | 'dependency'
  severity: 'error' | 'warning' | 'info'
  artifacts: string[]
  description: string
  resolution: string
}
```

#### 2.2.4 Knowledge Base

**Purpose**: Store and retrieve generation knowledge

**Location**: `/Users/lu/ccjk-public/src/generation/knowledge/`

**Components**:

1. **PatternLibrary** (`pattern-library.ts`)
   - Common code patterns
   - Architectural patterns
   - Best practices
   - Anti-patterns to avoid

2. **TemplateRepository** (`template-repository.ts`)
   - Agent templates
   - Skill templates
   - Instruction templates
   - Documentation templates

3. **CapabilityDatabase** (`capability-database.ts`)
   - Agent capabilities catalog
   - Capability requirements
   - Capability combinations
   - Capability examples

4. **BestPracticesStore** (`best-practices-store.ts`)
   - Language-specific practices
   - Framework-specific practices
   - Domain-specific practices
   - Team practices

**Interfaces**:

```typescript
interface KnowledgeBase {
  getPatterns(filter: PatternFilter): Pattern[]
  getTemplates(type: 'agent' | 'skill', filter: TemplateFilter): Template[]
  getCapabilities(filter: CapabilityFilter): Capability[]
  getBestPractices(context: ProjectContext): BestPractice[]
}

interface Pattern {
  id: string
  name: string
  type: 'design' | 'architectural' | 'idiom'
  description: string
  applicability: string[]
  examples: CodeExample[]
  relatedPatterns: string[]
}

interface Template {
  id: string
  name: string
  type: 'agent' | 'skill'
  content: string
  variables: TemplateVariable[]
  conditions: TemplateCondition[]
  metadata: TemplateMetadata
}
```

### 2.3 Data Flow

```
1. User Input
   ↓
2. Project Analysis
   - Scan project files
   - Analyze code structure
   - Detect patterns
   - Build context
   ↓
3. Generation Planning
   - Identify needs
   - Select templates
   - Plan customizations
   - Estimate quality
   ↓
4. Artifact Generation
   - Generate agents
   - Generate skills
   - Customize content
   - Format output
   ↓
5. Validation
   - Validate schema
   - Check quality
   - Detect conflicts
   - Generate reports
   ↓
6. User Review (Interactive Mode)
   - Present results
   - Allow modifications
   - Confirm selections
   ↓
7. Installation
   - Write agent files
   - Write skill files
   - Register artifacts
   - Update configuration
   ↓
8. Verification
   - Test agents
   - Test skills
   - Generate report
```

---

## 3. Implementation Plan

### 3.1 Phase 1: Foundation (Week 1-2)

#### Goals
- Set up project structure
- Implement core analysis engine
- Create basic generation engine
- Establish testing framework

#### Tasks

1. **Project Structure Setup**
   - Create `/Users/lu/ccjk-public/src/generation/` directory
   - Set up subdirectories (analysis, engine, validation, knowledge)
   - Create type definitions
   - Set up test infrastructure

2. **Analysis Engine - Core**
   - Implement `CodeAnalyzer` with AST parsing
   - Implement `ArchitectureAnalyzer` for layer detection
   - Implement `DependencyAnalyzer` for dependency graphs
   - Implement `ContextBuilder` for aggregation

3. **Generation Engine - Basic**
   - Implement `TemplateEngine` with variable substitution
   - Implement `AgentGenerator` with template-based generation
   - Implement `SkillGenerator` with template-based generation

4. **Testing**
   - Unit tests for analyzers
   - Unit tests for generators
   - Integration tests for basic flow

#### Deliverables
- Working analysis engine
- Basic generation engine
- Test suite with 80%+ coverage
- Documentation for core APIs

### 3.2 Phase 2: Intelligence (Week 3-4)

#### Goals
- Add intelligent pattern detection
- Implement context-aware customization
- Build knowledge base
- Enhance generation quality

#### Tasks

1. **Pattern Detection**
   - Implement design pattern detection
   - Implement architectural pattern detection
   - Implement idiom detection
   - Build pattern library

2. **Context-Aware Generation**
   - Implement `InstructionBuilder` with context
   - Implement `CapabilityMapper` with prioritization
   - Add project-specific examples
   - Add constraint generation

3. **Knowledge Base**
   - Build pattern library
   - Create template repository
   - Build capability database
   - Create best practices store

4. **Quality Enhancement**
   - Implement quality scoring
   - Add relevance checking
   - Implement completeness validation
   - Add consistency checking

#### Deliverables
- Intelligent pattern detection
- Context-aware generation
- Populated knowledge base
- Enhanced quality metrics

### 3.3 Phase 3: Validation & Quality (Week 5)

#### Goals
- Implement comprehensive validation
- Add quality assurance pipeline
- Build conflict detection
- Create reporting system

#### Tasks

1. **Validation Engine**
   - Implement `AgentValidator`
   - Implement `SkillValidator`
   - Implement `QualityChecker`
   - Implement `ConflictDetector`

2. **Quality Assurance**
   - Build validation pipeline
   - Add automated fixes
   - Implement quality gates
   - Create quality reports

3. **Conflict Resolution**
   - Detect duplicate agents/skills
   - Detect trigger conflicts
   - Detect capability overlaps
   - Suggest resolutions

4. **Reporting**
   - Generate validation reports
   - Generate quality reports
   - Generate conflict reports
   - Create summary dashboards

#### Deliverables
- Complete validation engine
- Quality assurance pipeline
- Conflict detection system
- Comprehensive reporting

### 3.4 Phase 4: User Experience (Week 6)

#### Goals
- Build CLI commands
- Create interactive workflows
- Add progress tracking
- Implement dry-run mode

#### Tasks

1. **CLI Commands**
   - Implement `ccjk:agents-gen` command
   - Implement `ccjk:skills-gen` command
   - Implement `ccjk:generate-all` command
   - Add command options and flags

2. **Interactive Mode**
   - Build interactive agent selection
   - Build interactive skill selection
   - Add customization prompts
   - Implement confirmation flows

3. **Progress Tracking**
   - Add analysis progress indicators
   - Add generation progress indicators
   - Add validation progress indicators
   - Create status dashboards

4. **Dry-Run Mode**
   - Implement preview without installation
   - Show what would be generated
   - Display validation results
   - Allow modifications before commit

#### Deliverables
- Complete CLI interface
- Interactive workflows
- Progress tracking system
- Dry-run functionality

### 3.5 Phase 5: Integration & Polish (Week 7)

#### Goals
- Integrate with existing CCJK systems
- Add cloud API integration
- Implement caching
- Polish user experience

#### Tasks

1. **System Integration**
   - Integrate with existing analyzers
   - Integrate with agent registry
   - Integrate with skill manager
   - Integrate with cloud API

2. **Cloud Integration**
   - Fetch templates from cloud
   - Upload generated artifacts
   - Sync with cloud knowledge base
   - Enable collaborative learning

3. **Performance Optimization**
   - Implement analysis caching
   - Add incremental analysis
   - Optimize pattern detection
   - Reduce generation time

4. **User Experience Polish**
   - Improve error messages
   - Add helpful suggestions
   - Enhance progress indicators
   - Create user documentation

#### Deliverables
- Full system integration
- Cloud API integration
- Performance optimizations
- Polished user experience

### 3.6 Phase 6: Testing & Documentation (Week 8)

#### Goals
- Comprehensive testing
- Complete documentation
- Create examples
- Prepare for release

#### Tasks

1. **Testing**
   - Complete unit test coverage
   - Add integration tests
   - Add end-to-end tests
   - Perform user acceptance testing

2. **Documentation**
   - Write API documentation
   - Create user guides
   - Write developer documentation
   - Create troubleshooting guides

3. **Examples**
   - Create example projects
   - Generate sample outputs
   - Create video tutorials
   - Write blog posts

4. **Release Preparation**
   - Code review
   - Security audit
   - Performance benchmarking
   - Release notes

#### Deliverables
- 90%+ test coverage
- Complete documentation
- Example projects
- Release-ready code

---

## 4. Technical Specifications

### 4.1 File Structure

```
src/generation/
├── index.ts                          # Main exports
├── types.ts                          # Shared type definitions
├── constants.ts                      # Constants and configurations
│
├── analysis/                         # Analysis Engine
│   ├── index.ts
│   ├── code-analyzer.ts             # AST parsing and code analysis
│   ├── architecture-analyzer.ts     # Architecture detection
│   ├── dependency-analyzer.ts       # Dependency graph analysis
│   ├── practice-analyzer.ts         # Practice detection
│   ├── context-builder.ts           # Context aggregation
│   └── __tests__/
│       ├── code-analyzer.test.ts
│       ├── architecture-analyzer.test.ts
│       └── ...
│
├── engine/                           # Generation Engine
│   ├── index.ts
│   ├── agent-generator.ts           # Agent generation
│   ├── skill-generator.ts           # Skill generation
│   ├── template-engine.ts           # Template rendering
│   ├── instruction-builder.ts       # Instruction building
│   ├── capability-mapper.ts         # Capability mapping
│   └── __tests__/
│       ├── agent-generator.test.ts
│       ├── skill-generator.test.ts
│       └── ...
│
├── validation/                       # Validation Engine
│   ├── index.ts
│   ├── agent-validator.ts           # Agent validation
│   ├── skill-validator.ts           # Skill validation
│   ├── quality-checker.ts           # Quality checking
│   ├── conflict-detector.ts         # Conflict detection
│   └── __tests__/
│       ├── agent-validator.test.ts
│       ├── skill-validator.test.ts
│       └── ...
│
├── knowledge/                        # Knowledge Base
│   ├── index.ts
│   ├── pattern-library.ts           # Pattern storage
│   ├── template-repository.ts       # Template storage
│   ├── capability-database.ts       # Capability catalog
│   ├── best-practices-store.ts      # Best practices
│   └── data/                        # Knowledge data files
│       ├── patterns/
│       ├── templates/
│       ├── capabilities/
│       └── practices/
│
├── orchestrator/                     # Orchestration Layer
│   ├── index.ts
│   ├── generation-orchestrator.ts   # Main orchestrator
│   ├── workflow-manager.ts          # Workflow management
│   ├── quality-pipeline.ts          # QA pipeline
│   └── __tests__/
│       └── generation-orchestrator.test.ts
│
└── utils/                            # Utilities
    ├── ast-utils.ts                 # AST utilities
    ├── template-utils.ts            # Template utilities
    ├── validation-utils.ts          # Validation utilities
    └── format-utils.ts              # Formatting utilities

src/commands/
├── ccjk-agents-gen.ts               # New agent generation command
├── ccjk-skills-gen.ts               # New skill generation command
└── ccjk-generate-all.ts             # Generate both agents and skills

templates/generation/                 # Generation templates
├── agents/
│   ├── base-agent.hbs
│   ├── specialized-agent.hbs
│   └── ...
└── skills/
    ├── base-skill.hbs
    ├── workflow-skill.hbs
    └── ...

tests/generation/                     # Integration tests
├── e2e/
│   ├── agent-generation.test.ts
│   ├── skill-generation.test.ts
│   └── full-workflow.test.ts
└── fixtures/
    ├── sample-projects/
    └── expected-outputs/
```

### 4.2 Key Algorithms

#### 4.2.1 Pattern Detection Algorithm

```typescript
/**
 * Detect code patterns using AST analysis
 */
function detectPatterns(ast: AST, context: ProjectContext): CodePattern[] {
  const patterns: CodePattern[] = []

  // 1. Traverse AST
  traverse(ast, {
    // Detect Singleton pattern
    ClassDeclaration(path) {
      if (isSingletonPattern(path)) {
        patterns.push({
          type: 'design-pattern',
          name: 'Singleton',
          locations: [path.node.loc],
          frequency: 1,
          confidence: 0.9
        })
      }
    },

    // Detect Factory pattern
    FunctionDeclaration(path) {
      if (isFactoryPattern(path)) {
        patterns.push({
          type: 'design-pattern',
          name: 'Factory',
          locations: [path.node.loc],
          frequency: 1,
          confidence: 0.85
        })
      }
    },

    // Detect Observer pattern
    CallExpression(path) {
      if (isObserverPattern(path)) {
        patterns.push({
          type: 'design-pattern',
          name: 'Observer',
          locations: [path.node.loc],
          frequency: 1,
          confidence: 0.8
        })
      }
    }
  })

  // 2. Aggregate an