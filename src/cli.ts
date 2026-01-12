#!/usr/bin/env node
/**
 * CCJK CLI Entry Point
 *
 * 核心理念：
 * - 发挥 Claude Code 的编码能力
 * - 通过 agent/mcp/skill/hooks 方案进行加成
 * - 简单易用、稳定可靠
 *
 * 使用懒加载架构，只在需要时加载命令模块
 */

import { runLazyCli } from './cli-lazy'

runLazyCli().catch(console.error)
