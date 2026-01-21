'use strict'
const commonJsonSchemas = require('../utils/common-json-schemas.js')
const reportErrors = require('../utils/report-errors.js')
const validateNewlinesAndPartitionConfiguration = require('../utils/validate-newlines-and-partition-configuration.js')
const getCustomGroupsCompareOptions = require('../utils/get-custom-groups-compare-options.js')
const validateCustomSortConfiguration = require('../utils/validate-custom-sort-configuration.js')
const types = require('./sort-variable-declarations/types.js')
const generatePredefinedGroups = require('../utils/generate-predefined-groups.js')
const sortNodesByDependencies = require('../utils/sort-nodes-by-dependencies.js')
const getEslintDisabledLines = require('../utils/get-eslint-disabled-lines.js')
const isNodeEslintDisabled = require('../utils/is-node-eslint-disabled.js')
const doesCustomGroupMatch = require('../utils/does-custom-group-match.js')
const sortNodesByGroups = require('../utils/sort-nodes-by-groups.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const reportAllErrors = require('../utils/report-all-errors.js')
const shouldPartition = require('../utils/should-partition.js')
const computeGroup = require('../utils/compute-group.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const isSortable = require('../utils/is-sortable.js')
const complete = require('../utils/complete.js')
let cachedGroupsByModifiersAndSelectors = /* @__PURE__ */ new Map()
let defaultOptions = {
  fallbackSort: { type: 'unsorted' },
  specialCharacters: 'keep',
  partitionByNewLine: false,
  partitionByComment: false,
  newlinesBetween: 'ignore',
  type: 'alphabetical',
  customGroups: [],
  ignoreCase: true,
  locales: 'en-US',
  alphabet: '',
  order: 'asc',
  groups: [],
}
const sortVariableDeclarations = createEslintRule.createEslintRule({
  create: context => ({
    VariableDeclaration: node => {
      if (!isSortable.isSortable(node.declarations)) {
        return
      }
      let settings = getSettings.getSettings(context.settings)
      let options = complete.complete(
        context.options.at(0),
        settings,
        defaultOptions,
      )
      validateCustomSortConfiguration.validateCustomSortConfiguration(options)
      validateNewlinesAndPartitionConfiguration.validateNewlinesAndPartitionConfiguration(
        options,
      )
      let { sourceCode, id } = context
      let eslintDisabledLines = getEslintDisabledLines.getEslintDisabledLines({
        ruleName: id,
        sourceCode,
      })
      let formattedMembers = node.declarations.reduce(
        (accumulator, declaration) => {
          var _a, _b
          let name
          if (
            declaration.id.type === 'ArrayPattern' ||
            declaration.id.type === 'ObjectPattern'
          ) {
            name = sourceCode.text.slice(...declaration.id.range)
          } else {
            ;({ name } = declaration.id)
          }
          let selector
          let dependencies = []
          if (declaration.init) {
            dependencies = extractDependencies(declaration.init)
            selector = 'initialized'
          } else {
            selector = 'uninitialized'
          }
          let predefinedGroups =
            generatePredefinedGroups.generatePredefinedGroups({
              cache: cachedGroupsByModifiersAndSelectors,
              selectors: [selector],
              modifiers: [],
            })
          let lastSortingNode =
            (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
          let sortingNode = {
            group: computeGroup.computeGroup({
              customGroupMatcher: customGroup =>
                doesCustomGroupMatch.doesCustomGroupMatch({
                  selectors: [selector],
                  elementName: name,
                  modifiers: [],
                  customGroup,
                }),
              predefinedGroups,
              options,
            }),
            isEslintDisabled: isNodeEslintDisabled.isNodeEslintDisabled(
              declaration,
              eslintDisabledLines,
            ),
            size: rangeToDiff.rangeToDiff(declaration, sourceCode),
            dependencyNames: [name],
            node: declaration,
            dependencies,
            name,
          }
          if (
            shouldPartition.shouldPartition({
              lastSortingNode,
              sortingNode,
              sourceCode,
              options,
            })
          ) {
            accumulator.push([])
          }
          ;(_b = accumulator.at(-1)) == null
            ? void 0
            : _b.push({
                ...sortingNode,
                partitionId: accumulator.length,
              })
          return accumulator
        },
        [[]],
      )
      let sortNodesExcludingEslintDisabled = ignoreEslintDisabledNodes => {
        let nodesSortedByGroups = formattedMembers.flatMap(nodes2 =>
          sortNodesByGroups.sortNodesByGroups({
            getOptionsByGroupIndex:
              getCustomGroupsCompareOptions.buildGetCustomGroupOverriddenOptionsFunction(
                options,
              ),
            ignoreEslintDisabledNodes,
            groups: options.groups,
            nodes: nodes2,
          }),
        )
        return sortNodesByDependencies.sortNodesByDependencies(
          nodesSortedByGroups,
          {
            ignoreEslintDisabledNodes,
          },
        )
      }
      let nodes = formattedMembers.flat()
      reportAllErrors.reportAllErrors({
        availableMessageIds: {
          missedSpacingBetweenMembers:
            'missedSpacingBetweenVariableDeclarationsMembers',
          extraSpacingBetweenMembers:
            'extraSpacingBetweenVariableDeclarationsMembers',
          unexpectedDependencyOrder:
            'unexpectedVariableDeclarationsDependencyOrder',
          unexpectedGroupOrder: 'unexpectedVariableDeclarationsGroupOrder',
          unexpectedOrder: 'unexpectedVariableDeclarationsOrder',
        },
        sortNodesExcludingEslintDisabled,
        sourceCode,
        options,
        context,
        nodes,
      })
    },
  }),
  meta: {
    schema: [
      {
        properties: {
          ...commonJsonSchemas.commonJsonSchemas,
          customGroups: commonJsonSchemas.buildCustomGroupsArrayJsonSchema({
            singleCustomGroupJsonSchema: types.singleCustomGroupJsonSchema,
          }),
          partitionByComment: commonJsonSchemas.partitionByCommentJsonSchema,
          partitionByNewLine: commonJsonSchemas.partitionByNewLineJsonSchema,
          newlinesBetween: commonJsonSchemas.newlinesBetweenJsonSchema,
          groups: commonJsonSchemas.groupsJsonSchema,
        },
        additionalProperties: false,
        type: 'object',
      },
    ],
    messages: {
      missedSpacingBetweenVariableDeclarationsMembers:
        reportErrors.MISSED_SPACING_ERROR,
      unexpectedVariableDeclarationsDependencyOrder:
        reportErrors.DEPENDENCY_ORDER_ERROR,
      extraSpacingBetweenVariableDeclarationsMembers:
        reportErrors.EXTRA_SPACING_ERROR,
      unexpectedVariableDeclarationsGroupOrder: reportErrors.GROUP_ORDER_ERROR,
      unexpectedVariableDeclarationsOrder: reportErrors.ORDER_ERROR,
    },
    docs: {
      url: 'https://perfectionist.dev/rules/sort-variable-declarations',
      description: 'Enforce sorted variable declarations.',
      recommended: true,
    },
    type: 'suggestion',
    fixable: 'code',
  },
  name: 'sort-variable-declarations',
  defaultOptions: [defaultOptions],
})
let extractDependencies = init => {
  let dependencies = []
  let checkNode = nodeValue => {
    if (
      nodeValue.type === 'ArrowFunctionExpression' ||
      nodeValue.type === 'FunctionExpression'
    ) {
      return
    }
    if (nodeValue.type === 'Identifier') {
      dependencies.push(nodeValue.name)
    }
    if (nodeValue.type === 'Property') {
      traverseNode(nodeValue.key)
      traverseNode(nodeValue.value)
    }
    if (nodeValue.type === 'ConditionalExpression') {
      traverseNode(nodeValue.test)
      traverseNode(nodeValue.consequent)
      traverseNode(nodeValue.alternate)
    }
    if (
      'expression' in nodeValue &&
      typeof nodeValue.expression !== 'boolean'
    ) {
      traverseNode(nodeValue.expression)
    }
    if ('object' in nodeValue) {
      traverseNode(nodeValue.object)
    }
    if ('callee' in nodeValue) {
      traverseNode(nodeValue.callee)
    }
    if ('left' in nodeValue) {
      traverseNode(nodeValue.left)
    }
    if ('right' in nodeValue) {
      traverseNode(nodeValue.right)
    }
    if ('elements' in nodeValue) {
      let elements = nodeValue.elements.filter(
        currentNode => currentNode !== null,
      )
      for (let element of elements) {
        traverseNode(element)
      }
    }
    if ('argument' in nodeValue && nodeValue.argument) {
      traverseNode(nodeValue.argument)
    }
    if ('arguments' in nodeValue) {
      for (let argument of nodeValue.arguments) {
        traverseNode(argument)
      }
    }
    if ('properties' in nodeValue) {
      for (let property of nodeValue.properties) {
        traverseNode(property)
      }
    }
    if ('expressions' in nodeValue) {
      for (let nodeExpression of nodeValue.expressions) {
        traverseNode(nodeExpression)
      }
    }
  }
  let traverseNode = nodeValue => {
    checkNode(nodeValue)
  }
  traverseNode(init)
  return dependencies
}
module.exports = sortVariableDeclarations
