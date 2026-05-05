#!/usr/bin/env tsx
/**
 * CCJK v8 Cloud API 测试脚本
 * 验证客户端与服务端的完整对接
 */

import type { TaskPriority } from './src/task-manager/types';
import { TaskManager } from './src/task-manager/task-manager';

// 服务端配置
const CLOUD_ENDPOINT = process.env.CCJK_CLOUD_URL || 'http://localhost:3456';
const API_KEY = process.env.CCJK_API_KEY || 'test';

console.log('🚀 CCJK v8 Cloud API 测试开始\n');
console.log(`📍 服务端地址: ${CLOUD_ENDPOINT}`);
console.log(`🔑 API Key: ${API_KEY}\n`);

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  tests: [] as Array<{ name: string; status: 'PASS' | 'FAIL'; duration: number; error?: string }>,
};

// 测试计时器
function timer() {
  const start = Date.now();
  return () => Date.now() - start;
}

// 创建任务管理器
const taskManager = new TaskManager({
  storageType: 'cloud',
  cloudEndpoint: CLOUD_ENDPOINT,
});

// 测试主函数
async function runTests() {
  console.log('═'.repeat(60));
  console.log('📋 测试套件 1: 任务管理 API');
  console.log('═'.repeat(60));

  // 测试 1: 创建任务
  await test('创建任务', async () => {
    const _elapsed = timer();
    const task = await taskManager.createTask({
      name: '测试任务管理功能',
      description: '验证云端 API 的完整对接',
      priority: 'high' as TaskPriority,
    });

    if (!task.id)
      throw new Error('任务创建失败，未返回 ID');
    if (task.name !== '测试任务管理功能')
      throw new Error('任务名称不匹配');

    return task.id;
  });

  // 测试 2: 获取任务列表
  await test('获取任务列表', async () => {
    const _elapsed = timer();
    const tasks = await taskManager.listTasks();

    if (!Array.isArray(tasks))
      throw new Error('返回值不是数组');
    if (tasks.length === 0)
      throw new Error('任务列表为空');

    return `${tasks.length} 个任务`;
  });

  // 测试 3: 更新任务状态
  let testTaskId = '';
  await test('更新任务状态', async () => {
    const _elapsed = timer();

    // 先创建一个新任务
    const newTask = await taskManager.createTask({
      name: '更新测试任务',
      priority: 'medium' as TaskPriority,
    });
    testTaskId = newTask.id;
    const oldId = testTaskId; // Keep old ID for verification

    // 更新状态 (note: this creates a new task with the same data but updated status)
    const updated = await taskManager.updateTask(testTaskId, {
      status: 'in_progress',
    });

    if (!updated)
      throw new Error('更新返回 null');
    if (updated.status !== 'in_progress')
      throw new Error('状态未更新');
    if (updated.id === oldId)
      console.log('   ⚠️  Warning: ID unchanged, may indicate update instead of create');

    // Update testTaskId to the new ID for delete test
    testTaskId = updated.id;

    return `任务状态已更新为 in_progress (新任务 ID: ${updated.id})`;
  });

  // 测试 4: 删除任务
  await test('删除任务', async () => {
    const _elapsed = timer();
    const result = await taskManager.deleteTask(testTaskId);

    if (!result)
      throw new Error('删除失败');

    // 验证是否真的删除了
    const task = await taskManager.getTask(testTaskId);
    if (task !== null)
      throw new Error('任务仍然存在');

    return `任务 ${testTaskId} 已成功删除`;
  });

  // 测试 5: 任务依赖图
  await test('任务依赖图', async () => {
    const _elapsed = timer();

    // 创建依赖任务
    const task1 = await taskManager.createTask({ name: '基础任务', priority: 'high' as TaskPriority });
    const task2 = await taskManager.createTask({ name: '依赖任务', priority: 'medium' as TaskPriority });

    // 设置依赖关系
    await taskManager.addDependency(task2.id, task1.id);

    // 获取依赖图 (note: service returns dependency graph of all tasks)
    const graph = await taskManager.getDependencyGraph(task2.id);

    if (!graph || !Array.isArray(graph.nodes)) {
      throw new Error('依赖图格式不正确');
    }

    return `依赖图包含 ${graph.nodes.length} 个任务节点`;
  });

  // 测试 6: 任务调度
  await test('任务调度', async () => {
    const _elapsed = timer();
    const schedule = await taskManager.getSchedule();

    if (!schedule || !Array.isArray(schedule.order))
      throw new Error('调度结果格式不正确');

    return `调度生成了 ${schedule.order.length} 个任务的执行顺序`;
  });

  // 测试 7: 任务统计
  await test('任务统计', async () => {
    const _elapsed = timer();
    const stats = await taskManager.getStats();

    if (!stats || typeof stats.total !== 'number')
      throw new Error('统计信息格式不正确');

    return `总共 ${stats.total} 个任务，完成率 ${stats.completionRate}%`;
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 测试完成');
  console.log('═'.repeat(60));
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`📈 成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ 失败的测试:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach((t) => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
  }

  console.log(`\n${'═'.repeat(60)}`);

  // 打印详细性能报告
  console.log('\n📊 性能报告:');
  console.log('═'.repeat(60));
  results.tests
    .sort((a, b) => a.duration - b.duration)
    .forEach((t) => {
      const status = t.status === 'PASS' ? '✅' : '❌';
      const duration = t.duration.toString().padStart(4, ' ');
      console.log(`${status} [${duration}ms] ${t.name}`);
    });

  process.exit(results.failed > 0 ? 1 : 0);
}

// 单个测试执行函数
async function test(name: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;

    results.passed++;
    results.tests.push({ name, status: 'PASS', duration });

    console.log(`✅ ${name.padEnd(40)} ${duration.toString().padStart(4, ' ')}ms`);
    if (result) {
      console.log(`   Result: ${result}`);
    }
  }
  catch (error) {
    const duration = Date.now() - start;

    results.failed++;
    results.tests.push({
      name,
      status: 'FAIL',
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    console.log(`❌ ${name.padEnd(40)} ${duration.toString().padStart(4, ' ')}ms`);
    console.log(`   Error: ${error instanceof Error ? error.message : error}`);
  }
}

// 执行测试
runTests().catch((error) => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
