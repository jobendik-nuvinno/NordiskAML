import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { setTiming } from '../../api/fakeServer'
import { deactivateMember, grantSupportAccess, readMembers, resetMembers } from '../../api/membersServer'
import { Ctx, type AppCtx } from '../context'
import { MembersScreen } from './Members'

setTiming([0, 0], 0)
beforeEach(() => resetMembers())

const ctx: AppCtx = { role: 'admin', actor: 'Erik Dahl', designRole: 'admin', fn: 'saksbehandler', caseId: null, openCase() {}, go() {} }
const render = () => renderToString(<Ctx.Provider value={ctx}><MembersScreen /></Ctx.Provider>)

describe('MembersScreen', () => {
  it('viser levende medlemmer, roller, status og nøkkeltall', () => {
    const html = render()
    expect(html).toContain('Medlemskap og faglig delegasjon')
    for (const t of ['Nora Berg', 'Jonas Eide', 'Marius A. Viken', 'Sara Holm', 'Tone Lie', 'Lars Moen', 'nora.berg@nordictrade.example'])
      expect(html).toContain(t)
    expect(html).toContain('Stedfortreder hvitvaskingsansvarlig')
    expect(html).toContain('Revisor (kun lesing)')
    expect(html).toContain('Invitert')
    expect(html).toContain('MFA-dekning')
    expect(html).toContain('Entra ID')
    expect(html).toContain('Supporttilgang')
    expect(html).toContain('Ingen supporttilgang er gitt.')
    expect(html).toContain('Arbeidsdeling')
    expect(html).toContain('Kontrollregler')
  })

  it('gjenspeiler deaktivering, logg og supporttilgang', async () => {
    await deactivateMember('Erik Dahl', readMembers().find(m => m.name === 'Nora Berg')!.id)
    await grantSupportAccess('Erik Dahl', 'Feilsøking av dokumentimport', 4)
    const html = render()
    expect(html).toContain('Deaktivert')
    expect(html).toContain('Reaktiver')
    expect(html).toContain('Tilgang trukket tilbake, aktive sesjoner avsluttet')
    expect(html).toContain('Feilsøking av dokumentimport')
    expect(html).toContain('Trekk tilbake')
  })
})
