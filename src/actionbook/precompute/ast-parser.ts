/**
 * AST Parser
 *
 * Parses TypeScript/JavaScript source files and generates Abstract Syntax Trees.
 * Uses @typescript-eslint/parser for accurate AST generation.
 */

import type { TSESTree } from '@typescript-eslint/types'
import type { ASTNode } from '../types.js'
import { parse } from '@typescript-eslint/parser'
import * as fs from 'node:fs/promises'

/**
 * Parse a source file and generate AST
 */
export async function parseAST(filePath: string): Promise<ASTNode | null> {
  try {
    const source = await fs.readFile(filePath, 'utf-8')
    return parseSourceToAST(source, filePath)
  }
  catch (error) {
    console.error(`Failed to parse AST for ${filePath}:`, error)
    return null
  }
}

/**
 * Parse source code string to AST
 */
export function parseSourceToAST(source: string, filePath: string): ASTNode | null {
  try {
    const estree = parse(source, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      project: './tsconfig.json',
      filePath,
    }) as any

    return convertESTreeToASTNode(estree)
  }
  catch (error) {
    console.error(`Failed to parse source for ${filePath}:`, error)
    return null
  }
}

/**
 * Convert ESTree node to our ASTNode format
 */
function convertESTreeToASTNode(node: any, parent?: any): ASTNode {
  const astNode: ASTNode = {
    type: node.type,
    name: getNodeName(node),
    range: {
      start: {
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
      },
      end: {
        line: node.loc?.end.line || 0,
        column: node.loc?.end.column || 0,
      },
    },
    children: [],
    metadata: extractNodeMetadata(node),
  }

  // Process child nodes
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range')
      continue

    const child = node[key]
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) {
          astNode.children.push(convertESTreeToASTNode(item, node))
        }
      }
    }
    else if (child && typeof child === 'object' && child.type) {
      astNode.children.push(convertESTreeToASTNode(child, node))
    }
  }

  return astNode
}

/**
 * Extract name from AST node
 */
function getNodeName(node: any): string | undefined {
  if (node.id?.name)
    return node.id.name
  if (node.key?.name)
    return node.key.name
  if (node.name)
    return node.name
  if (node.type === 'Identifier')
    return node.name
  return undefined
}

/**
 * Extract metadata from AST node
 */
function extractNodeMetadata(node: any): Record<string, any> {
  const metadata: Record<string, any> = {}

  if (node.declarations)
    metadata.declarationCount = node.declarations.length
  if (node.params)
    metadata.paramCount = node.params.length
  if (node.async)
    metadata.isAsync = true
  if (node.generator)
    metadata.isGenerator = true
  if (node.kind)
    metadata.kind = node.kind
  if (node.method)
    metadata.isMethod = true

  return metadata
}
