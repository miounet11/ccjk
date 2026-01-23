/**
 * Symbol Extractor
 *
 * Extracts symbols (functions, classes, variables, etc.) from AST nodes.
 * Builds symbol tables with scope information and references.
 */

import type { ASTNode, SymbolTable, Symbol, Import, Scope } from '../types.js'

/**
 * Extract symbols from AST
 */
export function extractSymbols(filePath: string, ast: ASTNode): SymbolTable {
  const symbolTable: SymbolTable = {
    filePath,
    symbols: [],
    exports: [],
    imports: [],
    scopes: [],
  }

  const scopeStack: Scope[] = []
  let scopeIdCounter = 0

  // Create module-level scope
  const moduleScope: Scope = {
    id: `scope-${scopeIdCounter++}`,
    kind: 'module',
    range: ast.range,
    children: [],
    symbols: [],
  }
  symbolTable.scopes.push(moduleScope)
  scopeStack.push(moduleScope)

  // Extract symbols from AST
  extractSymbolsFromNode(ast, symbolTable, scopeStack, scopeIdCounter)

  return symbolTable
}

/**
 * Recursively extract symbols from AST node
 */
function extractSymbolsFromNode(
  node: ASTNode,
  symbolTable: SymbolTable,
  scopeStack: Scope[],
  scopeIdCounter: number,
): number {
  const currentScope = scopeStack[scopeStack.length - 1]

  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      const symbol = createFunctionSymbol(node, currentScope.id)
      symbolTable.symbols.push(symbol)
      currentScope.symbols.push(symbol.id)

      // Create new scope
      const functionScope: Scope = {
        id: `scope-${scopeIdCounter++}`,
        kind: 'function',
        range: node.range,
        parent: currentScope.id,
        children: [],
        symbols: [],
      }
      symbolTable.scopes.push(functionScope)
      currentScope.children.push(functionScope.id)
      scopeStack.push(functionScope)
      break
    }

    case 'ClassDeclaration':
    case 'ClassExpression': {
      const symbol = createClassSymbol(node, currentScope.id)
      symbolTable.symbols.push(symbol)
      currentScope.symbols.push(symbol.id)

      // Create class scope
      const classScope: Scope = {
        id: `scope-${scopeIdCounter++}`,
        kind: 'class',
        range: node.range,
        parent: currentScope.id,
        children: [],
        symbols: [],
      }
      symbolTable.scopes.push(classScope)
      currentScope.children.push(classScope.id)
      scopeStack.push(classScope)
      break
    }

    case 'VariableDeclaration':
    case 'VariableDeclarator': {
      const symbol = createVariableSymbol(node, currentScope.id)
      symbolTable.symbols.push(symbol)
      currentScope.symbols.push(symbol.id)
      break
    }

    case 'TSInterfaceDeclaration':
    case 'TSTypeAliasDeclaration': {
      const symbol = createTypeSymbol(node, currentScope.id)
      symbolTable.symbols.push(symbol)
      symbolTable.exports.push(symbol)
      currentScope.symbols.push(symbol.id)
      break
    }

    case 'ImportDeclaration': {
      const importDecl = createImportDeclaration(node)
      symbolTable.imports.push(importDecl)
      break
    }

    case 'ExportNamedDeclaration':
    case 'ExportDefaultDeclaration': {
      // Mark symbols as exported
      if (node.name) {
        const symbol = symbolTable.symbols.find(s => s.name === node.name)
        if (symbol && !symbolTable.exports.includes(symbol)) {
          symbolTable.exports.push(symbol)
        }
      }
      break
    }

    case 'BlockStatement': {
      // Create block scope
      const blockScope: Scope = {
        id: `scope-${scopeIdCounter++}`,
        kind: 'block',
        range: node.range,
        parent: currentScope.id,
        children: [],
        symbols: [],
      }
      symbolTable.scopes.push(blockScope)
      currentScope.children.push(blockScope.id)
      scopeStack.push(blockScope)
      break
    }
  }

  // Process children
  for (const child of node.children) {
    scopeIdCounter = extractSymbolsFromNode(child, symbolTable, scopeStack, scopeIdCounter)

    // Pop scope if child created one
    if (
      child.type === 'FunctionDeclaration'
      || child.type === 'FunctionExpression'
      || child.type === 'ClassDeclaration'
      || child.type === 'ClassExpression'
      || child.type === 'BlockStatement'
    ) {
      const childScopeEnd = symbolTable.scopes.findIndex(s => s.range === child.range)
      if (childScopeEnd !== -1 && childScopeEnd < symbolTable.scopes.length - 1) {
        scopeStack.pop()
      }
    }
  }

  return scopeIdCounter
}

/**
 * Create function symbol
 */
function createFunctionSymbol(node: ASTNode, parentId: string): Symbol {
  return {
    id: `symbol-${node.type}-${node.range.start.line}-${node.range.start.column}`,
    name: node.name || '<anonymous>',
    kind: node.type.includes('Method') ? 'method' : 'function',
    range: node.range,
    definingScope: parentId,
    references: [],
    metadata: {
      isAsync: node.metadata.isAsync || false,
      isGenerator: node.metadata.isGenerator || false,
      paramCount: node.metadata.paramCount || 0,
    },
  }
}

/**
 * Create class symbol
 */
function createClassSymbol(node: ASTNode, parentId: string): Symbol {
  return {
    id: `symbol-class-${node.range.start.line}-${node.range.start.column}`,
    name: node.name || '<anonymous>',
    kind: 'class',
    range: node.range,
    definingScope: parentId,
    references: [],
    metadata: {},
  }
}

/**
 * Create variable symbol
 */
function createVariableSymbol(node: ASTNode, parentId: string): Symbol {
  const isConst = node.metadata.kind === 'const'
  return {
    id: `symbol-variable-${node.range.start.line}-${node.range.start.column}`,
    name: node.name || '<unknown>',
    kind: isConst ? 'constant' : 'variable',
    range: node.range,
    definingScope: parentId,
    references: [],
    metadata: {},
  }
}

/**
 * Create type symbol
 */
function createTypeSymbol(node: ASTNode, parentId: string): Symbol {
  return {
    id: `symbol-type-${node.range.start.line}-${node.range.start.column}`,
    name: node.name || '<anonymous>',
    kind: node.type.includes('Interface') ? 'interface' : 'type',
    range: node.range,
    definingScope: parentId,
    references: [],
    metadata: {},
  }
}

/**
 * Create import declaration
 */
function createImportDeclaration(node: ASTNode): Import {
  const imports: any[] = []

  // Extract import specifiers from children
  for (const child of node.children) {
    if (child.type === 'ImportSpecifier' || child.type === 'ImportDefaultSpecifier') {
      imports.push({
        name: child.name,
        alias: child.metadata.local,
        kind: child.type.replace('Import', '').toLowerCase(),
      })
    }
  }

  return {
    module: node.metadata.source || '',
    imports,
    range: node.range,
    isDynamic: node.type === 'ImportExpression',
  }
}
