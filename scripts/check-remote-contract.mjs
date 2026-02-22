#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()

const schemaPath = join(ROOT, 'schema', 'remote-json-contract.schema.json')
const contractDocPath = join(ROOT, 'docs', 'remote-json-contract.md')
const docsIndexPath = join(ROOT, 'docs', 'README.md')

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function ok(message) {
  console.log(`✅ ${message}`)
}

function assert(condition, message) {
  if (!condition) {
    fail(message)
  }
}

function readText(filePath) {
  assert(existsSync(filePath), `Missing file: ${filePath}`)
  return readFileSync(filePath, 'utf-8')
}

function main() {
  const schemaRaw = readText(schemaPath)
  const schema = JSON.parse(schemaRaw)
  const contractDoc = readText(contractDocPath)
  const docsIndex = readText(docsIndexPath)

  assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'Schema must use draft 2020-12')
  assert(typeof schema.$id === 'string' && schema.$id.length > 0, 'Schema must define $id')
  assert(schema.$defs?.setupSuccess, 'Schema must include $defs.setupSuccess')
  assert(schema.$defs?.setupFailure, 'Schema must include $defs.setupFailure')
  assert(schema.$defs?.doctorResult, 'Schema must include $defs.doctorResult')

  assert(contractDoc.includes('schema/remote-json-contract.schema.json'), 'Contract doc must reference schema file path')
  assert(contractDoc.includes(schema.$id), 'Contract doc must contain schema $id')
  assert(contractDoc.includes('ccjk remote setup --json'), 'Contract doc must document setup JSON output')
  assert(contractDoc.includes('ccjk remote doctor --json'), 'Contract doc must document doctor JSON output')

  assert(docsIndex.includes('remote-json-contract.md'), 'Docs index must link Remote JSON Contract page')
  assert(docsIndex.includes('../schema/remote-json-contract.schema.json'), 'Docs index must link schema JSON file')

  ok('Remote JSON schema structure is valid')
  ok('Contract documentation is in sync with schema')
  ok('Docs index links are present')
}

try {
  main()
}
catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
