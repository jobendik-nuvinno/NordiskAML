// Kildehelse (MON-06, OPS-01): utledes bare fra revisjonsloggen og kildetilstanden i den simulerte backenden.
// En tom eller delvis feed – eller et register uten vellykket oppslag – gir aldri grønn status.

import { BASIS_READY, REGISTERED, SOURCE_OUTAGE } from '../../domain/metrics'
import type { Case, Country } from '../../domain/types'
import type { Tone } from '../ui'

export const FETCHED = 'Registerdata innhentet'
export const RECOVERED = 'Kilde gjenopprettet'

export interface RegistrySource { country: Country; label: string; source: string; keyId: string }

export const REGISTRY_SOURCES: RegistrySource[] = [
  { country: 'NO', label: 'Foretaksregister NO', source: 'Brønnøysundregistrene (testdata)', keyId: 'nta-brreg-01' },
  { country: 'SE', label: 'Foretaksregister SE', source: 'Bolagsverket (testdata)', keyId: 'nta-bolagsverket-01' },
  { country: 'DK', label: 'Foretaksregister DK', source: 'CVR (testdata)', keyId: 'nta-cvr-01' },
]

export interface SourceHealth {
  src: RegistrySource
  lastSuccess: string | null
  backlog: number
  outages: number
  tone: Tone
  status: string
}

/** Siste vellykkede oppslag mot kilden, på tvers av saker (null når det aldri har lyktes). */
export function lastSuccess(cases: Case[], source: string): string | null {
  let last: string | null = null
  for (const c of cases) for (const e of c.audit)
    if (e.action === FETCHED && e.detail.startsWith(source) && (!last || e.at > last)) last = e.at
  return last
}

export function sourceHealth(cases: Case[], registryDown: boolean): SourceHealth[] {
  return REGISTRY_SOURCES.map(src => {
    const own = cases.filter(c => c.scope.country === src.country)
    const backlog = own.filter(c => c.status === 'waiting_source').length
    const outages = own.flatMap(c => c.audit).filter(e => e.action === SOURCE_OUTAGE).length
    const last = lastSuccess(cases, src.source)
    const [tone, status]: [Tone, string] = registryDown ? ['red', 'Utilgjengelig (503)']
      : !last ? ['amber', 'Ingen vellykket oppslag']
      : backlog ? ['amber', 'Delvis – restkø']
      : ['green', 'Tilgjengelig']
    return { src, lastSuccess: last, backlog, outages, tone, status }
  })
}

/** Samlet kildehelse: grønn bare når alle kilder er tilgjengelige, uten restkø og med vellykket oppslag. */
export function overallHealth(h: SourceHealth[]): { tone: Tone; value: string } {
  if (h.some(x => x.tone === 'red')) return { tone: 'red', value: 'Svikt' }
  if (h.some(x => x.tone !== 'green')) return { tone: 'amber', value: 'Delvis' }
  return { tone: 'green', value: 'Frisk' }
}

const ms = (iso: string) => new Date(iso).getTime()

/** Tid saken har ventet på kilde: fra «Kildeutfall» til «Kilde gjenopprettet» (eller nå / gitt grense). */
export function sourceWaitMs(c: Case, until = Date.now()): number {
  let total = 0, open: number | null = null
  for (const e of c.audit) {
    const t = ms(e.at)
    if (t > until) break
    if (e.action === SOURCE_OUTAGE && open === null) open = t
    if (e.action === RECOVERED && open !== null) { total += t - open; open = null }
  }
  return total + (open !== null ? until - open : 0)
}

/** Intern behandlingstid: registrert → grunnlag klargjort, minus tid saken ventet på kilde. */
export function internalMs(c: Case): number | null {
  const reg = c.audit.find(e => e.action === REGISTERED)
  const ready = c.audit.find(e => e.action === BASIS_READY)
  if (!reg || !ready) return null
  return Math.max(0, ms(ready.at) - ms(reg.at) - sourceWaitMs(c, ms(ready.at)))
}

export interface Latency { sourceAvgMs: number | null; sourceCases: number; internalAvgMs: number | null; internalCases: number }

export function latency(cases: Case[], now = Date.now()): Latency {
  const waits = cases.filter(c => c.audit.some(e => e.action === SOURCE_OUTAGE)).map(c => sourceWaitMs(c, now))
  const internal = cases.map(internalMs).filter((x): x is number => x !== null)
  const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  return { sourceAvgMs: avg(waits), sourceCases: waits.length, internalAvgMs: avg(internal), internalCases: internal.length }
}

export function duration(msValue: number | null): string {
  if (msValue === null) return '–'
  const min = Math.round(msValue / 60000)
  if (min < 1) return '< 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return h < 48 ? `${h} t ${min % 60} min` : `${Math.floor(h / 24)} døgn`
}

export const since = (iso: string | null, now = Date.now()) => iso ? duration(now - ms(iso)) : 'Aldri'
