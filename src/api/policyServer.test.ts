import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError, setTiming } from './fakeServer'
import { approveVersion, proposeVersion, readAudit, readVersions, rejectVersion, resetPolicies, rollback, versionAt } from './policyServer'

setTiming([0, 0], 0)
beforeEach(() => resetPolicies())

const status = async (p: Promise<unknown>) => { try { await p; return 0 } catch (e) { return e instanceof ApiError ? e.status : -1 } }

describe('Landpakker – to godkjennere (GOV-04)', () => {
  it('samme person avvises, en annen person publiserer', async () => {
    const v = await proposeVersion('Ingrid Solheim', 'NO', { version: '1.5', validFrom: '2027-01-01', changeSummary: 'Skjerpet krav til kilde til midler.' })
    expect(v.status).toBe('foreslått')
    expect(await status(approveVersion('Ingrid Solheim', v.id))).toBe(409)
    expect(readVersions('NO').find(x => x.id === v.id)!.status).toBe('foreslått')
    const pub = await approveVersion('Henrik Aas', v.id)
    expect(pub).toMatchObject({ status: 'publisert', proposedBy: 'Ingrid Solheim', approvedBy: 'Henrik Aas' })
    expect(pub.publishedAt).toBeTruthy()
    expect(await status(approveVersion('Henrik Aas', v.id))).toBe(409) // publisert er låst
  })

  it('avvisning gir status trukket', async () => {
    const v = await proposeVersion('Henrik Aas', 'DK', { version: '1.3', validFrom: '2027-01-01', changeSummary: 'Ny dansk vejledning.' })
    await rejectVersion('Ingrid Solheim', v.id, 'Mangler kildehenvisning')
    expect(readVersions('DK').find(x => x.id === v.id)!.status).toBe('trukket')
  })

  it('landpakke som ikke er godkjent kan ikke få versjoner', async () => {
    expect(await status(proposeVersion('Ingrid Solheim', 'FI', { version: '1.0', validFrom: '2027-01-01', changeSummary: 'Første finske pakke.' }))).toBe(409)
  })
})

describe('Påkrevde tiltak (GOV-03)', () => {
  it('forsøk på å slå av et påkrevd tiltak avvises med 422 og logges', async () => {
    const before = readVersions('NO').length
    expect(await status(proposeVersion('Ingrid Solheim', 'NO', { version: '1.5', validFrom: '2027-01-01', changeSummary: 'Fjern sanksjonsscreening.', removeMeasures: ['Sanksjonsscreening'] }))).toBe(422)
    expect(readVersions('NO')).toHaveLength(before)
    const entry = readAudit('NO')[0]
    expect(entry).toMatchObject({ outcome: 'avvist', actor: 'Ingrid Solheim' })
    expect(entry.text).toContain('Sanksjonsscreening')
  })
})

describe('Virkedato og tilbakeføring (GOV-04)', () => {
  it('tilbakedatert oppslag gir versjonen som gjaldt da', () => {
    expect(versionAt('NO', '2026-06-15')!.version).toBe('1.3')
    expect(versionAt('NO', '2026-10-01')!.version).toBe('1.4')
    expect(versionAt('NO', '2025-06-01')).toBeNull()
    expect(versionAt('SE', '2027-02-01')!.version).toBe('1.1') // foreslått v1.2 er ikke publisert
  })

  it('tilbakeføring lager ny versjon som peker til den gamle, uten å slette historikk', async () => {
    const v13 = readVersions('NO').find(v => v.version === '1.3')!
    const rb = await rollback('Henrik Aas', 'NO', v13.id, '2026-11-02')
    expect(rb).toMatchObject({ version: '1.5', status: 'foreslått', rolledBackFrom: v13.id })
    expect(await status(approveVersion('Henrik Aas', rb.id))).toBe(409)
    await approveVersion('Ingrid Solheim', rb.id)
    const all = readVersions('NO')
    expect(all.map(v => v.version)).toEqual(['1.3', '1.4', '1.5'])
    expect(all.find(v => v.version === '1.4')!.status).toBe('publisert')
    expect(versionAt('NO', '2026-11-02')!.id).toBe(rb.id)
    expect(versionAt('NO', '2026-10-15')!.version).toBe('1.4')
  })
})
