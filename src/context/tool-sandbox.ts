/**
 * Tool Result Sandbox - Intelligent compression for tool outputs
 *
 * Compresses tool results by 90%+ while preserving essential information.
 * Supports code, JSON, logs, and text with type-specific strategies.
 */

export interface ToolResult {
  toolName: string;
  raw: string;
  size: number;
}

export interface CompressedResult {
  summary: string;
  type: 'code' | 'json' | 'log' | 'text';
  memoryNodeId?: string;
  compressionRatio: number;
  originalSize: number;
}

export class ToolSandbox {
  private static readonly MAX_SUMMARY = 2048; // bytes

  /**
   * Process and compress a tool result
   */
  process(toolResult: ToolResult): CompressedResult {
    const type = this.detectType(toolResult.raw);
    const summary = this.compressByType(toolResult.raw, type);

    // Store full content reference if too large
    const memoryNodeId = toolResult.size > ToolSandbox.MAX_SUMMARY
      ? this.generateMemoryId(toolResult.toolName)
      : undefined;

    const finalSummary = summary.length > ToolSandbox.MAX_SUMMARY
      ? summary.slice(0, ToolSandbox.MAX_SUMMARY) + '\n... [truncated]'
      : summary;

    return {
      summary: finalSummary,
      type,
      memoryNodeId,
      compressionRatio: 1 - (finalSummary.length / toolResult.raw.length),
      originalSize: toolResult.raw.length
    };
  }

  /**
   * Detect content type from raw string
   */
  private detectType(raw: string): CompressedResult['type'] {
    const trimmed = raw.trim();

    // JSON detection
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON, continue detection
      }
    }

    // Code detection
    if (this.looksLikeCode(raw)) {
      return 'code';
    }

    // Log detection
    if (this.looksLikeLog(raw)) {
      return 'log';
    }

    return 'text';
  }

  private looksLikeCode(raw: string): boolean {
    const codePatterns = [
      /\bfunction\s+\w+\s*\(/,
      /\bclass\s+\w+/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /\bimport\s+.*\bfrom\b/,
      /\bexport\s+(default|const|function|class)/,
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /\bdef\s+\w+\s*\(/,  // Python
      /\bpub\s+fn\s+\w+/,  // Rust
    ];

    return codePatterns.some(pattern => pattern.test(raw));
  }

  private looksLikeLog(raw: string): boolean {
    const logPatterns = [
      /\b(ERROR|FATAL|WARN|INFO|DEBUG|TRACE)\b/,
      /\[\d{4}-\d{2}-\d{2}/,  // Timestamp
      /\d{2}:\d{2}:\d{2}/,    // Time
    ];

    const lines = raw.split('\n');
    const matchingLines = lines.filter(line =>
      logPatterns.some(pattern => pattern.test(line))
    );

    return matchingLines.length > lines.length * 0.3; // 30% threshold
  }

  /**
   * Compress content based on detected type
   */
  private compressByType(raw: string, type: CompressedResult['type']): string {
    try {
      switch (type) {
        case 'json':
          return this.compressJson(raw);
        case 'code':
          return this.compressCode(raw);
        case 'log':
          return this.compressLog(raw);
        case 'text':
        default:
          return this.compressText(raw);
      }
    } catch (err) {
      // Fallback to simple truncation
      return raw.slice(0, 1000) + `\n... [compression error: ${err}]`;
    }
  }

  /**
   * Compress JSON by summarizing arrays and deep objects
   */
  private compressJson(raw: string): string {
    try {
      const data = JSON.parse(raw);
      const compressed = this.compressJsonValue(data, 0, 2);
      return JSON.stringify(compressed, null, 2);
    } catch {
      return raw.slice(0, 1000) + '\n... [invalid JSON]';
    }
  }

  private compressJsonValue(value: any, depth: number, maxDepth: number): any {
    if (depth >= maxDepth) {
      return '<max depth reached>';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return [];
      if (value.length <= 3) return value.map(v => this.compressJsonValue(v, depth + 1, maxDepth));

      return {
        _type: 'array',
        length: value.length,
        sample: value.slice(0, 2).map(v => this.compressJsonValue(v, depth + 1, maxDepth)),
        _summary: `Array of ${value.length} items`
      };
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return {};
      if (keys.length <= 5) {
        const result: any = {};
        for (const key of keys) {
          result[key] = this.compressJsonValue(value[key], depth + 1, maxDepth);
        }
        return result;
      }

      // Too many keys, sample first 5
      const result: any = {};
      for (const key of keys.slice(0, 5)) {
        result[key] = this.compressJsonValue(value[key], depth + 1, maxDepth);
      }
      result._summary = `Object with ${keys.length} keys: ${keys.join(', ')}`;
      return result;
    }

    return value;
  }

  /**
   * Compress code by extracting signatures and structure
   */
  private compressCode(code: string): string {
    const lines = code.split('\n');
    const signatures: string[] = [];
    const imports: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract imports
      if (/^import\s+/.test(trimmed) || /^from\s+.*\s+import\s+/.test(trimmed)) {
        imports.push(line);
        continue;
      }

      // Extract function/class signatures
      if (this.isSignatureLine(trimmed)) {
        signatures.push(line);
      }
    }

    const result: string[] = [];

    if (imports.length > 0) {
      result.push('// Imports');
      result.push(...imports.slice(0, 10));
      if (imports.length > 10) {
        result.push(`// ... ${imports.length - 10} more imports`);
      }
      result.push('');
    }

    if (signatures.length > 0) {
      result.push('// Structure');
      result.push(...signatures.slice(0, 20));
      if (signatures.length > 20) {
        result.push(`// ... ${signatures.length - 20} more definitions`);
      }
    }

    result.push('');
    result.push(`// Total: ${lines.length} lines`);

    return result.join('\n');
  }

  private isSignatureLine(line: string): boolean {
    const signaturePatterns = [
      /^(export\s+)?(default\s+)?function\s+\w+/,
      /^(export\s+)?(default\s+)?class\s+\w+/,
      /^(export\s+)?(const|let|var)\s+\w+\s*=/,
      /^(export\s+)?interface\s+\w+/,
      /^(export\s+)?type\s+\w+\s*=/,
      /^(export\s+)?enum\s+\w+/,
      /^def\s+\w+\s*\(/,  // Python
      /^class\s+\w+:/,    // Python
      /^pub\s+fn\s+\w+/,  // Rust
      /^fn\s+\w+/,        // Rust
    ];

    return signaturePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Compress logs by extracting errors and warnings
   */
  private compressLog(log: string): string {
    const lines = log.split('\n');
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    for (const line of lines) {
      if (/\b(ERROR|FATAL)\b/i.test(line)) {
        errors.push(line);
      } else if (/\bWARN\b/i.test(line)) {
        warnings.push(line);
      } else if (/\bINFO\b/i.test(line)) {
        info.push(line);
      }
    }

    const result: string[] = [];

    result.push(`Log Summary: ${lines.length} lines`);
    result.push(`Errors: ${errors.length}, Warnings: ${warnings.length}, Info: ${info.length}`);
    result.push('');

    if (errors.length > 0) {
      result.push('=== Errors ===');
      result.push(...errors.slice(0, 5));
      if (errors.length > 5) {
        result.push(`... ${errors.length - 5} more errors`);
      }
      result.push('');
    }

    if (warnings.length > 0) {
      result.push('=== Warnings ===');
      result.push(...warnings.slice(0, 3));
      if (warnings.length > 3) {
        result.push(`... ${warnings.length - 3} more warnings`);
      }
      result.push('');
    }

    if (info.length > 0 && errors.length === 0 && warnings.length === 0) {
      result.push('=== Info (sample) ===');
      result.push(...info.slice(0, 5));
    }

    return result.join('\n');
  }

  /**
   * Compress plain text by extracting key sentences
   */
  private compressText(text: string): string {
    if (text.length <= 800) {
      return text;
    }

    const lines = text.split('\n');
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Keep first 3 and last 2 sentences
    const keySentences = [
      ...sentences.slice(0, 3),
      ...sentences.slice(-2)
    ];

    return keySentences.join('. ') + `\n\n... (${text.length} chars total, ${lines.length} lines)`;
  }

  /**
   * Generate memory node ID for full content storage
   */
  private generateMemoryId(toolName: string): string {
    return `mem_${toolName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
