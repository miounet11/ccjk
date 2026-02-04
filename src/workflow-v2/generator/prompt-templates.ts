/**
 * Prompt Templates for Workflow Generation
 *
 * This module contains templates and builders for creating
 * effective prompts for the AI workflow generator.
 */

import type { ProjectContext, PromptVariables, Workflow } from '../types.js'

export class PromptTemplates {
  /**
   * Build workflow generation prompt
   */
  buildWorkflowPrompt(variables: PromptVariables): string {
    const { task, context, options, examples, customInstructions } = variables

    return `You are an expert workflow generator for CCJK 2.0, a CLI tool that automates AI coding environments.

## Task
${task}

## Project Context
- Language: ${context.language}
- Framework: ${context.framework || 'None'}
- Platform: ${context.platform}
- Package Manager: ${context.packageManager || 'npm'}
- Build Tool: ${context.buildTool || 'None'}
- Testing Framework: ${context.testingFramework || 'None'}

${context.dependencies ? `- Dependencies: ${Object.keys(context.dependencies).slice(0, 10).join(', ')}` : ''}

${context.customContext?.fileSystem
  ? `
## Project Structure
- Has Tests: ${context.customContext.fileSystem.hasTests ? 'Yes' : 'No'}
- Has Documentation: ${context.customContext.fileSystem.hasDocs ? 'Yes' : 'No'}
- Has Config: ${context.customContext.fileSystem.hasConfig ? 'Yes' : 'No'}
- Main Files: ${context.customContext.fileSystem.mainFiles.slice(0, 5).join(', ')}
`
  : ''}

## Generation Options
- Include Tests: ${options?.includeTests !== false ? 'Yes' : 'No'}
- Include Error Handling: ${options?.includeErrorHandling !== false ? 'Yes' : 'No'}
- Optimization Level: ${options?.optimizationLevel || 'balanced'}
- Style: ${options?.style || 'balanced'}

${options?.customRequirements
  ? `
## Custom Requirements
${options.customRequirements.map(r => `- ${r}`).join('\n')}
`
  : ''}

${examples
  ? `
## Example Workflows
${examples}
`
  : ''}

${customInstructions
  ? `
## Custom Instructions
${customInstructions}
`
  : ''}

## Instructions

Generate a comprehensive workflow that accomplishes the task. The workflow MUST:

1. **Be Valid JSON** - Output ONLY a valid JSON object, no markdown formatting
2. **Have Clear Steps** - Each step should have a clear purpose and description
3. **Include Error Handling** - Add error handling for critical steps
4. **Add Validation** - Include validation rules where appropriate
5. **Be Platform-Aware** - Consider the target platform (${context.platform})
6. **Be Realistic** - Use commands and tools that actually exist

## Required JSON Structure

\`\`\`
{
  "id": "workflow-unique-id",
  "name": "Workflow Name",
  "description": "Clear description of what this workflow does",
  "version": "1.0.0",
  "tags": ["tag1", "tag2"],
  "steps": [
    {
      "id": "step-1",
      "name": "Step Name",
      "description": "Detailed description (at least 10 chars)",
      "command": "command to run",
      "dependencies": [],
      "validation": {
        "type": "exit_code",
        "condition": "0"
      },
      "errorHandling": {
        "strategy": "retry",
        "maxAttempts": 3
      },
      "timeout": 300
    }
  ],
  "metadata": {
    "createdAt": "ISO-date",
    "updatedAt": "ISO-date",
    "generatedBy": "ai",
    "complexity": "simple",
    "estimatedDuration": 10
  },
  "requirements": {
    "tools": ["tool1", "tool2"],
    "platforms": ["platform"]
  }
}
\`\`\`

## Step Types to Consider

- **Setup Steps**: Installation, configuration, initialization
- **Development Steps**: Building, compiling, generating code
- **Test Steps**: Running tests, linting, type checking
- **Deployment Steps**: Publishing, releasing, deploying
- **Validation Steps**: Checking results, verifying outputs

## Output Format

IMPORTANT: Output ONLY the raw JSON object. Do NOT wrap it in markdown code blocks. Do NOT add any explanatory text before or after. The entire response should be valid JSON that can be parsed directly.

Generate the workflow now:`
  }

  /**
   * Build fragment composition prompt
   */
  buildFragmentPrompt(fragmentIds: string[], context: ProjectContext): string {
    return `You are an expert workflow composer for CCJK 2.0.

## Task
Compose a workflow from the following fragments: ${fragmentIds.join(', ')}

## Project Context
- Language: ${context.language}
- Framework: ${context.framework || 'None'}
- Platform: ${context.platform}

## Instructions

1. Combine the fragments into a coherent workflow
2. Resolve any dependencies between fragments
3. Add any necessary connecting steps
4. Ensure proper error handling
5. Validate the complete workflow

## Output Format

Output ONLY a valid JSON workflow object (same structure as above). No markdown, no explanations, just raw JSON.

Compose the workflow now:`
  }

  /**
   * Build workflow variation prompt
   */
  buildVariationPrompt(baseWorkflow: Workflow, index: number, context: ProjectContext): string {
    const variations = [
      'Optimize for speed by parallelizing independent steps',
      'Enhance error handling and recovery',
      'Add comprehensive testing and validation',
      'Optimize for resource efficiency',
      'Add more detailed logging and monitoring',
    ]

    const variation = variations[index % variations.length]

    return `You are a workflow optimization expert for CCJK 2.0.

## Base Workflow
${JSON.stringify(baseWorkflow, null, 2)}

## Optimization Goal
${variation}

## Project Context
- Language: ${context.language}
- Platform: ${context.platform}

## Instructions

1. Analyze the base workflow
2. Apply the optimization strategy
3. Maintain all core functionality
4. Document improvements in metadata

## Output Format

Output ONLY a valid JSON workflow object with the same structure as the base workflow.

Generate the optimized workflow now:`
  }

  /**
   * Build step generation prompt
   */
  buildStepPrompt(
    stepName: string,
    stepDescription: string,
    context: ProjectContext,
  ): string {
    return `You are a workflow step expert for CCJK 2.0.

## Step to Generate
- Name: ${stepName}
- Description: ${stepDescription}

## Context
- Language: ${context.language}
- Platform: ${context.platform}

## Instructions

Generate a detailed workflow step with:
1. Specific command or script to execute
2. Appropriate validation rules
3. Error handling strategy
4. Reasonable timeout
5. Dependencies on other steps (if any)

## Output Format

Output ONLY a valid JSON step object:

\`\`\`
{
  "id": "step-id",
  "name": "${stepName}",
  "description": "${stepDescription}",
  "command": "specific command",
  "dependencies": [],
  "validation": {...},
  "errorHandling": {...},
  "timeout": 300
}
\`\`\`

Generate the step now:`
  }

  /**
   * Build validation prompt
   */
  buildValidationPrompt(workflow: Workflow): string {
    return `You are a workflow validation expert for CCJK 2.0.

## Workflow to Validate
${JSON.stringify(workflow, null, 2)}

## Validation Criteria

Check for:
1. **Circular Dependencies** - Steps that depend on each other in a cycle
2. **Missing Dependencies** - References to non-existent steps
3. **Invalid Commands** - Commands that don't exist or are malformed
4. **Timeout Issues** - Steps with unreasonable timeouts
5. **Platform Compatibility** - Commands incompatible with the target platform
6. **Security Issues** - Potentially dangerous operations

## Output Format

Output ONLY a valid JSON validation result:

\`\`\`
{
  "isValid": true/false,
  "errors": [
    {
      "type": "error_type",
      "stepId": "step-id",
      "message": "Error message",
      "severity": "critical|high|medium|low"
    }
  ],
  "warnings": [
    {
      "type": "warning_type",
      "stepId": "step-id",
      "message": "Warning message",
      "suggestion": "Suggested fix"
    }
  ]
}
\`\`\`

Validate the workflow now:`
  }

  /**
   * Build optimization prompt
   */
  buildOptimizationPrompt(workflow: Workflow, goal: 'speed' | 'quality' | 'resources'): string {
    const goals = {
      speed: 'Minimize execution time by parallelizing independent steps and reducing unnecessary operations',
      quality: 'Enhance reliability with better error handling, validation, and testing',
      resources: 'Reduce resource usage (memory, CPU, network) through efficient operations',
    }

    return `You are a workflow optimization expert for CCJK 2.0.

## Workflow to Optimize
${JSON.stringify(workflow, null, 2)}

## Optimization Goal
${goals[goal]}

## Instructions

1. Analyze the workflow for optimization opportunities
2. Apply optimizations aligned with the goal
3. Maintain all core functionality
4. Document all changes
5. Estimate improvements

## Output Format

Output ONLY a valid JSON workflow object with the same structure as the input workflow.

Optimize the workflow now:`
  }

  /**
   * Build test generation prompt
   */
  buildTestPrompt(workflow: Workflow): string {
    return `You are a workflow testing expert for CCJK 2.0.

## Workflow to Test
${JSON.stringify(workflow, null, 2)}

## Instructions

Generate comprehensive test cases for this workflow including:
1. **Happy Path Tests** - Normal execution scenarios
2. **Error Path Tests** - Failure scenarios and recovery
3. **Edge Cases** - Boundary conditions and unusual inputs
4. **Integration Tests** - Interaction with external tools/services

## Output Format

Output ONLY a valid JSON array of test cases:

\`\`\`
[
  {
    "name": "Test name",
    "description": "What this test validates",
    "scenario": "Test scenario",
    "expectedResult": "Expected outcome",
    "mockSetup": "Mock configuration if needed"
  }
]
\`\`\`

Generate test cases now:`
  }
}
