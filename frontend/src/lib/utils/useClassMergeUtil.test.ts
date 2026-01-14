import { describe, it, expect } from 'vitest'
import { useClassMergeUtil } from './useClassMergeUtil'

describe('useClassMergeUtil', () => {
  const { merge } = useClassMergeUtil()

  it('merges class names correctly', () => {
    expect(merge('c1', 'c2')).toBe('c1 c2')
  })

  it('handles conditional classes', () => {
    const isTrue = true
    const isFalse = false
    expect(merge('c1', isTrue && 'c2', isFalse && 'c3')).toBe('c1 c2')
  })

  it('handles array inputs', () => {
    expect(merge(['c1', 'c2'])).toBe('c1 c2')
  })

  it('handles object inputs', () => {
    expect(merge({ c1: true, c2: false, c3: true })).toBe('c1 c3')
  })

  it('merges tailwind conflicts correctly (updates with last one wins)', () => {
    // p-4 is padding: 1rem, p-2 is padding: 0.5rem.
    // Since they target the same CSS property, tailwind-merge keeps the last one.
    expect(merge('p-4', 'p-2')).toBe('p-2')
    expect(merge('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('preserves non-conflicting tailwind classes', () => {
    expect(merge('p-4 text-red-500', 'm-2')).toBe('p-4 text-red-500 m-2')
  })
})
