import { describe, it, expect } from 'vitest'
import { PLANS, getPlan } from '../plans'

describe('plans', () => {
  it('exposes the three plans with positive credits and amounts', () => {
    expect(PLANS).toHaveLength(3)
    for (const p of PLANS) {
      expect(p.credits).toBeGreaterThan(0)
      expect(p.amount).toBeGreaterThan(0)
      expect(typeof p.id).toBe('string')
    }
  })

  it('looks up a plan by id', () => {
    expect(getPlan('pro')?.credits).toBe(400)
    expect(getPlan('basic')?.amount).toBe(5)
  })

  it('returns undefined for an unknown plan', () => {
    expect(getPlan('nope')).toBeUndefined()
  })
})
