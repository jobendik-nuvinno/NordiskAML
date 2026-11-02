// Policytjeneste for landpakker (GOV-03, GOV-04). Eget lager og egen lagringsnøkkel, adskilt fra saksbackenden.
// Versjoner foreslås av én person og publiseres av en annen. Publiserte versjoner endres aldri; tilbakeføring
// lager en ny versjon som peker til den gamle, slik at historikken bevares.

import { ApiError, networkDelay } from './fakeServer'

export type PackCode = 'NO' | 'SE' | 'DK' | 'FI' | 'IS'
export type VersionStatus = 'utkast' | 'foreslått' | 'publisert' | 'trukket'

export interface LandPack {
  code: PackCode
  name: string
  sector: string
  status: 'aktiv' | 'ikke godkjent'
  owner: string
}

export interface PolicyVersion {
  id: string
  pack: PackCode
  version: string
  validFrom: string // ÅÅÅÅ-MM-DD
  sourceRef: string
  owner: string
  changeSummary: string
  mandatoryMeasures: string[]
  optionalMeasures: string[]
  status: VersionStatus
  proposedBy: string
  proposedAt: string
  approvedBy: string | null
  publishedAt: string | null
  rejectedBy?: string | null
  rejectReason?: string | null
  rolledBackFrom?: string | null
}

export interface PolicyAuditEntry {
  id: string
  at: string
  pack: PackCode
  actor: string
  outcome: 'ok' | 'avvist'
  text: string
}

/** Plattformkrav som ingen landpakke eller lokal policy kan slå av (GOV-03). */
export const MANDATORY_MEASURES = ['Reelle rettighetshavere', 'Sanksjonsscreening', 'PEP-kontroll', 'Formål og forventet bruk']

export const PACKS: LandPack[] = [
  { code: 'NO', name: 'Norge', sector: 'Advokat', status: 'aktiv', owner: 'Fagansvarlig AML' },
  { code: 'SE', name: 'Sverige', sector: 'Advokat', status: 'aktiv', owner: 'Fagansvarlig AML' },
  { code: 'DK', name: 'Danmark', sector: 'Advokat', status: 'aktiv', owner: 'Fagansvarlig AML' },
  { code: 'FI', name: 'Finland', sector: 'Advokat', status: 'ikke godkjent', owner: '–' },
  { code: 'IS', name: 'Island', sector: 'Advokat', status: 'ikke godkjent', owner: '–' },
]

const KEY = 'nordisk-aml-policy-v1'
interface State { versions: PolicyVersion[]; audit: PolicyAuditEntry[] }

const uuid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const today = () => now().slice(0, 10)

function seed(): State {
  const v = (pack: PackCode, version: string, validFrom: string, sourceRef: string, changeSummary: string, extra: Partial<PolicyVersion> = {}): PolicyVersion => ({
    id: `pol-${pack.toLowerCase()}-${version}`, pack, version, validFrom, sourceRef, owner: 'Fagansvarlig AML', changeSummary,
    mandatoryMeasures: [...MANDATORY_MEASURES], optionalMeasures: ['Kilde til midler ved forhøyet risiko', 'Rescreening hver 12. måned'],
    status: 'publisert', proposedBy: 'Ingrid Solheim', proposedAt: `${validFrom}T08:00:00.000Z`, approvedBy: 'Henrik Aas',
    publishedAt: `${validFrom}T09:00:00.000Z`, rolledBackFrom: null, ...extra,
  })
  const versions: PolicyVersion[] = [
    v('NO', '1.3', '2026-01-01', 'N1 · hvitvaskingsloven', 'Årlig revisjon av kundetiltak for advokatsektoren.', { proposedAt: '2025-12-01T08:00:00.000Z', publishedAt: '2025-12-03T09:00:00.000Z' }),
    v('NO', '1.4', '2026-10-01', 'N5 · PEP-forskrift', 'PEP-forskrift 1.10.2026: utvidet krav til PEP-kontroll og nærstående.', { proposedAt: '2026-09-10T08:00:00.000Z', publishedAt: '2026-09-12T09:00:00.000Z' }),
    v('SE', '1.1', '2026-03-01', 'S1 · penningtvättslagen', 'Svensk landpakke for advokatsektoren.', { proposedBy: 'Henrik Aas', approvedBy: 'Ingrid Solheim', proposedAt: '2026-02-10T08:00:00.000Z', publishedAt: '2026-02-12T09:00:00.000Z' }),
    v('SE', '1.2', '2027-01-01', 'S2 · FI-föreskrift', 'Oppdatert kontroll av reelle rettighetshavere etter ny föreskrift.', { status: 'foreslått', proposedBy: 'Henrik Aas', proposedAt: '2026-10-28T10:00:00.000Z', approvedBy: null, publishedAt: null }),
    v('DK', '1.2', '2026-05-01', 'D1 · hvidvaskloven', 'Dansk landpakke med oppdatert risikovurdering.', { proposedAt: '2026-04-05T08:00:00.000Z', publishedAt: '2026-04-08T09:00:00.000Z' }),
  ]
  const audit: PolicyAuditEntry[] = versions.flatMap(x => {
    const e: PolicyAuditEntry[] = [{ id: uuid(), at: x.proposedAt, pack: x.pack, actor: x.proposedBy, outcome: 'ok', text: `v${x.version} foreslått` }]
    if (x.publishedAt) e.push({ id: uuid(), at: x.publishedAt, pack: x.pack, actor: x.approvedBy!, outcome: 'ok', text: `v${x.version} godkjent og publisert` })
    return e
  })
  return { versions, audit }
}

const storage: Storage | null = (() => { try { return globalThis.localStorage ?? null } catch { return null } })()
let state: State = (() => {
  try { const raw = storage?.getItem(KEY); if (raw) return JSON.parse(raw) as State } catch { /* ugyldig lager */ }
  return seed()
})()
let version = 0
const listeners = new Set<() => void>()
function commit() {
  version++
  try { storage?.setItem(KEY, JSON.stringify(state)) } catch { /* privat modus */ }
  listeners.forEach(f => f())
}

export const policyStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
  getVersion: () => version,
}

function log(pack: PackCode, actor: string, outcome: PolicyAuditEntry['outcome'], text: string) {
  state.audit.push({ id: uuid(), at: now(), pack, actor, outcome, text })
}

function activePack(code: PackCode): LandPack {
  const p = PACKS.find(x => x.code === code)
  if (!p) throw new ApiError(404, 'Ukjent landpakke')
  if (p.status !== 'aktiv') throw new ApiError(409, `Landpakken ${code} er ikke godkjent for bruk.`)
  return p
}

const byVersion = (a: PolicyVersion, b: PolicyVersion) => {
  const [am, an] = a.version.split('.').map(Number), [bm, bn] = b.version.split('.').map(Number)
  return am - bm || an - bn
}

function nextVersion(pack: PackCode): string {
  const all = state.versions.filter(v => v.pack === pack).sort(byVersion)
  const last = all.at(-1)
  if (!last) return '1.0'
  const [m, n] = last.version.split('.').map(Number)
  return `${m}.${n + 1}`
}

/** Synkron lesing for UI-et. */
export function readVersions(pack: PackCode): PolicyVersion[] {
  return state.versions.filter(v => v.pack === pack).sort(byVersion)
}
export function readAudit(pack: PackCode): PolicyAuditEntry[] {
  return state.audit.filter(a => a.pack === pack).sort((a, b) => b.at.localeCompare(a.at))
}
export function suggestVersion(pack: PackCode): string { return nextVersion(pack) }

/** Publisert versjon som gjaldt på datoen (etter virkedato; ved lik virkedato vinner sist publiserte). */
export function versionAt(pack: PackCode, isoDate: string): PolicyVersion | null {
  const d = isoDate.slice(0, 10)
  const candidates = state.versions
    .filter(v => v.pack === pack && v.status === 'publisert' && v.validFrom <= d)
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom) || (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''))
  return candidates.at(-1) ?? null
}

/** Gjeldende versjon i dag. */
export function currentVersion(pack: PackCode): PolicyVersion | null { return versionAt(pack, today()) }

export interface ProposalInput {
  version: string
  validFrom: string
  changeSummary: string
  sourceRef?: string
  removeMeasures?: string[]
}

export async function proposeVersion(actor: string, pack: PackCode, input: ProposalInput): Promise<PolicyVersion> {
  await networkDelay()
  activePack(pack)
  const blocked = (input.removeMeasures ?? []).filter(m => MANDATORY_MEASURES.includes(m))
  if (blocked.length) {
    log(pack, actor, 'avvist', `Forsøk på å slå av påkrevd tiltak avvist: ${blocked.join(', ')}`)
    commit()
    throw new ApiError(422, `Påkrevde tiltak kan ikke slås av: ${blocked.join(', ')}. Forsøket er logget.`)
  }
  const ver = input.version.trim().replace(/^v/i, '')
  if (!/^\d+\.\d+$/.test(ver)) throw new ApiError(422, 'Versjon må ha formen 1.5.')
  if (state.versions.some(v => v.pack === pack && v.version === ver)) throw new ApiError(409, `Versjon ${ver} finnes allerede for ${pack}.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validFrom)) throw new ApiError(422, 'Oppgi gyldig virkedato.')
  if (input.changeSummary.trim().length < 10) throw new ApiError(422, 'Beskriv endringen (minst 10 tegn).')
  const base = currentVersion(pack) ?? readVersions(pack).filter(v => v.status === 'publisert').at(-1)
  const remove = input.removeMeasures ?? []
  const v: PolicyVersion = {
    id: uuid(), pack, version: ver, validFrom: input.validFrom, sourceRef: input.sourceRef?.trim() || base?.sourceRef || '–',
    owner: base?.owner ?? 'Fagansvarlig AML', changeSummary: input.changeSummary.trim(),
    mandatoryMeasures: [...MANDATORY_MEASURES],
    optionalMeasures: (base?.optionalMeasures ?? []).filter(m => !remove.includes(m)),
    status: 'foreslått', proposedBy: actor, proposedAt: now(), approvedBy: null, publishedAt: null, rolledBackFrom: null,
  }
  state.versions.push(v)
  log(pack, actor, 'ok', `v${ver} foreslått (virkedato ${input.validFrom})${remove.length ? ` – fjerner ${remove.join(', ')}` : ''}`)
  commit()
  return structuredClone(v)
}

function proposed(id: string): PolicyVersion {
  const v = state.versions.find(x => x.id === id)
  if (!v) throw new ApiError(404, 'Versjonen finnes ikke.')
  if (v.status === 'publisert') throw new ApiError(409, 'Publisert versjon er låst.')
  if (v.status !== 'foreslått') throw new ApiError(409, `Versjonen har status «${v.status}».`)
  return v
}

export async function approveVersion(actor: string, versionId: string): Promise<PolicyVersion> {
  await networkDelay()
  const v = proposed(versionId)
  if (v.proposedBy === actor) {
    log(v.pack, actor, 'avvist', `Egen-godkjenning av v${v.version} avvist (foreslått av samme person)`)
    commit()
    throw new ApiError(409, 'Samme person kan ikke både foreslå og godkjenne en policyversjon.')
  }
  v.status = 'publisert'
  v.approvedBy = actor
  v.publishedAt = now()
  log(v.pack, actor, 'ok', `v${v.version} godkjent og publisert${v.rolledBackFrom ? ' (tilbakeføring)' : ''}`)
  commit()
  return structuredClone(v)
}

export async function rejectVersion(actor: string, versionId: string, reason: string): Promise<PolicyVersion> {
  await networkDelay()
  const v = proposed(versionId)
  if (reason.trim().length < 5) throw new ApiError(422, 'Oppgi begrunnelse for avvisning.')
  v.status = 'trukket'
  v.rejectedBy = actor
  v.rejectReason = reason.trim()
  log(v.pack, actor, 'ok', `v${v.version} avvist: ${reason.trim()}`)
  commit()
  return structuredClone(v)
}

/**
 * Tilbakefør til en tidligere publisert versjon. Lager en ny versjon med kopiert innhold som må godkjennes av en
 * annen person. Ingen historikk slettes.
 */
export async function rollback(actor: string, pack: PackCode, toVersionId: string, validFrom = today()): Promise<PolicyVersion> {
  await networkDelay()
  activePack(pack)
  const src = state.versions.find(v => v.id === toVersionId && v.pack === pack)
  if (!src) throw new ApiError(404, 'Versjonen finnes ikke.')
  if (src.status !== 'publisert') throw new ApiError(409, 'Kan bare tilbakeføre til en publisert versjon.')
  const ver = nextVersion(pack)
  const v: PolicyVersion = {
    ...structuredClone(src), id: uuid(), version: ver, validFrom,
    changeSummary: `Tilbakeføring til v${src.version}: ${src.changeSummary}`,
    status: 'foreslått', proposedBy: actor, proposedAt: now(), approvedBy: null, publishedAt: null,
    rejectedBy: null, rejectReason: null, rolledBackFrom: src.id,
  }
  state.versions.push(v)
  log(pack, actor, 'ok', `Tilbakeføring foreslått: v${ver} = innholdet i v${src.version}`)
  commit()
  return structuredClone(v)
}

export function resetPolicies() {
  state = seed()
  commit()
}
