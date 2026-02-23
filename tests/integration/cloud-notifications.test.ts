/**
 * Cloud Notifications Integration Tests
 *
 * Tests for notification system including:
 * - Device binding
 * - Notification sending
 * - Reply polling
 * - Ask and wait flow
 *
 * @module tests/integration/cloud-notifications
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  BindResponse,
  CloudReply,
  NotifyResponse,
} from '../../src/services/cloud-notification'
import {
  assertErrorResponse,
  assertSuccessResponse,
  createMockBindResponse,
  createMockCloudReply,
  createMockNotifyResponse,
  createTestGateway,
  MockCloudServer,
  waitFor,
} from '../helpers/cloud-mock'
import type { CloudApiResponse } from '../../src/services/cloud/api-client'

describe('Cloud Notifications Integration Tests', () => {
  let mockServer: MockCloudServer
  let gateway: any

  beforeEach(() => {
    mockServer = new MockCloudServer()
    const testSetup = createTestGateway(mockServer)
    gateway = testSetup.gateway
  })

  afterEach(() => {
    mockServer.reset()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Test Suite 1: Device Binding
  // ==========================================================================

  describe('Device Binding', () => {
    it('should successfully bind device with valid code', async () => {
      // Arrange
      const bindCode = 'ABC123'
      const mockResponse: CloudApiResponse<BindResponse> = {
        success: true,
        data: createMockBindResponse({
          deviceToken: 'test-token-123',
          deviceId: 'device-456',
        }),
      }
      mockServer.setResponse('notifications.bind', mockResponse)

      // Act
      const response = await gateway.request<BindResponse>(
        'notifications.bind',
        {
          method: 'POST',
          body: {
            code: bindCode,
            deviceInfo: {
              name: 'Test Device',
              platform: 'darwin',
              hostname: 'test-host',
              version: '1.0.0',
            },
          },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.success).toBe(true)
      expect(response.data.deviceToken).toBe('test-token-123')
      expect(response.data.deviceId).toBe('device-456')
    })

    it('should handle invalid binding code', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<BindResponse> = {
        success: false,
        error: 'Invalid or expired binding code',
        code: 'INVALID_CODE',
      }
      mockServer.setResponse('notifications.bind', mockResponse)

      // Act
      const response = await gateway.request<BindResponse>(
        'notifications.bind',
        {
          method: 'POST',
          body: { code: 'INVALID' },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('INVALID_CODE')
    })

    it('should handle expired binding code', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<BindResponse> = {
        success: false,
        error: 'Binding code has expired',
        code: 'CODE_EXPIRED',
      }
      mockServer.setResponse('notifications.bind', mockResponse)

      // Act
      const response = await gateway.request<BindResponse>(
        'notifications.bind',
        {
          method: 'POST',
          body: { code: 'EXPIRED123' },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('CODE_EXPIRED')
    })

    it('should handle network timeout during binding', async () => {
      // Arrange
      mockServer.setLatency(10000)
      const mockResponse: CloudApiResponse<BindResponse> = {
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('notifications.bind', mockResponse)

      // Act
      const response = await gateway.request<BindResponse>(
        'notifications.bind',
        {
          method: 'POST',
          body: { code: 'ABC123' },
          timeout: 2000,
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('TIMEOUT')
    })
  })

  // ==========================================================================
  // Test Suite 2: Notification Sending
  // ==========================================================================

  describe('Notification Sending', () => {
    it('should successfully send notification', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<NotifyResponse> = {
        success: true,
        data: createMockNotifyResponse({
          notificationId: 'notif-123',
        }),
      }
      mockServer.setResponse('notifications.send', mockResponse)

      // Act
      const response = await gateway.request<NotifyResponse>(
        'notifications.send',
        {
          method: 'POST',
          body: {
            title: 'Test Notification',
            body: 'This is a test notification',
            type: 'info',
          },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.success).toBe(true)
      expect(response.data.notificationId).toBe('notif-123')
    })

    it('should handle authentication failure', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<NotifyResponse> = {
        success: false,
        error: 'Device not authenticated',
        code: 'UNAUTHORIZED',
      }
      mockServer.setResponse('notifications.send', mockResponse)

      // Act
      const response = await gateway.request<NotifyResponse>(
        'notifications.send',
        {
          method: 'POST',
          body: {
            title: 'Test',
            body: 'Test',
          },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('UNAUTHORIZED')
    })

    it('should handle notification send failure', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<NotifyResponse> = {
        success: false,
        error: 'Failed to deliver notification',
        code: 'DELIVERY_FAILED',
      }
      mockServer.setResponse('notifications.send', mockResponse)

      // Act
      const response = await gateway.request<NotifyResponse>(
        'notifications.send',
        {
          method: 'POST',
          body: {
            title: 'Test',
            body: 'Test',
          },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('DELIVERY_FAILED')
    })

    it('should handle timeout during notification send', async () => {
      // Arrange
      mockServer.setLatency(5000)
      const mockResponse: CloudApiResponse<NotifyResponse> = {
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('notifications.send', mockResponse)

      // Act
      const response = await gateway.request<NotifyResponse>(
        'notifications.send',
        {
          method: 'POST',
          body: { title: 'Test', body: 'Test' },
          timeout: 1000,
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('TIMEOUT')
    })
  })

  // ==========================================================================
  // Test Suite 3: Reply Polling
  // ==========================================================================

  describe('Reply Polling', () => {
    it('should successfully poll for reply', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<{ reply: CloudReply }> = {
        success: true,
        data: {
          reply: createMockCloudReply({
            content: 'User replied: Yes',
            notificationId: 'notif-123',
          }),
        },
      }
      mockServer.setResponse('notifications.poll', mockResponse)

      // Act
      const response = await gateway.request<{ reply: CloudReply }>(
        'notifications.poll',
        {
          method: 'GET',
          query: { timeout: 30000 },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.reply.content).toBe('User replied: Yes')
      expect(response.data.reply.notificationId).toBe('notif-123')
    })

    it('should handle no reply within timeout', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<{ reply: null }> = {
        success: true,
        data: { reply: null },
      }
      mockServer.setResponse('notifications.poll', mockResponse)

      // Act
      const response = await gateway.request<{ reply: CloudReply | null }>(
        'notifications.poll',
        {
          method: 'GET',
          query: { timeout: 5000 },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.reply).toBeNull()
    })

    it('should handle authentication failure during polling', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<{ reply: CloudReply }> = {
        success: false,
        error: 'Device not authenticated',
        code: 'UNAUTHORIZED',
      }
      mockServer.setResponse('notifications.poll', mockResponse)

      // Act
      const response = await gateway.request<{ reply: CloudReply }>(
        'notifications.poll',
        {
          method: 'GET',
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('UNAUTHORIZED')
    })

    it('should handle long-polling timeout', async () => {
      // Arrange
      mockServer.setLatency(3000) // 3 second delay
      const mockResponse: CloudApiResponse<{ reply: CloudReply }> = {
        success: false,
        error: 'Polling timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('notifications.poll', mockResponse)

      // Act
      const response = await gateway.request<{ reply: CloudReply }>(
        'notifications.poll',
        {
          method: 'GET',
          timeout: 2000, // 2 second timeout
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('TIMEOUT')
    }, 10000) // 10 second test timeout
  })

  // ==========================================================================
  // Test Suite 4: Complete Notification Flow
  // ==========================================================================

  describe('Complete Notification Flow', () => {
    it('should complete bind → notify → poll flow', async () => {
      // Step 1: Bind device
      const bindResponse: CloudApiResponse<BindResponse> = {
        success: true,
        data: createMockBindResponse(),
      }
      mockServer.setResponse('notifications.bind', bindResponse)

      const bind = await gateway.request<BindResponse>(
        'notifications.bind',
        {
          method: 'POST',
          body: { code: 'ABC123' },
        },
      )
      assertSuccessResponse(bind)

      // Step 2: Send notification
      const notifyResponse: CloudApiResponse<NotifyResponse> = {
        success: true,
        data: createMockNotifyResponse(),
      }
      mockServer.setResponse('notifications.send', notifyResponse)

      const notify = await gateway.request<NotifyResponse>(
        'notifications.send',
        {
          method: 'POST',
          body: { title: 'Test', body: 'Test' },
        },
      )
      assertSuccessResponse(notify)

      // Step 3: Poll for reply
      const pollResponse: CloudApiResponse<{ reply: CloudReply }> = {
        success: true,
        data: { reply: createMockCloudReply() },
      }
      mockServer.setResponse('notifications.poll', pollResponse)

      const poll = await gateway.request<{ reply: CloudReply }>(
        'notifications.poll',
        {
          method: 'GET',
        },
      )
      assertSuccessResponse(poll)

      // Assert complete flow
      expect(bind.data.deviceToken).toBeDefined()
      expect(notify.data.notificationId).toBeDefined()
      expect(poll.data.reply.content).toBeDefined()
    })

    it('should handle failure at bind step', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<BindResponse> = {
        success: false,
        error: 'Invalid code',
        code: 'INVALID_CODE',
      }
      mockServer.setResponse('notifications.bind', mockResponse)

      // Act
      const response = await gateway.request<BindResponse>(
        'notifications.bind',
        {
          method: 'POST',
          body: { code: 'INVALID' },
        },
      )

      // Assert - Flow should stop at bind step
      assertErrorResponse(response)
      expect(response.code).toBe('INVALID_CODE')
    })

    it('should handle failure at notify step', async () => {
      // Step 1: Successful bind
      const bindResponse: CloudApiResponse<BindResponse> = {
        success: true,
        data: createMockBindResponse(),
      }
      mockServer.setResponse('notifications.bind', bindResponse)

      const bind = await gateway.request<BindResponse>(
        'notifications.bind',
        {
          method: 'POST',
          body: { code: 'ABC123' },
        },
      )
      assertSuccessResponse(bind)

      // Step 2: Failed notify
      const notifyResponse: CloudApiResponse<NotifyResponse> = {
        success: false,
        error: 'Delivery failed',
        code: 'DELIVERY_FAILED',
      }
      mockServer.setResponse('notifications.send', notifyResponse)

      const notify = await gateway.request<NotifyResponse>(
        'notifications.send',
        {
          method: 'POST',
          body: { title: 'Test', body: 'Test' },
        },
      )

      // Assert - Flow should stop at notify step
      assertErrorResponse(notify)
      expect(notify.code).toBe('DELIVERY_FAILED')
    })
  })
})
