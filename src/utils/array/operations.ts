/**
 * Array Utilities
 * Array manipulation and transformation functions
 */

/**
 * Remove duplicates from array
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Remove duplicates by key
 */
export function uniqueBy<T>(arr: T[], key: keyof T | ((item: T) => any)): T[] {
  const seen = new Set()
  return arr.filter((item) => {
    const value = typeof key === 'function' ? key(item) : item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

/**
 * Flatten nested array
 */
export function flatten<T>(arr: any[], depth: number = Infinity): T[] {
  if (depth === 0)
    return arr

  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      acc.push(...flatten(val, depth - 1))
    }
    else {
      acc.push(val)
    }
    return acc
  }, [])
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

/**
 * Shuffle array randomly
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Get random element from array
 */
export function sample<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Get multiple random elements from array
 */
export function sampleSize<T>(arr: T[], size: number): T[] {
  const shuffled = shuffle(arr)
  return shuffled.slice(0, Math.min(size, arr.length))
}

/**
 * Partition array into two arrays based on predicate
 */
export function partition<T>(
  arr: T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const truthy: T[] = []
  const falsy: T[] = []

  for (const item of arr) {
    if (predicate(item)) {
      truthy.push(item)
    }
    else {
      falsy.push(item)
    }
  }

  return [truthy, falsy]
}

/**
 * Get intersection of arrays
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0)
    return []
  if (arrays.length === 1)
    return arrays[0]

  const [first, ...rest] = arrays
  return first.filter(item => rest.every(arr => arr.includes(item)))
}

/**
 * Get union of arrays
 */
export function union<T>(...arrays: T[][]): T[] {
  return unique(flatten(arrays, 1))
}

/**
 * Get difference between arrays (items in first but not in others)
 */
export function difference<T>(arr: T[], ...others: T[][]): T[] {
  const otherItems = new Set(flatten(others, 1))
  return arr.filter(item => !otherItems.has(item))
}

/**
 * Zip arrays together
 */
export function zip<T>(...arrays: T[][]): T[][] {
  const maxLength = Math.max(...arrays.map(arr => arr.length))
  const result: T[][] = []

  for (let i = 0; i < maxLength; i++) {
    result.push(arrays.map(arr => arr[i]))
  }

  return result
}

/**
 * Unzip array of arrays
 */
export function unzip<T>(arr: T[][]): T[][] {
  return zip(...arr)
}

/**
 * Group consecutive elements
 */
export function groupConsecutive<T>(
  arr: T[],
  predicate: (a: T, b: T) => boolean,
): T[][] {
  if (arr.length === 0)
    return []

  const groups: T[][] = [[arr[0]]]

  for (let i = 1; i < arr.length; i++) {
    const lastGroup = groups[groups.length - 1]
    const lastItem = lastGroup[lastGroup.length - 1]

    if (predicate(lastItem, arr[i])) {
      lastGroup.push(arr[i])
    }
    else {
      groups.push([arr[i]])
    }
  }

  return groups
}

/**
 * Take first n elements
 */
export function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n)
}

/**
 * Take last n elements
 */
export function takeLast<T>(arr: T[], n: number): T[] {
  return arr.slice(-n)
}

/**
 * Drop first n elements
 */
export function drop<T>(arr: T[], n: number): T[] {
  return arr.slice(n)
}

/**
 * Drop last n elements
 */
export function dropLast<T>(arr: T[], n: number): T[] {
  return arr.slice(0, -n)
}

/**
 * Take elements while predicate is true
 */
export function takeWhile<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  const result: T[] = []
  for (const item of arr) {
    if (!predicate(item))
      break
    result.push(item)
  }
  return result
}

/**
 * Drop elements while predicate is true
 */
export function dropWhile<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  let dropping = true
  return arr.filter((item) => {
    if (dropping && predicate(item)) {
      return false
    }
    dropping = false
    return true
  })
}

/**
 * Find index of element
 */
export function findIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  return arr.findIndex(predicate)
}

/**
 * Find last index of element
 */
export function findLastIndex<T>(
  arr: T[],
  predicate: (item: T) => boolean,
): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return i
    }
  }
  return -1
}

/**
 * Count occurrences of element
 */
export function count<T>(arr: T[], item: T): number {
  return arr.filter(x => x === item).length
}

/**
 * Count elements matching predicate
 */
export function countBy<T>(arr: T[], predicate: (item: T) => boolean): number {
  return arr.filter(predicate).length
}

/**
 * Sum array of numbers
 */
export function sum(arr: number[]): number {
  return arr.reduce((acc, val) => acc + val, 0)
}

/**
 * Sum by property or function
 */
export function sumBy<T>(
  arr: T[],
  selector: keyof T | ((item: T) => number),
): number {
  return arr.reduce((acc, item) => {
    const value = typeof selector === 'function' ? selector(item) : item[selector]
    return acc + (typeof value === 'number' ? value : 0)
  }, 0)
}

/**
 * Get average of numbers
 */
export function average(arr: number[]): number {
  return arr.length === 0 ? 0 : sum(arr) / arr.length
}

/**
 * Get minimum value
 */
export function min(arr: number[]): number | undefined {
  return arr.length === 0 ? undefined : Math.min(...arr)
}

/**
 * Get maximum value
 */
export function max(arr: number[]): number | undefined {
  return arr.length === 0 ? undefined : Math.max(...arr)
}

/**
 * Get minimum by property or function
 */
export function minBy<T>(
  arr: T[],
  selector: keyof T | ((item: T) => number),
): T | undefined {
  if (arr.length === 0)
    return undefined

  return arr.reduce((min, item) => {
    const minValue
      = typeof selector === 'function' ? selector(min) : (min[selector] as any)
    const itemValue
      = typeof selector === 'function' ? selector(item) : (item[selector] as any)
    return itemValue < minValue ? item : min
  })
}

/**
 * Get maximum by property or function
 */
export function maxBy<T>(
  arr: T[],
  selector: keyof T | ((item: T) => number),
): T | undefined {
  if (arr.length === 0)
    return undefined

  return arr.reduce((max, item) => {
    const maxValue
      = typeof selector === 'function' ? selector(max) : (max[selector] as any)
    const itemValue
      = typeof selector === 'function' ? selector(item) : (item[selector] as any)
    return itemValue > maxValue ? item : max
  })
}

/**
 * Sort array by property or function
 */
export function sortBy<T>(
  arr: T[],
  selector: keyof T | ((item: T) => any),
  order: 'asc' | 'desc' = 'asc',
): T[] {
  const sorted = [...arr].sort((a, b) => {
    const aValue = typeof selector === 'function' ? selector(a) : a[selector]
    const bValue = typeof selector === 'function' ? selector(b) : b[selector]

    if (aValue < bValue)
      return order === 'asc' ? -1 : 1
    if (aValue > bValue)
      return order === 'asc' ? 1 : -1
    return 0
  })

  return sorted
}

/**
 * Check if array is empty
 */
export function isEmpty<T>(arr: T[]): boolean {
  return arr.length === 0
}

/**
 * Compact array (remove falsy values)
 */
export function compact<T>(arr: T[]): NonNullable<T>[] {
  return arr.filter(item => !!item) as NonNullable<T>[]
}

/**
 * Range of numbers
 */
export function range(start: number, end?: number, step: number = 1): number[] {
  if (end === undefined) {
    end = start
    start = 0
  }

  const result: number[] = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }

  return result
}

/**
 * Rotate array by n positions
 */
export function rotate<T>(arr: T[], n: number): T[] {
  const len = arr.length
  if (len === 0)
    return arr

  n = ((n % len) + len) % len // Normalize n
  return [...arr.slice(n), ...arr.slice(0, n)]
}

/**
 * Check if arrays are equal
 */
export function isEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length)
    return false
  return arr1.every((item, index) => item === arr2[index])
}
