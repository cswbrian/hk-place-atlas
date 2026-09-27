import { describe, expect, it } from 'vitest'
import { SEARCH_LIMIT, fts5Query, hanNeedle, mergeSearchIds } from './search'

describe('fts5Query', () => {
  it('builds prefix terms for English and ignores FTS operators', () => {
    expect(fts5Query('  HIGH ST  ')).toBe('HIGH* AND ST*')
    expect(fts5Query('cheong*king')).toBe('cheong* AND king*')
    expect(fts5Query('a')).toBeNull()
  })

  it('does not put Chinese into the FTS query', () => {
    expect(fts5Query('高街')).toBeNull()
    expect(fts5Query('高街 HIGH')).toBe('HIGH*')
  })
})

describe('hanNeedle', () => {
  it('keeps a Chinese substring of at least two characters', () => {
    expect(hanNeedle('高街36')).toBe('高街')
    expect(hanNeedle('HIGH')).toBeNull()
    expect(hanNeedle('高')).toBeNull()
  })
})

describe('mergeSearchIds', () => {
  it('dedupes FTS hits then Chinese hits and caps the list', () => {
    expect(mergeSearchIds(['a', 'b'], ['b', 'c', 'd'], 3)).toEqual(['a', 'b', 'c'])
    expect(SEARCH_LIMIT).toBe(20)
  })
})
