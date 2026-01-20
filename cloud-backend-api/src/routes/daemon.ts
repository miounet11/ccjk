// CCJK Cloud API - Daemon Routes
// 与 src/daemon/ 功能对接

import type { ApiResponse, ConfigData, HeartbeatRequest, RegisterRequest, TaskData, TaskResult } from '../types'
import { Hono } from 'hono'
import { prisma } from '../db'

const daemon = new Hono()

// =====================================================
// 1. 设备注册 (DeviceManager.registerDevice 对接)
// 对应: ccjk daemon setup 命令
// =====================================================
daemon.post('/register', async (c) => {
  try {
    const body = await c.req.json() as RegisterRequest

    // 验证 device_key 格式
    if (!body.device_key || body.device_key.length < 10) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid device_key format (min 10 characters)',
      }, 400)
    }

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { deviceKey: body.device_key },
    })

    if (!user) {
      // 生成临时邮箱（用户可后续修改）
      const tempEmail = `user_${body.device_key.slice(0, 8)}@claudehome.cn`
      user = await prisma.user.create({
        data: {
          deviceKey: body.device_key,
          email: tempEmail,
        },
      })
    }

    // 更新或创建设备记录
    const device = await prisma.device.upsert({
      where: { deviceKey: body.device_key },
      create: {
        userId: user.id,
        deviceKey: body.device_key,
        deviceName: body.device_name || 'Unknown Device',
        osType: body.os_type,
        osVersion: body.os_version,
        ccjkVersion: body.ccjk_version || '3.7.0',
        status: 'online',
        lastHeartbeat: new Date(),
      },
      update: {
        status: 'online',
        lastHeartbeat: new Date(),
        updatedAt: new Date(),
      },
    })

    return c.json<ApiResponse>({
      success: true,
      data: {
        device_id: device.id,
        device_key: body.device_key,
        user_id: user.id,
        registered: true,
        message: 'Device registered successfully',
      },
    })
  }
  catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'Registration failed',
    }, 500)
  }
})

// =====================================================
// 2. 心跳 + 获取待执行任务
// 对应: CcjkDaemon.checkAndExecute()
// =====================================================
daemon.post('/heartbeat', async (c) => {
  try {
    const deviceKey = c.req.header('X-Device-Key')
    if (!deviceKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing X-Device-Key header',
      }, 401)
    }

    const body = await c.req.json() as HeartbeatRequest

    // 更新设备状态
    await prisma.device.update({
      where: { deviceKey },
      data: {
        status: body.status,
        lastHeartbeat: new Date(),
        updatedAt: new Date(),
      },
    })

    // 获取待执行任务
    const tasks = await prisma.task.findMany({
      where: {
        deviceKey,
        status: 'pending',
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 5,
    })

    // 标记任务为执行中
    if (tasks.length > 0) {
      const taskIds = tasks.map(t => t.id)
      await prisma.task.updateMany({
        where: {
          id: { in: taskIds },
        },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      })
    }

    return c.json<ApiResponse<{ tasks: TaskData[], heartbeat_interval: number }>>({
      success: true,
      data: {
        tasks: tasks.map(t => ({
          id: t.id,
          type: t.type,
          commands: t.commands,
          timeout: t.timeout,
        })),
        heartbeat_interval: 30,
      },
    })
  }
  catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'Heartbeat failed',
    }, 500)
  }
})

// =====================================================
// 3. 上报任务结果
// 对应: TaskExecutor.execute() 完成后
// =====================================================
daemon.post('/tasks/:id/result', async (c) => {
  try {
    const deviceKey = c.req.header('X-Device-Key')
    const taskId = c.req.param('id')
    const body = await c.req.json() as TaskResult

    // 验证任务归属
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.deviceKey !== deviceKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Task not found or access denied',
      }, 404)
    }

    // 更新任务结果
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: body.success ? 'completed' : 'failed',
        exitCode: body.exit_code,
        stdout: body.stdout?.slice(0, 100000), // 限制输出大小
        stderr: body.stderr?.slice(0, 100000),
        errorMessage: body.error,
        completedAt: body.completed_at ? new Date(body.completed_at) : new Date(),
      },
    })

    return c.json<ApiResponse>({
      success: true,
      data: { message: 'Task result recorded' },
    })
  }
  catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'Failed to record task result',
    }, 500)
  }
})

// =====================================================
// 4. 获取待执行任务 (轮询接口)
// 对应: EmailChecker.fetchNew() 后的任务获取
// =====================================================
daemon.get('/tasks/pending', async (c) => {
  try {
    const deviceKey = c.req.header('X-Device-Key')
    if (!deviceKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing X-Device-Key header',
      }, 401)
    }

    const limit = Math.min(Number(c.req.query('limit')) || 5, 20)

    const tasks = await prisma.task.findMany({
      where: {
        deviceKey,
        status: 'pending',
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    })

    // 标记为执行中
    if (tasks.length > 0) {
      const taskIds = tasks.map(t => t.id)
      await prisma.task.updateMany({
        where: {
          id: { in: taskIds },
        },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      })
    }

    return c.json<ApiResponse<{ tasks: TaskData[] }>>({
      success: true,
      data: {
        tasks: tasks.map(t => ({
          id: t.id,
          type: t.type,
          commands: t.commands,
          timeout: t.timeout,
        })),
      },
    })
  }
  catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'Failed to fetch pending tasks',
    }, 500)
  }
})

// =====================================================
// 5. 获取设备配置
// 对应: DaemonConfig 读取
// =====================================================
daemon.get('/config', async (c) => {
  try {
    const deviceKey = c.req.header('X-Device-Key')
    if (!deviceKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing X-Device-Key header',
      }, 401)
    }

    const device = await prisma.device.findUnique({
      where: { deviceKey },
    })

    if (!device) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Device not found. Please register first.',
      }, 404)
    }

    const configData: ConfigData = {
      heartbeat_interval: 30,
      task_check_interval: 10,
      log_upload_enabled: true,
      max_concurrent_tasks: 3,
      config: device.config as Record<string, unknown> | undefined,
    }

    return c.json<ApiResponse<ConfigData>>({
      success: true,
      data: configData,
    })
  }
  catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'Failed to fetch config',
    }, 500)
  }
})

// =====================================================
// 6. 设备下线
// 对应: daemon stop 命令
// =====================================================
daemon.post('/offline', async (c) => {
  try {
    const deviceKey = c.req.header('X-Device-Key')
    if (!deviceKey) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing X-Device-Key header',
      }, 401)
    }

    await prisma.device.update({
      where: { deviceKey },
      data: {
        status: 'offline',
        updatedAt: new Date(),
      },
    })

    return c.json<ApiResponse>({
      success: true,
      data: { message: 'Device marked as offline' },
    })
  }
  catch (error: any) {
    return c.json<ApiResponse>({
      success: false,
      error: error.message || 'Failed to mark device offline',
    }, 500)
  }
})

export default daemon
