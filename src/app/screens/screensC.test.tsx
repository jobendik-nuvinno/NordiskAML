import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { decide, resetDemo, setTiming, store } from '../../api/fakeServer'
import { postCheck, resetPartnerApi, webhooksIdle } from '../../api/partnerApi'
import { reportConcern, resetRestricted } from '../../api/restrictedServer'
import type { Role } from '../../domain/types'
import { Ctx, type AppCtx } from '../context'
import { EvidenceScreen } from './Evidence'
import { HistoryScreen } from './History'
import { InsightsScreen } from './Insights'
import { InvestigationScreen } from './Investigation'
import { MonitoringScreen } from './Monitoring'
import { PartnerApiScreen } from './PartnerApi'
import { TenantAuditScreen } from './TenantAudit'

setTiming([0, 0], 0)

beforeEach(async () => {
  resetPartnerApi()
  resetRestricted()
  await resetDemo()
})

function render(node: ReactNode, role: Role = 'saksbehandler', caseId: string | null = null) {
  const ctx: AppCtx = { role, actor: 'Nora Berg', designRole: 'user', fn: 'saksbehandler', caseId, openCase: () => {}, go: () => {} }
  return renderToString(<Ctx.Provider value={ctx}>{node}</Ctx.Provider>)
}

const sund = () => store.state.cases.find(c => c.status === 'review_ready')!

async function decideSund() {
  const c = sund()
  const answers = Object.fromEntries((c.risk?.mandatoryMeasures ?? []).map(m => [m, 'Gjennomført og dokumentert']))
  await decide('godkjenner', c.id, 'etabler', 'Grunnlaget er komplett og kontrollert.', answers)
  return c
}

describe('levende designskjermer C', () => {
  it('Bevis viser manifest med hash og versjon', () => {
    const c = store.state.cases[0]
    const html = render(<EvidenceScreen />, 'saksbehandler', c.id)
    expect(html).toContain('Bevismanifest')
    expect(html).toContain(c.evidence[0].title)
    expect(html).toContain(c.evidence[0].sha256.slice(0, 12))
    expect(html).toContain('Be om dokument')
  })

  it('Historikk viser logg, ingen beslutning før beslutning, og låst grunnlag etter', async () => {
    const c = sund()
    let html = render(<HistoryScreen />, 'saksbehandler', c.id)
    expect(html).toContain('Oppdrag registrert')
    expect(html).toContain(c.audit[0].correlationId.slice(0, 8))
    expect(html).toContain('Ingen beslutning ennå')
    await decideSund()
    html = render(<HistoryScreen />, 'saksbehandler', c.id)
    expect(html).toContain('Åpne eksakt beslutningsgrunnlag')
    expect(html).toContain('Oppdater registerdata')
    expect(html).toContain(`${c.decisions[0].retention.years} år`)
    expect(html).toContain('Planlagt')
  })

  it('Oppfølging viser kontrollkalender og saker som venter på kilde', async () => {
    let html = render(<MonitoringScreen />)
    expect(html).toContain('Prøv kilden igjen')
    expect(html).toContain('Org.nr 10000101')
    const c = await decideSund()
    html = render(<MonitoringScreen />)
    expect(html).toContain(c.name)
    expect(html).toContain('Planlagt')
  })

  it('Skjermet rom avslører ingenting utenfor tilgangsgruppen (AT-07)', async () => {
    const secret = 'Kunden ba om kontantoppgjør via tredjepart'
    await reportConcern('saksbehandler', { caseId: null, subjectName: 'Testpart AS', kind: 'manuell_observasjon', description: secret, amount: '' })
    const outsider = render(<InvestigationScreen />, 'saksbehandler')
    expect(outsider).toContain('Skjermet undersøkelsesrom')
    expect(outsider).toContain('Meld intern bekymring / manuell observasjon')
    expect(outsider).not.toContain(secret)
    expect(outsider).not.toContain('Testpart AS')
    expect(outsider).not.toContain('UND-001')
    const member = render(<InvestigationScreen />, 'hvitvaskingsansvarlig')
    expect(member).toContain(secret)
    expect(member).toContain('UND-001')
  })

  it('Partner-API viser webhook-logg med signatur', async () => {
    let html = render(<PartnerApiScreen />, 'partner')
    expect(html).toContain('Ingen request sendt ennå')
    await postCheck('demo-1042-check-v1', { externalReference: 'demo-1042', country: 'NO', sector: 'legal', partyType: 'organisation', subjectReference: 'pty-demo-18', serviceCode: 'company-transfer' })
    await webhooksIdle()
    html = render(<PartnerApiScreen />, 'partner')
    expect(html).toContain('Lever på nytt')
    expect(html).toMatch(/Signatur (verifisert ✓|avvist ✗)/)
  })

  it('Innsikt viser teller/nevner; bedriftsadmin ser bare forbruk', () => {
    const html = render(<InsightsScreen />, 'hvitvaskingsansvarlig')
    expect(html).toContain('påbegynte kontroller')
    expect(html).toContain('Utvalg per sak')
    expect(html).toContain(store.state.cases[0].ref)
    const admin = render(<TenantAuditScreen />, 'admin')
    expect(admin).toContain('Kontroller brukt')
    expect(admin).toContain('UX-05')
    for (const c of store.state.cases) {
      expect(admin).not.toContain(c.name)
      expect(admin).not.toContain(c.ref)
    }
  })
})
