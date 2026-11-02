import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { createCheck, decide, portalTasks, requestDocument, resetDemo, setTiming, settled, store, submitDocument } from '../api/fakeServer'
import { App } from './App'
import { CaseView } from './CaseView'
import { NewCheck } from './NewCheck'
import { PartnerConsole } from './PartnerConsole'
import { Portal } from './Portal'
import { Workqueue } from './Workqueue'
import { RestrictedRoom } from './Restricted'
import { Insights } from './Insights'
import { reportConcern } from '../api/restrictedServer'

setTiming([0, 0], 0)
beforeAll(async () => { await resetDemo() })

describe('røyktest: alle visninger rendrer', () => {
  it('app, kø, ny kontroll, portal og partner', () => {
    expect(renderToString(<App />)).toContain('Arbeidskø')
    expect(renderToString(<Workqueue open={() => {}} />)).toContain('Kystlinje')
    expect(renderToString(<NewCheck role="saksbehandler" created={() => {}} />)).toContain('ikke godkjent')
    expect(renderToString(<PartnerConsole />)).toBeTruthy()
  })

  it('saksvisning gjennom hele hovedløpet', async () => {
    for (const c of store.state.cases) expect(renderToString(<CaseView role="saksbehandler" id={c.id} back={() => {}} />)).toContain(c.ref)
    const c = await createCheck('saksbehandler', { orgNr: '100200301', country: 'NO', sector: 'legal', service: 'company-transfer' })
    await settled(c.id)
    expect(renderToString(<CaseView role="saksbehandler" id={c.id} back={() => {}} />)).toContain('Etterspør vedlegg')
    await requestDocument('saksbehandler', c.id, 'p-baltic')
    expect(renderToString(<Portal />)).toContain('Baltic Invest')
    await submitDocument('kunde', c.id, portalTasks().find(t => t.caseId === c.id)!.requestId, null)
    await decide('godkjenner', c.id, 'etabler_med_tiltak', 'Eierskap dokumentert av kunden.')
    expect(renderToString(<CaseView role="godkjenner" id={c.id} back={() => {}} />)).toContain('Beslutning fattet')
  })

  it('skjermet arbeidsrom viser undersøkelser bare for ansvarlig', async () => {
    await reportConcern('saksbehandler', { caseId: null, subjectName: 'Avbrutt oppdrag Eksempel', kind: 'manuell_observasjon', description: 'Kunden trakk seg ved spørsmål om midler' })
    expect(renderToString(<RestrictedRoom role="hvitvaskingsansvarlig" />)).toContain('Avbrutt oppdrag Eksempel')
    expect(renderToString(<RestrictedRoom role="saksbehandler" />)).not.toContain('Avbrutt oppdrag Eksempel')
  })

  it('innsikt: intern og kommersiell visning', () => {
    expect(renderToString(<Insights view="intern" />)).toContain('Sund Eksempel AB')
    const com = renderToString(<Insights view="kommersiell" />)
    expect(com).not.toContain('Sund Eksempel AB')
    expect(com).not.toContain('Havbris')
  })
})
