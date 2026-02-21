import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  encryptForPublicKey,
  decryptWithSecretKey,
  encryptSymmetric,
  decryptSymmetric,
  encryptJson,
  decryptJson,
  encodeBase64,
  decodeBase64,
} from './encryption';

describe('Encryption', () => {
  describe('Base64 encoding', () => {
    it('should encode and decode correctly', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const encoded = encodeBase64(data);
      const decoded = decodeBase64(encoded);

      expect(decoded).toEqual(data);
    });
  });

  describe('Asymmetric encryption', () => {
    it('should generate valid key pair', () => {
      const keyPair = generateKeyPair();

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.secretKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.secretKey.length).toBe(32);
    });

    it('should encrypt and decrypt with key pair', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Secret message');

      const encrypted = encryptForPublicKey(message, keyPair.publicKey);
      const decrypted = decryptWithSecretKey(encrypted, keyPair.secretKey);

      expect(decrypted).not.toBeNull();
      expect(new TextDecoder().decode(decrypted!)).toBe('Secret message');
    });

    it('should fail to decrypt with wrong key', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const message = new TextEncoder().encode('Secret message');

      const encrypted = encryptForPublicKey(message, keyPair1.publicKey);
      const decrypted = decryptWithSecretKey(encrypted, keyPair2.secretKey);

      expect(decrypted).toBeNull();
    });
  });

  describe('Symmetric encryption', () => {
    it('should encrypt and decrypt with symmetric key', () => {
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      const message = new TextEncoder().encode('Symmetric secret');

      const encrypted = encryptSymmetric(message, key);
      const decrypted = decryptSymmetric(encrypted, key);

      expect(decrypted).not.toBeNull();
      expect(new TextDecoder().decode(decrypted!)).toBe('Symmetric secret');
    });

    it('should fail to decrypt with wrong key', () => {
      const key1 = new Uint8Array(32);
      const key2 = new Uint8Array(32);
      crypto.getRandomValues(key1);
      crypto.getRandomValues(key2);
      const message = new TextEncoder().encode('Symmetric secret');

      const encrypted = encryptSymmetric(message, key1);
      const decrypted = decryptSymmetric(encrypted, key2);

      expect(decrypted).toBeNull();
    });
  });

  describe('JSON encryption', () => {
    it('should encrypt and decrypt JSON objects', () => {
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      const data = { foo: 'bar', num: 42, nested: { a: 1 } };

      const encrypted = encryptJson(data, key);
      const decrypted = decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should handle complex objects', () => {
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      const data = {
        sessionId: 'session-123',
        events: [
          { type: 'text', content: 'Hello' },
          { type: 'tool-call', name: 'read', args: { path: '/foo' } },
        ],
        metadata: {
          timestamp: Date.now(),
          user: 'test-user',
        },
      };

      const encrypted = encryptJson(data, key);
      const decrypted = decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });
  });
});
