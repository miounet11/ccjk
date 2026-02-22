import type { Gene } from './types';

/**
 * Calculate Global Desirability Index (GDI)
 * Based on EvoMap's GDI formula
 */

export function calculateGDI(gene: Gene): number {
  // 1. Intrinsic Quality (35%)
  const intrinsicQuality = calculateIntrinsicQuality(gene) * 35;

  // 2. Usage Metrics (30%)
  const usageMetrics = calculateUsageMetrics(gene) * 30;

  // 3. Social Signals (20%)
  const socialSignals = calculateSocialSignals(gene) * 20;

  // 4. Freshness (15%)
  const freshness = calculateFreshness(gene) * 15;

  return Math.min(100, Math.max(0, intrinsicQuality + usageMetrics + socialSignals + freshness));
}

function calculateIntrinsicQuality(gene: Gene): number {
  let score = 0;

  // Success rate (50%)
  score += gene.quality.successRate * 0.5;

  // Verification pass rate (30%)
  if (gene.verification) {
    score += gene.verification.passRate * 0.3;
  }

  // Has code (20%)
  if (gene.solution.code) {
    score += 0.2;
  }

  return score;
}

function calculateUsageMetrics(gene: Gene): number {
  let score = 0;

  // Usage count (60%)
  // Normalize to 0-1 (1000 uses = 1.0)
  const normalizedUsage = Math.min(gene.quality.usageCount / 1000, 1);
  score += normalizedUsage * 0.6;

  // Average time (40%)
  // Lower time is better
  // Normalize to 0-1 (300s = 0, 0s = 1)
  const normalizedTime = Math.max(0, 1 - gene.quality.avgTime / 300);
  score += normalizedTime * 0.4;

  return score;
}

function calculateSocialSignals(gene: Gene): number {
  // TODO: Implement when we have social features
  // For now, return a base score
  return 0.5;
}

function calculateFreshness(gene: Gene): number {
  const now = Date.now();
  const created = new Date(gene.metadata.createdAt).getTime();
  const ageInDays = (now - created) / (1000 * 60 * 60 * 24);

  // Decay over 365 days
  // 0 days = 1.0, 365 days = 0.0
  return Math.max(0, 1 - ageInDays / 365);
}

/**
 * Calculate context similarity score
 */
export function calculateContextScore(gene: Gene, context: any): number {
  let score = gene.quality.gdi;

  // Language match (+10)
  if (context.language && gene.problem.context.includes(context.language)) {
    score += 10;
  }

  // Framework match (+15)
  if (context.framework && gene.problem.context.includes(context.framework)) {
    score += 15;
  }

  // Version match (+5)
  if (context.version && gene.problem.context.some(c => c.includes(context.version))) {
    score += 5;
  }

  // Tag match (+2 per tag)
  if (context.tags && gene.metadata.tags) {
    const matchingTags = context.tags.filter((t: string) => gene.metadata.tags.includes(t));
    score += matchingTags.length * 2;
  }

  return score;
}
