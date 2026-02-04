/**
 * Query API - Call Graph
 *
 * Query interface for call graph data.
 */

import type { CallEdge, CallGraph, CallNode } from '../../types.js'
import { getGlobalIndex } from '../../cache/index.js'

/**
 * Query call graph for a file
 */
export async function queryCallGraph(filePath: string): Promise<CallGraph | null> {
  const index = getGlobalIndex()
  const key = `${filePath}|call-graph`

  const entry = await index.get(key)
  if (!entry) {
    return null
  }

  return entry.data as CallGraph
}

/**
 * Query entry points (functions not called by others)
 */
export async function queryEntryPoints(filePath: string): Promise<CallNode[]> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return []
  }

  const entryNodes = callGraph.nodes.filter(node =>
    callGraph.entryPoints.includes(node.id),
  )

  return entryNodes
}

/**
 * Query function by name
 */
export async function queryFunction(filePath: string, name: string): Promise<CallNode | null> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return null
  }

  return callGraph.nodes.find(node => node.name === name) || null
}

/**
 * Query callers of a function
 */
export async function queryCallers(filePath: string, functionName: string): Promise<CallEdge[]> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return []
  }

  const targetNode = callGraph.nodes.find(n => n.name === functionName)
  if (!targetNode) {
    return []
  }

  return callGraph.edges.filter(edge => edge.to === targetNode.id)
}

/**
 * Query callees of a function
 */
export async function queryCallees(filePath: string, functionName: string): Promise<CallEdge[]> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return []
  }

  const sourceNode = callGraph.nodes.find(n => n.name === functionName)
  if (!sourceNode) {
    return []
  }

  return callGraph.edges.filter(edge => edge.from === sourceNode.id)
}

/**
 * Query call chain between two functions
 */
export async function queryCallChain(
  filePath: string,
  from: string,
  to: string,
): Promise<string[]> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return []
  }

  const fromNode = callGraph.nodes.find(n => n.name === from)
  const toNode = callGraph.nodes.find(n => n.name === to)

  if (!fromNode || !toNode) {
    return []
  }

  // BFS to find shortest path
  const queue: Array<{ node: string, path: string[] }> = [
    { node: fromNode.id, path: [fromNode.id] },
  ]
  const visited = new Set<string>([fromNode.id])

  while (queue.length > 0) {
    const { node, path } = queue.shift()!

    if (node === toNode.id) {
      return path.map(id => callGraph.nodes.find(n => n.id === id)!.name)
    }

    const edges = callGraph.edges.filter(e => e.from === node)
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to)
        queue.push({ node: edge.to, path: [...path, edge.to] })
      }
    }
  }

  return []
}

/**
 * Query recursive functions
 */
export async function queryRecursiveFunctions(filePath: string): Promise<CallNode[]> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return []
  }

  const recursiveNodes: CallNode[] = []

  for (const node of callGraph.nodes) {
    const edges = callGraph.edges.filter(e => e.from === node.id)
    if (edges.some(e => e.to === node.id)) {
      recursiveNodes.push(node)
    }
  }

  return recursiveNodes
}

/**
 * Query call frequency
 */
export async function queryCallFrequency(filePath: string): Promise<Map<string, number>> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return new Map()
  }

  const frequency = new Map<string, number>()

  for (const edge of callGraph.edges) {
    const toNode = callGraph.nodes.find(n => n.id === edge.to)
    if (toNode) {
      const currentCount = frequency.get(toNode.name) || 0
      frequency.set(toNode.name, currentCount + edge.callCount)
    }
  }

  return frequency
}

/**
 * Query most called functions
 */
export async function queryMostCalledFunctions(filePath: string, limit = 10): Promise<Array<{ name: string, count: number }>> {
  const frequency = await queryCallFrequency(filePath)

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

/**
 * Query function depth (how deep in call tree)
 */
export async function queryFunctionDepth(filePath: string, functionName: string): Promise<number> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return 0
  }

  const targetNode = callGraph.nodes.find(n => n.name === functionName)
  if (!targetNode) {
    return 0
  }

  // Find shortest distance from any entry point
  const queue: Array<{ node: string, depth: number }> = callGraph.entryPoints.map(id => ({
    node: id,
    depth: 0,
  }))
  const visited = new Set<string>(callGraph.entryPoints)

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!

    if (node === targetNode.id) {
      return depth
    }

    const edges = callGraph.edges.filter(e => e.from === node)
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to)
        queue.push({ node: edge.to, depth: depth + 1 })
      }
    }
  }

  return 0
}

/**
 * Query dynamic calls
 */
export async function queryDynamicCalls(filePath: string): Promise<CallEdge[]> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return []
  }

  return callGraph.edges.filter(edge => edge.isDynamic)
}

/**
 * Query async functions
 */
export async function queryAsyncFunctions(filePath: string): Promise<CallNode[]> {
  const callGraph = await queryCallGraph(filePath)
  if (!callGraph) {
    return []
  }

  return callGraph.nodes.filter(node => node.isAsync)
}
