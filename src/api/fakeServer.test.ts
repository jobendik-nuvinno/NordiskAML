import { beforeEach, describe, expect, it } from 'vitest'
import {
  addIdentityField, resolveHit, ApiError, createCheck, decide, getCase, portalTasks, registerLaterChange, requestDocument, resetDemo, retrySource,
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
      ['Havbris Eksempel AS', 'needs_review'],
      ['Org.nr 10000101', 'waiting_source'],
      ['Lyngheia Eksempel AS', 'decided'],
      ['Bryggen Eksempel AS', 'decided'],
      ['Norrsken Exempel AB', 'customer_action'],
    ])
  })

  it('historiske saker har konsistente tidspunkter og forfalt/planlagt kontroll', async () => {
    const { reviewState } = await import('../domain/rules')
    const lyng = store.state.cases.find(c => c.name === 'Lyngheia Eksempel AS')!
    const bryg = store.state.cases.find(c => c.name === 'Bryggen Eksempel AS')!
    expect(lyng.createdAt < '2025-01-01').toBe(true)
    expect(lyng.decisions[0].snapshot.capturedAt).toBe(lyng.decisions[0].at)
    expect(reviewState(lyng.decisions[0].nextReviewAt)).toBe('forfalt')
    expect(reviewState(bryg.decisions[0].nextReviewAt)).toBe('planlagt')
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

describe('screening (SCR-02/04/05)', () => {
  const havbris = () => store.state.cases.find(c => c.orgNr === '100400501')!

  it('sanksjonstreff gir hasteoppgave og sperre', () => {
    const c = havbris()
    expect(c.urgency).toBe('haster')
    expect(c.screening.find(h => h.list === 'PEP')?.fields.find(f => f.field === 'Fødselsår')?.match).toBe('mangler')
  })

  it('falskt treff krever begrunnelse og tidsavgrensning; nytt identitetsfelt åpner igjen', async () => {
    const c = havbris()
    await expect(resolveHit('saksbehandler', c.id, 'hit-jon-pep', 'false_positive', 'Ulik person', '')).rejects.toMatchObject({ status: 422 })
    await resolveHit('saksbehandler', c.id, 'hit-jon-pep', 'false_positive', 'Annen person – ulik bostedskommune og verv', '2027-05-01')
    await resolveHit('godkjenner', c.id, 'hit-ivan-sank', 'false_positive', 'Ulikt land og stavemåte, verifisert mot pass', '2027-05-01')
    expect(c.status).toBe('review_ready')
    await addIdentityField('saksbehandler', c.id, 'p-jon')
    expect(c.screening.find(h => h.id === 'hit-jon-pep')?.status).toBe('open')
    expect(c.status).toBe('needs_review')
  })

  it('bekreftet sanksjon kan ikke overstyres til beslutning', async () => {
    const c = havbris()
    await resolveHit('godkjenner', c.id, 'hit-jon-pep', 'false_positive', 'Annen person – ulik bostedskommune og verv', '2027-05-01')
    await resolveHit('godkjenner', c.id, 'hit-ivan-sank', 'confirmed', 'Samsvar bekreftet etter kontroll av pass', '')
    await expect(decide('godkjenner', c.id, 'etabler', 'Lav risiko ellers, ønsker å etablere')).rejects.toMatchObject({ status: 409 })
  })

  it('bekreftet PEP krever at hvert tiltak besvares enkeltvis (RSK-03)', async () => {
    const c = havbris()
    await resolveHit('godkjenner', c.id, 'hit-jon-pep', 'confirmed', 'Samme person, verv bekreftet i kilde', '')
    await resolveHit('godkjenner', c.id, 'hit-ivan-sank', 'false_positive', 'Ulikt land og stavemåte, verifisert mot pass', '2027-05-01')
    expect(c.risk?.mandatoryMeasures.length).toBe(2)
    await expect(decide('godkjenner', c.id, 'etabler_med_tiltak', 'Samlet: alt er vurdert og i orden')).rejects.toMatchObject({ status: 422 })
    await decide('godkjenner', c.id, 'etabler_med_tiltak', 'PEP med dokumenterte midler', {
      'Kilde til midler og formue': 'Salg av bolig, kontrakt mottatt',
      'Godkjenning fra ledelse': 'Godkjent av partner 02.11',
    })
    const d = c.decisions[0]
    expect(d.measures).toHaveLength(2)
    expect(d.retention.years).toBe(10)
    expect(d.nextReviewAt).not.toBeNull()
  })
})
