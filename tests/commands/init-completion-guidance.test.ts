import { beforeEach, describe, expect, it } from 'vitest';
import { getSetupCompletionGuidance } from '../../src/commands/init';
import { initI18n } from '../../src/i18n';

describe('init completion guidance', () => {
  beforeEach(async () => {
    await initI18n('en');
  });

  it('uses Clavue-specific completion guidance for installed workflow commands', () => {
    const guidance = getSetupCompletionGuidance('clavue');

    expect(guidance.step1).toContain('clavue');
    expect(guidance.step1Detail).toContain('/ccjk:feat');
    expect(guidance.step1Detail).toContain('/ccjk:git-commit');
    expect(guidance.step1Detail2).toContain('/ccjk:init-project');
    expect(guidance.step1Detail2).toContain('/commands');
    expect(guidance.step1Detail2).not.toContain('/commit');
    expect(guidance.step1Detail2).not.toContain('/workflow');
    expect(guidance.step1Detail2).not.toContain('/ccjk - View All');
    expect(guidance.step3Command).toBe('/commands');
    expect(guidance.step4).toContain('Verify setup health');
    expect(guidance.step4Command).toBe('npx ccjk doctor');
    expect(guidance.step5).toContain('Keep CCJK updated');
    expect(guidance.step5Command).toBe('npx ccjk update');
  });

  it('keeps claude-code completion guidance for installed workflow commands', () => {
    const guidance = getSetupCompletionGuidance('claude-code');

    expect(guidance.step1).toContain('Claude Code');
    expect(guidance.step1Detail).toContain('/ccjk:feat');
    expect(guidance.step1Detail2).toContain('/commands');
    expect(guidance.step3Command).toBe('npx ccjk features');
    expect(guidance.step4Command).toBe('npx ccjk doctor');
    expect(guidance.step5Command).toBe('npx ccjk update');
  });
});
