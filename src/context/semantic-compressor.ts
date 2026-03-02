/**
 * Semantic Compressor - Intelligent message history compression
 *
 * Compresses conversation history by:
 * - Keeping recent N messages intact
 * - Extracting intent from older user messages
 * - Extracting key decisions from assistant messages
 * - Merging similar consecutive messages
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompressionStats {
  originalCount: number;
  compressedCount: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export class SemanticCompressor {
  private static readonly KEEP_RECENT = 5;
  private static readonly SIMILARITY_THRESHOLD = 0.7;

  /**
   * Compress message history while preserving context
   */
  compress(messages: Message[]): Message[] {
    if (messages.length <= SemanticCompressor.KEEP_RECENT) {
      return messages;
    }

    const recent = messages.slice(-SemanticCompressor.KEEP_RECENT);
    const old = messages.slice(0, -SemanticCompressor.KEEP_RECENT);

    // Compress old messages
    const compressedOld = old.map(msg => ({
      role: msg.role,
      content: msg.role === 'user'
        ? this.extractIntent(msg.content)
        : msg.role === 'assistant'
        ? this.extractDecisions(msg.content)
        : msg.content // Keep system messages as-is
    }));

    // Merge similar consecutive messages
    const merged = this.mergeSimilar(compressedOld);

    return [...merged, ...recent];
  }

  /**
   * Get compression statistics
   */
  getStats(original: Message[], compressed: Message[]): CompressionStats {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = JSON.stringify(compressed).length;

    return {
      originalCount: original.length,
      compressedCount: compressed.length,
      originalSize,
      compressedSize,
      compressionRatio: 1 - (compressedSize / originalSize)
    };
  }

  /**
   * Extract user intent from message
   */
  private extractIntent(content: string): string {
    // Extract action keywords
    const actionKeywords = this.extractActionKeywords(content);

    // Extract entities (file names, function names, etc.)
    const entities = this.extractEntities(content);

    // Keep first 200 chars for context
    const preview = content.slice(0, 200);

    const parts: string[] = [];

    if (preview.length < content.length) {
      parts.push(`${preview}...`);
    } else {
      parts.push(preview);
    }

    if (actionKeywords.length > 0) {
      parts.push(`\nIntent: ${actionKeywords.join(', ')}`);
    }

    if (entities.length > 0) {
      parts.push(`\nEntities: ${entities.slice(0, 5).join(', ')}`);
    }

    return parts.join('');
  }

  private extractActionKeywords(content: string): string[] {
    const keywords = new Set<string>();
    const actionPatterns = [
      /\b(refactor|refactoring)\b/gi,
      /\b(debug|debugging|fix|fixing)\b/gi,
      /\b(implement|implementing|add|adding)\b/gi,
      /\b(remove|removing|delete|deleting)\b/gi,
      /\b(optimize|optimizing|improve|improving)\b/gi,
      /\b(test|testing|verify|verifying)\b/gi,
      /\b(review|reviewing|check|checking)\b/gi,
      /\b(create|creating|build|building)\b/gi,
      /\b(update|updating|modify|modifying)\b/gi,
      /\b(analyze|analyzing|investigate|investigating)\b/gi,
    ];

    for (const pattern of actionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => keywords.add(match.toLowerCase()));
      }
    }

    return Array.from(keywords);
  }

  private extractEntities(content: string): string[] {
    const entities = new Set<string>();

    // File paths
    const filePaths = content.match(/[\w-]+\/[\w\/-]+\.[\w]+/g);
    if (filePaths) {
      filePaths.forEach(path => entities.add(path));
    }

    // Function/class names (camelCase or PascalCase)
    const identifiers = content.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g);
    if (identifiers) {
      identifiers.forEach(id => entities.add(id));
    }

    // Quoted strings (likely important terms)
    const quoted = content.match(/["'`]([^"'`]+)["'`]/g);
    if (quoted) {
      quoted.forEach(q => entities.add(q.slice(1, -1)));
    }

    return Array.from(entities);
  }

  /**
   * Extract key decisions from assistant message
   */
  private extractDecisions(content: string): string {
    const decisions: string[] = [];

    // Extract decision markers
    const decisionPatterns = [
      /(?:decision|choose|chose|selected?|decided?):\s*([^.\n]+)/gi,
      /(?:will|should|must)\s+(?:use|implement|apply|adopt)\s+([^.\n]+)/gi,
      /(?:recommend|suggest|propose)(?:ed)?\s+([^.\n]+)/gi,
      /(?:avoid|don't|shouldn't)\s+([^.\n]+)/gi,
    ];

    for (const pattern of decisionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          decisions.push(match[1].trim());
        }
      }
    }

    // Extract code blocks (keep structure only)
    const codeBlocks = content.match(/```[\w]*\n[\s\S]*?```/g);
    const codeBlockCount = codeBlocks ? codeBlocks.length : 0;

    const parts: string[] = [];

    if (decisions.length > 0) {
      parts.push('Decisions:');
      parts.push(...decisions.slice(0, 5).map(d => `- ${d}`));
      if (decisions.length > 5) {
        parts.push(`... ${decisions.length - 5} more decisions`);
      }
    } else {
      // No explicit decisions, keep first 300 chars
      parts.push(content.slice(0, 300));
      if (content.length > 300) {
        parts.push('...');
      }
    }

    if (codeBlockCount > 0) {
      parts.push(`\n[${codeBlockCount} code block${codeBlockCount > 1 ? 's' : ''}]`);
    }

    return parts.join('\n');
  }

  /**
   * Merge similar consecutive messages
   */
  private mergeSimilar(messages: Message[]): Message[] {
    if (messages.length === 0) return [];

    const merged: Message[] = [];
    let current = messages[0];

    for (let i = 1; i < messages.length; i++) {
      const next = messages[i];

      // Only merge messages with same role
      if (current.role === next.role && this.areSimilar(current.content, next.content)) {
        // Merge content
        current = {
          role: current.role,
          content: `${current.content}\n[Merged similar message]`
        };
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * Check if two messages are similar using Levenshtein distance
   */
  private areSimilar(a: string, b: string): boolean {
    // Quick length check
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);

    if (maxLen === 0) return true;
    if (minLen / maxLen < 0.5) return false; // Too different in length

    // Use normalized Levenshtein distance
    const distance = this.levenshtein(a.slice(0, 500), b.slice(0, 500)); // Limit for performance
    const normalized = 1 - (distance / Math.max(a.length, b.length, 1));

    return normalized >= SemanticCompressor.SIMILARITY_THRESHOLD;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[a.length][b.length];
  }
}
