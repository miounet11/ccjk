/**
 * Input Normalizer Utility
 *
 * Handles full-width (zenkaku) character conversion for CJK IME support.
 * Aligns with Claude Code 2.1.21's Japanese full-width number input support.
 *
 * @module input-normalizer
 * @since 9.3.5
 */

/**
 * Full-width to half-width character mapping
 * Supports: Numbers (０-９), Letters (Ａ-Ｚ, ａ-ｚ), Common symbols
 */
const FULLWIDTH_TO_HALFWIDTH: Record<string, string> = {
  // Full-width numbers (Japanese/Chinese IME)
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',

  // Full-width uppercase letters
  'Ａ': 'A',
  'Ｂ': 'B',
  'Ｃ': 'C',
  'Ｄ': 'D',
  'Ｅ': 'E',
  'Ｆ': 'F',
  'Ｇ': 'G',
  'Ｈ': 'H',
  'Ｉ': 'I',
  'Ｊ': 'J',
  'Ｋ': 'K',
  'Ｌ': 'L',
  'Ｍ': 'M',
  'Ｎ': 'N',
  'Ｏ': 'O',
  'Ｐ': 'P',
  'Ｑ': 'Q',
  'Ｒ': 'R',
  'Ｓ': 'S',
  'Ｔ': 'T',
  'Ｕ': 'U',
  'Ｖ': 'V',
  'Ｗ': 'W',
  'Ｘ': 'X',
  'Ｙ': 'Y',
  'Ｚ': 'Z',

  // Full-width lowercase letters
  'ａ': 'a',
  'ｂ': 'b',
  'ｃ': 'c',
  'ｄ': 'd',
  'ｅ': 'e',
  'ｆ': 'f',
  'ｇ': 'g',
  'ｈ': 'h',
  'ｉ': 'i',
  'ｊ': 'j',
  'ｋ': 'k',
  'ｌ': 'l',
  'ｍ': 'm',
  'ｎ': 'n',
  'ｏ': 'o',
  'ｐ': 'p',
  'ｑ': 'q',
  'ｒ': 'r',
  'ｓ': 's',
  'ｔ': 't',
  'ｕ': 'u',
  'ｖ': 'v',
  'ｗ': 'w',
  'ｘ': 'x',
  'ｙ': 'y',
  'ｚ': 'z',

  // Common full-width symbols
  '　': ' ', // Full-width space
  '！': '!',
  '？': '?',
  '．': '.',
  '，': ',',
  '：': ':',
  '；': ';',
  '（': '(',
  '）': ')',
  '［': '[',
  '］': ']',
  '｛': '{',
  '｝': '}',
  '＋': '+',
  '－': '-',
  '＊': '*',
  '／': '/',
  '＝': '=',
  '＜': '<',
  '＞': '>',
  '＠': '@',
  '＃': '#',
  '＄': '$',
  '％': '%',
  '＆': '&',
  '＿': '_',
}

/**
 * Normalize full-width characters to half-width equivalents
 *
 * This function converts full-width (zenkaku) characters commonly produced
 * by CJK IME (Chinese, Japanese, Korean Input Method Editors) to their
 * standard ASCII half-width equivalents.
 *
 * @param input - The input string potentially containing full-width characters
 * @returns The normalized string with half-width characters
 *
 * @example
 * ```ts
 * normalizeFullWidth('１２３') // Returns '123'
 * normalizeFullWidth('Ｈｅｌｌｏ') // Returns 'Hello'
 * normalizeFullWidth('０') // Returns '0'
 * ```
 */
export function normalizeFullWidth(input: string): string {
  if (!input) return input

  let result = ''
  for (const char of input) {
    result += FULLWIDTH_TO_HALFWIDTH[char] ?? char
  }
  return result
}

/**
 * Normalize input for menu selection
 *
 * Specifically designed for menu input handling:
 * - Converts full-width numbers to half-width
 * - Trims whitespace
 * - Converts to lowercase for letter options (h, q)
 *
 * @param input - Raw user input from menu prompt
 * @returns Normalized input ready for menu processing
 *
 * @example
 * ```ts
 * normalizeMenuInput('１') // Returns '1'
 * normalizeMenuInput('Ｈ') // Returns 'h'
 * normalizeMenuInput(' ０ ') // Returns '0'
 * ```
 */
export function normalizeMenuInput(input: string): string {
  if (!input) return input
  return normalizeFullWidth(input.trim()).toLowerCase()
}

/**
 * Check if a character is a full-width digit
 *
 * @param char - Single character to check
 * @returns True if the character is a full-width digit (０-９)
 */
export function isFullWidthDigit(char: string): boolean {
  const code = char.charCodeAt(0)
  // Full-width digits: U+FF10 (０) to U+FF19 (９)
  return code >= 0xFF10 && code <= 0xFF19
}

/**
 * Check if a string contains any full-width characters
 *
 * @param input - String to check
 * @returns True if the string contains any full-width characters
 */
export function hasFullWidthChars(input: string): boolean {
  if (!input) return false
  for (const char of input) {
    if (FULLWIDTH_TO_HALFWIDTH[char]) {
      return true
    }
  }
  return false
}
