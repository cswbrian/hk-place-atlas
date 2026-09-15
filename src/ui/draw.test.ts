import { describe, expect, it } from 'vitest'
import { clickClosesRing } from './draw'

describe('clickClosesRing', () => {
  it('closes when there are at least three vertices and the click is on the first point', () => {
    expect(clickClosesRing(3, 8)).toBe(true)
    expect(clickClosesRing(4, 0)).toBe(true)
  })

  it('does not close before three vertices', () => {
    expect(clickClosesRing(2, 0)).toBe(false)
  })

  it('does not close when the click is far from the first point', () => {
    expect(clickClosesRing(5, 20)).toBe(false)
  })
})
