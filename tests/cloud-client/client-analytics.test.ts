import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.mock('ofetch', () => ({
  ofetch: {
    create: vi.fn(() => fetchMock),
  },
}))

describe('cloud-client analytics integration', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('sends handshake with analytics headers and stable identifiers', async () => {
    fetchMock.mockResolvedValueOnce({
      success: true,
      requestId: 'req_handshake',
    })

    const { CloudClient } = await import('../../src/cloud-client/client')

    const client = new CloudClient({
      baseURL: 'https://api.claudehome.cn',
      version: '13.4.0',
      deviceToken: 'device-token-1',
      deviceId: 'device-1',
      anonymousUserId: 'anon-1',
      platform: 'darwin',
    })

    await client.handshake()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/handshake',
      expect.objectContaining({
        method: 'POST',
        body: {
          deviceId: 'device-1',
          platform: 'darwin',
          clientVersion: '13.4.0',
        },
        timeout: 5000,
      }),
    )

    expect(client.getIdentity()).toEqual({
      anonymousUserId: 'anon-1',
      clientVersion: '13.4.0',
      deviceId: 'device-1',
      deviceToken: 'device-token-1',
      platform: 'darwin',
    })
  })

  it('merges analytics identity into usage reports', async () => {
    fetchMock.mockResolvedValueOnce({
      success: true,
      requestId: 'req_usage',
    })

    const { CloudClient } = await import('../../src/cloud-client/client')

    const client = new CloudClient({
      baseURL: 'https://api.claudehome.cn',
      version: '13.4.0',
      deviceId: 'device-2',
      anonymousUserId: 'anon-2',
      platform: 'linux',
    })

    await client.reportUsage({
      reportId: 'report-1',
      metricType: 'command_run',
      timestamp: '2026-03-10T10:00:00.000Z',
      ccjkVersion: '13.4.0',
      nodeVersion: process.version,
      platform: 'linux',
      data: {
        errorType: 'none',
        timestamp: Date.now(),
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/usage/current',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          reportId: 'report-1',
          metricType: 'command_run',
          deviceId: 'device-2',
          platform: 'linux',
          clientVersion: '13.4.0',
        }),
        timeout: 5000,
      }),
    )
  })

  it('fires startup handshake during telemetry initialization by default', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      requestId: 'req_startup',
    })

    const { CloudClient } = await import('../../src/cloud-client/client')
    const { initializeTelemetry, stopTelemetry } = await import('../../src/cloud-client/telemetry')

    const client = new CloudClient({
      baseURL: 'https://api.claudehome.cn',
      version: '13.4.0',
      deviceId: 'device-3',
      anonymousUserId: 'anon-3',
      autoHandshake: true,
    })

    initializeTelemetry(client)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/handshake',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    await stopTelemetry()
  })
})
