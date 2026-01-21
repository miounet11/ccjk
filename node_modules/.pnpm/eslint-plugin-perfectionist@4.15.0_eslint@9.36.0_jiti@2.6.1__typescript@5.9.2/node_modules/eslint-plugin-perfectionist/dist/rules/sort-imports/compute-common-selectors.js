'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
const node_module = require('node:module')
const matchesTsconfigPaths = require('./matches-tsconfig-paths.js')
const getTypescriptImport = require('./get-typescript-import.js')
const matches = require('../../utils/matches.js')
let computeCommonSelectors = ({ tsConfigOutput, filename, options, name }) => {
  let matchesInternalPattern = value =>
    options.internalPattern.some(pattern => matches.matches(value, pattern))
  let internalExternalGroup = matchesInternalPattern(name)
    ? 'internal'
    : getInternalOrExternalGroup({
        tsConfigOutput,
        filename,
        name,
      })
  let commonSelectors = []
  if (
    tsConfigOutput &&
    matchesTsconfigPaths.matchesTsconfigPaths({
      tsConfigOutput,
      name,
    })
  ) {
    commonSelectors.push('tsconfig-path')
  }
  if (isIndex(name)) {
    commonSelectors.push('index')
  }
  if (isSibling(name)) {
    commonSelectors.push('sibling')
  }
  if (isParent(name)) {
    commonSelectors.push('parent')
  }
  if (isSubpath(name)) {
    commonSelectors.push('subpath')
  }
  if (internalExternalGroup === 'internal') {
    commonSelectors.push('internal')
  }
  if (isCoreModule(name, options.environment)) {
    commonSelectors.push('builtin')
  }
  if (internalExternalGroup === 'external') {
    commonSelectors.push('external')
  }
  return commonSelectors
}
let bunModules = /* @__PURE__ */ new Set([
  'detect-libc',
  'bun:sqlite',
  'bun:test',
  'bun:wrap',
  'bun:ffi',
  'bun:jsc',
  'undici',
  'bun',
  'ws',
])
let nodeBuiltinModules = new Set(node_module.builtinModules)
let builtinPrefixOnlyModules = /* @__PURE__ */ new Set([
  'node:sqlite',
  'node:test',
  'node:sea',
])
let isCoreModule = (value, environment) => {
  let clean = string_ => string_.replace(/^(?:node:){1,2}/u, '')
  let [basePath] = value.split('/')
  let cleanValue = clean(value)
  let cleanBase = clean(basePath)
  if (nodeBuiltinModules.has(cleanValue) || nodeBuiltinModules.has(cleanBase)) {
    return true
  }
  if (
    builtinPrefixOnlyModules.has(value) ||
    builtinPrefixOnlyModules.has(`node:${cleanValue}`) ||
    builtinPrefixOnlyModules.has(basePath) ||
    builtinPrefixOnlyModules.has(`node:${cleanBase}`)
  ) {
    return true
  }
  return environment === 'bun' && bunModules.has(value)
}
let isParent = value => value.startsWith('..')
let isSibling = value => value.startsWith('./')
let isSubpath = value => value.startsWith('#')
let isIndex = value =>
  [
    './index.d.js',
    './index.d.ts',
    './index.js',
    './index.ts',
    './index',
    './',
    '.',
  ].includes(value)
let getInternalOrExternalGroup = ({ tsConfigOutput, filename, name }) => {
  var _a
  let typescriptImport = getTypescriptImport.getTypescriptImport()
  if (!typescriptImport) {
    return !name.startsWith('.') && !name.startsWith('/') ? 'external' : null
  }
  let isRelativeImport = typescriptImport.isExternalModuleNameRelative(name)
  if (isRelativeImport) {
    return null
  }
  if (!tsConfigOutput) {
    return 'external'
  }
  let resolution = typescriptImport.resolveModuleName(
    name,
    filename,
    tsConfigOutput.compilerOptions,
    typescriptImport.sys,
    tsConfigOutput.cache,
  )
  if (
    typeof ((_a = resolution.resolvedModule) == null
      ? void 0
      : _a.isExternalLibraryImport) !== 'boolean'
  ) {
    return 'external'
  }
  return resolution.resolvedModule.isExternalLibraryImport
    ? 'external'
    : 'internal'
}
exports.computeCommonSelectors = computeCommonSelectors
