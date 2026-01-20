import { PrismaClient } from '@prisma/client'
import { prisma } from '../db'

async function main() {
  console.log('🌱 Seeding database...')

  // 创建测试用户
  const user = await prisma.user.upsert({
    where: { deviceKey: 'test_device_key_12345' },
    create: {
      deviceKey: 'test_device_key_12345',
      email: 'test@claudehome.cn',
    },
    update: {},
  })

  console.log(`✅ User created: ${user.email} (device_key: ${user.deviceKey})`)

  // 创建测试设备
  const device = await prisma.device.upsert({
    where: { deviceKey: 'test_device_key_12345' },
    create: {
      userId: user.id,
      deviceKey: 'test_device_key_12345',
      deviceName: 'Test Device',
      osType: 'darwin',
      ccjkVersion: '3.7.0',
      status: 'online',
    },
    update: {
      status: 'online',
      lastHeartbeat: new Date(),
    },
  })

  console.log(`✅ Device created: ${device.deviceName}`)

  // 创建测试任务
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      deviceKey: 'test_device_key_12345',
      type: 'sequential',
      commands: ['echo "Hello from CCJK Cloud!"'],
      status: 'pending',
      priority: 5,
    },
  })

  console.log(`✅ Task created: ${task.id}`)

  console.log('🎉 Seeding complete!')
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
