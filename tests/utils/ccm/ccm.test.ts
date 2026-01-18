import type { CCMSession } from '../../../src/utils/ccm/types'
// import vi from 'vitest'

describe('cCM Module', () => {
  describe('types', () => {
    it('should define CCMSession interface correctly', () => {
      const session: CCMSession = {
        session_id: 'test-session',
        cwd: '/test/path',
        tty: '/dev/ttys001',
        status: 'running',
        updated_at: new Date().toISOString(),
      }

      expect(session.session_id).toBe('test-session')
      expect(session.status).toBe('running')
    })

    it('should support all status types', () => {
      const statuses: Array<CCMSession['status']> = ['running', 'waiting_input', 'stopped']

      statuses.forEach((status) => {
        const session: CCMSession = {
          session_id: 'test',
          cwd: '/test',
          tty: '/dev/ttys001',
          status,
          updated_at: new Date().toISOString(),
        }

        expect(session.status).toBe(status)
      })
    })
  })

  describe('config', () => {
    it('should export CCM constants', async () => {
      const { CCM_DATA_DIR, CCM_SESSIONS_FILE } = await import('../../../src/utils/ccm/config')

      expect(CCM_DATA_DIR).toContain('.claude-monitor')
      expect(CCM_SESSIONS_FILE).toContain('sessions.json')
    })

    it('should provide status display function', async () => {
      const { getStatusDisplay } = await import('../../../src/utils/ccm/config')

      const runningDisplay = getStatusDisplay('running')
      expect(runningDisplay.symbol).toBe('●')
      expect(runningDisplay.color).toBe('green')

      const waitingDisplay = getStatusDisplay('waiting_input')
      expect(waitingDisplay.symbol).toBe('◐')
      expect(waitingDisplay.color).toBe('yellow')

      const stoppedDisplay = getStatusDisplay('stopped')
      expect(stoppedDisplay.symbol).toBe('✓')
      expect(stoppedDisplay.color).toBe('gray')
    })
  })

  describe('installer', () => {
    it('should check platform support', async () => {
      const { isCCMSupported } = await import('../../../src/utils/ccm/installer')

      const isSupported = isCCMSupported()
      expect(typeof isSupported).toBe('boolean')

      // CCM is only supported on macOS
      if (process.platform === 'darwin') {
        expect(isSupported).toBe(true)
      }
      else {
        expect(isSupported).toBe(false)
      }
    })

    it('should provide support message', async () => {
      const { getCCMSupportMessage } = await import('../../../src/utils/ccm/installer')

      const message = getCCMSupportMessage()
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })
  })

  describe('commands', () => {
    it('should export command functions', async () => {
      const ccmModule = await import('../../../src/utils/ccm/commands')

      expect(typeof ccmModule.launchCCM).toBe('function')
      expect(typeof ccmModule.clearCCMSessions).toBe('function')
      expect(typeof ccmModule.showCCMStatus).toBe('function')
      expect(typeof ccmModule.executeCCMCommand).toBe('function')
    })
  })

  describe('integration', () => {
    it('should export all public APIs from index', async () => {
      const ccmModule = await import('../../../src/utils/ccm')

      // Check installer exports
      expect(typeof ccmModule.isCCMInstalled).toBe('function')
      expect(typeof ccmModule.installCCM).toBe('function')
      expect(typeof ccmModule.isCCMSupported).toBe('function')

      // Check config exports
      expect(typeof ccmModule.getCCMSessions).toBe('function')
      expect(typeof ccmModule.getStatusDisplay).toBe('function')

      // Check command exports
      expect(typeof ccmModule.launchCCM).toBe('function')
      expect(typeof ccmModule.clearCCMSessions).toBe('function')
      expect(typeof ccmModule.showCCMStatus).toBe('function')
    })
  })
})
