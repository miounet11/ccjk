'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
let isCommentAboveOption = groupOption =>
  typeof groupOption === 'object' && 'commentAbove' in groupOption
exports.isCommentAboveOption = isCommentAboveOption
