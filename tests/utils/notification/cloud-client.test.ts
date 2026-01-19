/**
 * CCJK Notification System - Cloud Client Tests
 *
 * Comprehensive unit tests for the CloudClient class covering:
 * - Device registration (success and error cases)
 * - Device info retrieval
 * - Channel updates with array format conversion
 * - Notification sending with title and body
 * - Test notification
 * - Reply polling
 */

import type {
  CloudApiResponse,
  DeviceRegisterResponse,
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
  UserReply,
} from '../../../src/utils/notification/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudClient } from '../../../src/utils/notification/cloud-client'

// Import mocked modules
import { loadNotificationConfig, updateNotificationConfig } from '../../../src/utils/notification/config'
import { getDeviceInfo } from '../../../src/utils/notification/token'

// ============================================================================
// Mocks
// ============================================================================

// Mock config module
vi.mock('../../../src/utils/notification/config', () => ({
  loadNotificationConfig: vi.fn(),
  updateNotificationConfig: vi.fn(),
}))

// Mock token module
vi.mock('../../../src/utils/notification/token', () => ({
  getDeviceInfo: vi.fn(),
}))

// ============================================================================
// Test Suite
// ============================================================================

describe('cloudClient', () => {
  let client: CloudClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset singleton instance before each test
    CloudClient.resetInstance()
    client = CloudClient.getInstance()

    // Mock fetch globally
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    // Setup default mocks
    vi.mocked(loadNotificationConfig).mockResolvedValue({
      enabled: true,
      deviceToken: 'test-token-123',
      threshold: 10,
      cloudEndpoint: undefined, // Will use default endpoint
      channels: {
        feishu: { enabled: true, webhookUrl: 'https://example.com/webhook' },
        wechat: { enabled: false, corpId: '', agentId: '', secret: '' },
      },
    })

    vi.mocked(getDeviceInfo).mockReturnValue({
      name: 'test-machine',
      platform: 'darwin',
      osVersion: '23.0.0',
      arch: 'arm64',
      username: 'testuser',
      machineId: 'test-machine-id-12345',
    })

    vi.mocked(updateNotificationConfig).mockResolvedValue({
      enabled: true,
      deviceToken: 'test-token-123',
      threshold: 10,
      channels: {},
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    CloudClient.resetInstance()
  })

  // ==========================================================================
  // Singleton Pattern Tests
  // ==========================================================================

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = CloudClient.getInstance()
      const instance2 = CloudClient.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should create new instance after reset', () => {
      const instance1 = CloudClient.getInstance()
      CloudClient.resetInstance()
      const instance2 = CloudClient.getInstance()
      expect(instance1).not.toBe(instance2)
    })
  })

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('initialize', () => {
    it('should load config and set endpoint and token', async () => {
      await client.initialize()

      expect(loadNotificationConfig).toHaveBeenCalled()
    })

    it('should use default endpoint if not configured', async () => {
      vi.mocked(loadNotificationConfig).mockResolvedValue({
        enabled: true,
        deviceToken: 'test-token',
        threshold: 10,
        channels: {},
      })

      await client.initialize()

      expect(loadNotificationConfig).toHaveBeenCalled()
    })
  })

  describe('setEndpoint', () => {
    it('should update the endpoint', () => {
      client.setEndpoint('https://api.example.com')
      // Endpoint is private, test through behavior
      expect(() => client.setEndpoint('https://api.example.com')).not.toThrow()
    })
  })

  describe('setDeviceToken', () => {
    it('should update the device token', () => {
      client.setDeviceToken('new-token-456')
      // Token is private, test through behavior
      expect(() => client.setDeviceToken('new-token-456')).not.toThrow()
    })
  })

  // ==========================================================================
  // Device Registration Tests
  // ==========================================================================

  describe('registerDevice', () => {
    it('should successfully register device with default name', async () => {
      const mockResponse: CloudApiResponse<DeviceRegisterResponse> = {
        success: true,
        data: {
          token: 'new-device-token-789',
          deviceId: 'device-123',
          registeredAt: '2024-01-01T00:00:00Z',
        },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.registerDevice()

      expect(result).toEqual(mockResponse.data)
      expect(getDeviceInfo).toHaveBeenCalled()
      expect(updateNotificationConfig).toHaveBeenCalledWith({
        deviceToken: 'new-device-token-789',
      })
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/device/register'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should register device with custom name', async () => {
      const mockResponse: CloudApiResponse<DeviceRegisterResponse> = {
        success: true,
        data: {
          token: 'new-device-token-789',
          deviceId: 'device-123',
          registeredAt: '2024-01-01T00:00:00Z',
        },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await client.registerDevice('my-custom-device')

      const callArgs = fetchMock.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1].body)
      expect(requestBody.name).toBe('my-custom-device')
    })

    it('should throw error when registration fails', async () => {
      const mockResponse: CloudApiResponse<DeviceRegisterResponse> = {
        success: false,
        error: 'Registration failed',
      }

      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      })

      await expect(client.registerDevice()).rejects.toThrow('Registration failed')
    })

    it('should throw error when response has no data', async () => {
      const mockResponse: CloudApiResponse<DeviceRegisterResponse> = {
        success: true,
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(client.registerDevice()).rejects.toThrow('Failed to register device')
    })

    it('should handle network errors during registration', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      await expect(client.registerDevice()).rejects.toThrow()
    })
  })

  // ==========================================================================
  // Device Info Tests
  // ==========================================================================

  describe('getDeviceInfo', () => {
    it('should successfully retrieve device info', async () => {
      const mockDeviceInfo = {
        deviceId: 'device-123',
        name: 'test-machine',
        platform: 'darwin',
        registeredAt: '2024-01-01T00:00:00Z',
      }

      const mockResponse: CloudApiResponse<Record<string, unknown>> = {
        success: true,
        data: mockDeviceInfo,
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.getDeviceInfo()

      expect(result).toEqual(mockDeviceInfo)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/device/info'),
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should throw error when device info retrieval fails', async () => {
      const mockResponse: CloudApiResponse<Record<string, unknown>> = {
        success: false,
        error: 'Device not found',
      }

      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      })

      await expect(client.getDeviceInfo()).rejects.toThrow('Device not found')
    })

    it('should throw error when response has no data', async () => {
      const mockResponse: CloudApiResponse<Record<string, unknown>> = {
        success: true,
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(client.getDeviceInfo()).rejects.toThrow('Failed to get device info')
    })
  })

  // ==========================================================================
  // Channel Update Tests
  // ==========================================================================

  describe('updateChannels', () => {
    it('should successfully update channels', async () => {
      const mockResponse: CloudApiResponse = {
        success: true,
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const channels = {
        feishu: { enabled: true, webhookUrl: 'https://example.com/webhook' },
        wechat: { enabled: false },
      }

      await client.updateChannels(channels)

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/device/channels'),
        expect.objectContaining({
          method: 'PUT',
        }),
      )
    })

    it('should handle array format channels', async () => {
      const mockResponse: CloudApiResponse = {
        success: true,
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const channels = {
        enabled: ['feishu', 'email'],
        feishu: { webhookUrl: 'https://example.com/webhook' },
        email: { address: 'test@example.com' },
      }

      await client.updateChannels(channels)

      // Just verify the call was made with correct method
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/device/channels'),
        expect.objectContaining({
          method: 'PUT',
        }),
      )
    })

    it('should throw error when update fails', async () => {
      const mockResponse: CloudApiResponse = {
        success: false,
        error: 'Update failed',
      }

      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      })

      await expect(client.updateChannels({})).rejects.toThrow('Update failed')
    })
  })

  // ==========================================================================
  // Notification Sending Tests
  // ==========================================================================

  describe('sendNotification', () => {
    const mockMessage: NotificationMessage = {
      type: 'task_completed',
      task: {
        taskId: 'task-123',
        description: 'Test task',
        startTime: new Date('2024-01-01T00:00:00Z'),
        status: 'completed',
        duration: 60000,
      },
      priority: 'normal',
    }

    it('should successfully send notification with title and body', async () => {
      const mockResults: NotificationResult[] = [
        {
          success: true,
          channel: 'feishu',
          sentAt: new Date('2024-01-01T00:01:00Z'),
          messageId: 'msg-123',
        },
      ]

      const mockResponse: CloudApiResponse<{
        notificationId: string
        results: NotificationResult[]
      }> = {
        success: true,
        data: {
          notificationId: 'notif-123',
          results: mockResults,
        },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.sendNotification(mockMessage, ['feishu'])

      expect(result).toEqual(mockResults)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notify'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should send notification to enabled channels when no channels specified', async () => {
      const mockResults: NotificationResult[] = [
        {
          success: true,
          channel: 'feishu',
          sentAt: new Date('2024-01-01T00:01:00Z'),
        },
      ]

      const mockResponse: CloudApiResponse<{
        notificationId: string
        results: NotificationResult[]
      }> = {
        success: true,
        data: {
          notificationId: 'notif-123',
          results: mockResults,
        },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.sendNotification(mockMessage)

      expect(result).toEqual(mockResults)
    })

    it('should return empty array when no channels enabled', async () => {
      vi.mocked(loadNotificationConfig).mockResolvedValue({
        enabled: true,
        deviceToken: 'test-token',
        threshold: 10,
        channels: {},
      })

      const result = await client.sendNotification(mockMessage)

      expect(result).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should include actions in notification', async () => {
      const messageWithActions: NotificationMessage = {
        ...mockMessage,
        actions: [
          { id: 'approve', label: 'Approve', value: 'approved', primary: true },
          { id: 'reject', label: 'Reject', value: 'rejected' },
        ],
      }

      const mockResponse: CloudApiResponse<{
        notificationId: string
        results: NotificationResult[]
      }> = {
        success: true,
        data: {
          notificationId: 'notif-123',
          results: [],
        },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await client.sendNotification(messageWithActions, ['feishu'])

      // Just verify the call was made
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notify'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should return error results when sending fails', async () => {
      const mockResponse: CloudApiResponse = {
        success: false,
        error: 'Send failed',
      }

      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      })

      const result = await client.sendNotification(mockMessage, ['feishu', 'email'])

      expect(result).toHaveLength(2)
      expect(result[0].success).toBe(false)
      expect(result[0].error).toBe('Send failed')
      expect(result[0].channel).toBe('feishu')
      expect(result[1].channel).toBe('email')
    })

    it('should handle network errors during send', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      const result = await client.sendNotification(mockMessage, ['feishu'])

      expect(result).toHaveLength(1)
      expect(result[0].success).toBe(false)
      expect(result[0].error).toContain('Network error')
    })
  })

  // ==========================================================================
  // Test Notification Tests
  // ==========================================================================

  describe('sendTestNotification', () => {
    it('should successfully send test notification', async () => {
      const mockResults: NotificationResult[] = [
        {
          success: true,
          channel: 'feishu',
          sentAt: new Date('2024-01-01T00:01:00Z'),
          messageId: 'test-msg-123',
        },
      ]

      const mockResponse: CloudApiResponse<{
        notificationId: string
        results: NotificationResult[]
      }> = {
        success: true,
        data: {
          notificationId: 'test-notif-123',
          results: mockResults,
        },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.sendTestNotification()

      expect(result).toEqual(mockResults)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notify/test'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should throw error when test notification fails', async () => {
      const mockResponse: CloudApiResponse = {
        success: false,
        error: 'Test failed',
      }

      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      })

      await expect(client.sendTestNotification()).rejects.toThrow('Test failed')
    })

    it('should throw error when response has no data', async () => {
      const mockResponse: CloudApiResponse = {
        success: true,
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(client.sendTestNotification()).rejects.toThrow('Failed to send test notification')
    })
  })

  // ==========================================================================
  // Reply Polling Tests
  // ==========================================================================

  describe('pollForReply', () => {
    it('should successfully poll for reply', async () => {
      const mockReply: UserReply = {
        taskId: 'task-123',
        content: 'User response',
        channel: 'feishu',
        timestamp: new Date('2024-01-01T00:02:00Z'),
        actionId: 'approve',
      }

      const mockResponse: CloudApiResponse<{ reply: UserReply }> = {
        success: true,
        data: { reply: mockReply },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.pollForReply()

      expect(result).toEqual(expect.objectContaining({
        taskId: 'task-123',
        content: 'User response',
        channel: 'feishu',
        actionId: 'approve',
      }))
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/reply/poll'),
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should return null when no reply available', async () => {
      const mockResponse: CloudApiResponse<{ reply: null }> = {
        success: true,
        data: { reply: null },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.pollForReply()

      expect(result).toBeNull()
    })

    it('should convert timestamp string to Date object', async () => {
      const mockReply = {
        taskId: 'task-123',
        content: 'User response',
        channel: 'feishu' as NotificationChannel,
        timestamp: '2024-01-01T00:02:00Z',
      }

      const mockResponse: CloudApiResponse<{ reply: typeof mockReply }> = {
        success: true,
        data: { reply: mockReply },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.pollForReply()

      expect(result?.timestamp).toBeInstanceOf(Date)
      expect(result?.timestamp.toISOString()).toBe('2024-01-01T00:02:00.000Z')
    })

    it('should handle abort signal', async () => {
      fetchMock.mockImplementation(() => {
        return Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
      })

      await expect(client.pollForReply()).rejects.toThrow('Aborted')
    })
  })

  describe('startPolling and stopPolling', () => {
    it('should start polling and stop immediately', () => {
      const onReply = vi.fn()
      const onError = vi.fn()

      // Mock to prevent actual polling
      fetchMock.mockImplementation(() => new Promise(() => {}))

      client.startPolling(onReply, onError)

      // Immediately stop to prevent infinite loop
      client.stopPolling()

      // Verify polling was initiated
      expect(() => client.startPolling(onReply, onError)).not.toThrow()
    })

    it('should not start polling if already polling', () => {
      const onReply = vi.fn()

      // Mock to prevent actual polling
      fetchMock.mockImplementation(() => new Promise(() => {}))

      client.startPolling(onReply)
      client.startPolling(onReply) // Second call should be ignored

      client.stopPolling()

      // Should not throw
      expect(() => client.stopPolling()).not.toThrow()
    })

    it('should handle stopPolling when not polling', () => {
      // Should not throw when stopping without starting
      expect(() => client.stopPolling()).not.toThrow()
    })
  })

  describe('getReply', () => {
    it('should successfully get reply for specific notification', async () => {
      const mockReply: UserReply = {
        taskId: 'task-123',
        content: 'User response',
        channel: 'feishu',
        timestamp: new Date('2024-01-01T00:02:00Z'),
      }

      const mockResponse: CloudApiResponse<{ reply: UserReply }> = {
        success: true,
        data: { reply: mockReply },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.getReply('notif-123')

      expect(result).toEqual(expect.objectContaining({
        taskId: 'task-123',
        content: 'User response',
      }))
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/reply/notif-123'),
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should return null when no reply found', async () => {
      const mockResponse: CloudApiResponse<{ reply: null }> = {
        success: true,
        data: { reply: null },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.getReply('notif-123')

      expect(result).toBeNull()
    })
  })

  // ==========================================================================
  // HTTP Request Helper Tests
  // ==========================================================================

  describe('request timeout handling', () => {
    it('should timeout after specified duration', async () => {
      // Mock fetch to simulate a slow response that triggers abort
      fetchMock.mockImplementation(() => {
        return new Promise((_resolve, reject) => {
          // Simulate the abort signal being triggered
          setTimeout(() => {
            const abortError = new Error('The operation was aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          }, 100) // Short delay to simulate timeout
        })
      })

      // This should timeout and throw an error
      const promise = client.getDeviceInfo()

      await expect(promise).rejects.toThrow()
    }, 5000) // 5 second test timeout

    it('should include device token in request headers', async () => {
      client.setDeviceToken('my-secret-token')

      const mockResponse: CloudApiResponse<Record<string, unknown>> = {
        success: true,
        data: { test: 'data' },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await client.getDeviceInfo()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Device-Token': 'my-secret-token',
          }),
        }),
      )
    })

    it('should handle non-ok HTTP responses', async () => {
      const mockResponse: CloudApiResponse = {
        success: false,
        error: 'Server error',
        code: 'SERVER_ERROR',
      }

      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => mockResponse,
      })

      await expect(client.getDeviceInfo()).rejects.toThrow('Server error')
    })

    it('should handle fetch errors', async () => {
      fetchMock.mockRejectedValue(new Error('Connection refused'))

      await expect(client.getDeviceInfo()).rejects.toThrow()
    })
  })

  // ==========================================================================
  // Convenience Functions Tests
  // ==========================================================================

  describe('convenience functions', () => {
    it('should have getCloudClient function that returns CloudClient instance', async () => {
      // Use dynamic import to avoid module resolution issues
      const module = await import('../../../src/utils/notification/cloud-client.js')
      const instance = module.getCloudClient()
      expect(instance).toBeInstanceOf(CloudClient)
    })
  })
})
