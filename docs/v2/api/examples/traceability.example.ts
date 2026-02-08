/**
 * Traceability Example
 *
 * This example demonstrates comprehensive traceability features
 * including audit trails, action tracking, and compliance reporting.
 */

import type { Action } from '@ccjk/v2'
import { Actionbook, HookEnforcer, HookLevel } from '@ccjk/v2'

async function traceabilityExample() {
  console.log('=== Traceability Example ===\n')

  // Initialize actionbook for comprehensive action tracking
  const actionbook = new Actionbook({
    storagePath: './audit-actions',
    enableCompression: true,
    retentionDays: 365,
    enableEncryption: true,
  })

  // Define traceable actions
  const actions: Action[] = [
    {
      id: 'user-create',
      name: 'Create User',
      version: '1.0.0',
      description: 'Creates a new user account',
      permissions: ['admin', 'user-manager'],

      async execute(context) {
        const { username, email, role } = context.params

        // Create user
        const user = await createUserInDatabase({
          username,
          email,
          role,
          createdBy: context.userId,
          createdAt: new Date().toISOString(),
        })

        return {
          userId: user.id,
          username,
          email,
          createdAt: user.createdAt,
        }
      },
    },
    {
      id: 'permission-grant',
      name: 'Grant Permission',
      version: '1.0.0',
      description: 'Grants permissions to a user',
      permissions: ['admin'],

      async execute(context) {
        const { userId, permissions, reason } = context.params

        // Log permission change
        await logPermissionChange({
          userId,
          permissions,
          grantedBy: context.userId,
          reason,
          timestamp: new Date().toISOString(),
        })

        return {
          userId,
          permissions,
          grantedBy: context.userId,
          reason,
        }
      },

      async rollback(context) {
        const { userId, permissions } = context.originalContext.result

        // Revoke permissions
        await revokePermissions(userId, permissions)

        return {
          userId,
          permissionsRevoked: permissions,
        }
      },
    },
    {
      id: 'data-export',
      name: 'Export Data',
      version: '1.0.0',
      description: 'Exports sensitive data',
      permissions: ['admin', 'data-exporter'],

      async execute(context) {
        const { dataType, filters, format } = context.params

        // Log data access
        await logDataAccess({
          userId: context.userId,
          dataType,
          filters,
          format,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        })

        // Export data
        const data = await exportData(dataType, filters, format)

        return {
          exportId: generateId(),
          dataType,
          recordCount: data.length,
          format,
          exportedAt: new Date().toISOString(),
        }
      },
    },
  ]

  // Register all actions
  for (const action of actions) {
    await actionbook.registerAction(action)
  }

  // Initialize hook enforcer for additional traceability
  const enforcer = new HookEnforcer({
    strictMode: true,
    auditLogPath: './compliance-audit.log',
  })

  // Register compliance hooks
  await enforcer.registerHook({
    id: 'compliance-check',
    level: HookLevel.LEVEL_3,
    description: 'Compliance and regulatory check',
    handler: async (context) => {
      const { action, userId, data } = context

      // Check compliance requirements
      const compliance = await checkComplianceRequirements({
        action,
        userId,
        data,
        timestamp: new Date().toISOString(),
      })

      if (!compliance.allowed) {
        throw new Error(`Compliance violation: ${compliance.violation}`)
      }

      return { compliance, userId, action }
    },
  })

  // Execute traceable actions
  console.log('Creating user with full traceability...')
  const createUserResult = await actionbook.execute('user-create', {
    params: {
      username: 'john.doe',
      email: 'john.doe@example.com',
      role: 'developer',
    },
    userId: 'admin-123',
    requestId: 'req-001',
  })

  console.log('User created:', createUserResult.result)

  // Grant permissions with traceability
  console.log('\nGranting permissions with audit trail...')
  const grantResult = await actionbook.execute('permission-grant', {
    params: {
      userId: createUserResult.result.userId,
      permissions: ['read', 'write', 'deploy'],
      reason: 'Developer access for project Alpha',
    },
    userId: 'admin-123',
    requestId: 'req-002',
  })

  console.log('Permissions granted:', grantResult.result)

  // Export data with full audit trail
  console.log('\nExporting data with compliance tracking...')
  const exportResult = await actionbook.execute('data-export', {
    params: {
      dataType: 'user-data',
      filters: { active: true },
      format: 'csv',
    },
    userId: 'admin-123',
    requestId: 'req-003',
  })

  console.log('Data exported:', exportResult.result)

  // Get comprehensive audit trail
  console.log('\n=== Audit Trail ===')
  const history = await actionbook.getHistory()

  history.forEach((record) => {
    console.log(`\n[${record.timestamp}] ${record.actionId}`)
    console.log(`  User: ${record.userId}`)
    console.log(`  Status: ${record.status}`)
    console.log(`  Duration: ${record.duration}ms`)

    if (record.error) {
      console.log(`  Error: ${record.error}`)
    }
  })

  // Get analytics
  console.log('\n=== Analytics ===')
  const metrics = actionbook.getMetrics()
  console.log(`Total executions: ${metrics.executions}`)
  console.log(`Success rate: ${(metrics.successRate * 100).toFixed(1)}%`)
  console.log(`Average duration: ${metrics.averageDuration}ms`)

  // Get usage patterns
  const patterns = actionbook.analytics.getUsagePatterns()
  console.log('\nUsage patterns:')
  patterns.forEach((pattern) => {
    console.log(`- ${pattern.actionId}: ${pattern.frequency} times`)
  })

  // Compliance reporting
  console.log('\n=== Compliance Report ===')
  const complianceReport = await generateComplianceReport(history)
  console.log('Compliant actions:', complianceReport.compliant)
  console.log('Non-compliant actions:', complianceReport.violations)

  if (complianceReport.violations.length > 0) {
    console.log('Violations:')
    complianceReport.violations.forEach((violation) => {
      console.log(`- ${violation.actionId}: ${violation.reason}`)
    })
  }
}

/**
 * Example: Real-time monitoring and alerting
 */
async function realTimeMonitoringExample() {
  console.log('\n=== Real-Time Monitoring Example ===\n')

  const actionbook = new Actionbook({
    storagePath: './monitoring-actions',
    enableCompression: true,
  })

  // Define monitoring actions
  const monitoringActions: Action[] = [
    {
      id: 'health-check',
      name: 'Health Check',
      version: '1.0.0',
      description: 'Performs system health check',

      async execute(context) {
        const { service } = context.params

        const health = await checkServiceHealth(service)

        if (!health.healthy) {
          // Trigger alert
          await triggerAlert({
            type: 'health-check-failed',
            service,
            details: health.details,
            timestamp: new Date().toISOString(),
          })
        }

        return health
      },
    },
    {
      id: 'performance-monitor',
      name: 'Performance Monitor',
      version: '1.0.0',
      description: 'Monitors system performance',

      async execute(context) {
        const { metric, threshold } = context.params

        const value = await getPerformanceMetric(metric)

        if (value > threshold) {
          await triggerAlert({
            type: 'performance-threshold-exceeded',
            metric,
            value,
            threshold,
            timestamp: new Date().toISOString(),
          })
        }

        return { metric, value, threshold, status: value < threshold ? 'ok' : 'warning' }
      },
    },
  ]

  // Register monitoring actions
  for (const action of monitoringActions) {
    await actionbook.registerAction(action)
  }

  // Set up monitoring loop
  const monitoringInterval = setInterval(async () => {
    // Health checks
    const services = ['api', 'database', 'cache', 'queue']

    for (const service of services) {
      await actionbook.execute('health-check', {
        params: { service },
        userId: 'system-monitor',
        requestId: `monitor-${Date.now()}`,
      })
    }

    // Performance monitoring
    const metrics = [
      { metric: 'cpu', threshold: 80 },
      { metric: 'memory', threshold: 85 },
      { metric: 'disk', threshold: 90 },
    ]

    for (const { metric, threshold } of metrics) {
      await actionbook.execute('performance-monitor', {
        params: { metric, threshold },
        userId: 'system-monitor',
        requestId: `monitor-${Date.now()}`,
      })
    }
  }, 60000) // Check every minute

  console.log('Monitoring started...')
  console.log('Press Ctrl+C to stop monitoring')

  // Run for 5 minutes then stop
  setTimeout(() => {
    clearInterval(monitoringInterval)
    console.log('\nMonitoring stopped')

    // Get monitoring history
    actionbook.getHistory({
      startDate: new Date(Date.now() - 5 * 60 * 1000),
    }).then((history) => {
      console.log('\nMonitoring history (last 5 minutes):')
      console.log(`- Total checks: ${history.length}`)

      const healthChecks = history.filter(h => h.actionId === 'health-check')
      const perfChecks = history.filter(h => h.actionId === 'performance-monitor')

      console.log(`- Health checks: ${healthChecks.length}`)
      console.log(`- Performance checks: ${perfChecks.length}`)

      const failures = history.filter(h => h.status === 'failed')
      console.log(`- Failed checks: ${failures.length}`)
    })
  }, 5 * 60 * 1000)
}

/**
 * Example: Forensic analysis
 */
async function forensicAnalysisExample() {
  console.log('\n=== Forensic Analysis Example ===\n')

  const actionbook = new Actionbook({
    storagePath: './forensic-actions',
    retentionDays: 365 * 5, // 5 years retention
  })

  // Define forensic actions
  const forensicActions: Action[] = [
    {
      id: 'data-access-log',
      name: 'Data Access Log',
      version: '1.0.0',
      description: 'Logs all data access events',

      async execute(context) {
        const { userId, dataId, action, ip, userAgent } = context.params

        // Store detailed access log
        const logEntry = {
          timestamp: new Date().toISOString(),
          userId,
          dataId,
          action,
          ip,
          userAgent,
          sessionId: context.requestId,
          geoLocation: await getGeoLocation(ip),
        }

        await storeForensicLog(logEntry)

        return logEntry
      },
    },
    {
      id: 'security-incident',
      name: 'Security Incident',
      version: '1.0.0',
      description: 'Records security incidents',

      async execute(context) {
        const { type, severity, details, reporter } = context.params

        const incident = {
          incidentId: generateId(),
          type,
          severity,
          details,
          reporter,
          timestamp: new Date().toISOString(),
          status: 'open',
        }

        // Store incident
        await storeSecurityIncident(incident)

        // Trigger investigation if high severity
        if (severity >= 8) {
          await triggerInvestigation(incident)
        }

        return incident
      },
    },
  ]

  // Register forensic actions
  for (const action of forensicActions) {
    await actionbook.registerAction(action)
  }

  // Simulate forensic data collection
  console.log('Collecting forensic data...')

  // Log data access
  await actionbook.execute('data-access-log', {
    params: {
      userId: 'user-456',
      dataId: 'customer-data-123',
      action: 'read',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
    },
    userId: 'system',
    requestId: 'forensic-001',
  })

  // Log security incident
  const incidentResult = await actionbook.execute('security-incident', {
    params: {
      type: 'unauthorized-access',
      severity: 9,
      details: {
        resource: '/admin/users',
        method: 'POST',
        attempted: 'create-admin-user',
      },
      reporter: 'security-system',
    },
    userId: 'security-system',
    requestId: 'forensic-002',
  })

  console.log('Incident recorded:', incidentResult.result.incidentId)

  // Generate forensic report
  console.log('\n=== Forensic Report ===')
  const allHistory = await actionbook.getHistory()

  const report = {
    timeframe: 'All time',
    totalEvents: allHistory.length,
    securityIncidents: allHistory.filter(h => h.actionId === 'security-incident').length,
    dataAccessEvents: allHistory.filter(h => h.actionId === 'data-access-log').length,
    uniqueUsers: new Set(allHistory.map(h => h.userId)).size,
    suspiciousActivities: allHistory.filter(h => h.actionId === 'security-incident'
      && h.result?.severity >= 7).length,
  }

  console.log('Total events:', report.totalEvents)
  console.log('Security incidents:', report.securityIncidents)
  console.log('Data access events:', report.dataAccessEvents)
  console.log('Unique users:', report.uniqueUsers)
  console.log('Suspicious activities:', report.suspiciousActivities)
}

// Helper functions (would be implemented)
async function createUserInDatabase(userData) {
  // Implementation
  return { id: 'user-123', ...userData }
}

async function logPermissionChange(change) {
  // Implementation
  console.log('Permission change logged:', change)
}

async function exportData(_dataType, _filters: any, _format: any) {
  // Implementation
  return Array.from({ length: 100 }).fill({ id: 1, data: 'sensitive' })
}

async function checkComplianceRequirements(_req) {
  // Implementation
  return { allowed: true }
}

async function generateComplianceReport(history) {
  // Implementation
  return {
    compliant: history.length - 2,
    violations: [
      { actionId: 'data-export', reason: 'Missing approval' },
      { actionId: 'permission-grant', reason: 'Invalid reason' },
    ],
  }
}

async function checkServiceHealth(_service) {
  // Implementation
  return { healthy: Math.random() > 0.1, details: { responseTime: 100 } }
}

async function triggerAlert(alert) {
  // Implementation
  console.log('ALERT:', alert.type, alert.service || alert.metric)
}

async function getPerformanceMetric(_metric) {
  // Implementation
  return Math.random() * 100
}

async function getGeoLocation(_ip) {
  // Implementation
  return { country: 'US', city: 'New York' }
}

async function storeForensicLog(entry) {
  // Implementation
  console.log('Forensic log stored:', entry.timestamp)
}

async function storeSecurityIncident(incident) {
  // Implementation
  console.log('Security incident stored:', incident.incidentId)
}

async function triggerInvestigation(incident) {
  // Implementation
  console.log('Investigation triggered for incident:', incident.incidentId)
}

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// Run examples
await traceabilityExample()
await realTimeMonitoringExample()
await forensicAnalysisExample()

console.log('\n=== All Traceability Examples Complete ===')

// Note: The monitoring example runs for 5 minutes
// In a real scenario, you might want to handle this differently
process.exit(0)
