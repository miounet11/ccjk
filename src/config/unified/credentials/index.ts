/**
 * Credential Manager Index
 *
 * Main exports for the credential management system
 */

export * from './manager'
export type {
  Credential,
  CredentialWithValue,
  EncryptedCredentialStorage,
  EncryptedCredential,
  CredentialStorageOptions,
  CredentialQueryOptions,
  KeyDerivationOptions,
} from './types'
export { DEFAULT_KEY_DERIVATION } from './types'
