# Quick Start Guide | 快速开始指南

Get up and running with CCJK v2.0 in under 5 minutes. This guide will walk you through your first project setup, creating hooks, and using the basic features.

## 🎯 What You'll Learn

- Initialize your first CCJK project
- Create and register a hook
- Use the traceability framework
- Create a simple skill
- Run your first agent

## ⚡ 5-Minute Setup

### Step 1: Install CCJK

```bash
# Install globally (recommended)
npm install -g ccjk@latest

# Or use without installing
npx ccjk@latest init
```

### Step 2: Initialize Project

```bash
# Navigate to your project (or create new one)
cd /path/to/your/project

# Run interactive setup
ccjk init
```

The wizard will ask you several questions:

```
Welcome to CCJK v2.0! 🚀

? Project name: my-awesome-project
? Enable hooks? (Y/n): Y
? Enable traceability? (Y/n): Y
? Enable skills? (Y/n): Y
? Enable agents? (Y/n): Y
? Redis URL (default: redis://localhost:6379):
? Git hooks installation mode: automatic

Setting up CCJK v2.0...
✓ Configuration created
✓ Hooks directory created
✓ Skills directory created
✓ Agents configured
✓ Git hooks installed

CCJK is ready! 🎉
```

### Step 3: Verify Setup

```bash
# Check if everything is working
ccjk doctor
```

Expected output:
```
✓ Node.js: v20.11.0
✓ npm: 10.2.4
✓ Git: 2.43.0
✓ Redis: 7.2.3 (connected)
✓ Configuration: valid
✓ Hooks: enabled
✓ Skills: enabled
✓ Agents: ready

All systems operational! 🎉
```

## 🚀 Your First Hook

Let's create a hook that enforces TypeScript strict mode.

### Step 1: Create Hook File

Create `.ccjk/hooks/typescript-strict.hook.ts`:

```typescript
import { HookEnforcer, EnforcementLevel } from '@ccjk/v2/hooks';
import { readFileSync } from 'fs';
import { join } from 'path';

export default {
  id: 'typescript-strict',
  name: 'TypeScript Strict Mode Enforcement',
  description: 'Ensures TypeScript strict mode is enabled',
  level: EnforcementLevel.L2_STRONGLY_RECOMMENDED,

  // When to trigger this hook
  matcher: {
    event: 'pre-commit',
    files: ['**/*.ts', '**/*.tsx'],
    exclude: ['node_modules/**', 'dist/**']
  },

  // The enforcement logic
  async enforce(context) {
    const tsconfigPath = join(context.project.root, 'tsconfig.json');

    try {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      if (!tsconfig.compilerOptions?.strict) {
        return {
          passed: false,
          message: 'TypeScript strict mode must be enabled in tsconfig.json',
          fix: {
            description: 'Enable strict mode in tsconfig.json',
            apply: async () => {
              tsconfig.compilerOptions = tsconfig.compilerOptions || {};
              tsconfig.compilerOptions.strict = true;

              await context.utils.writeFile(
                tsconfigPath,
                JSON.stringify(tsconfig, null, 2)
              );
            }
          }
        };
      }

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to check tsconfig.json: ${error.message}`
      };
    }
  }
};
```

### Step 2: Register the Hook

```bash
# Register the hook
ccjk hooks register typescript-strict

# Test the hook
ccjk hooks test typescript-strict
```

### Step 3: See It In Action

Make a change to any TypeScript file:

```bash
# Edit a TypeScript file
echo "console.log('hello');" > test.ts

# Commit the change (trigger hook)
git add test.ts
git commit -m "Add test file"
```

You'll see the hook in action:

```
Running pre-commit hooks...
⚠️  TypeScript Strict Mode Enforcement (L2)
   Message: TypeScript strict mode must be enabled in tsconfig.json
   Fix available: Enable strict mode in tsconfig.json

? Apply fix? (Y/n): Y
✓ Fix applied successfully
✓ Hook passed after fix

Commit successful! ✅
```

## 📊 Using Traceability

Let's trace a feature implementation.

### Step 1: Create a Trace

```bash
# Create a new trace for a feature
c cjk trace create --id "user-auth" --title "User Authentication System" --description "Implement secure user authentication"
```

### Step 2: Work on the Feature

All commits will automatically include the trace ID:

```bash
# Make changes
echo "export function login() {}" > src/auth.ts

# Commit (trace ID automatically added)
git add src/auth.ts
git commit -m "Add login function"
```

The commit message will be enhanced:
```
Add login function

[Trace: user-auth]
```

### Step 3: View Trace

```bash
# Show trace details
c cjk trace show user-auth

# Get trace summary
c cjk trace summary --format=tree
```

## 🧠 Creating a Skill

Let's create a skill that helps with code reviews.

### Step 1: Create Skill File

Create `.ccjk/skills/code-reviewer.skill.ts`:

```typescript
import { Skill, CognitionProtocol } from '@ccjk/v2/skills';

export default {
  id: 'code-reviewer',
  name: 'AI Code Reviewer',
  description: 'Provides intelligent code review suggestions',

  protocol: CognitionProtocol.CHAIN_OF_THOUGHT,

  prompt: `
    You are an expert code reviewer. Analyze the provided code and:

    1. Identify potential bugs
    2. Suggest improvements
    3. Check for security issues
    4. Verify best practices

    Be constructive and specific in your feedback.
  `,

  examples: [
    {
      input: 'function add(a, b) { return a + b; }',
      output: 'Code looks good. Consider adding type checking for better reliability.'
    }
  ],

  parameters: {
    language: {
      type: 'string',
      enum: ['javascript', 'typescript', 'python', 'go'],
      required: true
    },
    code: {
      type: 'string',
      required: true
    }
  }
} as Skill;
```

### Step 2: Use the Skill

```bash
# Use the skill directly
c cjk skills run code-reviewer --language=typescript --code="function add(a, b) { return a + b; }"

# Or integrate in your workflow
c cjk skills review --file src/main.ts --skill=code-reviewer
```

## 🤖 Your First Agent

Let's create a simple monitoring agent.

### Step 1: Create Agent

Create `.ccjk/agents/monitor.agent.ts`:

```typescript
import { Agent, AgentRole, MessageBus } from '@ccjk/v2/agents';

export default class MonitorAgent extends Agent {
  constructor(
    id: string,
    name: string,
    messageBus: MessageBus
  ) {
    super(id, name, AgentRole.MONITOR, messageBus);
  }

  async onMessage(message) {
    if (message.type === 'FILE_CHANGED') {
      console.log(`File changed: ${message.payload.file}`);

      // Analyze the change
      const analysis = await this.analyzeChange(message.payload);

      // Publish results
      this.publish({
        type: 'ANALYSIS_RESULT',
        payload: analysis,
        author: this.id
      });
    }
  }

  private async analyzeChange(change) {
    // Simple analysis
    return {
      file: change.file,
      size: change.content.length,
      complexity: this.calculateComplexity(change.content),
      timestamp: new Date()
    };
  }

  private calculateComplexity(content: string): number {
    return content.split('\n').length;
  }
}
```

### Step 2: Start the Agent

```bash
# Start the agent
c cjk agents start monitor

# Check agent status
c cjk agents status
```

## 🎯 Practice Exercises

### Exercise 1: Hook Enhancement
Modify the TypeScript hook to also check for:
- No unused variables (`noUnusedLocals`)
- No implicit returns (`noImplicitReturns`)

### Exercise 2: Skill Enhancement
Create a skill that:
- Generates commit messages based on code changes
- Uses the chain-of-thought protocol
- Includes examples

### Exercise 3: Agent Collaboration
Create two agents that:
1. Monitor file changes
2. Auto-format code when files change

Make them communicate through the message bus.

## 📈 Next Steps

Now that you've mastered the basics:

1. **Deep Dive**: Read the [Configuration Guide](./configuration.md)
2. **Advanced Hooks**: Learn about [Hook Enforcement](./tutorials/hook-enforcement.md)
3. **Traceability**: Understand the [Traceability Framework](./tutorials/traceability.md)
4. **Skills DSL**: Master the [Skills Domain Language](./tutorials/skills-dsl.md)
5. **Agent Networks**: Build [Multi-Agent Systems](./tutorials/agents-network.md)

## 🆘 Common Issues

### "Hook not triggered"
- Ensure the hook file has `.hook.ts` extension
- Check the matcher configuration
- Verify hooks are enabled in config

### "Redis connection failed"
- Check if Redis is running: `redis-cli ping`
- Verify connection settings in config
- Try `docker ps | grep redis`

### "Skill not found"
- Ensure skill file has `.skill.ts` extension
- Check the skills directory is correct
- Run `ccjk skills list` to see available skills

## 📚 Related Documentation

- [Installation Guide](./installation.md) - Detailed installation instructions
- [Configuration Guide](./configuration.md) - All configuration options
- [Hook Tutorial](./tutorials/hook-enforcement.md) - Deep dive into hooks
- [Troubleshooting](./troubleshooting.md) - Fix common issues

Ready to explore more? Check out the [Hook Enforcement Tutorial](./tutorials/hook-enforcement.md)! 🚀
