// Innsikt (UX-03, UX-05): rene funksjoner over saker. Alt beregnes fra revisjonsloggen slik at utvalget
// kan gjenskapes. Menneskelige beslutninger telles aldri som helautomatiske beslutninger.

import { evaluateBlockers } from './rules'
import type { AuditEvent, Case, CaseStatus, RiskAssessment } from './types'

export const SYSTEM_ACTOR = 'System'
export const REGISTERED = 'Oppdrag registrert'
export const BASIS_READY = 'Beslutningsgrunnlag klargjort'
export const SOURCE_OUTAGE = 'Kildeutfall'
export const DECISION_PREFIX = 'Beslutning fattet'

/** Hendelser som betyr manuell innhenting eller korrigering (§13). */
export const MANUAL_ACTIONS = [
  'Vedlegg etterspurt fra kunde',
  'Kunde leverte dokument',
  'Nytt forsøk mot kilde',
  'Treff avklart som falskt',
  'Treff bekreftet',
  'Ny identitetsopplysning registrert',
] as const

export interface CaseClassification {
  ref: string
  /** Med i nevneren (påbegynt kontroll i loggen). */
  started: boolean
  /** Maskinelt ferdig grunnlag – ikke en automatisk beslutning. */
  automated: boolean
  reason: string
}

export interface AutomationRate {
  numerator: number
  denominator: number
  /** teller / nevner, 0 når nevneren er 0. */
  rate: number
  /** teller / alle saker i utvalget (også de som er utelatt fra nevneren). */
  shareOfAll: number
  totalCases: number
  /** Frafall: påbegynte kontroller som ikke ble maskinelt ferdige, gruppert på årsak. */
  excluded: { reason: string; count: number }[]
  /** Utelatelser: saker som ikke kan regnes som påbegynt ut fra loggen. */
  omitted: { reason: string; count: number }[]
  perCase: CaseClassification[]
  /** Menneskelige beslutninger (sluttgodkjenninger) – telles separat, aldri som automatiske. */
  humanDecisions: number
  /** Plattformen fatter ikke beslutninger. Alltid 0 i denne løsningen. */
  automatedDecisions: 0
}

const statusIn = (e: AuditEvent): string | null => /status: (\w+)/.exec(e.detail)?.[1] ?? null

export function classifyCase(c: Case): CaseClassification {
  const log = c.audit
  const base = { ref: c.ref, started: true, automated: false }
  const reg = log.findIndex(e => e.action === REGISTERED)
  if (reg < 0) return { ...base, started: false, reason: 'Mangler registreringshendelse i loggen' }

  // Første klargjøring som endte i «klar for faglig vurdering».
  const ready = log.findIndex((e, i) => i > reg && e.action === BASIS_READY && statusIn(e) === 'review_ready')
  const before = log.slice(reg + 1, ready < 0 ? log.length : ready)
  const manual = before.find(e => (MANUAL_ACTIONS as readonly string[]).includes(e.action))
  if (manual) return { ...base, reason: `Manuell innhenting: ${manual.action} (${manual.actor})` }
  const human = before.find(e => e.actor !== SYSTEM_ACTOR)
  if (human) return { ...base, reason: `Menneskelig handling før klargjøring: ${human.action} (${human.actor})` }

  if (ready < 0) {
    if (c.status === 'waiting_source' || before.some(e => e.action === SOURCE_OUTAGE))
      return { ...base, reason: 'Venter på kilde (kildeutfall)' }
    if (c.status === 'processing') return { ...base, reason: 'Automatisk behandling pågår' }
    const last = [...before].reverse().find(e => e.action === BASIS_READY)
    return { ...base, reason: `Stoppet for manuell avklaring (status: ${last ? statusIn(last) : c.status})` }
  }
  if (evaluateBlockers(c).length) return { ...base, reason: 'Åpen sperre etter klargjøring' }
  if (c.status !== 'review_ready' && c.status !== 'decided')
    return { ...base, reason: `Endte ikke klar for vurdering (status: ${c.status})` }
  return { ...base, automated: true, reason: 'Kun systemhendelser fra registrering til klart grunnlag' }
}

function tally(reasons: string[]) {
  const m = new Map<string, number>()
  for (const r of reasons) m.set(r, (m.get(r) ?? 0) + 1)
  return [...m].map(([reason, count]) => ({ reason, count }))
}

/** Grovkategori for frafall, slik at like årsaker grupperes. */
const category = (reason: string) => reason.split(':')[0].replace(/ \(.*$/, '')

export function automationRate(cases: Case[]): AutomationRate {
  const perCase = cases.map(classifyCase)
  const started = perCase.filter(p => p.started)
  const numerator = started.filter(p => p.automated).length
  const denominator = started.length
  const humanDecisions = cases.flatMap(c => c.audit)
    .filter(e => e.action.startsWith(DECISION_PREFIX) && e.actor !== SYSTEM_ACTOR).length
  return {
    numerator,
    denominator,
    rate: denominator ? numerator / denominator : 0,
    shareOfAll: cases.length ? numerator / cases.length : 0,
    totalCases: cases.length,
    excluded: tally(started.filter(p => !p.automated).map(p => category(p.reason))),
    omitted: tally(perCase.filter(p => !p.started).map(p => p.reason)),
    perCase,
    humanDecisions,
    automatedDecisions: 0,
  }
}

// ---------- Ledelsesrapport (UX-05) ----------

export type RiskBand = RiskAssessment['band'] | 'ikke_vurdert'

export interface ManagementReport {
  backlog: Record<CaseStatus, number>
  openBacklog: number
  risk: Record<RiskBand, number>
  sourceOutages: number
  waitingOnSource: number
  sourceRecoveries: number
  openHits: number
  measures: number
  manualActions: number
}

export function managementReport(cases: Case[]): ManagementReport {
  const backlog: Record<CaseStatus, number> = {
    processing: 0, waiting_source: 0, customer_action: 0, needs_review: 0, review_ready: 0, decided: 0,
  }
  const risk: Record<RiskBand, number> = { lav: 0, middels: 0, høy: 0, ikke_vurdert: 0 }
  for (const c of cases) {
    backlog[c.status]++
    risk[c.risk?.band ?? 'ikke_vurdert']++
  }
  const events = cases.flatMap(c => c.audit)
  return {
    backlog,
    openBacklog: cases.length - backlog.decided,
    risk,
    sourceOutages: events.filter(e => e.action === SOURCE_OUTAGE).length,
    waitingOnSource: backlog.waiting_source,
    sourceRecoveries: events.filter(e => e.action === 'Kilde gjenopprettet').length,
    openHits: cases.flatMap(c => c.screening).filter(h => h.status === 'open').length,
    measures: cases.reduce((n, c) => n + (c.risk?.mandatoryMeasures.length ?? 0), 0),
    manualActions: events.filter(e => e.actor !== SYSTEM_ACTOR && e.action !== REGISTERED).length,
  }
}

// ---------- Kommersiell visning (UX-05) ----------

export interface CommercialView { controlsUsed: number; period: string }

/** Kommersiell administrator ser bare antall forbrukte kontroller – ikke kunder, treff eller status. */
export function commercialView(cases: Case[], at: Date = new Date()): CommercialView {
  const period = at.toISOString().slice(0, 7)
  return {
    controlsUsed: cases.filter(c => c.audit.some(e => e.action === REGISTERED && e.at.startsWith(period))).length,
    period,
  }
}
