/**
 * Semantic compression algorithm
 * Compresses text by removing redundant information while preserving meaning
 */

import { CompressionAlgorithm } from '../../types';

export interface SemanticCompressionResult {
  compressed: string;
  removedInfo: string[];
  originalSize: number;
  compressedSize: number;
}

export interface SemanticDecompressionResult {
  decompressed: string;
  success: boolean;
  error?: string;
}

/**
 * Semantic Compression implementation
 */
export class SemanticCompression {
  private readonly aggressiveness: number;

  constructor(aggressiveness: number = 0.5) {
    // Aggressiveness: 0 (conservative) to 1 (aggressive)
    this.aggressiveness = Math.max(0, Math.min(1, aggressiveness));
  }

  /**
   * Compress text using semantic analysis
   */
  compress(text: string): SemanticCompressionResult {
    const originalSize = text.length;
    let compressed = text;
    const removedInfo: string[] = [];

    // Apply compression techniques based on aggressiveness
    compressed = this.removeRedundantWhitespace(compressed);
    compressed = this.compressCommonPhrases(compressed, removedInfo);
    compressed = this.removeFillerWords(compressed, removedInfo);

    if (this.aggressiveness > 0.3) {
      compressed = this.abbreviateCommonTerms(compressed, removedInfo);
    }

    if (this.aggressiveness > 0.6) {
      compressed = this.removeRedundantSentences(compressed, removedInfo);
    }

    return {
      compressed,
      removedInfo,
      originalSize,
      compressedSize: compressed.length,
    };
  }

  /**
   * Decompress semantically compressed text
   */
  decompress(compressed: string): SemanticDecompressionResult {
    try {
      // Semantic compression is mostly lossy, but we can restore some patterns
      let decompressed = compressed;

      // Restore abbreviated terms
      decompressed = this.restoreAbbreviations(decompressed);

      // Restore common phrases
      decompressed = this.restoreCommonPhrases(decompressed);

      return {
        decompressed,
        success: true,
      };
    } catch (error) {
      return {
        decompressed: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove redundant whitespace
   */
  private removeRedundantWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      .trim();
  }

  /**
   * Compress common phrases
   */
  private compressCommonPhrases(text: string, removedInfo: string[]): string {
    const phraseMap: Record<string, string> = {
      'in order to': 'to',
      'due to the fact that': 'because',
      'at this point in time': 'now',
      'for the purpose of': 'for',
      'in the event that': 'if',
      'with regard to': 'regarding',
      'with reference to': 'regarding',
      'it is important to note that': '',
      'it should be noted that': '',
      'as a matter of fact': 'actually',
      'at the present time': 'now',
      'in the near future': 'soon',
      'on a regular basis': 'regularly',
      'in spite of the fact that': 'although',
      'until such time as': 'until',
    };

    let compressed = text;

    for (const [phrase, replacement] of Object.entries(phraseMap)) {
      const regex = new RegExp(phrase, 'gi');
      if (regex.test(compressed)) {
        removedInfo.push(`phrase:${phrase}->${replacement}`);
        compressed = compressed.replace(regex, replacement);
      }
    }

    return compressed;
  }

  /**
   * Remove filler words based on aggressiveness
   */
  private removeFillerWords(text: string, removedInfo: string[]): string {
    const fillerWords = [
      'actually', 'basically', 'essentially', 'literally',
      'really', 'very', 'quite', 'rather', 'somewhat',
      'just', 'simply', 'merely', 'only',
    ];

    let compressed = text;

    // Only remove if aggressiveness is high enough
    if (this.aggressiveness > 0.4) {
      for (const word of fillerWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        if (regex.test(compressed)) {
          removedInfo.push(`filler:${word}`);
          compressed = compressed.replace(regex, '');
        }
      }
    }

    return compressed;
  }

  /**
   * Abbreviate common technical terms
   */
  private abbreviateCommonTerms(text: string, removedInfo: string[]): string {
    const abbreviations: Record<string, string> = {
      'function': 'fn',
      'parameter': 'param',
      'parameters': 'params',
      'argument': 'arg',
      'arguments': 'args',
      'variable': 'var',
      'variables': 'vars',
      'configuration': 'config',
      'initialize': 'init',
      'implementation': 'impl',
      'interface': 'iface',
      'application': 'app',
      'database': 'db',
      'repository': 'repo',
      'environment': 'env',
      'development': 'dev',
      'production': 'prod',
      'documentation': 'docs',
      'specification': 'spec',
      'authentication': 'auth',
      'authorization': 'authz',
      'administrator': 'admin',
      'information': 'info',
      'message': 'msg',
      'error': 'err',
      'response': 'resp',
      'request': 'req',
    };

    let compressed = text;

    for (const [term, abbr] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(compressed)) {
        removedInfo.push(`abbr:${term}->${abbr}`);
        compressed = compressed.replace(regex, abbr);
      }
    }

    return compressed;
  }

  /**
   * Remove redundant sentences (aggressive)
   */
  private removeRedundantSentences(text: string, removedInfo: string[]): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const uniqueSentences = new Set<string>();
    const kept: string[] = [];

    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().trim();

      // Check for semantic similarity (simple approach)
      let isDuplicate = false;
      for (const existing of uniqueSentences) {
        if (this.areSimilar(normalized, existing)) {
          isDuplicate = true;
          removedInfo.push(`duplicate:${sentence.trim()}`);
          break;
        }
      }

      if (!isDuplicate) {
        uniqueSentences.add(normalized);
        kept.push(sentence.trim());
      }
    }

    return kept.join('. ') + (kept.length > 0 ? '.' : '');
  }

  /**
   * Check if two sentences are semantically similar
   */
  private areSimilar(s1: string, s2: string): boolean {
    // Simple similarity check based on word overlap
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    const similarity = intersection.size / union.size;

    // Consider similar if > 70% word overlap
    return similarity > 0.7;
  }

  /**
   * Restore abbreviations
   */
  private restoreAbbreviations(text: string): string {
    const expansions: Record<string, string> = {
      'fn': 'function',
      'param': 'parameter',
      'params': 'parameters',
      'arg': 'argument',
      'args': 'arguments',
      'var': 'variable',
      'vars': 'variables',
      'config': 'configuration',
      'init': 'initialize',
      'impl': 'implementation',
      'iface': 'interface',
      'app': 'application',
      'db': 'database',
      'repo': 'repository',
      'env': 'environment',
      'dev': 'development',
      'prod': 'production',
      'docs': 'documentation',
      'spec': 'specification',
      'auth': 'authentication',
      'authz': 'authorization',
      'admin': 'administrator',
      'info': 'information',
      'msg': 'message',
      'err': 'error',
      'resp': 'response',
      'req': 'request',
    };

    let restored = text;

    for (const [abbr, term] of Object.entries(expansions)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'g');
      restored = restored.replace(regex, term);
    }

    return restored;
  }

  /**
   * Restore common phrases
   */
  private restoreCommonPhrases(text: string): string {
    // Most phrase compressions are acceptable in decompressed form
    // Only restore critical ones
    return text
      .replace(/\bto\b/g, 'in order to')
      .replace(/\bbecause\b/g, 'due to the fact that');
  }

  /**
   * Get algorithm identifier
   */
  getAlgorithm(): CompressionAlgorithm {
    return CompressionAlgorithm.SEMANTIC;
  }
}
