/**
 * Credential Manager Index
 *
 * Main exports for the credential management system
 */

export * from './manager'
export type {
  Credential,
  CredentialQueryOptions,
  CredentialStorageOptions,
  CredentialWithValue,
  EncryptedCredential,
  EncryptedCredentialStorage,
  KeyDerivationOptions,
} from './types'
export { DEFAULT_KEY_DERIVATION } from './types'
