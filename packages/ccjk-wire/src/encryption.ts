import { randomBytes } from 'crypto';
import nacl from 'tweetnacl';

/**
 * Encryption utilities for CCJK remote control
 * Uses TweetNaCl for end-to-end encryption
 */

// Generate random bytes
export function getRandomBytes(length: number): Uint8Array {
  return new Uint8Array(randomBytes(length));
}

// Base64 encoding/decoding
export function encodeBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

export function decodeBase64(data: string): Uint8Array {
  return new Uint8Array(Buffer.from(data, 'base64'));
}

// Generate key pair for asymmetric encryption
export function generateKeyPair(): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  };
}

// Encrypt data with public key (for session keys)
export function encryptForPublicKey(data: Uint8Array, publicKey: Uint8Array): Uint8Array {
  const nonce = getRandomBytes(nacl.box.nonceLength);
  const ephemeralKeyPair = nacl.box.keyPair();

  const encrypted = nacl.box(
    data,
    nonce,
    publicKey,
    ephemeralKeyPair.secretKey
  );

  // Combine: ephemeral public key + nonce + encrypted data
  const result = new Uint8Array(
    ephemeralKeyPair.publicKey.length + nonce.length + encrypted.length
  );
  result.set(ephemeralKeyPair.publicKey, 0);
  result.set(nonce, ephemeralKeyPair.publicKey.length);
  result.set(encrypted, ephemeralKeyPair.publicKey.length + nonce.length);

  return result;
}

// Decrypt data with secret key
export function decryptWithSecretKey(
  encryptedData: Uint8Array,
  secretKey: Uint8Array
): Uint8Array | null {
  const ephemeralPublicKeyLength = nacl.box.publicKeyLength;
  const nonceLength = nacl.box.nonceLength;

  if (encryptedData.length < ephemeralPublicKeyLength + nonceLength) {
    return null;
  }

  const ephemeralPublicKey = encryptedData.slice(0, ephemeralPublicKeyLength);
  const nonce = encryptedData.slice(
    ephemeralPublicKeyLength,
    ephemeralPublicKeyLength + nonceLength
  );
  const ciphertext = encryptedData.slice(ephemeralPublicKeyLength + nonceLength);

  return nacl.box.open(ciphertext, nonce, ephemeralPublicKey, secretKey);
}

// Symmetric encryption (for message content)
export function encryptSymmetric(data: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = getRandomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(data, nonce, key);

  // Combine: nonce + encrypted data
  const result = new Uint8Array(nonce.length + encrypted.length);
  result.set(nonce, 0);
  result.set(encrypted, nonce.length);

  return result;
}

// Symmetric decryption
export function decryptSymmetric(
  encryptedData: Uint8Array,
  key: Uint8Array
): Uint8Array | null {
  const nonceLength = nacl.secretbox.nonceLength;

  if (encryptedData.length < nonceLength) {
    return null;
  }

  const nonce = encryptedData.slice(0, nonceLength);
  const ciphertext = encryptedData.slice(nonceLength);

  return nacl.secretbox.open(ciphertext, nonce, key);
}

// Encrypt JSON object
export function encryptJson<T>(
  data: T,
  key: Uint8Array,
  variant: 'symmetric' | 'asymmetric' = 'symmetric',
  publicKey?: Uint8Array
): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);

  let encrypted: Uint8Array;
  if (variant === 'asymmetric' && publicKey) {
    encrypted = encryptForPublicKey(bytes, publicKey);
  } else {
    encrypted = encryptSymmetric(bytes, key);
  }

  return encodeBase64(encrypted);
}

// Decrypt JSON object
export function decryptJson<T>(
  encryptedData: string,
  key: Uint8Array,
  variant: 'symmetric' | 'asymmetric' = 'symmetric'
): T | null {
  const encrypted = decodeBase64(encryptedData);

  let decrypted: Uint8Array | null;
  if (variant === 'asymmetric') {
    decrypted = decryptWithSecretKey(encrypted, key);
  } else {
    decrypted = decryptSymmetric(encrypted, key);
  }

  if (!decrypted) {
    return null;
  }

  const json = new TextDecoder().decode(decrypted);
  return JSON.parse(json) as T;
}
