/**
 * Object Utilities
 * Object manipulation and transformation functions
 */

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as any;
  }

  if (obj instanceof Object) {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        output[key] = deepMerge(targetValue, sourceValue as any);
      } else {
        output[key] = sourceValue as any;
      }
    }
  }

  return output;
}

/**
 * Check if value is a plain object
 */
function isObject(value: any): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Get nested property value using dot notation
 */
export function get<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}

/**
 * Set nested property value using dot notation
 */
export function set(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

/**
 * Check if object has nested property using dot notation
 */
export function has(obj: any, path: string): boolean {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * Delete nested property using dot notation
 */
export function unset(obj: any, path: string): boolean {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  if (lastKey in current) {
    delete current[lastKey];
    return true;
  }

  return false;
}

/**
 * Get all keys from object (including nested)
 */
export function keys(obj: any, prefix: string = ''): string[] {
  const result: string[] = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      result.push(fullKey);

      if (isObject(obj[key])) {
        result.push(...keys(obj[key], fullKey));
      }
    }
  }

  return result;
}

/**
 * Get all values from object
 */
export function values<T = any>(obj: Record<string, T>): T[] {
  return Object.values(obj);
}

/**
 * Get all entries from object
 */
export function entries<T = any>(obj: Record<string, T>): [string, T][] {
  return Object.entries(obj);
}

/**
 * Pick specific keys from object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Omit specific keys from object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
}

/**
 * Filter object by predicate
 */
export function filter<T>(
  obj: Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const [key, value] of entries(obj)) {
    if (predicate(value, key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Map object values
 */
export function map<T, U>(
  obj: Record<string, T>,
  mapper: (value: T, key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};

  for (const [key, value] of entries(obj)) {
    result[key] = mapper(value, key);
  }

  return result;
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Flatten nested object
 */
export function flatten(
  obj: any,
  prefix: string = '',
  separator: string = '.'
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}${separator}${key}` : key;

      if (isObject(obj[key]) && !Array.isArray(obj[key])) {
        Object.assign(result, flatten(obj[key], fullKey, separator));
      } else {
        result[fullKey] = obj[key];
      }
    }
  }

  return result;
}

/**
 * Unflatten object (reverse of flatten)
 */
export function unflatten(
  obj: Record<string, any>,
  separator: string = '.'
): any {
  const result: any = {};

  for (const [key, value] of entries(obj)) {
    set(result, key.replace(new RegExp(separator, 'g'), '.'), value);
  }

  return result;
}

/**
 * Invert object (swap keys and values)
 */
export function invert<T extends string | number>(
  obj: Record<string, T>
): Record<T, string> {
  const result: any = {};

  for (const [key, value] of entries(obj)) {
    result[value] = key;
  }

  return result;
}

/**
 * Group array of objects by key
 */
export function groupBy<T>(
  arr: T[],
  key: keyof T | ((item: T) => string)
): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of arr) {
    const groupKey =
      typeof key === 'function' ? key(item) : String(item[key]);

    if (!result[groupKey]) {
      result[groupKey] = [];
    }

    result[groupKey].push(item);
  }

  return result;
}

/**
 * Convert array to object using key selector
 */
export function keyBy<T>(
  arr: T[],
  key: keyof T | ((item: T) => string)
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const item of arr) {
    const itemKey = typeof key === 'function' ? key(item) : String(item[key]);
    result[itemKey] = item;
  }

  return result;
}

/**
 * Check if two objects are deeply equal
 */
export function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 === null ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Remove null and undefined values from object
 */
export function compact<T extends object>(obj: T): Partial<T> {
  const result: any = {};

  for (const [key, value] of entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Freeze object deeply (immutable)
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  Object.freeze(obj);

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null) {
        deepFreeze(value);
      }
    }
  }

  return obj;
}

/**
 * Merge multiple objects
 */
export function merge<T extends object>(...objects: Partial<T>[]): T {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {} as T);
}

/**
 * Get object size (number of keys)
 */
export function size(obj: object): number {
  return Object.keys(obj).length;
}
