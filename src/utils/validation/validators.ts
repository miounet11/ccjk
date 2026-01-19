/**
 * Validation Utilities
 * General-purpose validation functions
 */

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: any): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * Check if value is a number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an object
 */
export function isObject(value: any): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray(value: any): value is any[] {
  return isArray(value) && value.length > 0;
}

/**
 * Check if value is a function
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Check if value is a promise
 */
export function isPromise(value: any): value is Promise<any> {
  return value instanceof Promise || (isObject(value) && isFunction(value.then));
}

/**
 * Check if value is a valid email
 */
export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid URL
 */
export function isURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid UUID
 */
export function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a valid JSON string
 */
export function isJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid date
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid ISO date string
 */
export function isISODate(value: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoDateRegex.test(value) && !isNaN(Date.parse(value));
}

/**
 * Check if value is in range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Check if string matches pattern
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return isString(value) && pattern.test(value);
}

/**
 * Check if value is one of allowed values
 */
export function isOneOf<T>(value: T, allowed: T[]): boolean {
  return allowed.includes(value);
}

/**
 * Check if object has all required keys
 */
export function hasKeys<T extends object>(
  obj: T,
  keys: (keyof T)[]
): boolean {
  return isObject(obj) && keys.every((key) => key in obj);
}

/**
 * Check if string has minimum length
 */
export function hasMinLength(value: string, min: number): boolean {
  return isString(value) && value.length >= min;
}

/**
 * Check if string has maximum length
 */
export function hasMaxLength(value: string, max: number): boolean {
  return isString(value) && value.length <= max;
}

/**
 * Check if string length is in range
 */
export function hasLengthInRange(
  value: string,
  min: number,
  max: number
): boolean {
  return isString(value) && value.length >= min && value.length <= max;
}

/**
 * Check if array has minimum length
 */
export function hasMinItems(value: any[], min: number): boolean {
  return isArray(value) && value.length >= min;
}

/**
 * Check if array has maximum length
 */
export function hasMaxItems(value: any[], max: number): boolean {
  return isArray(value) && value.length <= max;
}

/**
 * Check if value is a positive number
 */
export function isPositive(value: number): boolean {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a negative number
 */
export function isNegative(value: number): boolean {
  return isNumber(value) && value < 0;
}

/**
 * Check if value is zero
 */
export function isZero(value: number): boolean {
  return isNumber(value) && value === 0;
}

/**
 * Check if value is an integer
 */
export function isInteger(value: number): boolean {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Check if value is a port number (1-65535)
 */
export function isPort(value: number): boolean {
  return isInteger(value) && value >= 1 && value <= 65535;
}

/**
 * Check if value is a valid IP address (v4)
 */
export function isIPv4(value: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(value);
}

/**
 * Check if value is a valid IP address (v6)
 */
export function isIPv6(value: string): boolean {
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Regex.test(value);
}

/**
 * Check if value is a valid hex color
 */
export function isHexColor(value: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(value);
}

/**
 * Check if all values in array are unique
 */
export function hasUniqueValues(value: any[]): boolean {
  return isArray(value) && new Set(value).size === value.length;
}

/**
 * Assert value is defined, throw error if not
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message || 'Value is null or undefined');
  }
}

/**
 * Assert condition is true, throw error if not
 */
export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
