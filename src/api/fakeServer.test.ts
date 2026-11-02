import { beforeEach, describe, expect, it } from 'vitest'
import {
  ApiError, createCheck, decide, getCase, portalTasks, registerLaterChange, requestDocument, resetDemo, retrySource,
  setRegistryDown, setTiming, settled, store, submitDocument,
} from './fakeServer'

setTiming([0, 0], 0)

const fjordlys = { orgNr: '100200301', country: 'NO' as const, sector: 'legal' as const, service: 'company-transfer' }

beforeEach(async () => { await resetDemo() })

describe('seed', () => {
  it('har saker i ulike tilstander', () => {
    const s = store.state.cases.map(c => [c.name, c.status])
    expect(s).toEqual([
      ['Kystlinje Eksempel AS', 'needs_review'],
      ['Sund Eksempel AB', 'review_ready'],
      ['Org.nr 10000101', 'waiting_source'],
    ])
  })
})

describe('tilgang håndheves i backend (D-004)', () => {
  it('saksbehandler kan ikke beslutte', async () => {
    const sund = store.state.cases[1]
    await expect(decide('saksbehandler', sund.id, 'etabler', 'Grunnlaget er komplett')).rejects.toMatchObject({ status: 403 })
  })
  it('kunde kan ikke opprette kontroll', async () => {
    await expect(createCheck('kunde', fjordlys)).rejects.toBeInstanceOf(ApiError)
  })
  it('FI kan ikke velges (UX-06)', async () => {
    await expect(createCheck('saksbehandler', { ...fjordlys, country: 'FI' })).rejects.toMatchObject({ status: 422 })
  })
})

describe('demo-hovedløp', () => {
  it('org.nr → sperre → vedlegg → beslutning → låst grunnlag', async () => {
    const c = await createCheck('saksbehandler', fjordlys)
    await settled(c.id)
    expect(c.status).toBe('needs_review')
    expect(c.checks.find(k => k.key === 'eierskap')?.state).toBe('open')

    await expect(decide('godkjenner', c.id, 'etabler', 'Ser greit ut her')).rejects.toMatchObject({ status: 409 })

    await requestDocument('saksbehandler', c.id, 'p-baltic')
    expect(c.status).toBe('customer_action')
    const task = portalTasks().find(t => t.caseId === c.id)!
    expect(Object.keys(task)).not.toContain('status')
    expect(JSON.stringify(task)).not.toMatch(/score|sperre|risiko/i)

    await submitDocument('kunde', c.id, task.requestId, null)
    expect(c.status).toBe('review_ready')
    expect(c.evidence.find(e => e.kind === 'dokument')?.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(c.risk?.version).toBe(2)

    await expect(decide('godkjenner', c.id, 'etabler', 'kort')).rejects.toMatchObject({ status: 422 })
    await decide('godkjenner', c.id, 'etabler_med_tiltak', 'Eierskap dokumentert, forsterkede tiltak for utenlandsk ledd.')
    const d = getCase(c.id).decisions[0]
    expect(d.snapshot.registry?.roles.find(r => r.role === 'Styreleder')?.name).toBe('Ola Eksempel')

    await registerLaterChange('saksbehandler', c.id)
    expect(getCase(c.id).registry?.roles.find(r => r.role === 'Styreleder')?.name).toBe('Nora Eksempel')
    expect(d.snapshot.registry?.roles.find(r => r.role === 'Styreleder')?.name).toBe('Ola Eksempel')
    expect(c.audit.some(e => e.decisionId === d.id)).toBe(true)
  })
})

describe('kildeutfall (MON-03)', () => {
  it('503 gir ventestatus; gjenoppretting fortsetter uten ny kontroll', async () => {
    setRegistryDown(true)
    const c = await createCheck('saksbehandler', fjordlys)
    await settled(c.id)
    expect(c.status).toBe('waiting_source')
    await expect(retrySource('saksbehandler', c.id)).rejects.toMatchObject({ status: 503 })
    const count = store.state.cases.length
    setRegistryDown(false)
    await settled(c.id)
    expect(c.status).toBe('needs_review')
    expect(store.state.cases.length).toBe(count)
    expect(c.audit.filter(e => e.action === 'Registerdata innhentet')).toHaveLength(1)
  })
})
