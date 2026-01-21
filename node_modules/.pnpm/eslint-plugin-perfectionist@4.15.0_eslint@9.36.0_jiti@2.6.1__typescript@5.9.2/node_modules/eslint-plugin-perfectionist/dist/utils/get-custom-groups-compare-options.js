'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
let getCustomGroupsCompareOptions = (options, groupIndex) => {
  var _a, _b
  let { customGroups, fallbackSort, groups, order, type } = options
  if (Array.isArray(customGroups)) {
    let group = groups[groupIndex]
    let customGroup =
      typeof group === 'string'
        ? customGroups.find(currentGroup => group === currentGroup.groupName)
        : null
    if (customGroup) {
      fallbackSort = {
        type:
          ((_a = customGroup.fallbackSort) == null ? void 0 : _a.type) ??
          fallbackSort.type,
      }
      let fallbackOrder =
        ((_b = customGroup.fallbackSort) == null ? void 0 : _b.order) ??
        fallbackSort.order
      if (fallbackOrder) {
        fallbackSort.order = fallbackOrder
      }
      order = customGroup.order ?? order
      type = customGroup.type ?? type
    }
  }
  return {
    fallbackSort,
    order,
    type,
  }
}
let buildGetCustomGroupOverriddenOptionsFunction = options => groupIndex => ({
  options: getCustomGroupOverriddenOptions({
    groupIndex,
    options,
  }),
})
let getCustomGroupOverriddenOptions = ({ groupIndex, options }) => ({
  ...options,
  ...getCustomGroupsCompareOptions(options, groupIndex),
})
exports.buildGetCustomGroupOverriddenOptionsFunction =
  buildGetCustomGroupOverriddenOptionsFunction
exports.getCustomGroupOverriddenOptions = getCustomGroupOverriddenOptions
exports.getCustomGroupsCompareOptions = getCustomGroupsCompareOptions
