import { describe, expect, it } from 'vitest'
import { formatZAR } from './ui'

describe('formatZAR', () => {
  it('formats a whole-rand amount with no decimal places', () => {
    const formatted = formatZAR(1500000)
    expect(formatted).toMatch(/1[\s,.]?500[\s,.]?000/)
    expect(formatted).not.toMatch(/\.\d/)
  })

  it('formats zero', () => {
    expect(formatZAR(0)).toMatch(/0/)
  })
})
