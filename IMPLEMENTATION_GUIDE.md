# Implementation Guide 🛠️

**How to Integrate Workflows and Styles into CCJK**

> Technical guide for implementing the creative design package

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Workflow Implementation](#workflow-implementation)
3. [Style System Implementation](#style-system-implementation)
4. [UI Components](#ui-components)
5. [Configuration Management](#configuration-management)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Interface                         │
│                    (bin/ccjk.ts)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Command Router                            │
│              (src/cli/command-router.ts)                     │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   Workflow Engine       │   │   Style Engine          │
│   (src/workflows/)      │   │   (src/styles/)         │
└─────────────────────────┘   └─────────────────────────┘
            │                               │
            ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Output Formatter                          │
│              (src/output/formatter.ts)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Terminal Output                           │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── workflows/
│   ├── core/
│   │   ├── workflow-base.ts
│   │   ├── workflow-registry.ts
│   │   └── workflow-types.ts
│   ├── implementations/
│   │   ├── quick-start.ts
│   │   ├── bug-hunter.ts
│   │   ├── code-review.ts
│   │   ├── tdd-master.ts
│   │   ├── docs-generator.ts
│   │   ├── refactoring-wizard.ts
│   │   ├── security-auditor.ts
│   │   ├── performance-optimizer.ts
│   │   ├── api-designer.ts
│   │   └── feature-planner.ts
│   └── index.ts
├── styles/
│   ├── core/
│   │   ├── style-base.ts
│   │   ├── style-registry.ts
│   │   ├── style-types.ts
│   │   └── style-combiner.ts
│   ├── implementations/
│   │   ├── academic/
│   │   │   ├── professor-mode.ts
│   │   │   ├── research-paper.ts
│   │   │   └── scientific-method.ts
│   │   ├── entertainment/
│   │   │   ├── gamer-mode.ts
│   │   │   ├── movie-director.ts
│   │   │   └── anime-character.ts
│   │   ├── programmer/
│   │   │   ├── tech-bro.ts
│   │   │   ├── hacker-style.ts
│   │   │   ├── cat-programmer.ts
│   │   │   └── unicorn-startup.ts
│   │   └── special/
│   │       ├── minimalist.ts
│   │       ├── poetic-coder.ts
│   │       ├── ramen-developer.ts
│   │       ├── night-owl.ts
│   │       └── circus-master.ts
│   └── index.ts
├── ui/
│   ├── components/
│   │   ├── menu.ts
│   │   ├── selector.ts
│   │   ├── progress.ts
│   │   └── dialog.ts
│   ├── themes/
│   │   ├── default.ts
│   │   ├── minimal.ts
│   │   └── high-contrast.ts
│   └── index.ts
├── output/
│   ├── formatter.ts
│   ├── renderer.ts
│   └── templates/
└── config/
    ├── user-preferences.ts
    ├── workflow-config.ts
    └── style-config.ts
```

---

## Workflow Implementation

### Base Workflow Class

```typescript
// src/workflows/core/workflow-base.ts

import { WorkflowMetadata, WorkflowResult, WorkflowOptions } from './workflow-types';

export abstract class BaseWorkflow {
  abstract getMetadata(): WorkflowMetadata;

  abstract async execute(options: WorkflowOptions): Promise<WorkflowResult>;

  async validate(options: WorkflowOptions): Promise<boolean> {
    // Default validation logic
    return true;
  }

  async preExecute(options: WorkflowOptions): Promise<void> {
    // Hook for pre-execution setup
  }

  async postExecute(result: WorkflowResult): Promise<void> {
    // Hook for post-execution cleanup
  }

  protected async showProgress(message: string, progress: number): Promise<void> {
    // Progress reporting
  }

  protected async prompt(question: string, options?: any): Promise<string> {
    // User interaction
  }
}
```

### Workflow Types

```typescript
// src/workflows/core/workflow-types.ts

export interface WorkflowMetadata {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'productivity' | 'quality' | 'learning' | 'fun';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  version: string;
  author?: string;
  tags: string[];
}

export interface WorkflowOptions {
  // Common options
  verbose?: boolean;
  dryRun?: boolean;
  interactive?: boolean;

  // Workflow-specific options
  [key: string]: any;
}

export interface WorkflowResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  warnings?: string[];
  metrics?: {
    duration: number;
    filesProcessed?: number;
    linesChanged?: number;
    [key: string]: any;
  };
}

export interface WorkflowStep {
  name: string;
  description: string;
  execute: () => Promise<void>;
  optional?: boolean;
  estimatedTime?: number;
}
```

### Example Workflow Implementation

```typescript
// src/workflows/implementations/bug-hunter.ts

import { BaseWorkflow } from '../core/workflow-base';
import { WorkflowMetadata, WorkflowOptions, WorkflowResult } from '../core/workflow-types';

export class BugHunterWorkflow extends BaseWorkflow {
  getMetadata(): WorkflowMetadata {
    return {
      id: 'bug-hunter',
      name: 'Bug Hunter',
      emoji: '🐛',
      description: 'Systematic bug detection and resolution',
      category: 'quality',
      difficulty: 'intermediate',
      estimatedTime: '5-10 minutes',
      version: '1.0.0',
      tags: ['debugging', 'testing', 'quality'],
    };
  }

  async execute(options: WorkflowOptions): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      // Step 1: Collect error information
      await this.showProgress('Collecting error logs...', 0);
      const errors = await this.collectErrors(options);

      // Step 2: Analyze patterns
      await this.showProgress('Analyzing error patterns...', 25);
      const patterns = await this.analyzePatterns(errors);

      // Step 3: Find root cause
      await this.showProgress('Tracing root cause...', 50);
      const rootCause = await this.findRootCause(patterns);

      // Step 4: Generate solutions
      await this.showProgress('Generating solutions...', 75);
      const solutions = await this.generateSolutions(rootCause);

      // Step 5: Create tests
      await this.showProgress('Creating test cases...', 90);
      const tests = await this.generateTests(rootCause, solutions);

      await this.showProgress('Complete!', 100);

      return {
        success: true,
        message: 'Bug analysis complete',
        data: {
          errors,
          patterns,
          rootCause,
          solutions,
          tests,
        },
        metrics: {
          duration: Date.now() - startTime,
          errorsAnalyzed: errors.length,
          solutionsGenerated: solutions.length,
          testsCreated: tests.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bug analysis failed',
        errors: [error.message],
        metrics: {
          duration: Date.now() - startTime,
        },
      };
    }
  }

  private async collectErrors(options: WorkflowOptions): Promise<any[]> {
    // Implementation
    return [];
  }

  private async analyzePatterns(errors: any[]): Promise<any> {
    // Implementation
    return {};
  }

  private async findRootCause(patterns: any): Promise<any> {
    // Implementation
    return {};
  }

  private async generateSolutions(rootCause: any): Promise<any[]> {
    // Implementation
    return [];
  }

  private async generateTests(rootCause: any, solutions: any[]): Promise<any[]> {
    // Implementation
    return [];
  }
}
```

### Workflow Registry

```typescript
// src/workflows/core/workflow-registry.ts

import { BaseWorkflow } from './workflow-base';
import { WorkflowMetadata } from './workflow-types';

export class WorkflowRegistry {
  private workflows: Map<string, typeof BaseWorkflow> = new Map();

  register(WorkflowClass: typeof BaseWorkflow): void {
    const instance = new WorkflowClass();
    const metadata = instance.getMetadata();
    this.workflows.set(metadata.id, WorkflowClass);
  }

  get(id: string): BaseWorkflow | undefined {
    const WorkflowClass = this.workflows.get(id);
    return WorkflowClass ? new WorkflowClass() : undefined;
  }

  getAll(): WorkflowMetadata[] {
    return Array.from(this.workflows.values()).map(WorkflowClass => {
      const instance = new WorkflowClass();
      return instance.getMetadata();
    });
  }

  getByCategory(category: string): WorkflowMetadata[] {
    return this.getAll().filter(w => w.category === category);
  }

  search(query: string): WorkflowMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(w =>
      w.name.toLowerCase().includes(lowerQuery) ||
      w.description.toLowerCase().includes(lowerQuery) ||
      w.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

// Singleton instance
export const workflowRegistry = new WorkflowRegistry();
```

---

## Style System Implementation

### Base Style Class

```typescript
// src/styles/core/style-base.ts

import { StyleMetadata, StyleConfig, StyleTransform } from './style-types';

export abstract class BaseStyle {
  abstract getMetadata(): StyleMetadata;

  abstract transform(input: string, context?: any): string;

  getConfig(): StyleConfig {
    return {
      enabled: true,
      priority: 1,
      options: {},
    };
  }

  isCompatibleWith(otherStyle: BaseStyle): boolean {
    const metadata = this.getMetadata();
    const otherMetadata = otherStyle.getMetadata();

    return !metadata.conflicts.includes(otherMetadata.id);
  }

  protected applyPrefix(text: string): string {
    const metadata = this.getMetadata();
    return metadata.prompts.prefix + text;
  }

  protected applySuffix(text: string): string {
    const metadata = this.getMetadata();
    return text + metadata.prompts.suffix;
  }

  protected wrapWithStyle(text: string): string {
    return this.applySuffix(this.applyPrefix(text));
  }
}
```

### Style Types

```typescript
// src/styles/core/style-types.ts

export interface StyleMetadata {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'academic' | 'entertainment' | 'programmer' | 'special';
  personality: string;
  examples: string[];
  prompts: {
    system: string;
    prefix: string;
    suffix: string;
  };
  compatibility: string[];
  conflicts: string[];
  version: string;
}

export interface StyleConfig {
  enabled: boolean;
  priority: number;
  options: Record<string, any>;
}

export interface StyleTransform {
  (input: string, context?: any): string;
}

export interface StyleCombination {
  primary: string;
  secondary: string[];
  blendMode: 'sequential' | 'parallel' | 'weighted';
}
```

### Example Style Implementation

```typescript
// src/styles/implementations/entertainment/gamer-mode.ts

import { BaseStyle } from '../../core/style-base';
import { StyleMetadata } from '../../core/style-types';

export class GamerModeStyle extends BaseStyle {
  getMetadata(): StyleMetadata {
    return {
      id: 'gamer-mode',
      name: 'Gamer Mode',
      emoji: '🎮',
      description: 'Achievement unlocked! Level up your code!',
      category: 'entertainment',
      personality: 'Energetic, competitive, achievement-focused, fun',
      examples: [
        '🎮 QUEST STARTED!',
        'Achievement Unlocked! 🏆',
        'Level Up! +50 XP',
      ],
      prompts: {
        system: 'Gamify all responses with achievements, XP, levels, boss battles, and gaming metaphors. Make coding feel like an epic quest!',
        prefix: '🎮 QUEST STARTED! ',
        suffix: '\n\n🏆 Achievement Unlocked! +50 XP',
      },
      compatibility: ['anime-character', 'night-owl', 'tech-bro'],
      conflicts: ['professor-mode', 'research-paper', 'minimalist'],
      version: '1.0.0',
    };
  }

  transform(input: string, context?: any): string {
    let output = input;

    // Add gaming elements
    output = this.addAchievements(output);
    output = this.addXPSystem(output);
    output = this.addBossBattles(output);
    output = this.addPowerUps(output);

    return this.wrapWithStyle(output);
  }

  private addAchievements(text: string): string {
    // Add achievement notifications
    const achievements = [
      '🏆 Code Warrior',
      '⭐ Bug Slayer',
      '💪 Optimization Master',
    ];

    // Logic to insert achievements
    return text;
  }

  private addXPSystem(text: string): string {
    // Add XP and level-up notifications
    return text;
  }

  private addBossBattles(text: string): string {
    // Convert problems into boss battles
    return text;
  }

  private addPowerUps(text: string): string {
    // Add power-up suggestions
    return text;
  }
}
```

### Style Combiner

```typescript
// src/styles/core/style-combiner.ts

import { BaseStyle } from './style-base';
import { StyleCombination } from './style-types';

export class StyleCombiner {
  combine(styles: BaseStyle[], combination: StyleCombination): BaseStyle {
    switch (combination.blendMode) {
      case 'sequential':
        return this.sequentialBlend(styles);
      case 'parallel':
        return this.parallelBlend(styles);
      case 'weighted':
        return this.weightedBlend(styles, combination);
      default:
        return styles[0];
    }
  }

  private sequentialBlend(styles: BaseStyle[]): BaseStyle {
    // Apply styles one after another
    return new CompositeStyle(styles, 'sequential');
  }

  private parallelBlend(styles: BaseStyle[]): BaseStyle {
    // Apply styles in parallel, merge results
    return new CompositeStyle(styles, 'parallel');
  }

  private weightedBlend(styles: BaseStyle[], combination: StyleCombination): BaseStyle {
    // Apply styles with different weights
    return new CompositeStyle(styles, 'weighted');
  }

  validateCombination(styles: BaseStyle[]): { valid: boolean; conflicts: string[] } {
    const conflicts: string[] = [];

    for (let i = 0; i < styles.length; i++) {
      for (let j = i + 1; j < styles.length; j++) {
        if (!styles[i].isCompatibleWith(styles[j])) {
          conflicts.push(`${styles[i].getMetadata().name} ⚔️ ${styles[j].getMetadata().name}`);
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }
}

class CompositeStyle extends BaseStyle {
  constructor(
    private styles: BaseStyle[],
    private mode: 'sequential' | 'parallel' | 'weighted'
  ) {
    super();
  }

  getMetadata() {
    return this.styles[0].getMetadata();
  }

  transform(input: string, context?: any): string {
    if (this.mode === 'sequential') {
      return this.styles.reduce((text, style) => style.transform(text, context), input);
    } else {
      // Parallel or weighted blending
      const transformed = this.styles.map(style => style.transform(input, context));
      return this.mergeTransforms(transformed);
    }
  }

  private mergeTransforms(transforms: string[]): string {
    // Merge logic
    return transforms[0];
  }
}
```

---

## UI Components

### Menu Component

```typescript
// src/ui/components/menu.ts

export interface MenuItem {
  id: string;
  label: string;
  emoji?: string;
  action: () => Promise<void>;
  shortcut?: string;
}

export class Menu {
  constructor(
    private title: string,
    private items: MenuItem[]
  ) {}

  async show(): Promise<void> {
    console.log(this.renderTitle());
    console.log(this.renderItems());

    const selection = await this.getSelection();
    await this.executeSelection(selection);
  }

  private renderTitle(): string {
    return `
╔═══════════════════════════════════════════════════════════════╗
║  ${this.title.padEnd(60)}║
╚═══════════════════════════════════════════════════════════════╝
    `.trim();
  }

  private renderItems(): string {
    return this.items.map((item, index) => {
      const number = index + 1;
      const emoji = item.emoji || '';
      const shortcut = item.shortcut ? ` (${item.shortcut})` : '';
      return `  ${number}. ${emoji} ${item.label}${shortcut}`;
    }).join('\n');
  }

  private async getSelection(): Promise<number> {
    // Get user input
    return 0;
  }

  private async executeSelection(index: number): Promise<void> {
    if (index >= 0 && index < this.items.length) {
      await this.items[index].action();
    }
  }
}
```

### Progress Component

```typescript
// src/ui/components/progress.ts

export class ProgressBar {
  constructor(
    private total: number,
    private width: number = 40
  ) {}

  render(current: number, message?: string): string {
    const percentage = Math.floor((current / this.total) * 100);
    const filled = Math.floor((current / this.total) * this.width);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const msg = message ? ` ${message}` : '';

    return `[${bar}] ${percentage}%${msg}`;
  }

  async update(current: number, message?: string): Promise<void> {
    process.stdout.write('\r' + this.render(current, message));

    if (current >= this.total) {
      process.stdout.write('\n');
    }
  }
}
```

---

## Configuration Management

```typescript
// src/config/user-preferences.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface UserPreferences {
  role: 'student' | 'professional' | 'startup' | 'creative' | 'devops';
  favoriteWorkflows: string[];
  outputStyles: string[];
  theme: 'default' | 'minimal' | 'high-contrast';
  autoUpdate: boolean;
  telemetry: boolean;
}

export class PreferencesManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.ccjk', 'preferences.json');
  }

  async load(): Promise<UserPreferences> {
    try {
      const data = await fs.promises.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return this.getDefaults();
    }
  }

  async save(preferences: UserPreferences): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(
      this.configPath,
      JSON.stringify(preferences, null, 2)
    );
  }

  private getDefaults(): UserPreferences {
    return {
      role: 'professional',
      favoriteWorkflows: ['bug-hunter', 'code-review'],
      outputStyles: ['minimalist', 'hacker-style'],
      theme: 'default',
      autoUpdate: true,
      telemetry: false,
    };
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/workflows/__tests__/bug-hunter.test.ts

import { BugHunterWorkflow } from '../implementations/bug-hunter';

describe('BugHunterWorkflow', () => {
  let workflow: BugHunterWorkflow;

  beforeEach(() => {
    workflow = new BugHunterWorkflow();
  });

  test('should have correct metadata', () => {
    const metadata = workflow.getMetadata();
    expect(metadata.id).toBe('bug-hunter');
    expect(metadata.category).toBe('quality');
  });

  test('should execute successfully', async () => {
    const result = await workflow.execute({});
    expect(result.success).toBe(true);
  });

  test('should handle errors gracefully', async () => {
    const result = await workflow.execute({ invalidOption: true });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integration/workflow-style.test.ts

import { workflowRegistry } from '../../workflows/core/workflow-registry';
import { styleRegistry } from '../../styles/core/style-registry';
import { OutputFormatter } from '../../output/formatter';

describe('Workflow + Style Integration', () => {
  test('should apply style to workflow output', async () => {
    const workflow = workflowRegistry.get('bug-hunter');
    const style = styleRegistry.get('gamer-mode');
    const formatter = new OutputFormatter([style]);

    const result = await workflow.execute({});
    const formatted = formatter.format(result.message);

    expect(formatted).toContain('🎮');
    expect(formatted).toContain('Achievement');
  });
});
```

---

## Deployment

### Build Process

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Create distribution
npm pack
```

### Installation

```bash
# Global installation
npm install -g ccjk

# Local installation
npm install ccjk
```

### Usage

```bash
# Run workflow
ccjk bug-hunt

# Configure styles
ccjk config styles

# Setup wizard
ccjk setup
```

---

## Performance Considerations

1. **Lazy Loading**: Load workflows and styles on demand
2. **Caching**: Cache compiled styles and workflow results
3. **Async Operations**: Use async/await for I/O operations
4. **Progress Feedback**: Show progress for long-running operations
5. **Resource Cleanup**: Properly clean up resources after execution

---

## Security Considerations

1. **Input Validation**: Validate all user inputs
2. **File System Access**: Restrict file system access
3. **Command Execution**: Sanitize command arguments
4. **API Keys**: Store API keys securely
5. **Telemetry**: Respect user privacy preferences

---

