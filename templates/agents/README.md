# Agent Templates

This directory contains agent definition templates for CCJK v8.0.0's multi-agent orchestration system.

## Available Agents

| Agent ID | Name | Model | Category | Complexity |
|----------|------|-------|----------|------------|
| `typescript-architect` | TypeScript Architect | sonnet | development | advanced |
| `react-specialist` | React Specialist | sonnet | development | intermediate-advanced |
| `python-expert` | Python Expert | sonnet | development | intermediate-advanced |
| `go-expert` | Go Expert | sonnet | development | intermediate-advanced |
| `fullstack-developer` | Full-Stack Developer | sonnet | development | intermediate-advanced |
| `testing-automation-expert` | Testing Automation Expert | opus | quality-assurance | advanced |

## Agent Template Structure

Each agent template follows this JSON structure:

```json
{
  "id": "unique-agent-id",
  "name": {
    "en": "English Name",
    "zh-CN": "中文名称"
  },
  "description": {
    "en": "English description",
    "zh-CN": "中文描述"
  },
  "persona": "Detailed persona description (100+ words)",
  "capabilities": ["list", "of", "capabilities"],
  "skills": ["skill-id-1", "skill-id-2"],
  "mcpServers": ["mcp-server-1", "mcp-server-2"],
  "systemPrompt": "System prompt for the agent",
  "instructions": [
    "Specific instruction 1",
    "Specific instruction 2"
  ],
  "triggers": [
    "condition that triggers this agent",
    "another trigger condition"
  ],
  "model": "sonnet|opus|haiku",
  "metadata": {
    "version": "1.0.0",
    "author": "ccjk-team",
    "category": "development|quality-assurance|devops",
    "tags": ["tag1", "tag2"],
    "complexity": "beginner|intermediate|advanced",
    "experience_level": "beginner|intermediate|senior"
  }
}
```

## Usage

These templates are used by CCJK's agent orchestration system to:

1. **Agent Selection**: Choose the most appropriate agent based on user queries and triggers
2. **Context Setup**: Configure the agent with proper persona, skills, and MCP servers
3. **Instruction Following**: Provide specific guidelines for each agent's behavior
4. **Model Assignment**: Use the optimal Claude model for each agent's complexity

## Model Selection Strategy

- **Opus**: Complex reasoning tasks, advanced architecture decisions
- **Sonnet**: Balanced performance for most development tasks
- **Haiku**: Fast responses for simple operations and templates

## Extending the System

To add new agents:

1. Create a new JSON file following the template structure
2. Define clear triggers and capabilities
3. Choose appropriate MCP servers for the agent's domain
4. Update this README with the new agent information