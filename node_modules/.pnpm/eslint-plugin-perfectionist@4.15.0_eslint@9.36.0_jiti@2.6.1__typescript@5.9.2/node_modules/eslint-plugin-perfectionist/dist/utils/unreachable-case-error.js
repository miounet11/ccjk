'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
class UnreachableCaseError extends Error {
  constructor(value) {
    super(`Unreachable case: ${value}`)
    this.name = 'UnreachableCaseError'
  }
}
exports.UnreachableCaseError = UnreachableCaseError
