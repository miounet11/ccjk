import { decryptEnvelope as wireDecrypt } from '@ccjk/wire';
import { decode as base64Decode } from 'base64-arraybuffer';

/**
 * Decrypt message envelope
 */
export function decryptMessage(envelope: any, sessionKey: Uint8Array): any {
  try {
    return wireDecrypt(envelope, sessionKey);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    return null;
  }
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const buffer = base64Decode(base64);
  return new Uint8Array(buffer);
}

/**
 * Get session key from storage or config
 * In production, this should be securely exchanged via key exchange protocol
 */
export async function getSessionKey(sessionId: string): Promise<Uint8Array | null> {
  try {
    // TODO: Implement secure key exchange
    // For now, return null and handle gracefully
    console.warn('Session key exchange not implemented yet');
    return null;
  } catch (error) {
    console.error('Failed to get session key:', error);
    return null;
  }
}
