import { describe, expect, it } from 'vitest'
import { buildHash, parseHash } from './route'

const any = () => true

describe('lesbare URL-er', () => {
  it('bygger og leser saksside med funksjon og saksnummer', () => {
    const h = buildHash({ role: 'user', fn: 'hvitvaskingsansvarlig', screen: 'ownership', caseRef: 'SAK-1004' })
    expect(h).toBe('#/arbeidsflate/aml-ansvarlig/ownership/SAK-1004')
    expect(parseHash(h, any)).toEqual({ role: 'user', fn: 'hvitvaskingsansvarlig', screen: 'ownership', caseRef: 'SAK-1004' })
  })
  it('roller uten funksjon og uten sak', () => {
    expect(buildHash({ role: 'platform', fn: 'saksbehandler', screen: 'partner-api', caseRef: null })).toBe('#/plattform/partner-api')
    expect(parseHash('#/kunde/portal', any)).toEqual({ role: 'customer', screen: 'portal', caseRef: null })
  })
  it('ukjent rolle eller side ignoreres; saksnummer må ha riktig format', () => {
    expect(parseHash('#/ukjent/queue', any)).toEqual({})
    expect(parseHash('#/arbeidsflate/saksbehandler/finnes-ikke', s => s === 'queue')).toEqual({ role: 'user', fn: 'saksbehandler', caseRef: null })
    expect(parseHash('#/arbeidsflate/saksbehandler/case/<script>', any).caseRef).toBeNull()
  })
})
