/**
 * Call Graph Generator
 *
 * Generates call graphs from AST by analyzing function calls and relationships.
 * Identifies entry points and call dependencies between functions.
 */

import type { ASTNode, CallGraph, CallNode, CallEdge } from '../types.js'

/**
 * Generate call graph from AST
 */
export function generateCallGraph(filePath: string, ast: ASTNode): CallGraph {
  const callGraph: CallGraph = {
    filePath,
    nodes: [],
    edges: [],
    entryPoints: [],
  }

  const functionStack: string[] = []
  let nodeIdCounter = 0

  // Extract all functions first
  extractFunctions(ast, callGraph, functionStack, nodeIdCounter)

  // Then extract call relationships
  functionStack.length = 0
  extractCallEdges(ast, callGraph, functionStack)

  // Identify entry points (functions not called by others)
  const calledFunctions = new Set(callGraph.edges.map(e => e.to))
  callGraph.entryPoints = callGraph.nodes
    .filter(node => !calledFunctions.has(node.id))
    .map(node => node.id)

  return callGraph
}

/**
 * Extract all function definitions
 */
function extractFunctions(
  node: ASTNode,
  callGraph: CallGraph,
  functionStack: string[],
  nodeIdCounter: number,
): number {
  if (
    node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ArrowFunctionExpression'
  ) {
    const callNode: CallNode = {
      id: `func-${nodeIdCounter++}`,
      name: node.name || '<anonymous>',
      kind: node.type.includes('Arrow') ? 'arrow' : node.type === 'FunctionExpression' ? 'function' : 'function',
      range: node.range,
      isAsync: node.metadata.isAsync || false,
      isGenerator: node.metadata.isGenerator || false,
    }
    callGraph.nodes.push(callNode)
    functionStack.push(callNode.id)
  }

  for (const child of node.children) {
    nodeIdCounter = extractFunctions(child, callGraph, functionStack, nodeIdCounter)
  }

  // Pop from stack if this was a function
  if (
    node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ArrowFunctionExpression'
  ) {
    functionStack.pop()
  }

  return nodeIdCounter
}

/**
 * Extract call edges
 */
function extractCallEdges(
  node: ASTNode,
  callGraph: CallGraph,
  functionStack: string[],
): void {
  // Push current function to stack
  if (
    node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ArrowFunctionExpression'
  ) {
    const funcNode = callGraph.nodes.find(n => n.range === node.range)
    if (funcNode) {
      functionStack.push(funcNode.id)
    }
  }

  // Check for function calls
  if (node.type === 'CallExpression' || node.type === 'NewExpression') {
    const callee = node.children.find(c => c.type === 'Identifier' || c.type === 'MemberExpression')
    if (callee && functionStack.length > 0) {
      const callerId = functionStack[functionStack.length - 1]
      const calleeName = callee.name || getMemberExpressionName(callee)

      // Find matching function node
      const calleeNode = callGraph.nodes.find(n => n.name === calleeName)

      if (calleeNode) {
        const existingEdge = callGraph.edges.find(
          e => e.from === callerId && e.to === calleeNode.id && e.range.start.line === node.range.start.line,
        )

        if (existingEdge) {
          existingEdge.callCount++
        }
        else {
          const edge: CallEdge = {
            from: callerId,
            to: calleeNode.id,
            range: node.range,
            isDynamic: node.type === 'NewExpression' || callee.type === 'MemberExpression',
            callCount: 1,
          }
          callGraph.edges.push(edge)
        }
      }
    }
  }

  for (const child of node.children) {
    extractCallEdges(child, callGraph, functionStack)
  }

  // Pop from stack
  if (
    node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ArrowFunctionExpression'
  ) {
    functionStack.pop()
  }
}

/**
 * Get name from member expression (e.g., obj.method -> method)
 */
function getMemberExpressionName(node: ASTNode): string | undefined {
  const property = node.children.find(c => c.type === 'Identifier')
  return property?.name
}
