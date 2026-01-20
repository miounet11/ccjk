/**
 * String Utilities
 * String manipulation and formatting functions
 */

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str)
    return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert string to camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/^\w|[A-Z]|\b\w/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase())
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
}

/**
 * Convert string to PascalCase
 */
export function pascalCase(str: string): string {
  return str
    .replace(/^\w|[A-Z]|\b\w/g, letter => letter.toUpperCase())
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
}

/**
 * Convert string to snake_case
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/^_/, '')
}

/**
 * Convert string to kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/^-/, '')
}

/**
 * Convert string to CONSTANT_CASE
 */
export function constantCase(str: string): string {
  return snakeCase(str).toUpperCase()
}

/**
 * Truncate string to specified length
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length)
    return str
  return str.slice(0, length - suffix.length) + suffix
}

/**
 * Pad string to specified length
 */
export function pad(
  str: string,
  length: number,
  char: string = ' ',
  direction: 'left' | 'right' | 'both' = 'right',
): string {
  if (str.length >= length)
    return str

  const padLength = length - str.length

  if (direction === 'left') {
    return char.repeat(padLength) + str
  }
  else if (direction === 'right') {
    return str + char.repeat(padLength)
  }
  else {
    const leftPad = Math.floor(padLength / 2)
    const rightPad = padLength - leftPad
    return char.repeat(leftPad) + str + char.repeat(rightPad)
  }
}

/**
 * Remove whitespace from both ends
 */
export function trim(str: string): string {
  return str.trim()
}

/**
 * Remove whitespace from start
 */
export function trimStart(str: string): string {
  return str.trimStart()
}

/**
 * Remove whitespace from end
 */
export function trimEnd(str: string): string {
  return str.trimEnd()
}

/**
 * Split string by delimiter
 */
export function split(str: string, delimiter: string | RegExp): string[] {
  return str.split(delimiter)
}

/**
 * Join array of strings
 */
export function join(arr: string[], separator: string = ''): string {
  return arr.join(separator)
}

/**
 * Replace all occurrences of search with replacement
 */
export function replaceAll(
  str: string,
  search: string | RegExp,
  replacement: string,
): string {
  if (typeof search === 'string') {
    return str.split(search).join(replacement)
  }
  return str.replace(new RegExp(search, 'g'), replacement)
}

/**
 * Check if string starts with prefix
 */
export function startsWith(str: string, prefix: string): boolean {
  return str.startsWith(prefix)
}

/**
 * Check if string ends with suffix
 */
export function endsWith(str: string, suffix: string): boolean {
  return str.endsWith(suffix)
}

/**
 * Check if string contains substring
 */
export function contains(str: string, substring: string): boolean {
  return str.includes(substring)
}

/**
 * Count occurrences of substring
 */
export function countOccurrences(str: string, substring: string): number {
  return str.split(substring).length - 1
}

/**
 * Reverse string
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('')
}

/**
 * Remove all whitespace
 */
export function removeWhitespace(str: string): string {
  return str.replace(/\s+/g, '')
}

/**
 * Normalize whitespace (replace multiple spaces with single space)
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim()
}

/**
 * Extract words from string
 */
export function words(str: string): string[] {
  return str.match(/\b\w+\b/g) || []
}

/**
 * Count words in string
 */
export function wordCount(str: string): number {
  return words(str).length
}

/**
 * Convert string to title case
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Convert string to sentence case
 */
export function sentenceCase(str: string): string {
  return capitalize(str.toLowerCase())
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  }
  return str.replace(/[&<>"']/g, char => htmlEscapes[char])
}

/**
 * Unescape HTML special characters
 */
export function unescapeHTML(str: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': '\'',
  }
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => htmlUnescapes[entity])
}

/**
 * Escape regular expression special characters
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Generate random string
 */
export function randomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return result
}

/**
 * Generate UUID v4
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Slugify string (URL-friendly)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Extract numbers from string
 */
export function extractNumbers(str: string): number[] {
  const matches = str.match(/-?\d+\.?\d*/g)
  return matches ? matches.map(Number) : []
}

/**
 * Format template string with values
 */
export function template(str: string, values: Record<string, any>): string {
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match
  })
}

/**
 * Repeat string n times
 */
export function repeat(str: string, count: number): string {
  return str.repeat(count)
}

/**
 * Check if string is empty or only whitespace
 */
export function isBlank(str: string): boolean {
  return !str || str.trim().length === 0
}

/**
 * Ensure string ends with suffix
 */
export function ensureSuffix(str: string, suffix: string): string {
  return endsWith(str, suffix) ? str : str + suffix
}

/**
 * Ensure string starts with prefix
 */
export function ensurePrefix(str: string, prefix: string): string {
  return startsWith(str, prefix) ? str : prefix + str
}

/**
 * Remove prefix from string
 */
export function removePrefix(str: string, prefix: string): string {
  return startsWith(str, prefix) ? str.slice(prefix.length) : str
}

/**
 * Remove suffix from string
 */
export function removeSuffix(str: string, suffix: string): string {
  return endsWith(str, suffix) ? str.slice(0, -suffix.length) : str
}
