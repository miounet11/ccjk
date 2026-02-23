/**
 * Cloud Client - Notification Tests
 *
 * Comprehensive test coverage for notification API endpoints:
 * - Bind (success + failure paths)
 * - Notify (success + failure paths)
 * - Poll (success + failure paths)
 *
 * @module tests/cloud-client/notifications
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CCJKCloudClient } from '../../src/services/cloud-notification'
import type {
  BindRequest,
  BindResponse,
  NotifyRequest,
  NotifyResponse,
  PollResponse,
} from '../../src/cloud-client/notifications/types'
import {
  validateBindRequest,
  validateBindResponse,
  validateNotifyRequest,
  validateNotifyResponse,
  validatePollResponse,
} from '../../src/cloud-client/notifications/types'

// Mock the gateway
const mockGatewayRequest = vi.fn()
const mockGatewaySetAuthToken = vi.fn()

vi.mock('../../src/cloud-client/gateway', () => ({
  createDefaultGateway: () => ({
    request: mockGatewayRequest,
    setAuthToken: mockGatewaySetAuthToken,
  }),
}))

// Mock file system operations
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

vi.mock('../../src/utils/fs-operations', () => ({
  writeFileAtomic: vi.fn(),
}))

vi.mock('../../src/utils/notification/token', () => ({
  getDeviceInfo: vi.fn(() => ({
    name: 'Test Device',
    platform: 'darwin',
    hostname: 'test-host',
    username: 'test-user',
  })),
}))

describe('Cloud Client - Notification DTOs', () => {
  describe('Validation Functions', () => {
    describe('validateBindRequest', () => {
      it('should validate valid bind request', () => {
        const request: BindRequest = {
          code: 'ABC123',
          deviceInfo: {
            name: 'Test Device',
            platform: 'darwin',
            hostname: 'test-host',
            username: 'test-user',
          },
        }

        const result = validateBindRequest(request)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject missing code', () => {
        const request = {
          deviceInfo: {
            name: 'Test Device',
            platform: 'darwin',
            hostname: 'test-host',
            username: 'test-user',
          },
        } as BindRequest

        const result = validateBindRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('code is required and must be a string')
      })

      it('should reject short code', () => {
        const request: BindRequest = {
          code: 'ABC',
          deviceInfo: {
            name: 'Test Device',
            platform: 'darwin',
            hostname: 'test-host',
            username: 'test-user',
          },
        }

        const result = validateBindRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('code must be at least 4 characters')
      })

      it('should reject missing deviceInfo', () => {
        const request = {
          code: 'ABC123',
        } as BindRequest

        const result = validateBindRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('deviceInfo is required and must be an object')
      })

      it('should reject invalid deviceInfo fields', () => {
        const request: BindRequest = {
          code: 'ABC123',
          deviceInfo: {
            name: '',
            platform: '',
            hostname: 'test-host',
            username: 'test-user',
          },
        }

        const result = validateBindRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('validateNotifyRequest', () => {
      it('should validate valid notify request', () => {
        const request: NotifyRequest = {
          title: 'Test Notification',
          body: 'This is a test notification',
          type: 'info',
        }

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject missing title', () => {
        const request = {
          body: 'This is a test notification',
        } as NotifyRequest

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('title is required and must be a string')
      })

      it('should reject missing body', () => {
        const request = {
          title: 'Test Notification',
        } as NotifyRequest

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('body is required and must be a string')
      })

      it('should reject title too long', () => {
        const request: NotifyRequest = {
          title: 'A'.repeat(201),
          body: 'Test body',
        }

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('title must be 200 characters or less')
      })

      it('should reject body too long', () => {
        const request: NotifyRequest = {
          title: 'Test title',
          body: 'A'.repeat(4001),
        }

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('body must be 4000 characters or less')
      })

      it('should reject invalid type', () => {
        const request: NotifyRequest = {
          title: 'Test title',
          body: 'Test body',
          type: 'invalid' as any,
        }

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('type must be one of: info, success, warning, error')
      })

      it('should validate actions', () => {
        const request: NotifyRequest = {
          title: 'Test title',
          body: 'Test body',
          actions: [
            { id: 'yes', label: 'Yes', value: 'yes' },
            { id: 'no', label: 'No', value: 'no' },
          ],
        }

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid actions', () => {
        const request: NotifyRequest = {
          title: 'Test title',
          body: 'Test body',
          actions: [
            { id: '', label: 'Yes', value: 'yes' },
          ],
        }

        const result = validateNotifyRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('validateBindResponse', () => {
      it('should validate successful bind response', () => {
        const response: BindResponse = {
          success: true,
          data: {
            deviceToken: 'token123',
            deviceId: 'device456',
          },
        }

        const result = validateBindResponse(response)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate failed bind response', () => {
        const response: BindResponse = {
          success: false,
          error: 'Invalid code',
          code: 'INVALID_CODE',
        }

        const result = validateBindResponse(response)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject missing success field', () => {
        const response = {
          data: {
            deviceToken: 'token123',
            deviceId: 'device456',
          },
        } as BindResponse

        const result = validateBindResponse(response)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('success is required and must be a boolean')
      })

      it('should reject successful response without data', () => {
        const response: BindResponse = {
          success: true,
        }

        const result = validateBindResponse(response)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('data is required when success is true')
      })

      it('should reject failed response without error', () => {
        const response: BindResponse = {
          success: false,
        }

        const result = validateBindResponse(response)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('error is required when success is false')
      })
    })

    describe('validateNotifyResponse', () => {
      it('should validate successful notify response', () => {
        const response: NotifyResponse = {
          success: true,
          data: {
            notificationId: 'notif123',
          },
        }

        const result = validateNotifyResponse(response)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate failed notify response', () => {
        const response: NotifyResponse = {
          success: false,
          error: 'Device not bound',
          code: 'NOT_BOUND',
        }

        const result = validateNotifyResponse(response)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject successful response without notificationId', () => {
        const response: NotifyResponse = {
          success: true,
          data: {} as any,
        }

        const result = validateNotifyResponse(response)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('data.notificationId is required and must be a string')
      })
    })

    describe('validatePollResponse', () => {
      it('should validate successful poll response with reply', () => {
        const response: PollResponse = {
          success: true,
          data: {
            reply: {
              content: 'User reply',
              timestamp: '2024-01-01T00:00:00Z',
              notificationId: 'notif123',
            },
          },
        }

        const result = validatePollResponse(response)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate successful poll response with null reply (timeout)', () => {
        const response: PollResponse = {
          success: true,
          data: {
            reply: null,
          },
        }

        const result = validatePollResponse(response)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject reply without content', () => {
        const response: PollResponse = {
          success: true,
          data: {
            reply: {
              content: '',
              timestamp: '2024-01-01T00:00:00Z',
            },
          },
        }

        const result = validatePollResponse(response)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('CCJKCloudClient Integration', () => {
    let client: CCJKCloudClient

    beforeEach(() => {
      vi.clearAllMocks()
      mockGatewayRequest.mockReset()
      mockGatewaySetAuthToken.mockReset()
      client = new CCJKCloudClient()
    })

    describe('bind()', () => {
      it('should successfully bind device', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            deviceToken: 'token123',
            deviceId: 'device456',
          },
        })

        const result = await client.bind('ABC123')

        expect(result.success).toBe(true)
        expect(result.data?.deviceToken).toBe('token123')
        expect(result.data?.deviceId).toBe('device456')
        expect(mockGatewayRequest).toHaveBeenCalledWith(
          'notifications.bind',
          expect.objectContaining({
            method: 'POST',
            body: expect.objectContaining({
              code: 'ABC123',
            }),
          }),
        )
      })

      it('should handle bind failure', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: false,
          error: 'Invalid code',
          code: 'INVALID_CODE',
        })

        const result = await client.bind('INVALID')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid code')
      })

      it('should handle network error', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: false,
          error: 'Network error',
          code: 'NETWORK_ERROR',
        })

        const result = await client.bind('ABC123')

        expect(result.success).toBe(false)
        expect(result.code).toBe('NETWORK_ERROR')
      })

      it('should validate request before sending', async () => {
        const result = await client.bind('ABC') // Too short

        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid bind request')
        expect(result.code).toBe('VALIDATION_ERROR')
        expect(mockGatewayRequest).not.toHaveBeenCalled()
      })

      it('should validate response after receiving', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {}, // Missing required fields
        })

        const result = await client.bind('ABC123')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid bind response')
        expect(result.code).toBe('RESPONSE_VALIDATION_ERROR')
      })

      it('should update gateway auth token after successful bind', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            deviceToken: 'token123',
            deviceId: 'device456',
          },
        })

        await client.bind('ABC123')

        expect(mockGatewaySetAuthToken).toHaveBeenCalledWith('token123')
      })
    })

    describe('notify()', () => {
      beforeEach(async () => {
        // Bind device first
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            deviceToken: 'token123',
            deviceId: 'device456',
          },
        })
        await client.bind('ABC123')
        vi.clearAllMocks()
      })

      it('should successfully send notification', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            notificationId: 'notif123',
          },
        })

        const result = await client.notify({
          title: 'Test Notification',
          body: 'This is a test',
          type: 'info',
        })

        expect(result.success).toBe(true)
        expect(result.data?.notificationId).toBe('notif123')
        expect(mockGatewayRequest).toHaveBeenCalledWith(
          'notifications.send',
          expect.objectContaining({
            method: 'POST',
            body: expect.objectContaining({
              title: 'Test Notification',
              body: 'This is a test',
              type: 'info',
            }),
          }),
        )
      })

      it('should handle notify failure', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
        })

        const result = await client.notify({
          title: 'Test',
          body: 'Test',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Rate limit exceeded')
      })

      it('should reject if device not bound', async () => {
        const unboundClient = new CCJKCloudClient()

        const result = await unboundClient.notify({
          title: 'Test',
          body: 'Test',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Device not bound')
        expect(result.code).toBe('NOT_BOUND')
      })

      it('should validate request before sending', async () => {
        const result = await client.notify({
          title: 'A'.repeat(201), // Too long
          body: 'Test',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid notify request')
        expect(result.code).toBe('VALIDATION_ERROR')
      })

      it('should send notification with actions', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            notificationId: 'notif123',
          },
        })

        const result = await client.notify({
          title: 'Confirm Action',
          body: 'Do you want to proceed?',
          actions: [
            { id: 'yes', label: 'Yes', value: 'yes' },
            { id: 'no', label: 'No', value: 'no' },
          ],
        })

        expect(result.success).toBe(true)
        expect(mockGatewayRequest).toHaveBeenCalledWith(
          'notifications.send',
          expect.objectContaining({
            body: expect.objectContaining({
              actions: expect.arrayContaining([
                expect.objectContaining({ id: 'yes' }),
                expect.objectContaining({ id: 'no' }),
              ]),
            }),
          }),
        )
      })
    })

    describe('waitForReply()', () => {
      beforeEach(async () => {
        // Bind device first
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            deviceToken: 'token123',
            deviceId: 'device456',
          },
        })
        await client.bind('ABC123')
        vi.clearAllMocks()
      })

      it('should successfully receive reply', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            reply: {
              content: 'User replied yes',
              timestamp: '2024-01-01T00:00:00Z',
              notificationId: 'notif123',
              actionId: 'yes',
            },
          },
        })

        const reply = await client.waitForReply()

        expect(reply).not.toBeNull()
        expect(reply?.content).toBe('User replied yes')
        expect(reply?.actionId).toBe('yes')
        expect(mockGatewayRequest).toHaveBeenCalledWith(
          'notifications.poll',
          expect.objectContaining({
            method: 'GET',
            query: expect.objectContaining({ timeout: expect.any(Number) }),
          }),
        )
      })

      it('should return null on timeout', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            reply: null,
          },
        })

        const reply = await client.waitForReply()

        expect(reply).toBeNull()
      })

      it('should throw if device not bound', async () => {
        const unboundClient = new CCJKCloudClient()

        await expect(unboundClient.waitForReply()).rejects.toThrow('Device not bound')
      })

      it('should handle poll error', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: false,
          error: 'Network error',
          code: 'NETWORK_ERROR',
        })

        await expect(client.waitForReply()).rejects.toThrow('Network error')
      })

      it('should use custom timeout', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: { reply: null },
        })

        await client.waitForReply(30000)

        expect(mockGatewayRequest).toHaveBeenCalledWith(
          'notifications.poll',
          expect.objectContaining({
            query: { timeout: 30000 },
            timeout: 30000,
          }),
        )
      })
    })

    describe('ask()', () => {
      beforeEach(async () => {
        // Bind device first
        mockGatewayRequest.mockResolvedValue({
          success: true,
          data: {
            deviceToken: 'token123',
            deviceId: 'device456',
          },
        })
        await client.bind('ABC123')
        vi.clearAllMocks()
      })

      it('should send question and wait for reply', async () => {
        // Mock notify response
        mockGatewayRequest.mockResolvedValueOnce({
          success: true,
          data: {
            notificationId: 'notif123',
          },
        })

        // Mock poll response
        mockGatewayRequest.mockResolvedValueOnce({
          success: true,
          data: {
            reply: {
              content: 'yes',
              timestamp: '2024-01-01T00:00:00Z',
              notificationId: 'notif123',
              actionId: 'yes',
            },
          },
        })

        const reply = await client.ask('Deploy to production?', {
          actions: [
            { id: 'yes', label: 'Yes', value: 'yes' },
            { id: 'no', label: 'No', value: 'no' },
          ],
        })

        expect(reply.content).toBe('yes')
        expect(reply.actionId).toBe('yes')
        expect(mockGatewayRequest).toHaveBeenCalledTimes(2)
      })

      it('should throw if notification fails', async () => {
        mockGatewayRequest.mockResolvedValue({
          success: false,
          error: 'Failed to send',
          code: 'SEND_ERROR',
        })

        await expect(client.ask('Test question')).rejects.toThrow('Failed to send')
      })

      it('should throw if no reply received', async () => {
        // Mock notify success
        mockGatewayRequest.mockResolvedValueOnce({
          success: true,
          data: {
            notificationId: 'notif123',
          },
        })

        // Mock poll timeout
        mockGatewayRequest.mockResolvedValueOnce({
          success: true,
          data: {
            reply: null,
          },
        })

        await expect(client.ask('Test question')).rejects.toThrow('No reply received within timeout')
      })
    })
  })
})
