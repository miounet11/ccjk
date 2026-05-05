/**
 * Intent Detector - Automatically detect user intent and trigger skills
 */

import type { CcjkSkill } from './types';

export interface IntentMatch {
  skill: CcjkSkill;
  confidence: number;
  trigger: string;
}

/**
 * Intent patterns for automatic skill triggering
 */
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  commit: [
    /(commit|提交|push|推送)/i,
    /(git\s+commit|git\s+push)/i,
    /(save\s+changes|保存更改)/i,
  ],
  review: [
    /(review|审查|检查|check)/i,
    /(code\s+review|代码审查)/i,
    /(pull\s+request|pr)/i,
  ],
  test: [
    /(test|测试|tdd)/i,
    /(unit\s+test|单元测试)/i,
    /(write\s+test|编写测试)/i,
  ],
  feature: [
    /(feature|功能|implement|实现)/i,
    /(new\s+feature|新功能)/i,
    /(add\s+feature|添加功能)/i,
  ],
  debug: [
    /(bug|错误|debug|调试|fix|修复)/i,
    /(error|异常|exception)/i,
    /(not\s+working|无法工作)/i,
  ],
  brainstorm: [
    /(idea|想法|design|设计|plan|规划)/i,
    /(brainstorm|头脑风暴)/i,
    /(architecture|架构)/i,
  ],
  verify: [
    /(verify|验证|validate|校验)/i,
    /(quality|质量|check\s+code)/i,
  ],
  docs: [
    /(doc|文档|documentation)/i,
    /(readme|说明)/i,
    /(comment|注释)/i,
  ],
};

/**
 * Detect user intent from input text
 */
export function detectIntent(input: string, skills: CcjkSkill[]): IntentMatch[] {
  const matches: IntentMatch[] = [];
  const lowerInput = input.toLowerCase();

  for (const skill of skills) {
    if (!skill.enabled)
      continue;

    // Check direct trigger match (highest confidence)
    for (const trigger of skill.triggers) {
      if (lowerInput.includes(trigger.toLowerCase())) {
        matches.push({ skill, confidence: 1.0, trigger });
        continue;
      }
    }

    // Check intent patterns (medium confidence)
    const category = skill.category;
    const patterns = INTENT_PATTERNS[category] || [];

    for (const pattern of patterns) {
      if (pattern.test(input)) {
        matches.push({ skill, confidence: 0.7, trigger: skill.triggers[0] });
        break;
      }
    }

    // Check tags (low confidence)
    if (skill.tags) {
      for (const tag of skill.tags) {
        if (lowerInput.includes(tag.toLowerCase())) {
          matches.push({ skill, confidence: 0.5, trigger: skill.triggers[0] });
          break;
        }
      }
    }
  }

  // Sort by confidence and remove duplicates
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .filter((match, index, self) =>
      index === self.findIndex(m => m.skill.id === match.skill.id),
    );
}

/**
 * Get skill recommendation message
 */
export function getRecommendationMessage(matches: IntentMatch[], lang: 'en' | 'zh-CN' = 'en'): string {
  if (matches.length === 0)
    return '';

  const topMatch = matches[0];
  const skillName = typeof topMatch.skill.name === 'string'
    ? topMatch.skill.name
    : topMatch.skill.name[lang] || topMatch.skill.name.en;

  if (lang === 'zh-CN') {
    return `💡 检测到意图，推荐使用技能: ${skillName} (输入 "${topMatch.trigger}")`;
  }

  return `💡 Intent detected, recommended skill: ${skillName} (type "${topMatch.trigger}")`;
}
