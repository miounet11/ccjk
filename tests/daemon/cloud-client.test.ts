/**
 * Cloud Client Tests
 * Tests for cloud API communication client
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudClient } from '../../src/daemon/cloud-client'

// Mock fetch
global.fetch = vi.fn()

describe('cloudClient', () => {
  let client: CloudClient

  beforeEach(() => {
    vi.mocked(global.fetch).mockReset()
    client = new CloudClient({
      deviceToken: 'test-token-12345',
      debug: false,
    })
  })

  afterEach(() => {
    client.stopHeartbeat()
    vi.clearAllMocks()
  })

  describe('device Registration', () => {
    it('should register device successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            device: {
              id: 'device-123',
              name: 'Test Device',
              platform: 'darwin',
              status: 'online',
            },
          },
        }),
      } as Response)

      const result = await client.register({
        name: 'Test Device',
        platform: 'darwin',
        hostname: 'test-host',
        version: '1.0.0',
      })

      expect(result.success).toBe(true)
      expect(result.data?.device.id).toBe('device-123')
      expect(client.getDeviceInfo()?.id).toBe('device-123')
    })

    it('should handle registration failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid token',
        }),
      } as Response)

      const result = await client.register({
        name: 'Test Device',
        platform: 'darwin',
        hostname: 'test-host',
        version: '1.0.0',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid token')
    })

    it('should use default API URL', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { device: { id: 'device-123' } } }),
      } as Response)

      await client.register()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.claudehome.cn/api/control/devices/register',
        expect.any(Object),
      )
    })

    it('should use custom API URL when provided', async () => {
      const customClient = new CloudClient({
        deviceToken: 'test-token',
        apiUrl: 'https://custom.api.com/control',
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { device: { id: 'device-123' } } }),
      } as Response)

      await customClient.register()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom.api.com/control/devices/register',
        expect.any(Object),
      )
    })
  })

  describe('heartbeat', () => {
    it('should send heartbeat successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            deviceStatus: 'online',
          },
        }),
      } as Response)

      const result = await client.heartbeat('online')

      expect(result.success).toBe(true)
    })

    it('should include current tasks in heartbeat', async () => {
      client.addTask('task-1')
      client.addTask('task-2')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response)

      await client.heartbeat('busy')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        }),
      )

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.currentTasks).toContain('task-1')
      expect(body.currentTasks).toContain('task-2')
    })

    it('should return pending tasks from heartbeat', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            pendingTasks: [
              {
                id: 'cmd-1',
                deviceId: 'device-123',
                commandType: 'shell',
                command: 'echo test',
              },
            ],
          },
        }),
      } as Response)

      const result = await client.heartbeat('online')

      expect(result.success).toBe(true)
      expect(result.data?.pendingTasks).toHaveLength(1)
      expect(result.data?.pendingTasks?.[0].command).toBe('echo test')
    })
  })

  describe('task Pulling', () => {
    it('should pull pending tasks', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            commands: [
              {
                id: 'cmd-1',
                deviceId: 'device-123',
                commandType: 'shell',
                command: 'npm test',
                cwd: '/app',
              },
            ],
          },
        }),
      } as Response)

      const tasks = await client.pullTasks()

      expect(tasks).toHaveLength(1)
      expect(tasks[0].command).toBe('npm test')
      expect(tasks[0].cwd).toBe('/app')
    })

    it('should return empty array on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Unauthorized',
        }),
      } as Response)

      const tasks = await client.pullTasks()

      expect(tasks).toHaveLength(0)
    })
  })

  describe('result Reporting', () => {
    it('should report command result successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            commandId: 'cmd-123',
            status: 'completed',
          },
        }),
      } as Response)

      client.addTask('cmd-123')

      const result = await client.reportResult('cmd-123', {
        exitCode: 0,
        stdout: 'Build successful',
        stderr: '',
        success: true,
        duration: 5000,
      })

      expect(result.success).toBe(true)
      expect(client.getActiveTasksCount()).toBe(0) // Task removed after report
    })

    it('should keep task on failed report', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Network error',
        }),
      } as Response)

      client.addTask('cmd-123')

      await client.reportResult('cmd-123', {
        exitCode: 0,
        stdout: '',
        stderr: '',
        success: true,
        duration: 0,
      })

      // Task should still be tracked since report failed
      expect(client.getActiveTasksCount()).toBe(1)
    })
  })

  describe('task Tracking', () => {
    it('should track active tasks', () => {
      client.addTask('task-1')
      client.addTask('task-2')
      client.addTask('task-3')

      expect(client.getActiveTasksCount()).toBe(3)
    })

    it('should remove tracked tasks', () => {
      client.addTask('task-1')
      client.addTask('task-2')

      client.removeTask('task-1')

      expect(client.getActiveTasksCount()).toBe(1)
    })
  })

  describe('heartbeat Loop', () => {
    it('should start heartbeat loop', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            // Include pendingTasks to trigger callback
            pendingTasks: [],
          },
        }),
      } as Response)

      let callbackCount = 0
      const onTasks = () => {
        callbackCount++
      }

      // Create client with short heartbeat interval for testing
      const testClient = new CloudClient({
        deviceToken: 'test-token',
        heartbeatInterval: 50, // 50ms for quick testing
      })

      testClient.startHeartbeat(onTasks)

      // Wait for heartbeat to fire
      await new Promise(resolve => setTimeout(resolve, 150))

      testClient.stopHeartbeat()

      // Callback is only called when there are pending tasks
      // But we can verify heartbeat was called by checking fetch
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should stop heartbeat loop', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response)

      client.startHeartbeat()

      await new Promise(resolve => setTimeout(resolve, 50))

      client.stopHeartbeat()

      const isConnected = client.isConnected()
      expect(isConnected).toBe(false)
    })
  })

  describe('offline Status', () => {
    it('should send offline and stop heartbeat', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response)

      client.startHeartbeat()
      client.addTask('task-1')

      await client.goOffline()

      // Verify offline was sent
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        }),
      )

      // Tasks should be cleared
      expect(client.getActiveTasksCount()).toBe(0)
      expect(client.isConnected()).toBe(false)
    })
  })
})
