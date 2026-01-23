/**
 * Query API - AST
 *
 * Query interface for AST data.
 */

import type { ASTNode } from '../../types.js'
import { getGlobalIndex } from '../../cache/index.js'

/**
 * Query AST for a file
 */
export async function queryAST(filePath: string, offset?: number): Promise<ASTNode | null> {
  const index = getGlobalIndex()
  const key = offset ? `${filePath}|ast|${offset}` : `${filePath}|ast`

  const entry = await index.get(key)
  if (!entry) {
    return null
  }

  return entry.data as ASTNode
}

/**
 * Query AST node at specific position
 */
export async function queryASTAtPosition(
  filePath: string,
  line: number,
  column: number,
): Promise<ASTNode | null> {
  const ast = await queryAST(filePath)
  if (!ast) {
    return null
  }

  return findNodeAtPosition(ast, line, column)
}

/**
 * Find AST node at position
 */
function findNodeAtPosition(node: ASTNode, line: number, column: number): ASTNode | null {
  // Check if position is within this node
  const isBefore = line < node.range.start.line
    || (line === node.range.start.line && column < node.range.start.column)
  const isAfter = line > node.range.end.line
    || (line === node.range.end.line && column > node.range.end.column)

  if (isBefore || isAfter) {
    return null
  }

  // Check children first (more specific nodes)
  for (const child of node.children) {
    const found = findNodeAtPosition(child, line, column)
    if (found) {
      return found
    }
  }

  // Return this node if no child matches
  return node
}

/**
 * Query all AST nodes of a specific type
 */
export async function queryASTByType(filePath: string, nodeType: string): Promise<ASTNode[]> {
  const ast = await queryAST(filePath)
  if (!ast) {
    return []
  }

  return findNodesByType(ast, nodeType)
}

/**
 * Find all nodes of a specific type
 */
function findNodesByType(node: ASTNode, nodeType: string): ASTNode[] {
  const results: ASTNode[] = []

  if (node.type === nodeType) {
    results.push(node)
  }

  for (const child of node.children) {
    results.push(...findNodesByType(child, nodeType))
  }

  return results
}

/**
 * Query AST nodes with a specific name
 */
export async function queryASTByName(filePath: string, name: string): Promise<ASTNode[]> {
  const ast = await queryAST(filePath)
  if (!ast) {
    return []
  }

  return findNodesByName(ast, name)
}

/**
 * Find all nodes with a specific name
 */
function findNodesByName(node: ASTNode, name: string): ASTNode[] {
  const results: ASTNode[] = []

  if (node.name === name) {
    results.push(node)
  }

  for (const child of node.children) {
    results.push(...findNodesByName(child, name))
  }

  return results
}
