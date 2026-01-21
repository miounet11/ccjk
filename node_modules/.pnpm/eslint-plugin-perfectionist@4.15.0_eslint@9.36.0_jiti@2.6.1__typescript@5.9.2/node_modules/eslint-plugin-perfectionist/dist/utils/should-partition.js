'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
const isPartitionComment = require('./is-partition-comment.js')
const getCommentsBefore = require('./get-comments-before.js')
const getLinesBetween = require('./get-lines-between.js')
let shouldPartition = ({
  tokenValueToIgnoreBefore,
  lastSortingNode,
  sortingNode,
  sourceCode,
  options,
}) => {
  let shouldPartitionByComment =
    options.partitionByComment &&
    hasPartitionComment({
      comments: getCommentsBefore.getCommentsBefore({
        tokenValueToIgnoreBefore,
        node: sortingNode.node,
        sourceCode,
      }),
      partitionByComment: options.partitionByComment,
    })
  if (shouldPartitionByComment) {
    return true
  }
  return !!(
    options.partitionByNewLine &&
    lastSortingNode &&
    getLinesBetween.getLinesBetween(sourceCode, lastSortingNode, sortingNode)
  )
}
let hasPartitionComment = ({ partitionByComment, comments }) =>
  comments.some(comment =>
    isPartitionComment.isPartitionComment({
      partitionByComment,
      comment,
    }),
  )
exports.shouldPartition = shouldPartition
