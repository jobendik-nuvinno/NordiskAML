import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDemo, setRegistryDown, setTiming, store } from '../../api/fakeServer'
import { readMembers, resetMembers } from '../../api/membersServer'
import { resetPartnerApi } from '../../api/partnerApi'
import { currentVersion, resetPolicies } from '../../api/policyServer'
import { Ctx, type AppCtx, type DesignRole } from '../context'
import { DataSourcesScreen } from './DataSources'
import { LIVE } from './index'
import { OperationsScreen } from './Operations'
import { latency, overallHealth, sourceHealth } from './sourceHealth'
import { TenantOverviewScreen } from './TenantOverview'

setTiming([0, 0], 0)

beforeEach(async () => {
  resetPartnerApi()
  resetMembers()
  resetPolicies()
  await resetDemo()
})
afterEach(async () => {
  setRegistryDown(false)
  await resetDemo()
})

function render(node: ReactNode, designRole: DesignRole = 'admin') {
  const ctx: AppCtx = { role: 'admin', actor: 'Erik Dahl', designRole, fn: 'saksbehandler', caseId: null, openCase: () => {}, go: () => {} }
  return renderToString(<Ctx.Provider value={ctx}>{node}</Ctx.Provider>)
}

const COMPANIES = ['Fjordlys', 'Kystlinje', 'Havbris', 'Sund Eksempel', 'Eng Eksempel']
const HIT_NAMES = ['Jon Eksempel', 'Ivan Eksemplov']

describe('S15 levende admin og drift', () => {
  it('registrerer skjermene som levende', () => {
    expect(LIVE['tenant-overview']).toBe(TenantOverviewScreen)
    expect(LIVE['data-sources']).toBe(DataSourcesScreen)
    expect(LIVE.operations).toBe(OperationsScreen)
  })

  it('Virksomhetsoversikt viser levende antall, medlemmer, policy og forbruk – uten kunder eller treff', () => {
    const html = render(<TenantOverviewScreen />)
    const open = store.state.cases.filter(c => c.status !== 'decided').length
    expect(html).toContain('Aktive kontroller')
    expect(html).toContain(`>${open}<`)
    expect(html).toContain('Klar for vurdering')
    expect(html).toContain('Venter på kunde eller kilde')
    expect(html).toContain('Besluttet')
    const active = readMembers().filter(m => m.status === 'aktiv')
    expect(html).toContain('MFA-dekning')
    expect(html).toContain(`>${active.length}<`)
    const no = currentVersion('NO')
    if (no) expect(html).toContain(`NO AML-regelpakke v${no.version}`)
    expect(html).toContain('Kontroller brukt i')
    for (const n of [...COMPANIES, ...HIT_NAMES]) expect(html).not.toContain(n)
  })

  it('Datakilder viser rett, formål og egen nøkkel per kilde, og levende status', () => {
    let html = render(<DataSourcesScreen />)
    for (const s of ['Foretaksregister NO', 'Foretaksregister SE', 'Foretaksregister DK', 'Reelle rettighetshavere NO', 'Særskilt tilgang', 'eID-leverandør', 'PEP-liste', 'Sanksjonsliste', 'Partner-API'])
      expect(html).toContain(s)
    expect(html).toContain('Brønnøysundregistrene (testdata)')
    expect(html).toContain('Tilgjengelig')
    expect(html).toContain('gjenbrukes aldri mellom virksomheter')
    expect(html).toContain('testmiljø-menyen')
    expect(html).toContain('Sanksjonsliste 2026-11-01')
    expect(html).not.toContain('Utilgjengelig (503)')
    setRegistryDown(true)
    html = render(<DataSourcesScreen />)
    expect(html).toContain('Utilgjengelig (503)')
    expect(html).toContain('Svikt')
  })

  it('delvis feed eller register uten vellykket oppslag gir aldri grønt', () => {
    // Seed: DK-kontrollen ble registrert under kildeutfall og står i restkø.
    const h = sourceHealth(store.state.cases, false)
    const dk = h.find(x => x.src.country === 'DK')!
    expect(dk.lastSuccess).toBeNull()
    expect(dk.tone).not.toBe('green')
    expect(overallHealth(h).tone).not.toBe('green')
    expect(overallHealth(sourceHealth([], false)).tone).not.toBe('green')
    expect(h.find(x => x.src.country === 'NO')!.lastSuccess).not.toBeNull()
  })

  it('Driftsinnsikt viser tekniske tall uten kundedata, og blir rød ved kildeutfall', () => {
    let html = render(<OperationsScreen />, 'platform')
    expect(html).toContain('Ingen kundenavn, treff eller saksinnhold')
    expect(html).toContain('Restkø')
    expect(html).toContain('Kildeforsinkelse')
    expect(html).toContain('Intern behandlingstid')
    expect(html).toContain('Tid siden siste vellykkede oppslag')
    expect(html).toContain('Webhook-leveranser')
    expect(html).toContain('Mangler telemetri')
    expect(html).toContain('Delvis')
    for (const n of [...COMPANIES, ...HIT_NAMES]) expect(html).not.toContain(n)
    for (const c of store.state.cases) expect(html).not.toContain(c.ref)
    expect(latency(store.state.cases).sourceCases).toBeGreaterThan(0)

    setRegistryDown(true)
    html = render(<OperationsScreen />, 'platform')
    expect(html).toContain('Utilgjengelig (503)')
    expect(html).toContain('Svikt')
    expect(html).not.toContain('>Frisk<')
    for (const n of COMPANIES) expect(html).not.toContain(n)
  })

  it('kildeutfall vises også i virksomhetsoversikten', () => {
    setRegistryDown(true)
    const html = render(<TenantOverviewScreen />)
    expect(html).toContain('Registerkilden er utilgjengelig (503)')
  })
})
