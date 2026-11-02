import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { activeDecision } from '../domain/rules'
import { Ctx, type AppCtx } from '../app/context'
import { DecisionScreen } from '../app/screens/Decision'
import { HistoryScreen } from '../app/screens/History'
import {
  createCheck, decide, getCase, portalTasks, reopenDecision, requestDocument, resetDemo, setTiming, settled, submitDocument,
} from './fakeServer'

setTiming([0, 0], 0)
beforeEach(async () => { await resetDemo() })

/** Fjordlys: dokument levert og beslutning v1 (forsterkede tiltak). */
async function decidedCase() {
  const c = await createCheck('saksbehandler', { orgNr: '100200301', country: 'NO', sector: 'legal', service: 'company-transfer' })
  await settled(c.id)
  await requestDocument('saksbehandler', c.id, 'p-baltic')
  const task = portalTasks().find(t => t.caseId === c.id)!
  await submitDocument('kunde', c.id, task.requestId, null)
  await decide('godkjenner', c.id, 'etabler_med_tiltak', 'Eierskap dokumentert, forsterkede tiltak for utenlandsk ledd.')
  return getCase(c.id)
}

const REASON = 'Korrigert identitet for reell rettighetshaver – nytt grunnlag kreves.'

describe('overprøving og retting (RSK-04, RSK-06)', () => {
  it('saksbehandler kan ikke overprøve (403)', async () => {
    const c = await decidedCase()
    await expect(reopenDecision('saksbehandler', c.id, REASON)).rejects.toMatchObject({ status: 403 })
    expect(activeDecision(c)?.version).toBe(1)
  })

  it('overprøving krever begrunnelse (422) og en fattet beslutning (409)', async () => {
    const c = await decidedCase()
    await expect(reopenDecision('godkjenner', c.id, 'kort')).rejects.toMatchObject({ status: 422 })
    expect(c.status).toBe('decided')
    await reopenDecision('hvitvaskingsansvarlig', c.id, REASON)
    await expect(reopenDecision('godkjenner', c.id, REASON)).rejects.toMatchObject({ status: 409 })
  })

  it('ny versjon lages; gammel beslutning, grunnlag og hash er uendret', async () => {
    const c = await decidedCase()
    const v1 = c.decisions[0]
    const before = { sha256: v1.sha256, snapshot: structuredClone(v1.snapshot), outcome: v1.outcome, reason: v1.reason }
    const riskVersion = c.risk!.version

    await reopenDecision('godkjenner', c.id, REASON)
    expect(activeDecision(c)).toBeUndefined()
    expect(c.status).toBe('review_ready')
    expect(c.risk!.version).toBe(riskVersion + 1)
    expect(v1.supersededAt).toBeTruthy()
    expect(v1.supersededReason).toBe(REASON)
    expect(c.audit.some(e => e.action.startsWith('Beslutning overprøvd') && e.detail === REASON)).toBe(true)

    await decide('godkjenner', c.id, 'avslå', 'Korrigert identitet gir nytt utfall: oppdraget avslås.')
    expect(c.decisions).toHaveLength(2)
    expect(c.decisions[0].sha256).toBe(before.sha256)
    expect(c.decisions[0].snapshot).toEqual(before.snapshot)
    expect(c.decisions[0].outcome).toBe(before.outcome)
    expect(c.decisions[0].reason).toBe(before.reason)
    const v2 = c.decisions[1]
    expect(v2.version).toBe(2)
    expect(v2.sha256).not.toBe(before.sha256)
    expect(activeDecision(c)).toBe(v2)
    expect(c.status).toBe('decided')
    // Oppbevaring og neste kontroll følger aktiv versjon
    expect(activeDecision(c)!.retention.years).toBe(5)
    expect(activeDecision(c)!.retention.until).not.toBeNull()
    expect(activeDecision(c)!.nextReviewAt).toBeNull()
    await expect(decide('godkjenner', c.id, 'etabler', 'Enda en beslutning uten overprøving')).rejects.toMatchObject({ status: 409 })
  })

  it('beslutningsskjermen og historikken viser begge versjoner', async () => {
    const c = await decidedCase()
    const v1sha = c.decisions[0].sha256
    await reopenDecision('godkjenner', c.id, REASON)
    const render = (el: Parameters<typeof renderToString>[0]) => {
      const value: AppCtx = { actor: 'Jonas Eide', role: 'godkjenner', designRole: 'user', fn: 'godkjenner', caseId: c.id, openCase: () => {}, go: () => {} }
      return renderToString(createElement(Ctx.Provider, { value }, el))
    }
    const reopened = render(createElement(DecisionScreen))
    expect(reopened).toContain('Tidligere beslutning (versjon 1) er bevart uendret')
    expect(reopened).toContain('Fatt beslutning')

    await decide('godkjenner', c.id, 'avslå', 'Korrigert identitet gir nytt utfall: oppdraget avslås.')
    const html = render(createElement(DecisionScreen))
    for (const t of ['Versjon 2', 'Tidligere versjoner', 'Versjon 1', v1sha.slice(0, 12), 'Åpne låst grunnlag', REASON, 'Overprøv beslutning', 'separat, lovlig svar'])
      expect(html).toContain(t)
    const history = render(createElement(HistoryScreen))
    expect(history).toContain('Versjon 1')
    expect(history).toContain('Versjon 2')
    expect(history).toContain('(versjon 1)')
    expect(history).toContain('(versjon 2)')
  })
})
