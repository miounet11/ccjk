import { describe, expect, it } from 'vitest';
import { resolveClaudeFamilyModelSlots } from '../../src/utils/claude-model-slots';

describe('claude-family model slot resolver', () => {
  it('maps provider defaults by exact positional slots', () => {
    expect(resolveClaudeFamilyModelSlots({
      defaultModels: [
        '  GPT-5.4-EXACT  ',
        'gpt-5.3-codex-spark',
        'MiniMax-M2',
        'Claude-Opus-4.6',
      ],
    })).toEqual({
      primaryModel: 'GPT-5.4-EXACT',
      haikuModel: 'gpt-5.3-codex-spark',
      sonnetModel: 'MiniMax-M2',
      opusModel: 'Claude-Opus-4.6',
    });
  });

  it('locks every slot to an exact selected model', () => {
    expect(resolveClaudeFamilyModelSlots({
      defaultModels: ['gpt-5.4', 'gpt-5.3-codex-spark'],
      selectedModel: '  Claude-Opus-4.6  ',
    })).toEqual({
      primaryModel: 'Claude-Opus-4.6',
      haikuModel: 'Claude-Opus-4.6',
      sonnetModel: 'Claude-Opus-4.6',
      opusModel: 'Claude-Opus-4.6',
    });
  });
});
