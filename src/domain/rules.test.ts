import { describe, expect, it } from 'vitest'
import { REGISTRY } from '../api/seed'
import { nextReview, retentionFor, reviewState, analyseOwnership, assessRisk, beneficialOwners, evaluateBlockers, publicStatus, recommend, sortQueue } from './rules'
import type { Case } from './types'

const rec = (orgNr: string) => REGISTRY[orgNr]

function caseFrom(orgNr: string, patch: Partial<Case> = {}): Case {
  const r = rec(orgNr)
  return {
    id: orgNr, ref: 'SAK-1', tenantId: 't', orgNr, name: r.entry.legalName, subjectId: r.subjectId,
    scope: { country: 'NO', sector: 'legal', service: 'company-transfer', covered: 'ja', basis: '', responsible: '' },
    status: 'review_ready', stage: 'klargjore', urgency: 'normal', owner: null,
    createdAt: '2026-11-01T00:00:00Z', dueAt: '2026-11-05T00:00:00Z',
    registry: null, parties: r.parties, edges: r.edges, checks: [], docRequests: [], evidence: [], screening: [],
    risk: null, decisions: [], audit: [], ...patch,
  }
}

describe('eierskap (UBO-02/03/04)', () => {
  it('60 % av 60 % gir 36 % økonomisk andel', () => {
    const r = rec('100200301')
    const a = analyseOwnership(r.subjectId, r.parties, r.edges)
    expect(a.persons.find(p => p.partyId === 'p-kari')?.total).toBeCloseTo(0.36)
    expect(beneficialOwners(a).map(p => p.partyId)).toEqual(['p-kari'])
  })

  it('utenlandsk ledd uten eiere blir uavklart, ikke «ingen eier»', () => {
    const r = rec('100200301')
    const a = analyseOwnership(r.subjectId, r.parties, r.edges)
    expect(a.unresolved).toEqual([expect.objectContaining({ partyId: 'p-baltic', reason: 'manglende_ledd' })])
  })

  it('A → B → A avsluttes som uavklart og henger ikke', () => {
    const r = rec('100300401')
    const a = analyseOwnership(r.subjectId, r.parties, r.edges)
    expect(a.unresolved.some(u => u.reason === 'sirkel')).toBe(true)
  })

  it('samme person gjennom to selskaper vises én gang med begge stier', () => {
    const r = rec('100200301')
    const edges = [...r.edges, { id: 'x', from: 'p-kari', to: 'p-baltic', share: 0.1, controlType: 'eierskap' as const, source: 't', validFrom: '' }]
    const a = analyseOwnership(r.subjectId, r.parties, edges)
    const kari = a.persons.filter(p => p.partyId === 'p-kari')
    expect(kari).toHaveLength(1)
    expect(kari[0].paths).toHaveLength(2)
    expect(kari[0].total).toBeCloseTo(0.4)
  })
})

describe('sperrer før poengsum (RSK-02)', () => {
  it('lav score kombinert med uavklart eier gir ikke klart grunnlag', () => {
    const c = caseFrom('100200301')
    const risk = { ...assessRisk(c), score: 5, band: 'lav' as const }
    const blockers = evaluateBlockers(c)
    expect(blockers.map(b => b.code)).toContain('uavklart_eierskap')
    expect(recommend(risk, blockers)).toBe('be_om_mer')
  })

  it('ren struktur gir ingen sperrer', () => {
    expect(evaluateBlockers(caseFrom('5560000101', { scope: { country: 'SE', sector: 'legal', service: 'company-transfer', covered: 'ja', basis: '', responsible: '' } }))).toEqual([])
  })
})

describe('risikoprofil (RSK-01)', () => {
  it('samme databilde gir samme anbefaling', () => {
    const c = caseFrom('100200301')
    const a = assessRisk(c, 1, 't'), b = assessRisk(c, 1, 't')
    expect(a).toEqual(b)
    expect(a.score).toBe(a.factors.reduce((s, f) => s + f.contribution, 0))
  })
})

describe('arbeidskø (UX-01)', () => {
  it('haster først, deretter tidligste frist', () => {
    const a = caseFrom('100200301', { id: 'a', dueAt: '2026-11-03' })
    const b = caseFrom('100200301', { id: 'b', dueAt: '2026-11-02' })
    const c = caseFrom('100200301', { id: 'c', dueAt: '2026-11-09', urgency: 'haster' })
    expect(sortQueue([a, b, c]).map(x => x.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('partnerstatus', () => {
  it('røper ikke interne statuser', () => {
    expect(publicStatus('needs_review')).toBe('processing')
    expect(publicStatus('waiting_source')).toBe('processing')
  })
})

describe('oppbevaring og kontrollkalender (PRV-03, MON-01)', () => {
  it('ordinært og forsterket norsk forhold får ulike frister med hjemmel', () => {
    const a = retentionFor('NO', 'etabler', '2026-11-02T00:00:00Z')
    const b = retentionFor('NO', 'etabler_med_tiltak', '2026-11-02T00:00:00Z')
    expect([a.years, b.years]).toEqual([5, 10])
    expect(b.basis).toMatch(/forsterkede/)
    expect(retentionFor('NO', 'avslå', '2026-11-02T00:00:00Z').until?.slice(0, 4)).toBe('2031')
  })
  it('neste kontroll fra risiko; passert dato er forfalt, ikke fornyet', () => {
    const risk = { ...assessRisk(caseFrom('5560000101')), band: 'høy' as const }
    const next = nextReview('etabler', risk, '2025-01-01T00:00:00Z')!
    expect(next.slice(0, 7)).toBe('2026-01')
    expect(reviewState(next, '2026-11-02T00:00:00Z')).toBe('forfalt')
    expect(reviewState(nextReview('avslå', risk, '2025-01-01T00:00:00Z'))).toBe('ingen')
  })
})
