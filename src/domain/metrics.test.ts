import { beforeEach, describe, expect, it } from 'vitest'
import {
  createCheck, decide, portalTasks, requestDocument, resetDemo, setTiming, settled, store, submitDocument,
} from '../api/fakeServer'
import { automationRate, commercialView, managementReport } from './metrics'

setTiming([0, 0], 0)

const fjordlys = { orgNr: '100200301', country: 'NO' as const, sector: 'legal' as const, service: 'company-transfer' }

async function manualFlow() {
  const c = await createCheck('saksbehandler', fjordlys)
  await settled(c.id)
  await requestDocument('saksbehandler', c.id, 'p-baltic')
  const task = portalTasks().find(t => t.caseId === c.id)!
  await submitDocument('kunde', c.id, task.requestId, null)
  await decide('godkjenner', c.id, 'etabler_med_tiltak', 'Eierskap dokumentert, forsterkede tiltak for utenlandsk ledd.')
  return c
}

beforeEach(async () => { await resetDemo() })

describe('automatiseringsmåling (UX-03)', () => {
  it('teller bare grunnlag uten manuell innhenting; nevneren omfatter ventende saker', async () => {
    const c = await manualFlow()
    const cases = store.state.cases
    const m = automationRate(cases)
    const byRef = (ref: string) => m.perCase.find(p => p.ref === ref)!

    const fjord = byRef(c.ref)
    expect(fjord.automated).toBe(false)
    expect(fjord.reason).toMatch(/Manuell innhenting: Vedlegg etterspurt fra kunde/)

    const sund = cases.find(x => x.name === 'Sund Eksempel AB')!
    expect(byRef(sund.ref).automated).toBe(true)

    const dk = cases.find(x => x.scope.country === 'DK')!
    expect(dk.status).toBe('waiting_source')
    expect(byRef(dk.ref)).toMatchObject({ started: true, automated: false })

    expect(m.denominator).toBe(cases.length)
    // Sund og de to historiske sakene fikk grunnlaget klart uten manuell innhenting.
    expect(m.numerator).toBe(3)
    expect(m.rate).toBeCloseTo(3 / cases.length)
    expect(m.excluded.reduce((n, e) => n + e.count, 0)).toBe(m.denominator - m.numerator)
    expect(m.excluded.some(e => /kilde/i.test(e.reason))).toBe(true)
  })

  it('menneskelige sluttgodkjenninger telles aldri som automatiske beslutninger', async () => {
    const sund = store.state.cases.find(x => x.name === 'Sund Eksempel AB')!
    const before = automationRate(store.state.cases).humanDecisions
    await decide('godkjenner', sund.id, 'etabler', 'Grunnlaget er komplett og uten avvik.')
    const m = automationRate(store.state.cases)
    expect(m.humanDecisions).toBe(before + 1)
    expect(m.automatedDecisions).toBe(0)
    // Grunnlaget var fortsatt maskinelt ferdig – men beslutningen er menneskelig.
    expect(m.perCase.find(p => p.ref === sund.ref)?.automated).toBe(true)
  })

  it('kan gjenskapes: samme logg gir samme utvalg', () => {
    const copy = structuredClone(store.state.cases)
    expect(automationRate(copy)).toEqual(automationRate(store.state.cases))
  })
})

describe('ledelsesrapport og kommersiell visning (UX-05)', () => {
  it('viser restanser, risikofordeling og kildeutfall', () => {
    const r = managementReport(store.state.cases)
    expect(r.backlog.waiting_source).toBe(1)
    expect(r.sourceOutages).toBe(1)
    expect(Object.values(r.backlog).reduce((a, b) => a + b, 0)).toBe(store.state.cases.length)
    expect(Object.values(r.risk).reduce((a, b) => a + b, 0)).toBe(store.state.cases.length)
    expect(r.openHits).toBeGreaterThan(0)
  })

  it('kommersiell visning viser bare antall – ingen kunder, treff eller status', async () => {
    await manualFlow()
    const v = commercialView(store.state.cases)
    expect(Object.keys(v).sort()).toEqual(['controlsUsed', 'period'])
    const thisMonth = new Date().toISOString().slice(0, 7)
    expect(v.controlsUsed).toBe(store.state.cases.filter(c => c.createdAt.slice(0, 7) === thisMonth).length)
    expect(v.controlsUsed).toBeLessThan(store.state.cases.length) // historiske saker telles ikke i perioden
    const json = JSON.stringify(v)
    for (const c of store.state.cases) expect(json).not.toContain(c.name)
    expect(json).not.toMatch(/treff|status|review|decided|waiting|Eksempel/i)
  })
})
