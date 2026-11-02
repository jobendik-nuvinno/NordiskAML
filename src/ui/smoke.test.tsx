import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { createCheck, decide, portalTasks, requestDocument, resetDemo, setTiming, settled, store, submitDocument } from '../api/fakeServer'
import { App } from './App'
import { CaseView } from './CaseView'
import { NewCheck } from './NewCheck'
import { PartnerConsole } from './PartnerConsole'
import { Portal } from './Portal'
import { Workqueue } from './Workqueue'

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
})
