import { describe, expect, it } from 'vitest'
import { lineageChain } from './lineage'
import type { Relation } from './types'

const rel = (
  id: string,
  fromId: string,
  toId: string,
  type: Relation['type'],
): Relation => ({ id, fromId, toId, type })

describe('lineageChain', () => {
  it('returns only the place when it has no relations of that type', () => {
    expect(
      lineageChain(
        [
          rel('r1', 'a', 'b', 'site_successor'),
        ],
        'a',
        'institution_successor',
      ),
    ).toEqual(['a'])
  })

  it('walks institution successors in order through the given place', () => {
    const relations = [
      rel('r1', 'queens', 'connaught', 'institution_successor'),
      rel('r2', 'connaught', 'current', 'institution_successor'),
      rel('r3', 'connaught', 'wwh', 'site_successor'),
    ]
    expect(lineageChain(relations, 'connaught', 'institution_successor')).toEqual([
      'queens',
      'connaught',
      'current',
    ])
  })

  it('does not loop when a cycle exists', () => {
    const relations = [
      rel('r1', 'a', 'b', 'site_successor'),
      rel('r2', 'b', 'a', 'site_successor'),
    ]
    expect(lineageChain(relations, 'a', 'site_successor')).toEqual(['a', 'b'])
  })
})
