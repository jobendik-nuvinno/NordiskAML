import { beforeEach, describe, expect, it } from 'vitest'
import { portalTasks, requestDocument, resetDemo, setTiming, settled, store } from './fakeServer'
import { getCheck, postCheck, resetPartnerApi, webhookLog } from './partnerApi'
import { closeInvestigation, listInvestigations, reportConcern, resetRestricted, updateInvestigation } from './restrictedServer'

setTiming([0, 0], 0)
beforeEach(async () => { resetPartnerApi(); resetRestricted(); await resetDemo() })

const body = { externalReference: 'demo-at07', country: 'NO', sector: 'legal', partyType: 'organisation', subjectReference: 'pty-demo-18', serviceCode: 'company-transfer' }
const SECRET = 'Kunden ba om kontantoppgjør til ukjent tredjepart'

describe('AT-07 ingen avsløring (INV-03)', () => {
  it('kunde, partner, saksbehandler og saksloggen kan ikke utlede at undersøkelsen finnes', async () => {
    const created = await postCheck('demo-at07-key-0001', body)
    const id = (created.body as { id: string }).id
    await settled(id)
    await requestDocument('saksbehandler', id, 'p-baltic')

    const before = {
      cases: JSON.stringify(store.state.cases),
      portal: JSON.stringify(portalTasks()),
      partner: JSON.stringify((await getCheck(id)).body),
      webhooks: webhookLog.get().length,
    }

    const receipt = await reportConcern('saksbehandler', { caseId: id, subjectName: '', kind: 'internt_tips', description: SECRET })
    expect(receipt).toEqual({ receipt: 'Mottatt' })

    expect(JSON.stringify(store.state.cases)).toBe(before.cases)
    expect(JSON.stringify(portalTasks())).toBe(before.portal)
    expect(JSON.stringify((await getCheck(id)).body)).toBe(before.partner)
    expect(webhookLog.get().length).toBe(before.webhooks)

    for (const role of ['saksbehandler', 'godkjenner', 'kunde', 'partner'] as const)
      await expect(listInvestigations(role)).rejects.toMatchObject({ status: 404 })
    const seen = await listInvestigations('hvitvaskingsansvarlig')
    expect(seen[0].signals[0].description).toBe(SECRET)
  })

  it('melderen får samme kvittering uansett om saken allerede er under undersøkelse', async () => {
    const c = store.state.cases[0]
    const a = await reportConcern('godkjenner', { caseId: c.id, subjectName: '', kind: 'internt_tips', description: 'Første signal om saken' })
    const b = await reportConcern('saksbehandler', { caseId: c.id, subjectName: '', kind: 'internt_tips', description: 'Andre signal om samme sak' })
    expect(a).toEqual(b)
    const inv = await listInvestigations('hvitvaskingsansvarlig')
    expect(inv).toHaveLength(1)
    expect(inv[0].signals).toHaveLength(2)
  })
})

describe('triage og avslutning (INV-01, TXN-01)', () => {
  it('manuell observasjon uten sak eller kontonummer; avslutning krever funn og konklusjon', async () => {
    await reportConcern('saksbehandler', { caseId: null, subjectName: 'Avbrutt oppdrag – Ukjent Eksempel AS', kind: 'manuell_observasjon', description: 'Kunden trakk oppdraget etter spørsmål om midlenes opprinnelse', amount: '2 400 000 NOK' })
    const [inv] = await listInvestigations('hvitvaskingsansvarlig')
    expect(inv.caseId).toBeNull()
    await expect(closeInvestigation('hvitvaskingsansvarlig', inv.id, 'Ingen grunnlag funnet etter gjennomgang', 'rapporteres_ikke')).rejects.toMatchObject({ status: 422 })
    await updateInvestigation('hvitvaskingsansvarlig', inv.id, { finding: 'Oppdrag avbrutt etter spørsmål om midler', hypothesis: 'Mulig forsøk på å skjule opprinnelse', priority: 'høy' })
    await expect(closeInvestigation('hvitvaskingsansvarlig', inv.id, 'kort', 'rapporteres')).rejects.toMatchObject({ status: 422 })
    await closeInvestigation('hvitvaskingsansvarlig', inv.id, 'Mistanke ikke avkreftet; beslutning om rapport fattet av ansvarlig.', 'rapporteres')
    const [done] = await listInvestigations('hvitvaskingsansvarlig')
    expect(done.status).toBe('avsluttet')
    expect(done.conclusion?.responsible).toBe('Marius A. Viken')
    expect(done.timeline.length).toBeGreaterThanOrEqual(3)
  })
})
