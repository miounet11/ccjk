import { parse } from 'smol-toml';
import { describe, expect, it } from 'vitest';
import {
  buildCodexGoalsFeatureConfigContent,
  isCodexGoalsFeatureEnabled,
  parseCodexConfig,
  renderCodexConfig,
  setCodexGoalsFeatureInContent,
} from '../../src/utils/code-tools/codex';

describe('codex goals feature config', () => {
  it('adds a features section when missing', () => {
    const content = 'model = "gpt-5.5"\n';
    const next = buildCodexGoalsFeatureConfigContent(content);
    const parsed = parse(next) as any;

    expect(parsed.features.goals).toBe(true);
    expect(next).toContain('[features]');
  });

  it('updates an existing goals flag without dropping user config', () => {
    const content = [
      'model = "gpt-5.5"',
      '',
      '[features]',
      '# user setting',
      'goals = false',
      '',
      '[projects."/tmp/project"]',
      'trust_level = "trusted"',
      '',
    ].join('\n');

    const next = setCodexGoalsFeatureInContent(content, true);
    const parsed = parse(next) as any;

    expect(parsed.features.goals).toBe(true);
    expect(next).toContain('# user setting');
    expect(next).toContain('[projects."/tmp/project"]');
    expect(next).toContain('trust_level = "trusted"');
  });

  it('preserves Codex feature flags when rendering managed config', () => {
    const config = parseCodexConfig([
      'model = "gpt-5.5"',
      '',
      '[features]',
      'goals = true',
      '',
      '[model_providers.ttqq]',
      'name = "ttqq"',
      'base_url = "https://ttqq.inping.com/v1"',
      'wire_api = "responses"',
      'temp_env_key = "OPENAI_API_KEY"',
      'requires_openai_auth = false',
      '',
      '[projects."/tmp/project"]',
      'trust_level = "trusted"',
      '',
    ].join('\n'));

    const rendered = renderCodexConfig({
      ...config,
      modelProvider: 'ttqq',
    });
    const parsed = parse(rendered) as any;

    expect(parsed.features.goals).toBe(true);
    expect(rendered).toContain('[projects."/tmp/project"]');
  });

  it('detects whether the feature is enabled', () => {
    expect(isCodexGoalsFeatureEnabled('[features]\ngoals = true\n')).toBe(true);
    expect(isCodexGoalsFeatureEnabled('[features]\ngoals = false\n')).toBe(false);
    expect(isCodexGoalsFeatureEnabled('not toml')).toBe(false);
  });
});
