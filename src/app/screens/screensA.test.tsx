import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { requestDocument, resetDemo, setTiming, store } from '../../api/fakeServer'
import { analyseOwnership } from '../../domain/rules'
import { Ctx, type AppCtx } from '../context'
import { CaseOverviewScreen } from './CaseOverview'
import { CustomerInviteScreen } from './CustomerInvite'
import { IdentityScreen } from './Identity'
import { PortalScreen } from './Portal'
import { QueueScreen } from './Queue'
import { ScopeScreen } from './Scope'

setTiming([0, 0], 0)
beforeAll(async () => { await resetDemo() })

const kystlinje = () => store.state.cases.find(c => c.name === 'Kystlinje Eksempel AS')!
function render(C: ComponentType, over: Partial<AppCtx> = {}) {
  const ctx: AppCtx = { role: 'saksbehandler', actor: 'Nora Berg', designRole: 'user', fn: 'saksbehandler', caseId: null, openCase: () => {}, go: () => {}, ...over }
  return renderToString(<Ctx.Provider value={ctx}><C /></Ctx.Provider>)
}

describe('levende skjermer A', () => {
  it('arbeidskøen viser seed-saker, filtre og handling', () => {
    const html = render(QueueScreen)
    for (const t of ['Kystlinje Eksempel AS', 'Krever faglig arbeid', 'Venter på kunde', 'Systemfeil', 'Besluttet', 'Start ny kontroll', 'Åpne'])
      expect(html).toContain(t)
  })

  it('avgrensing har demoforetak, sperrede land og er låst for andre funksjoner', () => {
    const html = render(ScopeScreen)
    for (const t of ['100 200 301', 'Havbris Eksempel AS', 'landpakke ikke godkjent', 'Forslag fra regelmotor', 'Avgrensingsregel'])
      expect(html).toContain(t)
    expect(render(ScopeScreen, { role: 'godkjenner', fn: 'godkjenner' })).toContain('Bare saksbehandler kan starte')
  })

  it('saksoversikten viser kontekst, kontroller, sperrer og meldelenke', () => {
    const c = kystlinje()
    const html = render(CaseOverviewScreen, { caseId: c.id })
    for (const t of ['Sakskontekst', 'Kontrollgrunnlag', 'Neste steg', 'Meld intern bekymring', `av ${c.checks.length} kontroller`, c.checks[0].label])
      expect(html).toContain(t)
    if (c.status === 'needs_review') expect(html).toContain('Be om opplysninger')
  })

  it('identitet viser registeroppføring og bevis', () => {
    const c = store.state.cases.find(x => x.registry)!
    const html = render(IdentityScreen, { caseId: c.id })
    expect(html).toContain(c.registry!.legalName)
    expect(html).toContain('Identitet og representasjonsrett')
    const ev = c.evidence.find(e => e.kind === 'register')
    if (ev) expect(html).toContain(ev.sha256)
  })

  it('kundeinvitasjon og portal viser forespørsel uten intern informasjon', async () => {
    const c = kystlinje()
    const u = analyseOwnership(c.subjectId, c.parties, c.edges).unresolved[0]
    if (u) await requestDocument('saksbehandler', c.id, u.partyId)
    const invite = render(CustomerInviteScreen, { caseId: c.id })
    expect(invite).toContain('Hva er bevisst skjult?')
    if (u) expect(invite).toContain('Eierdokumentasjon for')
    const portal = render(PortalScreen, { role: 'kunde', designRole: 'customer' })
    if (u) expect(portal).toContain('Eierdokumentasjon for')
    for (const forbidden of ['score', 'Sanksjon', 'Sperre', 'PEP', c.ref]) expect(portal).not.toContain(forbidden)
  })
})
