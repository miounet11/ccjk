/**
 * CCJK Skills V2 - Runtime Engine
 *
 * Executes cognitive protocols with enforced reasoning chains and
 * L1→L3→L2 execution flow.
 */

import {
  CognitiveProtocol,
  ReasoningChain,
  ExecutionContext,
  ExecutionTrace,
  ExecutionStep,
  ExecutionError,
  ExecutionResult,
  RuntimeConfig,
  Skill,
  Layer,
  SkillError,
  SkillErrorType,
} from './types.js';

/**
 * Runtime engine for executing cognitive protocols
 */
export class Runtime {
  private config: RuntimeConfig;
  private trace: ExecutionTrace;

  constructor(config: Partial<RuntimeConfig> = {}) {
    this.config = {
      enforceReasoningChain: true,
      traceExecution: true,
      maxExecutionTime: 30000, // 30 seconds
      allowFallback: true,
      outputFormat: 'structured',
      ...config,
    };
    this.trace = this.createTrace();
  }

  /**
   * Execute a skill with the given input
   */
  async execute(skill: Skill, input: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.trace = this.createTrace();

    try {
      // Step 1: L1 - Language/Syntax analysis
      const l1Result = await this.executeL1(skill, input);

      // Step 2: L3 - Domain constraints application
      const l3Result = await this.executeL3(skill, l1Result);

      // Step 3: L2 - Design pattern application
      const l2Result = await this.executeL2(skill, l3Result);

      // Build reasoning chain
      const reasoningChain: ReasoningChain = {
        layer1: this.extractL1Insight(l1Result),
        layer3: this.extractL3Insight(l3Result),
        layer2: this.extractL2Insight(l2Result),
      };

      // Create execution context
      const context: ExecutionContext = {
        skill,
        input,
        reasoningChain,
        trace: this.trace,
      };

      // Format output
      const output = this.formatOutput(l2Result, context);

      const endTime = Date.now();
      this.trace.endTime = new Date();

      return {
        success: true,
        output,
        reasoningChain,
        trace: this.trace,
        metadata: {
          executionTime: endTime - startTime,
          tokensUsed: this.estimateTokens(input, output),
          layerAccessed: [Layer.L1, Layer.L3, Layer.L2],
        },
      };
    } catch (error) {
      return this.handleError(error, input, startTime);
    }
  }

  /**
   * Execute L1 layer - Language mechanisms
   */
  private async executeL1(skill: Skill, input: any): Promise<any> {
    this.addStep(Layer.L1, 'Analyzing language/syntax patterns', { input });

    try {
      // Extract language patterns from input
      const patterns = this.extractPatterns(input);
      const syntaxErrors = this.detectSyntaxErrors(input);
      const transformations = this.applyL1Transforms(skill, patterns);

      const result = {
        patterns,
        errors: syntaxErrors,
        transformations,
        recommendations: this.generateL1Recommendations(syntaxErrors, patterns),
      };

      this.addStep(Layer.L1, 'Completed language analysis', result);
      return result;
    } catch (error) {
      this.addError(Layer.L1, 'L1 execution failed', error);
      throw error;
    }
  }

  /**
   * Execute L3 layer - Domain constraints
   */
  private async executeL3(skill: Skill, l1Result: any): Promise<any> {
    this.addStep(Layer.L3, 'Applying domain constraints', { l1Result });

    try {
      // Validate against domain constraints
      const violations = this.validateConstraints(skill, l1Result);
      const enrichedContext = this.enrichWithDomainKnowledge(l1Result);
      const constraints = this.extractConstraints(skill);

      // If constraints are violated, we need to adjust the approach
      if (violations.length > 0) {
        this.addStep(Layer.L3, 'Constraint violations detected', violations);

        // Generate constraint-based recommendations
        const adjustments = this.generateConstraintAdjustments(violations, constraints);

        return {
          violations,
          adjustments,
          enrichedContext,
          mustUsePattern: this.determineRequiredPattern(violations),
        };
      }

      const result = {
        validated: true,
        enrichedContext,
        constraints,
        violations: [],
      };

      this.addStep(Layer.L3, 'Domain constraints applied successfully', result);
      return result;
    } catch (error) {
      this.addError(Layer.L3, 'L3 execution failed', error);
      throw error;
    }
  }

  /**
   * Execute L2 layer - Design patterns
   */
  private async executeL2(skill: Skill, l3Result: any): Promise<any> {
    this.addStep(Layer.L2, 'Applying design patterns', { l3Result });

    try {
      // Select appropriate design pattern based on L3 results
      const pattern = this.selectPattern(skill, l3Result);
      const implementation = this.generateImplementation(pattern, l3Result);
      const examples = this.generateExamples(pattern, l3Result);

      // If L3 had violations, apply corrective patterns
      if (l3Result.violations?.length > 0) {
        const correctivePattern = this.selectCorrectivePattern(l3Result.violations);
        const correctiveImplementation = this.generateCorrectiveImplementation(correctivePattern, l3Result);

        const result = {
          pattern: correctivePattern,
          implementation: correctiveImplementation,
          examples: this.generateCorrectiveExamples(correctivePattern),
          originalPattern: pattern,
          reason: 'Constraint violation required pattern adjustment',
        };

        this.addStep(Layer.L2, 'Applied corrective design pattern', result);
        return result;
      }

      const result = {
        pattern,
        implementation,
        examples,
        bestPractices: this.generateBestPractices(pattern),
      };

      this.addStep(Layer.L2, 'Design pattern applied successfully', result);
      return result;
    } catch (error) {
      this.addError(Layer.L2, 'L2 execution failed', error);
      throw error;
    }
  }

  /**
   * Extract patterns from input
   */
  private extractPatterns(input: any): any[] {
    const patterns = [];

    if (typeof input === 'string') {
      // Look for common code patterns
      if (input.includes('try {')) {
        patterns.push({ type: 'error-handling', pattern: 'try-catch' });
      }
      if (input.includes('async ')) {
        patterns.push({ type: 'async', pattern: 'async-await' });
      }
      if (input.includes('class ')) {
        patterns.push({ type: 'oop', pattern: 'class-definition' });
      }
      if (input.includes('interface ')) {
        patterns.push({ type: 'typing', pattern: 'interface-definition' });
      }
    }

    return patterns;
  }

  /**
   * Detect syntax errors or anti-patterns
   */
  private detectSyntaxErrors(input: any): any[] {
    const errors = [];

    if (typeof input === 'string') {
      // Look for common anti-patterns
      if (input.includes('var ')) {
        errors.push({
          type: 'deprecated-keyword',
          message: 'Use let/const instead of var',
          severity: 'warning',
        });
      }
      if (input.includes('==') && !input.includes('===')) {
        errors.push({
          type: 'loose-equality',
          message: 'Consider using strict equality (===)',
          severity: 'suggestion',
        });
      }
    }

    return errors;
  }

  /**
   * Apply L1 transformations
   */
  private applyL1Transforms(skill: Skill, patterns: any[]): any[] {
    const transforms = [];

    // Apply language-level transformations based on patterns
    for (const pattern of patterns) {
      switch (pattern.pattern) {
        case 'try-catch':
          transforms.push({
            from: 'try-catch',
            to: 'Result<T, E>',
            reason: 'Prefer result types over exceptions',
          });
          break;
        case 'async-await':
          transforms.push({
            from: 'async-await',
            to: 'Task<T>',
            reason: 'Consider task-based abstractions',
          });
          break;
      }
    }

    return transforms;
  }

  /**
   * Generate L1 recommendations
   */
  private generateL1Recommendations(errors: any[], patterns: any[]): string[] {
    const recommendations = [];

    if (errors.some(e => e.type === 'deprecated-keyword')) {
      recommendations.push('Update code to use modern JavaScript syntax');
    }

    if (patterns.some(p => p.pattern === 'try-catch')) {
      recommendations.push('Consider using Result types for error handling');
    }

    return recommendations;
  }

  /**
   * Validate against domain constraints
   */
  private validateConstraints(skill: Skill, l1Result: any): any[] {
    const violations = [];

    // Extract constraints from skill AST
    const l3Layer = skill.ast.layers.find(l => l.layer === Layer.L3);
    if (l3Layer) {
      for (const constraint of l3Layer.constraints) {
        // Simple validation logic (would be more sophisticated in real implementation)
        if (constraint.condition.includes('typed') && l1Result.patterns.some((p: any) => p.type === 'oop')) {
          violations.push({
            constraint: constraint.condition,
            message: constraint.errorMessage || 'Type constraint violated',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Enrich with domain knowledge
   */
  private enrichWithDomainKnowledge(l1Result: any): any {
    return {
      ...l1Result,
      domainContext: 'Based on cognitive protocol analysis',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract constraints from skill
   */
  private extractConstraints(skill: Skill): any[] {
    const constraints = [];
    const l3Layer = skill.ast.layers.find(l => l.layer === Layer.L3);
    if (l3Layer) {
      return l3Layer.constraints.map(c => ({
        condition: c.condition,
        validation: c.validation,
        message: c.errorMessage,
      }));
    }
    return constraints;
  }

  /**
   * Generate constraint adjustments
   */
  private generateConstraintAdjustments(violations: any[], constraints: any[]): any[] {
    const adjustments = [];

    for (const violation of violations) {
      adjustments.push({
        violation: violation.constraint,
        adjustment: `Adjust implementation to satisfy: ${violation.constraint}`,
        priority: 'high',
      });
    }

    return adjustments;
  }

  /**
   * Determine required pattern based on violations
   */
  private determineRequiredPattern(violations: any[]): string {
    if (violations.some(v => v.constraint.includes('typed'))) {
      return 'Type-Safe Wrapper';
    }
    return 'Default Pattern';
  }

  /**
   * Select design pattern
   */
  private selectPattern(skill: Skill, l3Result: any): any {
    const l2Layer = skill.ast.layers.find(l => l.layer === Layer.L2);
    if (l2Layer && l2Layer.patterns.length > 0) {
      return {
        name: l2Layer.patterns[0].pattern,
        implementation: l2Layer.patterns[0].implementation,
        examples: l2Layer.patterns[0].examples,
      };
    }

    return {
      name: 'Default Pattern',
      implementation: 'Standard implementation',
      examples: [],
    };
  }

  /**
   * Generate implementation
   */
  private generateImplementation(pattern: any, l3Result: any): string {
    return `// Implementation of ${pattern.name}
// Based on domain constraints: ${JSON.stringify(l3Result.constraints || [])}
${pattern.implementation}`;
  }

  /**
   * Generate examples
   */
  private generateExamples(pattern: any, l3Result: any): string[] {
    return pattern.examples.map((ex: string) => `// Example: ${ex}`);
  }

  /**
   * Generate best practices
   */
  private generateBestPractices(pattern: any): string[] {
    return [
      `Follow the ${pattern.name} pattern consistently`,
      'Document the rationale for pattern choice',
      'Test edge cases specific to this pattern',
    ];
  }

  /**
   * Select corrective pattern
   */
  private selectCorrectivePattern(violations: any[]): any {
    return {
      name: 'Constraint Compliance Wrapper',
      description: 'Pattern that ensures domain constraints are satisfied',
    };
  }

  /**
   * Generate corrective implementation
   */
  private generateCorrectiveImplementation(pattern: any, l3Result: any): string {
    return `// Corrective implementation to handle violations:
// ${JSON.stringify(l3Result.violations)}
${pattern.implementation || '// TODO: Implement corrective measures'}`;
  }

  /**
   * Generate corrective examples
   */
  private generateCorrectiveExamples(pattern: any): string[] {
    return [
      '// Before: Violates constraints',
      '// After: Complies with all domain rules',
    ];
  }

  /**
   * Extract insights from each layer
   */
  private extractL1Insight(result: any): string {
    return `Language level: ${result.patterns.length} patterns detected, ${result.errors.length} issues found`;
  }

  private extractL3Insight(result: any): string {
    if (result.violations.length > 0) {
      return `Domain constraints: ${result.violations.length} violations require pattern adjustment`;
    }
    return 'Domain constraints: All constraints satisfied';
  }

  private extractL2Insight(result: any): string {
    return `Design pattern: ${result.pattern.name} applied${result.reason ? ` (${result.reason})` : ''}`;
  }

  /**
   * Format output based on configuration
   */
  private formatOutput(result: any, context: ExecutionContext): any {
    switch (this.config.outputFormat) {
      case 'json':
        return {
          result,
          reasoningChain: context.reasoningChain,
          trace: this.trace,
        };

      case 'text':
        return this.formatAsText(result, context);

      case 'structured':
      default:
        return {
          implementation: result.implementation,
          pattern: result.pattern,
          reasoning: context.reasoningChain,
          bestPractices: result.bestPractices,
        };
    }
  }

  /**
   * Format as human-readable text
   */
  private formatAsText(result: any, context: ExecutionContext): string {
    const lines = [
      '🔍 Cognitive Protocol Execution Result',
      '=====================================',
      '',
      '📝 Reasoning Chain:',
      `  L1 (Language): ${context.reasoningChain.layer1}`,
      `  L3 (Domain): ${context.reasoningChain.layer3}`,
      `  L2 (Design): ${context.reasoningChain.layer2}`,
      '',
      '💡 Implementation:',
      result.implementation,
      '',
      '📚 Examples:',
      ...(result.examples || []).map((ex: string) => `  ${ex}`),
      '',
      '✨ Best Practices:',
      ...(result.bestPractices || []).map((bp: string) => `  • ${bp}`),
    ];

    return lines.join('\n');
  }

  /**
   * Handle execution errors
   */
  private handleError(error: any, input: any, startTime: number): ExecutionResult {
    const endTime = Date.now();
    this.trace.endTime = new Date();

    this.addError(Layer.L2, 'Execution failed', error);

    if (this.config.allowFallback) {
      // Provide a fallback response
      return {
        success: false,
        output: {
          error: error.message,
          fallback: 'Using basic pattern due to execution error',
          basicImplementation: '// Basic implementation due to error',
        },
        reasoningChain: {
          layer1: 'Error occurred during language analysis',
          layer3: 'Fallback to basic constraints',
          layer2: 'Using default pattern due to error',
        },
        trace: this.trace,
        metadata: {
          executionTime: endTime - startTime,
          tokensUsed: 0,
          layerAccessed: [Layer.L1, Layer.L3, Layer.L2],
        },
      };
    }

    throw error;
  }

  /**
   * Create new execution trace
   */
  private createTrace(): ExecutionTrace {
    return {
      startTime: new Date(),
      steps: [],
      errors: [],
    };
  }

  /**
   * Add execution step
   */
  private addStep(layer: Layer, action: string, result: any): void {
    if (this.config.traceExecution) {
      this.trace.steps.push({
        timestamp: new Date(),
        layer,
        action,
        result,
      });
    }
  }

  /**
   * Add execution error
   */
  private addError(layer: Layer, action: string, error: any): void {
    if (this.config.traceExecution) {
      this.trace.errors.push({
        timestamp: new Date(),
        layer,
        error: error.message || String(error),
        recovery: this.config.allowFallback ? 'Using fallback approach' : undefined,
      });
    }
  }

  /**
   * Estimate token usage (rough approximation)
   */
  private estimateTokens(input: any, output: any): number {
    const inputStr = JSON.stringify(input);
    const outputStr = JSON.stringify(output);
    return Math.ceil((inputStr.length + outputStr.length) / 4); // Rough estimate: 4 chars per token
  }
}

/**
 * Create a runtime instance with default configuration
 */
export function createRuntime(config?: Partial<RuntimeConfig>): Runtime {
  return new Runtime(config);
}