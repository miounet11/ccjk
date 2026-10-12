import { writeFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── In-memory file system ──────────────────────────────────

const { fsStore } = vi.hoisted(() => ({
  fsStore: {} as Record<string, string>,
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn((path: string) => path in fsStore),
  readFileSync: vi.fn((path: string, _encoding: string) => {
    if (path in fsStore) return fsStore[path]
    throw new Error(`ENOENT: ${path}`)
  }),
  writeFileSync: vi.fn((path: string, data: string) => {
    fsStore[path] = data
  }),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
}))

import {
  createModelRouting,
  deleteProviderProfile,
  generateProfileId,
  getActiveProviderProfileId,
  getProviderProfile,
  listProviderProfiles,
  saveProviderProfile,
  setActiveProviderProfile,
} from '../../../src/utils/clavue-provider-profile'

const CLAVUE_JSON_PATH = '/mock-home/.clavue/.clavue.json'
const CREDENTIALS_JSON_PATH = '/mock-home/.clavue/.credentials.json'

// ── Tests ──────────────────────────────────────────────────

describe('clavue-provider-profile', () => {
  beforeEach(() => {
    // Reset in-memory file system
    for (const key of Object.keys(fsStore)) {
      delete fsStore[key]
    }
    vi.clearAllMocks()
  })

  // ── createModelRouting ──────────────────────────────────

  describe('createModelRouting', () => {
    it('maps primary model to all slots when no others specified', () => {
      const result = createModelRouting({ primaryModel: 'claude-sonnet-4-20250514' })
      expect(result.primaryModel).toBe('claude-sonnet-4-20250514')
      expect(result.subagentModel).toBe('claude-sonnet-4-20250514')
      expect(result.smallFastModel).toBe('claude-sonnet-4-20250514')
      expect(result.planModel).toBe('claude-sonnet-4-20250514')
      expect(result.exploreModel).toBe('claude-sonnet-4-20250514')
      expect(result.generalModel).toBe('claude-sonnet-4-20250514')
      expect(result.teamModel).toBe('claude-sonnet-4-20250514')
      expect(result.guideModel).toBe('claude-sonnet-4-20250514')
      expect(result.reviewModel).toBe('')
    })

    it('maps primary/haiku/sonnet/opus to correct 9 slots', () => {
      const result = createModelRouting({
        primaryModel: 'claude-sonnet-4-20250514',
        haikuModel: 'claude-haiku-4-20250514',
        sonnetModel: 'claude-sonnet-4-20250514',
        opusModel: 'claude-opus-4-20250514',
      })
      expect(result.primaryModel).toBe('claude-sonnet-4-20250514')
      expect(result.smallFastModel).toBe('claude-haiku-4-20250514')
      expect(result.subagentModel).toBe('claude-sonnet-4-20250514')
      expect(result.generalModel).toBe('claude-sonnet-4-20250514')
      expect(result.exploreModel).toBe('claude-sonnet-4-20250514')
      expect(result.teamModel).toBe('claude-sonnet-4-20250514')
      expect(result.planModel).toBe('claude-opus-4-20250514')
      expect(result.guideModel).toBe('claude-opus-4-20250514')
      expect(result.reviewModel).toBe('')
    })

    it('falls back to primary for haiku/sonnet/opus when not specified', () => {
      const result = createModelRouting({
        primaryModel: 'gpt-5',
        haikuModel: 'gpt-5-mini',
      })
      expect(result.primaryModel).toBe('gpt-5')
      expect(result.smallFastModel).toBe('gpt-5-mini')
      expect(result.subagentModel).toBe('gpt-5')
      expect(result.planModel).toBe('gpt-5')
      expect(result.guideModel).toBe('gpt-5')
    })

    it('handles empty primary model', () => {
      const result = createModelRouting({})
      expect(result.primaryModel).toBe('')
      expect(result.smallFastModel).toBe('')
      expect(result.subagentModel).toBe('')
      expect(result.reviewModel).toBe('')
    })

    it('handles partial model specification', () => {
      const result = createModelRouting({
        sonnetModel: 'claude-sonnet-4-20250514',
        opusModel: 'claude-opus-4-20250514',
      })
      expect(result.primaryModel).toBe('')
      expect(result.smallFastModel).toBe('')
      expect(result.subagentModel).toBe('claude-sonnet-4-20250514')
      expect(result.exploreModel).toBe('claude-sonnet-4-20250514')
      expect(result.generalModel).toBe('claude-sonnet-4-20250514')
      expect(result.teamModel).toBe('claude-sonnet-4-20250514')
      expect(result.planModel).toBe('claude-opus-4-20250514')
      expect(result.guideModel).toBe('claude-opus-4-20250514')
    })
  })

  // ── generateProfileId ────────────────────────────────────

  describe('generateProfileId', () => {
    it('converts to lowercase', () => {
      expect(generateProfileId('MyProfile')).toBe('myprofile')
      expect(generateProfileId('ANTHROPIC')).toBe('anthropic')
    })

    it('replaces spaces and special chars with dashes', () => {
      expect(generateProfileId('My Profile')).toBe('my-profile')
      expect(generateProfileId('OpenAI Key')).toBe('openai-key')
      expect(generateProfileId('hello@world!test')).toBe('hello-world-test')
    })

    it('collapses multiple consecutive dashes', () => {
      expect(generateProfileId('a--b')).toBe('a-b')
      expect(generateProfileId('a---b')).toBe('a-b')
      expect(generateProfileId('My  Profile  Test')).toBe('my-profile-test')
    })

    it('removes leading and trailing dashes', () => {
      expect(generateProfileId('-leading')).toBe('leading')
      expect(generateProfileId('trailing-')).toBe('trailing')
      expect(generateProfileId('-both-')).toBe('both')
    })

    it('keeps alphanumeric chars and dashes', () => {
      expect(generateProfileId('my-profile-123')).toBe('my-profile-123')
      expect(generateProfileId('test-v2-final')).toBe('test-v2-final')
    })

    it('handles empty string', () => {
      expect(generateProfileId('')).toBe('')
    })
  })

  // ── saveProviderProfile ─────────────────────────────────

  describe('saveProviderProfile', () => {
    it('creates a new profile and writes to both files', () => {
      const profile = saveProviderProfile({
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test-123',
      })

      expect(profile.id).toBe('test-provider')
      expect(profile.name).toBe('Test Provider')
      expect(profile.providerId).toBe('custom')
      expect(profile.baseUrl).toBe('https://api.example.com')
      expect(profile.authType).toBe('api_key')
      expect(profile.provenance).toEqual({ kind: 'manual' })
      expect(typeof profile.createdAt).toBe('number')
      expect(typeof profile.updatedAt).toBe('number')
      expect(profile.modelRouting).toBeDefined()
      expect(profile.modelRouting.primaryModel).toBe('')

      // Verify .clavue.json was written
      expect(writeFileSync).toHaveBeenCalledWith(
        CLAVUE_JSON_PATH,
        expect.any(String),
      )
      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(clavueData.clavueProviderProfiles).toHaveLength(1)
      expect(clavueData.clavueProviderProfiles[0].id).toBe('test-provider')
      expect(clavueData.activeProviderProfileId).toBe('test-provider')

      // Verify .credentials.json was written
      expect(writeFileSync).toHaveBeenCalledWith(
        CREDENTIALS_JSON_PATH,
        expect.any(String),
      )
      const credData = JSON.parse(fsStore[CREDENTIALS_JSON_PATH])
      expect(credData.providerProfiles['test-provider']).toEqual({
        credential: 'sk-test-123',
        authType: 'api_key',
      })
    })

    it('updates existing profile — preserves createdAt, updates updatedAt', () => {
      vi.useFakeTimers()
      // Create initial profile at a known time
      const initial = saveProviderProfile({
        id: 'update-test',
        name: 'Initial',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-initial',
      })

      const originalCreatedAt = initial.createdAt

      // Advance time and update the profile
      vi.advanceTimersByTime(5000)
      const updated = saveProviderProfile({
        id: 'update-test',
        name: 'Updated',
        baseUrl: 'https://api.new-example.com',
        authType: 'api_key',
        apiKey: 'sk-updated',
      })
      vi.useRealTimers()

      expect(updated.createdAt).toBe(originalCreatedAt)
      expect(updated.updatedAt).toBeGreaterThan(initial.updatedAt)
      expect(updated.name).toBe('Updated')
      expect(updated.baseUrl).toBe('https://api.new-example.com')

      // Only one profile should exist
      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(clavueData.clavueProviderProfiles).toHaveLength(1)

      // Credential should be updated
      const credData = JSON.parse(fsStore[CREDENTIALS_JSON_PATH])
      expect(credData.providerProfiles['update-test'].credential).toBe('sk-updated')
    })

    it('skips credential write when apiKey is empty', () => {
      saveProviderProfile({
        id: 'no-key',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: '',
      })

      // .clavue.json should exist
      expect(fsStore[CLAVUE_JSON_PATH]).toBeDefined()

      // .credentials.json should NOT be written (no key)
      expect(fsStore[CREDENTIALS_JSON_PATH]).toBeUndefined()
    })

    it('preserves modelMode from existing profile when not provided in update', () => {
      saveProviderProfile({
        id: 'mode-test',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
        modelMode: 'anthropic_native',
      })

      // Update without modelMode
      const updated = saveProviderProfile({
        id: 'mode-test',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
      })

      expect(updated.modelMode).toBe('anthropic_native')
    })

    it('preserves apiDialectMode from existing profile when not provided in update', () => {
      saveProviderProfile({
        id: 'dialect-test',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
        apiDialectMode: 'anthropic_messages',
      })

      // Update without apiDialectMode
      const updated = saveProviderProfile({
        id: 'dialect-test',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
      })

      expect(updated.apiDialectMode).toBe('anthropic_messages')
    })

    it('overwrites modelMode when explicitly set to new value', () => {
      saveProviderProfile({
        id: 'mode-overwrite',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
        modelMode: 'anthropic_native',
      })

      const updated = saveProviderProfile({
        id: 'mode-overwrite',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
        modelMode: 'openai_native',
      })

      expect(updated.modelMode).toBe('openai_native')
    })

    it('does not set modelMode when not provided and no existing value', () => {
      const profile = saveProviderProfile({
        id: 'no-mode',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
      })

      expect(profile.modelMode).toBeUndefined()
      expect(profile.apiDialectMode).toBeUndefined()
    })

    it('sets new profile as active by default', () => {
      saveProviderProfile({
        id: 'auto-active',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
      })

      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(clavueData.activeProviderProfileId).toBe('auto-active')
    })

    it('does not set as active when setAsActive is false', () => {
      saveProviderProfile({
        id: 'not-active',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
        setAsActive: false,
      })

      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(clavueData.activeProviderProfileId).toBeUndefined()
    })

    it('uses default modelRouting when none provided', () => {
      const profile = saveProviderProfile({
        id: 'default-routing',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
      })

      expect(profile.modelRouting).toBeDefined()
      expect(profile.modelRouting.primaryModel).toBe('')
      expect(profile.modelRouting.reviewModel).toBe('')
      expect(profile.modelRouting.presetId).toBeUndefined()
    })

    it('uses custom modelRouting when provided', () => {
      const profile = saveProviderProfile({
        id: 'custom-routing',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-test',
        modelRouting: {
          primaryModel: 'gpt-5',
          subagentModel: 'gpt-5-mini',
          smallFastModel: 'gpt-5-nano',
          planModel: 'gpt-5',
          exploreModel: 'gpt-5-mini',
          generalModel: 'gpt-5-mini',
          teamModel: 'gpt-5-mini',
          guideModel: 'gpt-5',
          reviewModel: '',
        },
      })

      expect(profile.modelRouting.primaryModel).toBe('gpt-5')
      expect(profile.modelRouting.smallFastModel).toBe('gpt-5-nano')
    })
  })

  // ── deleteProviderProfile ────────────────────────────────

  describe('deleteProviderProfile', () => {
    it('removes profile and credential', () => {
      saveProviderProfile({
        id: 'to-delete',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-delete',
      })
      saveProviderProfile({
        id: 'to-keep',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-keep',
      })

      const result = deleteProviderProfile('to-delete')
      expect(result).toBe(true)

      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(clavueData.clavueProviderProfiles).toHaveLength(1)
      expect(clavueData.clavueProviderProfiles[0].id).toBe('to-keep')

      const credData = JSON.parse(fsStore[CREDENTIALS_JSON_PATH])
      expect(credData.providerProfiles['to-delete']).toBeUndefined()
      expect(credData.providerProfiles['to-keep']).toBeDefined()
    })

    it('returns false for non-existent profile', () => {
      const result = deleteProviderProfile('nonexistent')
      expect(result).toBe(false)
    })

    it('sets active to next profile when deleting the active one', () => {
      saveProviderProfile({
        id: 'first',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-first',
      })
      saveProviderProfile({
        id: 'second',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-second',
      })

      // 'first' should be active (set as active when created, but second was created after so might override)
      // Create them in a way that ensures 'first' is active
      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      clavueData.activeProviderProfileId = 'first'
      fsStore[CLAVUE_JSON_PATH] = JSON.stringify(clavueData)

      deleteProviderProfile('first')

      const updatedData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(updatedData.activeProviderProfileId).toBe('second')
    })

    it('clears active when deleting the only profile', () => {
      saveProviderProfile({
        id: 'only',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-only',
      })

      deleteProviderProfile('only')

      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(clavueData.activeProviderProfileId).toBeUndefined()
      expect(clavueData.clavueProviderProfiles).toHaveLength(0)
    })

    it('does not change active when deleting a non-active profile', () => {
      saveProviderProfile({
        id: 'active-one',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-active',
      })
      saveProviderProfile({
        id: 'inactive',
        baseUrl: 'https://api.example.com',
        authType: 'api_key',
        apiKey: 'sk-inactive',
      })

      // Ensure active-one is active
      const clavueData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      clavueData.activeProviderProfileId = 'active-one'
      fsStore[CLAVUE_JSON_PATH] = JSON.stringify(clavueData)

      deleteProviderProfile('inactive')

      const updatedData = JSON.parse(fsStore[CLAVUE_JSON_PATH])
      expect(updatedData.activeProviderProfileId).toBe('active-one')
    })
  })

  // ── setActiveProviderProfile ─────────────────────────────

  describe('setActiveProviderProfile', () => {
    beforeEach(() => {
      saveProviderProfile({
        id: 'profile-a',
        baseUrl: 'https://api.a.com',
        authType: 'api_key',
        apiKey: 'sk-a',
        setAsActive: false,
      })
      saveProviderProfile({
        id: 'profile-b',
        baseUrl: 'https://api.b.com',
        authType: 'api_key',
        apiKey: 'sk-b',
        setAsActive: false,
      })
    })

    it('sets the active profile ID in .clavue.json', () => {
      const result = setActiveProviderProfile('profile-a')
      expect(result).toBe(true)

      expect(getActiveProviderProfileId()).toBe('profile-a')
    })

    it('returns false for non-existent profile', () => {
      const result = setActiveProviderProfile('missing')
      expect(result).toBe(false)
    })

    it('switches active from one to another', () => {
      setActiveProviderProfile('profile-a')
      expect(getActiveProviderProfileId()).toBe('profile-a')

      setActiveProviderProfile('profile-b')
      expect(getActiveProviderProfileId()).toBe('profile-b')
    })
  })

  // ── list/get profiles ────────────────────────────────────

  describe('listProviderProfiles / getProviderProfile', () => {
    beforeEach(() => {
      saveProviderProfile({
        id: 'list-a',
        name: 'Profile A',
        baseUrl: 'https://api.a.com',
        authType: 'api_key',
        apiKey: 'sk-a',
      })
      saveProviderProfile({
        id: 'list-b',
        name: 'Profile B',
        baseUrl: 'https://api.b.com',
        authType: 'api_key',
        apiKey: 'sk-b',
      })
    })

    it('lists all provider profiles', () => {
      const profiles = listProviderProfiles()
      expect(profiles).toHaveLength(2)
      expect(profiles.map(p => p.id)).toEqual(['list-a', 'list-b'])
    })

    it('returns empty array when no profiles exist', () => {
      for (const key of Object.keys(fsStore)) {
        delete fsStore[key]
      }
      expect(listProviderProfiles()).toEqual([])
    })

    it('gets a single profile by ID', () => {
      const profile = getProviderProfile('list-a')
      expect(profile).toBeDefined()
      expect(profile!.id).toBe('list-a')
      expect(profile!.name).toBe('Profile A')
    })

    it('returns undefined for non-existent profile', () => {
      expect(getProviderProfile('missing')).toBeUndefined()
    })

    it('gets the active provider profile ID', () => {
      // The last saved profile (list-b) should be active by default
      expect(getActiveProviderProfileId()).toBe('list-b')
    })
  })
})
