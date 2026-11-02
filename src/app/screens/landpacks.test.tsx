import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { setTiming } from '../../api/fakeServer'
import { proposeVersion, resetPolicies } from '../../api/policyServer'
import { Ctx, type AppCtx } from '../context'
import { LandPacksScreen } from './LandPacks'

setTiming([0, 0], 0)
beforeEach(() => resetPolicies())

const ctx: AppCtx = { role: 'partner', actor: 'Ingrid Solheim', designRole: 'platform', fn: 'saksbehandler', caseId: null, openCase() {}, go() {} }
const render = () => renderToString(<Ctx.Provider value={ctx}><LandPacksScreen /></Ctx.Provider>)

describe('Landpakker-skjermen', () => {
  it('viser levende pakker, versjoner og kontrollflater', () => {
    const html = render()
    expect(html).toContain('Regelpakker i drift')
    expect(html).toContain('NO v1.4')
    expect(html).toContain('SE v1.1')
    expect(html).toContain('DK v1.2')
    expect(html).toContain('Ikke godkjent')
    expect(html).toContain('PEP-forskrift 1.10.2026')
    expect(html).toContain('Hvilken versjon gjaldt?')
    expect(html).toContain('Tilbakefør')
    expect(html).toContain('Revisjonslogg · NO')
    expect(html).not.toMatch(/demo|prototyp/i)
  })

  it('egen foreslått versjon viser at en annen person må godkjenne', async () => {
    await proposeVersion('Ingrid Solheim', 'NO', { version: '1.5', validFrom: '2027-01-01', changeSummary: 'Skjerpet kontroll av kilde til midler.' })
    const html = render()
    expect(html).toContain('Skjerpet kontroll av kilde til midler.')
    expect(html).toContain('Bytt person i brukermenyen')
    expect(html).toContain('Krever godkjenning')
  })
})
