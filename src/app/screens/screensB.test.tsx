import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { createCheck, decide, portalTasks, requestDocument, resetDemo, setTiming, settled, store, submitDocument } from '../../api/fakeServer'
import type { Role } from '../../domain/types'
import { Ctx, type AppCtx, type UserFunction } from '../context'
import { DecisionScreen, SnapshotOverlay } from './Decision'
import { OwnershipScreen } from './Ownership'
import { RiskScreen } from './Risk'
import { ScreeningScreen } from './Screening'

setTiming([0, 0], 0)
beforeAll(async () => { await resetDemo() })

const byOrg = (orgNr: string) => store.state.cases.find(c => c.orgNr === orgNr)!
function render(el: ReactElement, caseId: string, role: Role = 'saksbehandler') {
  const value: AppCtx = {
    role, designRole: 'user', fn: (role === 'admin' || role === 'kunde' || role === 'partner' ? 'saksbehandler' : role) as UserFunction,
    caseId, openCase: () => {}, go: () => {},
  }
  return renderToString(<Ctx.Provider value={value}>{el}</Ctx.Provider>)
}

describe('levende designskjermer B', () => {
  it('eierskap viser sirkel som uavklart (Kystlinje)', () => {
    const html = render(<OwnershipScreen />, byOrg('100300401').id)
    for (const t of ['Eierstruktur og kontroll', 'Kystlinje Eksempel AS', 'Havn Holding Eksempel AS', 'Sirkel – uavklart', 'Per Eksempel',
      'Tomme registerdata betyr ikke at selskapet mangler reelle rettighetshavere', '60 % × 60 % = 36 %', 'Sirkulær eierkjede'])
      expect(html).toContain(t)
  })

  it('screening viser feltsammenligning og avklaringsskjema (Havbris)', () => {
    const html = render(<ScreeningScreen />, byOrg('100400501').id)
    for (const t of ['Ivan Eksempelov', 'Sanksjon = hastekanal', 'PEP gir forsterkede tiltak', 'Begrunnelse (påkrevd)', 'Gjelder til',
      'Avklar som falskt treff', 'Bekreft treff', 'Hastekanal for sanksjon'])
      expect(html).toContain(t)
    expect(html).toMatch(/samsvar|avvik|mangler/)
  })

  it('risiko viser faktorer, terskler og sperrer før score (Havbris)', () => {
    const c = byOrg('100400501')
    const html = render(<RiskScreen />, c.id)
    for (const t of ['Risikoscore', 'Åpne sperrer', 'Forklarbar risikovurdering', 'Potensielt sanksjonstreff', 'før'])
      expect(html).toContain(t)
    if (c.risk) expect(html).toContain(c.risk.factors[0].label)
  })

  it('beslutning er sperret og viser rolleadvarsel (Havbris)', () => {
    const html = render(<DecisionScreen />, byOrg('100400501').id)
    for (const t of ['Beslutning er sperret', 'Potensielt sanksjonstreff', 'Bare Faglig godkjenner', 'Fatt beslutning', 'Anbefalt', 'Menneskelig kontroll', 'Sperret'])
      expect(html).toContain(t)
  })

  it('besluttet sak viser utfall, oppbevaring, hash og låst grunnlag (Fjordlys)', async () => {
    const c = await createCheck('saksbehandler', { orgNr: '100200301', country: 'NO', sector: 'legal', service: 'company-transfer' })
    await settled(c.id)
    await requestDocument('saksbehandler', c.id, 'p-baltic')
    const task = portalTasks().find(t => t.caseId === c.id)!
    await submitDocument('kunde', c.id, task.requestId, null)
    await decide('godkjenner', c.id, 'etabler_med_tiltak', 'Eierskap dokumentert, forsterkede tiltak for utenlandsk ledd.')
    const d = store.state.cases.find(x => x.id === c.id)!.decisions[0]
    const html = render(<DecisionScreen />, c.id, 'godkjenner')
    for (const t of ['Etabler med forsterkede tiltak', 'Jonas Eide', '10 år', 'Planlagt', d.sha256, 'Åpne låst beslutningsgrunnlag', 'Fattet'])
      expect(html).toContain(t)
    const overlay = renderToString(<SnapshotOverlay decision={d} close={() => {}} />)
    for (const t of ['Låst beslutningsgrunnlag', 'Ola Eksempel', 'Styreleder', 'Reell rettighetshaver', 'Lukk', d.snapshot.evidence[0].sha256])
      expect(overlay).toContain(t)
  })
})
