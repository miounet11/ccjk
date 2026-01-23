/**
 * Query API - Symbols
 *
 * Query interface for symbol table data.
 */

import type { SymbolTable, Symbol, Import } from '../../types.js'
import { getGlobalIndex } from '../../cache/index.js'

/**
 * Query symbol table for a file
 */
export async function querySymbols(filePath: string): Promise<SymbolTable | null> {
  const index = getGlobalIndex()
  const key = `${filePath}|symbol`

  const entry = await index.get(key)
  if (!entry) {
    return null
  }

  return entry.data as SymbolTable
}

/**
 * Query all exported symbols
 */
export async function queryExports(filePath: string): Promise<Symbol[]> {
  const symbolTable = await querySymbols(filePath)
  if (!symbolTable) {
    return []
  }

  return symbolTable.exports
}

/**
 * Query all imported symbols
 */
export async function queryImports(filePath: string): Promise<Import[]> {
  const symbolTable = await querySymbols(filePath)
  if (!symbolTable) {
    return []
  }

  return symbolTable.imports
}

/**
 * Query symbol by name
 */
export async function querySymbolByName(filePath: string, name: string): Promise<Symbol | null> {
  const symbolTable = await querySymbols(filePath)
  if (!symbolTable) {
    return null
  }

  return symbolTable.symbols.find(s => s.name === name) || null
}

/**
 * Query symbols by kind
 */
export async function querySymbolsByKind(filePath: string, kind: string): Promise<Symbol[]> {
  const symbolTable = await querySymbols(filePath)
  if (!symbolTable) {
    return []
  }

  return symbolTable.symbols.filter(s => s.kind === kind)
}

/**
 * Query symbol at position
 */
export async function querySymbolAtPosition(
  filePath: string,
  line: number,
  column: number,
): Promise<Symbol | null> {
  const symbolTable = await querySymbols(filePath)
  if (!symbolTable) {
    return null
  }

  return symbolTable.symbols.find(symbol => {
    const isBefore = line < symbol.range.start.line
      || (line === symbol.range.start.line && column < symbol.range.start.column)
    const isAfter = line > symbol.range.end.line
      || (line === symbol.range.end.line && column > symbol.range.end.column)

    return !isBefore && !isAfter
  }) || null
}

/**
 * Query all functions
 */
export async function queryFunctions(filePath: string): Promise<Symbol[]> {
  return querySymbolsByKind(filePath, 'function')
}

/**
 * Query all classes
 */
export async function queryClasses(filePath: string): Promise<Symbol[]> {
  return querySymbolsByKind(filePath, 'class')
}

/**
 * Query all interfaces
 */
export async function queryInterfaces(filePath: string): Promise<Symbol[]> {
  return querySymbolsByKind(filePath, 'interface')
}

/**
 * Query all types
 */
export async function queryTypes(filePath: string): Promise<Symbol[]> {
  return querySymbolsByKind(filePath, 'type')
}

/**
 * Query all variables
 */
export async function queryVariables(filePath: string): Promise<Symbol[]> {
  return querySymbolsByKind(filePath, 'variable')
}

/**
 * Query scope at position
 */
export async function queryScopeAtPosition(
  filePath: string,
  line: number,
  column: number,
): Promise<string | null> {
  const symbolTable = await querySymbols(filePath)
  if (!symbolTable) {
    return null
  }

  for (const scope of symbolTable.scopes) {
    const isBefore = line < scope.range.start.line
      || (line === scope.range.start.line && column < scope.range.start.column)
    const isAfter = line > scope.range.end.line
      || (line === scope.range.end.line && column > scope.range.end.column)

    if (!isBefore && !isAfter) {
      return scope.id
    }
  }

  return null
}

/**
 * Query symbols in scope
 */
export async function querySymbolsInScope(filePath: string, scopeId: string): Promise<Symbol[]> {
  const symbolTable = await querySymbols(filePath)
  if (!symbolTable) {
    return []
  }

  const scope = symbolTable.scopes.find(s => s.id === scopeId)
  if (!scope) {
    return []
  }

  return symbolTable.symbols.filter(s => scope.symbols.includes(s.id))
}
