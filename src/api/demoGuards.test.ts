import { beforeEach, describe, expect, it } from 'vitest'
import { parseHash } from '../app/route'
import { createCheck, decide, requestDocument, resetDemo, setTiming, settled, store } from './fakeServer'

setTiming([0, 0], 0)
beforeEach(async () => { await resetDemo() })

describe('vern mot uheldige klikk under visning', () => {
  it('beslutning avvises mens saken fortsatt behandles eller har uklart omfang', async () => {
    setTiming([0, 0], 50)
    const c = await createCheck('saksbehandler', { orgNr: '5560000101', country: 'SE', sector: 'legal', service: 'company-transfer' })
    expect(c.status).toBe('processing')
    await expect(decide('godkjenner', c.id, 'etabler', 'Forsøk før grunnlaget er klart')).rejects.toMatchObject({ status: 409 })
    setTiming([0, 0], 0)
    await settled(c.id)
    const advisory = await createCheck('saksbehandler', { orgNr: '5560000101', country: 'SE', sector: 'legal', service: 'advisory' })
    await settled(advisory.id)
    expect(advisory.status).toBe('needs_review')
    await expect(decide('godkjenner', advisory.id, 'etabler', 'Uklart omfang skal ikke kunne besluttes')).rejects.toMatchObject({ status: 409 })
  })

  it('dokumentforespørsel på besluttet sak eller dobbel forespørsel avvises synlig', async () => {
    const lyng = store.state.cases.find(c => c.name === 'Lyngheia Eksempel AS')!
    await expect(requestDocument('saksbehandler', lyng.id, 'p-tor')).rejects.toMatchObject({ status: 409 })
    expect(lyng.status).toBe('decided')
    const kyst = store.state.cases.find(c => c.name === 'Kystlinje Eksempel AS')!
    await requestDocument('saksbehandler', kyst.id, 'p-per')
    await expect(requestDocument('saksbehandler', kyst.id, 'p-per')).rejects.toMatchObject({ status: 409 })
  })

  it('ugyldige URL-er krasjer ikke appen', () => {
    const any = () => true
    expect(parseHash('#/constructor', any)).toEqual({})
    expect(parseHash('#/__proto__/x', any)).toEqual({})
    expect(() => parseHash('#/arbeidsflate/%E0%A4%A', any)).not.toThrow()
  })
})
