import { describe, it, expect } from 'vitest';
import { createEnvelope, createEncryptedContent } from './protocol';
import { isCuid } from '@paralleldrive/cuid2';

describe('Protocol', () => {
  describe('createEnvelope', () => {
    it('should create valid envelope with required fields', () => {
      const envelope = createEnvelope('user', 'session-123', {
        t: 'text',
        text: 'Hello world',
      });

      expect(isCuid(envelope.id)).toBe(true);
      expect(envelope.role).toBe('user');
      expect(envelope.sessionId).toBe('session-123');
      expect(envelope.ev.t).toBe('text');
      expect(envelope.time).toBeGreaterThan(0);
      expect(envelope.encrypted).toBe(false);
    });

    it('should accept optional fields', () => {
      const envelope = createEnvelope('agent', 'session-456', {
        t: 'status',
        state: 'thinking',
      }, {
        turnId: 'turn-1',
        subagent: 'agent-1',
        encrypted: true,
      });

      expect(envelope.turnId).toBe('turn-1');
      expect(envelope.subagent).toBe('agent-1');
      expect(envelope.encrypted).toBe(true);
    });

    it('should generate unique IDs', () => {
      const env1 = createEnvelope('user', 'session-1', { t: 'text', text: 'a' });
      const env2 = createEnvelope('user', 'session-1', { t: 'text', text: 'b' });

      expect(env1.id).not.toBe(env2.id);
    });
  });

  describe('createEncryptedContent', () => {
    it('should create encrypted content structure', () => {
      const content = createEncryptedContent('base64encodeddata');

      expect(content.t).toBe('encrypted');
      expect(content.c).toBe('base64encodeddata');
      expect(content.v).toBe(1);
    });
  });
});
