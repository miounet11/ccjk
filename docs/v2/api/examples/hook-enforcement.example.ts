/**
 * Hook Enforcement Example
 *
 * This example demonstrates how to use the Hooks API for traceability
 * and enforcement of critical operations.
 */

import { HookEnforcer, HookLevel } from '@ccjk/v2'

async function hookEnforcementExample() {
  console.log('=== Hook Enforcement Example ===\n')

  // Initialize hook enforcer with strict mode
  const enforcer = new HookEnforcer({
    strictMode: true,
    auditLogPath: './audit.log',
    maxHistorySize: 1000,
  })

  // Register L1 hook (logging only)
  await enforcer.registerHook({
    id: 'perf-metric',
    level: HookLevel.LEVEL_1,
    description: 'Performance metric collection',
    handler: async (context) => {
      const startTime = Date.now()
      const result = await context.operation()
      const duration = Date.now() - startTime

      console.log(`[METRIC] ${context.metricName}: ${duration}ms`)
      metrics.histogram(context.metricName, duration)

      return result
    },
  })

  // Register L2 hook (approval with bypass)
  await enforcer.registerHook({
    id: 'api-call',
    level: HookLevel.LEVEL_2,
    description: 'External API call',
    handler: async (context) => {
      const response = await fetch(context.url, {
        method: context.method || 'GET',
        headers: context.headers || {},
        body: context.body ? JSON.stringify(context.body) : undefined,
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }

      return await response.json()
    },
  })

  // Register L3 hook (strict enforcement)
  await enforcer.registerHook({
    id: 'file-write',
    level: HookLevel.LEVEL_3,
    description: 'Critical file system write',
    handler: async (context) => {
      const { path, content } = context
      await fs.writeFile(path, content)
      return { path, bytes: content.length }
    },
  })

  // Execute L1 hook (always executes)
  const perfResult = await enforcer.execute('perf-metric', {
    metricName: 'database-query',
    operation: () => databaseQuery('SELECT * FROM users'),
  })
  console.log('Performance tracking:', perfResult.executed)

  // Execute L2 hook (can be bypassed)
  try {
    const _apiResult = await enforcer.execute('api-call', {
      url: 'https://api.example.com/users',
      method: 'GET',
    })
    console.log('API call successful')
  }
  catch (_error) {
    console.log('API call failed, bypassing...')
    await enforcer.bypass('api-call', 'API unavailable, using cache')
  }

  // Execute L3 hook (cannot bypass in strict mode)
  const fileResult = await enforcer.execute('file-write', {
    path: './data/output.json',
    content: JSON.stringify({ status: 'success' }),
  })
  console.log('File written:', fileResult.result.path)

  // Get statistics
  const stats = enforcer.getStats()
  console.log('\nHook Statistics:')
  console.log(`- Total executions: ${stats.totalExecutions}`)
  console.log(`- Bypass count: ${stats.bypassCount}`)
  console.log(`- Average duration: ${stats.averageDuration}ms`)

  // Get history
  const history = enforcer.getHistory('file-write')
  console.log('\nFile write history:', history.length, 'executions')
}

/**
 * Example: Comprehensive file system monitoring
 */
async function fileSystemMonitoringExample() {
  console.log('\n=== File System Monitoring Example ===\n')

  const enforcer = new HookEnforcer({ strictMode: true })

  // Register file operation hooks
  const fileOps = ['read', 'write', 'delete', 'move']

  for (const op of fileOps) {
    await enforcer.registerHook({
      id: `fs-${op}`,
      level: HookLevel.LEVEL_3,
      description: `Critical file ${op} operation`,
      handler: async (context) => {
        console.log(`[FILE ${op.toUpperCase()}] ${context.path}`)
        return await executeFileOp(op, context)
      },
    })
  }

  // All file operations are now tracked and enforced
  await enforcer.execute('fs-write', {
    path: './config.json',
    content: JSON.stringify({ setting: 'value' }),
  })

  await enforcer.execute('fs-read', {
    path: './config.json',
  })

  await enforcer.execute('fs-move', {
    from: './config.json',
    to: './config.backup.json',
  })
}

/**
 * Example: Multi-layer security enforcement
 */
async function securityEnforcementExample() {
  console.log('\n=== Security Enforcement Example ===\n')

  const enforcer = new HookEnforcer({
    strictMode: true,
    auditLogPath: './security-audit.log',
  })

  // Register security hooks at different levels
  await enforcer.registerHook({
    id: 'auth-check',
    level: HookLevel.LEVEL_3,
    description: 'User authentication check',
    handler: async (context) => {
      const { user, action, resource } = context
      const allowed = await checkPermissions(user, action, resource)

      if (!allowed) {
        throw new Error(`Access denied: ${user} cannot ${action} on ${resource}`)
      }

      console.log(`[AUTH] ${user} allowed to ${action} on ${resource}`)
      return { allowed }
    },
  })

  await enforcer.registerHook({
    id: 'data-access',
    level: HookLevel.LEVEL_3,
    description: 'Sensitive data access',
    handler: async (context) => {
      console.log(`[DATA ACCESS] User ${context.user} accessing ${context.resource}`)
      console.log(`[DATA ACCESS] Reason: ${context.reason}`)

      return await accessData(context.resource, context.user)
    },
  })

  await enforcer.registerHook({
    id: 'audit-log',
    level: HookLevel.LEVEL_1,
    description: 'Audit logging for all operations',
    handler: async (context) => {
      const entry = {
        timestamp: new Date().toISOString(),
        user: context.user,
        action: context.action,
        resource: context.resource,
        result: context.result,
      }

      await fs.appendFile('./audit.log', `${JSON.stringify(entry)}\n`)
      return entry
    },
  })

  // Execute security workflow
  try {
    await enforcer.execute('auth-check', {
      user: 'admin',
      action: 'write',
      resource: '/etc/config',
    })

    await enforcer.execute('data-access', {
      user: 'admin',
      resource: 'sensitive-data',
      reason: 'System maintenance',
    })

    await enforcer.execute('audit-log', {
      user: 'admin',
      action: 'write',
      resource: '/etc/config',
      result: 'success',
    })
  }
  catch (error) {
    console.error('Security violation:', error.message)
  }
}

// Run examples
await hookEnforcementExample()
await fileSystemMonitoringExample()
await securityEnforcementExample()

console.log('\n=== All Examples Complete ===')
