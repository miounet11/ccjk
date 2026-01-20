/**
 * Array Utilities Tests
 */

import {
  average,
  chunk,
  compact,
  difference,
  flatten,
  intersection,
  isEmpty,
  max,
  min,
  partition,
  range,
  shuffle,
  sortBy,
  sum,
  union,
  unique,
  uniqueBy,
} from '../operations'

describe('array Utilities', () => {
  describe('unique', () => {
    it('should remove duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })
  })

  describe('uniqueBy', () => {
    it('should remove duplicates by key', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 1, name: 'John Doe' },
      ]
      expect(uniqueBy(arr, 'id')).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ])
    })

    it('should remove duplicates by function', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 1, name: 'John Doe' },
      ]
      expect(uniqueBy(arr, item => item.id)).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ])
    })
  })

  describe('flatten', () => {
    it('should flatten nested arrays', () => {
      expect(flatten([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4])
      expect(flatten([1, [2, [3, [4]]]], 1)).toEqual([1, 2, [3, [4]]])
      expect(flatten([1, [2, [3, [4]]]], 2)).toEqual([1, 2, 3, [4]])
    })
  })

  describe('chunk', () => {
    it('should split array into chunks', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
      expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]])
    })
  })

  describe('shuffle', () => {
    it('should shuffle array', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffle(arr)

      expect(shuffled).toHaveLength(arr.length)
      expect(shuffled.sort()).toEqual(arr.sort())
      expect(arr).toEqual([1, 2, 3, 4, 5]) // Original unchanged
    })
  })

  describe('partition', () => {
    it('should partition array by predicate', () => {
      const [evens, odds] = partition([1, 2, 3, 4, 5], n => n % 2 === 0)
      expect(evens).toEqual([2, 4])
      expect(odds).toEqual([1, 3, 5])
    })
  })

  describe('set operations', () => {
    it('should find intersection', () => {
      expect(intersection([1, 2, 3], [2, 3, 4], [3, 4, 5])).toEqual([3])
      expect(intersection([1, 2], [3, 4])).toEqual([])
    })

    it('should find union', () => {
      expect(union([1, 2], [2, 3], [3, 4])).toEqual([1, 2, 3, 4])
    })

    it('should find difference', () => {
      expect(difference([1, 2, 3, 4], [2, 3], [4])).toEqual([1])
    })
  })

  describe('math operations', () => {
    it('should calculate sum', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15)
      expect(sum([])).toBe(0)
    })

    it('should calculate average', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3)
      expect(average([])).toBe(0)
    })

    it('should find min', () => {
      expect(min([3, 1, 4, 1, 5])).toBe(1)
      expect(min([])).toBeUndefined()
    })

    it('should find max', () => {
      expect(max([3, 1, 4, 1, 5])).toBe(5)
      expect(max([])).toBeUndefined()
    })
  })

  describe('sortBy', () => {
    it('should sort by property', () => {
      const arr = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 35 },
      ]

      expect(sortBy(arr, 'age')).toEqual([
        { name: 'Jane', age: 25 },
        { name: 'John', age: 30 },
        { name: 'Bob', age: 35 },
      ])

      expect(sortBy(arr, 'age', 'desc')).toEqual([
        { name: 'Bob', age: 35 },
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ])
    })

    it('should sort by function', () => {
      const arr = ['apple', 'pie', 'a', 'longer']
      expect(sortBy(arr, s => s.length)).toEqual(['a', 'pie', 'apple', 'longer'])
    })
  })

  describe('isEmpty', () => {
    it('should check if array is empty', () => {
      expect(isEmpty([])).toBe(true)
      expect(isEmpty([1])).toBe(false)
    })
  })

  describe('compact', () => {
    it('should remove falsy values', () => {
      expect(compact([0, 1, false, 2, '', 3, null, undefined, 4])).toEqual([
        1,
        2,
        3,
        4,
      ])
    })
  })

  describe('range', () => {
    it('should generate range of numbers', () => {
      expect(range(5)).toEqual([0, 1, 2, 3, 4])
      expect(range(1, 5)).toEqual([1, 2, 3, 4])
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8])
    })
  })
})
