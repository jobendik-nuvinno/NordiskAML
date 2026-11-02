import { beforeEach, describe, expect, it } from 'vitest'
import { setTiming } from './fakeServer'
import {
  changeRole, deactivateMember, grantSupportAccess, inviteMember, reactivateMember, readMemberAudit, readMembers,
  readSupportGrants, resetMembers, revokeSupportAccess,
} from './membersServer'

setTiming([0, 0], 0)
beforeEach(() => resetMembers())

const ADMIN = 'Erik Dahl'
const byName = (n: string) => readMembers().find(m => m.name === n)!

describe('S13 brukere og roller', () => {
  it('bare bedriftsadministrator kan administrere brukere (403)', async () => {
    await expect(inviteMember('Nora Berg', { name: 'Ny Person', email: 'ny@nordictrade.example', role: 'saksbehandler' })).rejects.toMatchObject({ status: 403 })
  })

  it('invitasjon logges med aktør, og revisor får utløpsdato', async () => {
    const m = await inviteMember(ADMIN, { name: 'Kari Revisor', email: 'kari@nordictrade.example', role: 'revisor' })
    expect(m.status).toBe('invitert')
    expect(m.accessExpires).not.toBeNull()
    const e = readMemberAudit()[0]
    expect(e).toMatchObject({ actor: ADMIN, action: 'Bruker invitert', target: 'Kari Revisor' })
    expect(Date.parse(e.at)).toBeGreaterThan(0)
    await expect(inviteMember(ADMIN, { name: 'Kari', email: 'kari@nordictrade.example', role: 'saksbehandler' })).rejects.toMatchObject({ status: 409 })
    await expect(inviteMember(ADMIN, { name: 'Ugyldig', email: 'ikke-epost', role: 'saksbehandler' })).rejects.toMatchObject({ status: 422 })
  })

  it('administrator kan ikke gi seg selv saksroller (403)', async () => {
    const erik = byName(ADMIN)
    for (const r of ['saksbehandler', 'godkjenner', 'hvitvaskingsansvarlig'] as const)
      await expect(changeRole(ADMIN, erik.id, ['bedriftsadministrator', r])).rejects.toMatchObject({ status: 403 })
    expect(byName(ADMIN).roles).toEqual(['bedriftsadministrator'])
  })

  it('rolleendring for andre logges med før og etter', async () => {
    await changeRole(ADMIN, byName('Nora Berg').id, ['saksbehandler', 'godkjenner'])
    expect(byName('Nora Berg').roles).toEqual(['saksbehandler', 'godkjenner'])
    expect(readMemberAudit()[0]).toMatchObject({ actor: ADMIN, action: 'Rolle endret', detail: 'Saksbehandler → Saksbehandler, Faglig godkjenner' })
  })

  it('revisor kan ikke samtidig ha saksrolle (422, arbeidsdeling)', async () => {
    await expect(changeRole(ADMIN, byName('Tone Lie').id, ['revisor', 'saksbehandler'])).rejects.toMatchObject({ status: 422 })
    await expect(changeRole(ADMIN, byName('Nora Berg').id, ['saksbehandler', 'revisor'])).rejects.toMatchObject({ status: 422 })
  })

  it('siste aktive hvitvaskingsansvarlig kan ikke deaktiveres eller miste rollen (409)', async () => {
    const marius = byName('Marius A. Viken')
    await expect(deactivateMember(ADMIN, marius.id)).rejects.toMatchObject({ status: 409 })
    await expect(changeRole(ADMIN, marius.id, ['godkjenner'])).rejects.toMatchObject({ status: 409 })
    // Stedfortreder teller ikke – men når Sara får rollen, kan Marius fratas den.
    await changeRole(ADMIN, byName('Sara Holm').id, ['hvitvaskingsansvarlig'])
    await deactivateMember(ADMIN, marius.id)
    expect(byName('Marius A. Viken').status).toBe('deaktivert')
  })

  it('deaktivering gjelder umiddelbart, avslutter sesjoner og logges; reaktivering logges', async () => {
    const nora = byName('Nora Berg')
    await deactivateMember(ADMIN, nora.id)
    expect(byName('Nora Berg')).toMatchObject({ status: 'deaktivert', activeSessions: 0 })
    expect(readMemberAudit()[0]).toMatchObject({ actor: ADMIN, action: 'Tilgang trukket tilbake, aktive sesjoner avsluttet', target: 'Nora Berg' })
    await expect(changeRole(ADMIN, nora.id, ['godkjenner'])).rejects.toMatchObject({ status: 409 })
    await reactivateMember(ADMIN, nora.id)
    expect(byName('Nora Berg').status).toBe('aktiv')
    expect(readMemberAudit()[0].action).toBe('Bruker reaktivert')
    await expect(deactivateMember(ADMIN, byName(ADMIN).id)).rejects.toMatchObject({ status: 409 })
  })
})

describe('S13 tidsavgrenset supporttilgang (SEC-02)', () => {
  it('krever begrunnelse og maks 8 timer', async () => {
    await expect(grantSupportAccess(ADMIN, '', 2)).rejects.toMatchObject({ status: 422 })
    await expect(grantSupportAccess(ADMIN, 'Feilsøking av import', 9)).rejects.toMatchObject({ status: 422 })
    await expect(grantSupportAccess('Nora Berg', 'Feilsøking av import', 2)).rejects.toMatchObject({ status: 403 })
  })

  it('utløper automatisk og kan trekkes tilbake', async () => {
    const g = await grantSupportAccess(ADMIN, 'Feilsøking av dokumentimport', 2)
    expect(readSupportGrants()[0].status).toBe('aktiv')
    expect(readSupportGrants(Date.now() + 3 * 36e5)[0].status).toBe('utløpt')
    expect(readMemberAudit()[0]).toMatchObject({ actor: ADMIN, action: 'Supporttilgang gitt' })
    await revokeSupportAccess(ADMIN, g.id)
    expect(readSupportGrants()[0].status).toBe('trukket tilbake')
    expect(readMemberAudit()[0].action).toBe('Supporttilgang trukket tilbake')
    await expect(revokeSupportAccess(ADMIN, g.id)).rejects.toMatchObject({ status: 409 })
  })
})
