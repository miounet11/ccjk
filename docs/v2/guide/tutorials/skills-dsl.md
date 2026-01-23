# Skills DSL Tutorial | Skills DSL 教程

Learn how to create powerful AI skills using CCJK's Domain-Specific Language (DSL) for defining cognitive protocols, reasoning patterns, and AI personalities.

## 🎯 What You'll Learn

- Understanding Skills DSL syntax
- Creating cognitive protocols
- Building chain-of-thought reasoning
- Multi-agent collaboration patterns
- Custom AI personalities
- Skill composition and orchestration

## 📚 Prerequisites

- CCJK v2.0 installed ([Installation Guide](../installation.md))
- Basic understanding of AI/LLM concepts
- TypeScript/JavaScript knowledge (for advanced skills)

## 🧠 Understanding Skills DSL

### What is Skills DSL?

Skills DSL is a declarative language for defining AI behaviors, reasoning patterns, and cognitive protocols. It allows you to:

- Define AI personalities
- Specify reasoning patterns
- Chain multiple AI operations
- Create reusable AI components

### Basic Structure

```typescript
const skill: Skill = {
  id: 'my-skill',
  name: 'My Skill',
  description: 'What this skill does',

  // Cognition protocol
  protocol: CognitionProtocol.CHAIN_OF_THOUGHT,

  // AI personality
  personality: {
    role: 'Expert developer',
    style: 'helpful and constructive',
    constraints: ['Be specific', 'Use examples']
  },

  // Input/output specification
  parameters: {
    input: { type: 'string', required: true },
    format: { type: 'string', enum: ['json', 'markdown'], default: 'json' }
  },

  // Prompt template
  prompt: `
    As an expert {role}, analyze the following {input} and provide {format} output.
    {style}
    {constraints}
  `
};
```

## 🚀 Creating Your First Skill

Let's create a simple code review skill.

### Step 1: Create Skill File

Create `.ccjk/skills/code-reviewer.skill.ts`:

```typescript
import { Skill, CognitionProtocol } from '@ccjk/v2/skills';

export default {
  id: 'code-reviewer',
  name: 'AI Code Reviewer',
  description: 'Provides intelligent code review feedback',

  protocol: CognitionProtocol.CHAIN_OF_THOUGHT,

  personality: {
    role: 'Senior Software Engineer',
    style: 'constructive, detailed, and educational',
    constraints: [
      'Always provide specific examples',
      'Explain the why behind suggestions',
      'Consider performance implications',
      'Check for security issues'
    ]
  },

  parameters: {
    code: {
      type: 'string',
      required: true,
      description: 'The code to review'
    },
    language: {
      type: 'string',
      required: true,
      enum: ['javascript', 'typescript', 'python', 'go', 'java']
    },
    focus: {
      type: 'string',
      enum: ['all', 'performance', 'security', 'style'],
      default: 'all'
    }
  },

  prompt: `
    You are a {role} reviewing {language} code. Your style is {style}.

    Please review the following code with {focus} focus:

    \\`\\`\\`{language}
    {code}
    \\`\\`\\`

    Review constraints: {constraints}

    Provide a structured review with:
    1. Overall assessment
    2. Issues found (with severity)
    3. Suggestions for improvement
    4. Positive aspects
    5. Example fixes where applicable

    Format your response in {format}.
  `,

  examples: [
    {
      input: {
        code: 'function add(a, b) { return a + b; }',
        language: 'javascript'
      },
      output: {
        assessment: 'Good',
        issues: [],
        suggestions: ['Consider adding type checking'],
        positives: ['Clear function name', 'Simple implementation']
      }
    }
  ]
} as Skill;
```

### Step 2: Register the Skill

```bash
# Register the skill
ccjk skills register code-reviewer

# Test the skill
ccjk skills test code-reviewer
```

### Step 3: Use the Skill

```bash
# Use directly
c cjk skills run code-reviewer \
  --code="function add(a, b) { return a + b; }" \
  --language=javascript

# Review a file
c cjk skills review --file src/main.ts --skill=code-reviewer

# Focus on specific aspects
c cjk skills run code-reviewer \
  --file src/auth.ts \
  --focus=security
```

## 🔗 Cognition Protocols

### Chain of Thought (CoT)

Best for step-by-step reasoning:

```typescript
const skill: Skill = {
  id: 'problem-solver',
  protocol: CognitionProtocol.CHAIN_OF_THOUGHT,

  prompt: `
    Solve this problem step by step:
    1. Understand the problem
    2. Identify key constraints
    3. Consider possible approaches
    4. Evaluate each approach
    5. Choose the best solution
    6. Implement the solution

    Problem: {problem}
  `
};
```

### Tree of Thoughts (ToT)

Best for exploring multiple solutions:

```typescript
const skill: Skill = {
  id: 'solution-explorer',
  protocol: CognitionProtocol.TREE_OF_THOUGHTS,

  prompt: `
    Explore multiple solutions to this problem:

    Problem: {problem}

    For each solution:
    1. Describe the approach
    2. List pros and cons
    3. Estimate complexity
    4. Evaluate feasibility

    Then:
    - Compare all solutions
    - Recommend the best one
    - Explain your reasoning
  `
};
```

### Reflexion

Best for iterative improvement:

```typescript
const skill: Skill = {
  id: 'code-improver',
  protocol: CognitionProtocol.REFLEXION,

  prompt: `
    Review and improve this code iteratively:

    Initial code: {code}

    Iteration 1:
    - Identify issues
    - Suggest improvements

    Iteration 2:
    - Review your suggestions
    - Refine further

    Final iteration:
    - Present the best solution
    - Explain the improvement journey
  `
};
```

### Debate

Best for considering multiple perspectives:

```typescript
const skill: Skill = {
  id: 'architecture-debater',
  protocol: CognitionProtocol.DEBATE,

  prompt: `
    Debate this architectural decision:

    Topic: {topic}
    Options: {options}

    Role 1 (Advocate):
    - Argue for option 1
    - Provide evidence

    Role 2 (Opponent):
    - Argue for option 2
    - Counter Role 1's points

    Moderator:
    - Summarize key points
    - Declare a winner
    - Provide recommendation
  `
};
```

## 🤖 Advanced Skill: Multi-Agent Collaboration

Create a skill that coordinates multiple agents:

```typescript
import { Skill, CognitionProtocol } from '@ccjk/v2/skills';

export default {
  id: 'multi-agent-code-review',
  name: 'Multi-Agent Code Review',
  description: 'Uses multiple agents for comprehensive code review',

  protocol: CognitionProtocol.DEBATE,

  agents: [
    {
      id: 'security-expert',
      role: 'Security Expert',
      expertise: ['security', 'vulnerabilities', 'best-practices'],
      personality: 'paranoid, thorough, detailed'
    },
    {
      id: 'performance-guru',
      role: 'Performance Engineer',
      expertise: ['performance', 'optimization', 'scaling'],
      personality: 'efficient, analytical, metrics-driven'
    },
    {
      id: 'maintainability-champion',
      role: 'Senior Developer',
      expertise: ['readability', 'maintainability', 'patterns'],
      personality: 'practical, experienced, mentoring'
    }
  ],

  workflow: [
    {
      step: 1,
      agent: 'security-expert',
      task: 'security-review',
      output: 'security-report'
    },
    {
      step: 2,
      agent: 'performance-guru',
      task: 'performance-analysis',
      output: 'performance-report'
    },
    {
      step: 3,
      agent: 'maintainability-champion',
      task: 'code-quality-review',
      output: 'quality-report'
    },
    {
      step: 4,
      agent: 'coordinator',
      task: 'synthesize-reports',
      inputs: ['security-report', 'performance-report', 'quality-report'],
      output: 'final-review'
    }
  ],

  prompt: `
    Coordinate a multi-agent code review for the following {language} code:

    \\`\\`\\`{language}
    {code}
    \\`\\`\\`

    {agents}

    Follow this workflow:
    {workflow}

    Each agent should:
    1. Focus on their expertise area
    2. Provide specific examples
    3. Suggest concrete improvements
    4. Assign severity levels

    The coordinator should:
    1. Consolidate all findings
    2. Remove duplicates
    3. Prioritize issues by severity
    4. Provide actionable recommendations
  `
} as Skill;
```

## 🎨 Custom AI Personalities

Create different AI personalities for different use cases:

### The Mentor

```typescript
const mentorPersonality = {
  role: 'Experienced Software Engineering Mentor',
  style: 'patient, educational, supportive',
  constraints: [
    'Always explain the why',
    'Provide learning resources',
    'Encourage best practices',
    'Be constructive, not critical'
  ],
  examples: [
    'Instead of "This is wrong", say "Consider this alternative approach"',
    'Always provide code examples',
    'Link to relevant documentation'
  ]
};
```

### The Code Reviewer

```typescript
const reviewerPersonality = {
  role: 'Senior Code Reviewer',
  style: 'thorough, professional, direct',
  constraints: [
    'Check for all potential issues',
    'Prioritize security and performance',
    'Consider edge cases',
    'Verify test coverage'
  ],
  examples: [
    'Always check for SQL injection',
    'Look for memory leaks',
    'Verify error handling',
    'Check API rate limiting'
  ]
};
```

### The Architect

```typescript
const architectPersonality = {
  role: 'Software Architect',
  style: 'strategic, big-picture focused',
  constraints: [
    'Consider long-term maintainability',
    'Evaluate architectural patterns',
    'Think about scalability',
    'Consider team collaboration'
  ],
  examples: [
    'Evaluate coupling and cohesion',
    'Consider microservices vs monolith',
    'Plan for future requirements',
    'Design for failure'
  ]
};
```

## 🔗 Skill Composition

Compose multiple skills together:

```typescript
import { SkillComposer } from '@ccjk/v2/skills';

// Compose multiple skills
const composedSkill = SkillComposer.compose([
  'code-reviewer',
  'performance-analyzer',
  'security-scanner'
], {
  orchestration: 'sequential',
  aggregation: 'merge',
  priority: ['security', 'performance', 'style']
});

// Create pipeline
const pipeline = SkillComposer.pipeline([
  {
    skill: 'code-parser',
    output: 'ast'
  },
  {
    skill: 'code-analyzer',
    input: 'ast',
    output: 'analysis'
  },
  {
    skill: 'report-generator',
    input: 'analysis',
    output: 'report'
  }
]);
```

## 📊 Skill Parameters

### Input Validation

```typescript
const skill: Skill = {
  parameters: {
    code: {
      type: 'string',
      required: true,
      minLength: 10,
      maxLength: 10000,
      description: 'The code to analyze'
    },
    language: {
      type: 'string',
      required: true,
      enum: ['javascript', 'typescript', 'python'],
      description: 'Programming language'
    },
    strict: {
      type: 'boolean',
      default: false,
      description: 'Use strict checking'
    },
    timeout: {
      type: 'number',
      default: 30000,
      min: 1000,
      max: 300000,
      description: 'Timeout in milliseconds'
    }
  }
};
```

### Output Specification

```typescript
const skill: Skill = {
  output: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            message: { type: 'string' },
            line: { type: 'number' },
            suggestion: { type: 'string' }
          }
        }
      },
      score: {
        type: 'number',
        minimum: 0,
        maximum: 100
      }
    }
  }
};
```

## 🧪 Testing Skills

### Unit Testing

```typescript
import { testSkill } from '@ccjk/v2/testing';
import codeReviewer from './code-reviewer.skill';

describe('code-reviewer skill', () => {
  it('should review code successfully', async () => {
    const result = await testSkill(codeReviewer, {
      code: 'function add(a, b) { return a + b; }',
      language: 'javascript'
    });

    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('score');
    expect(result.issues).toBeInstanceOf(Array);
  });

  it('should handle invalid input', async () => {
    await expect(testSkill(codeReviewer, {}))
      .rejects
      .toThrow('Missing required parameter: code');
  });
});
```

### Integration Testing

```typescript
import { SkillRunner } from '@ccjk/v2/skills';

describe('skill integration', () => {
  let runner: SkillRunner;

  beforeAll(() => {
    runner = new SkillRunner();
  });

  it('should run skill with real AI', async () => {
    const result = await runner.run('code-reviewer', {
      code: fs.readFileSync('src/main.ts', 'utf-8'),
      language: 'typescript'
    });

    expect(result.issues).toBeDefined();
    expect(result.issues.length).toBeGreaterThanOrEqual(0);
  });
});
```

## 🚀 Performance Optimization

### Caching

```typescript
const skill: Skill = {
  cache: {
    enabled: true,
    key: (params) => {
      // Generate cache key based on parameters
      return `${params.code.length}-${params.language}-${params.strict}`;
    },
    ttl: 3600000, // 1 hour
    maxSize: 100
  }
};
```

### Batch Processing

```typescript
const skill: Skill = {
  batch: {
    enabled: true,
    maxSize: 10,
    timeout: 5000
  },

  async processBatch(inputs) {
    // Process multiple inputs together
    return inputs.map(input => this.process(input));
  }
};
```

## 📚 Best Practices

### 1. Clear Naming

```typescript
// Good
id: 'typescript-code-reviewer',
name: 'TypeScript Code Reviewer',

// Avoid
id: 'skill1',
name: 'My Skill',
```

### 2. Comprehensive Documentation

```typescript
const skill: Skill = {
  description: 'Analyzes TypeScript code for potential issues, performance problems, and best practices',

  examples: [
    {
      title: 'Basic usage',
      input: { code: 'const x = 5;', language: 'typescript' },
      output: { issues: [], score: 95 }
    },
    {
      title: 'With issues',
      input: { code: 'var x = 5;', language: 'typescript' },
      output: {
        issues: [{
          type: 'style',
          message: 'Use const/let instead of var'
        }],
        score: 70
      }
    }
  ]
};
```

### 3. Robust Error Handling

```typescript
const skill: Skill = {
  async execute(params) {
    try {
      // Validate input
      this.validateInput(params);

      // Process
      const result = await this.process(params);

      // Validate output
      this.validateOutput(result);

      return result;
    } catch (error) {
      return {
        error: true,
        message: error.message,
        type: error.type || 'unknown',
        recoverable: error.recoverable || false
      };
    }
  }
};
```

### 4. Progressive Enhancement

```typescript
const skill: Skill = {
  async execute(params) {
    // Basic validation
    const basicResult = await this.basicAnalysis(params);

    // Advanced analysis if requested
    if (params.deep) {
      const advancedResult = await this.advancedAnalysis(params);
      return { ...basicResult, ...advancedResult };
    }

    return basicResult;
  }
};
```

## 🎯 Practice Exercises

### Exercise 1: Documentation Generator
Create a skill that:
- Generates documentation from code
- Uses chain-of-thought protocol
- Supports multiple output formats
- Includes examples

### Exercise 2: Test Generator
Create a skill that:
- Generates test cases from requirements
- Uses tree-of-thoughts for multiple scenarios
- Creates both positive and negative tests
- Includes edge cases

### Exercise 3: Refactoring Assistant
Create a skill that:
- Suggests code refactoring
- Uses reflexion protocol
- Provides before/after examples
- Explains benefits

## 📚 Next Steps

- Learn about [Agent Networks](./agents-network.md)
- Explore [Workflow Generation](./workflow-generation.md)
- Read [Best Practices](../best-practices.md)
- Check [API Reference](../api-reference/README.md)

## 🆘 Troubleshooting

### Skill Not Loading
1. Check file extension: `.skill.ts`
2. Verify export: `export default`
3. Check syntax errors: `npx tsc --noEmit`

### Skill Execution Failed
1. Check parameter types
2. Verify required parameters
3. Check AI service connection
4. Review logs: `ccjk skills logs`

### Poor Skill Output
1. Refine prompt
2. Add more examples
3. Adjust personality
4. Try different protocol

Ready to learn about [Agent Networks](./agents-network.md)? 🚀
