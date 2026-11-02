import type {
  Retention, Country,
  Blocker, Case, CaseStatus, DecisionOutcome, OwnershipEdge, Party, RiskAssessment, RiskFactor,
} from './types'

export const POLICY = 'NO-legal 1.0 (demo)'
/** Terskel for reell rettighetshaver i aktiv landspakke (demo). */
export const UBO_THRESHOLD = 0.25

// ---------- Eierskap (UBO-02, UBO-03, UBO-04) ----------

export interface OwnerPath { chain: string[]; share: number | null }
export interface PersonShare { partyId: string; total: number | null; paths: OwnerPath[] }
export interface Unresolved { partyId: string; reason: 'manglende_ledd' | 'sirkel'; detail: string }
export interface OwnershipAnalysis { persons: PersonShare[]; unresolved: Unresolved[] }

/**
 * Går eierkjeden oppover fra subjektet og multipliserer andeler per sti.
 * Samme person gjennom flere stier samles til én rad med alle stier bevart.
 * Sirkler og organisasjoner uten kjente eiere blir «uavklart», aldri «ingen eier».
 */
export function analyseOwnership(subjectId: string, parties: Party[], edges: OwnershipEdge[]): OwnershipAnalysis {
  const byId = new Map(parties.map(p => [p.id, p]))
  const persons = new Map<string, PersonShare>()
  const unresolved = new Map<string, Unresolved>()

  const walk = (id: string, chain: string[], share: number | null) => {
    const owners = edges.filter(e => e.to === id)
    if (owners.length === 0) {
      const p = byId.get(id)
      if (p?.type === 'person') {
        const row = persons.get(id) ?? { partyId: id, total: 0, paths: [] }
        row.paths.push({ chain, share })
        row.total = row.total === null || share === null ? null : row.total + share
        persons.set(id, row)
      } else {
        unresolved.set(id, { partyId: id, reason: 'manglende_ledd', detail: `Ingen kjente eiere for ${p?.name ?? id}` })
      }
      return
    }
    for (const e of owners) {
      if (chain.includes(e.from)) {
        unresolved.set(e.from, {
          partyId: e.from,
          reason: 'sirkel',
          detail: [...chain, e.from].map(x => byId.get(x)?.name ?? x).join(' → '),
        })
        continue
      }
      const next = share === null || e.share === null ? null : round(share * e.share)
      walk(e.from, [...chain, e.from], next)
    }
  }
  walk(subjectId, [subjectId], 1)
  return { persons: [...persons.values()], unresolved: [...unresolved.values()] }
}

export function beneficialOwners(a: OwnershipAnalysis): PersonShare[] {
  return a.persons.filter(p => p.total === null || p.total > UBO_THRESHOLD)
}

const round = (n: number) => Math.round(n * 1e6) / 1e6
export const pct = (n: number | null) => (n === null ? 'ukjent' : `${Math.round(n * 1000) / 10} %`)

// ---------- Sperrer før poengsum (RSK-02) ----------

export function evaluateBlockers(c: Case): Blocker[] {
  const out: Blocker[] = []
  if (c.status === 'waiting_source' || c.checks.some(k => k.state === 'waiting'))
    out.push({ code: 'kilde_utilgjengelig', label: 'Påkrevd kilde mangler', detail: 'Registerkilden ga ikke gyldig svar. Saken er ikke ferdig kontrollert.' })
  for (const h of c.screening.filter(h => h.list === 'Sanksjon' && h.status !== 'false_positive'))
    out.push({ code: 'sanksjonstreff', label: 'Potensielt sanksjonstreff', detail: `${h.candidate} (${h.listVersion}) – hastekanal` })
  for (const h of c.screening.filter(h => h.list === 'PEP' && h.status === 'open'))
    out.push({ code: 'uavklart_treff', label: 'Uavklart PEP-treff', detail: `${h.candidate} må avklares faglig` })
  if (c.parties.length) {
    const a = analyseOwnership(c.subjectId, c.parties, c.edges)
    for (const u of a.unresolved)
      out.push({ code: 'uavklart_eierskap', label: 'Uavklart eierskap', detail: u.detail })
  }
  return out
}

// ---------- Forklarbar risikoprofil (RSK-01) ----------

export const RISK_THRESHOLDS = { middels: 30, høy: 60 }

export function assessRisk(c: Case, version = 1, at = new Date().toISOString()): RiskAssessment {
  const foreign = c.parties.some(p => p.type === 'organisation' && p.country !== c.scope.country)
  const pep = c.screening.some(h => h.list === 'PEP' && h.status === 'confirmed')
  const factors: RiskFactor[] = [
    { key: 'kunde', label: 'Kunde', value: foreign ? 'Selskap med utenlandsk eierledd' : 'Norsk selskap, kjent eierstruktur', contribution: foreign ? 15 : 5, source: 'Eiergraf' },
    { key: 'produkt', label: 'Produkt / tjeneste', value: serviceLabel(c.scope.service), contribution: c.scope.service === 'company-transfer' ? 20 : 10, source: 'Oppdragsavgrensning' },
    { key: 'kanal', label: 'Kanal', value: 'Digital, eID-verifisert representant', contribution: 5, source: 'Demo-eID v1' },
    { key: 'land', label: 'Land', value: foreign ? `${c.scope.country} + utenlandsk ledd` : c.scope.country, contribution: foreign ? 10 : 0, source: 'Landpakke' },
    { key: 'forventet_bruk', label: 'Forventet bruk', value: pep ? 'PEP involvert' : 'Engangsoppdrag', contribution: pep ? 25 : 5, source: 'Kundens svar' },
  ]
  const score = factors.reduce((s, f) => s + f.contribution, 0)
  const band = score >= RISK_THRESHOLDS.høy ? 'høy' : score >= RISK_THRESHOLDS.middels ? 'middels' : 'lav'
  const mandatoryMeasures = pep ? ['Kilde til midler og formue', 'Godkjenning fra ledelse'] : []
  return { id: `risk-${c.id}-v${version}`, version, policy: POLICY, factors, score, band, thresholds: RISK_THRESHOLDS, mandatoryMeasures, computedAt: at }
}

export function recommend(risk: RiskAssessment | null, blockers: Blocker[]): DecisionOutcome {
  if (blockers.length || !risk) return 'be_om_mer'
  return risk.band === 'lav' ? 'etabler' : 'etabler_med_tiltak'
}

// ---------- Arbeidskø (UX-01) ----------

export function sortQueue(cases: Case[]): Case[] {
  const rank: Record<CaseStatus, number> = { needs_review: 0, waiting_source: 1, customer_action: 2, processing: 3, review_ready: 1, decided: 9 }
  return [...cases].sort((a, b) =>
    (a.urgency === 'haster' ? 0 : 1) - (b.urgency === 'haster' ? 0 : 1)
    || a.dueAt.localeCompare(b.dueAt)
    || rank[a.status] - rank[b.status])
}

/** Hvem må gjøre noe? Skiller systemfeil fra kundeforhold og faglig arbeid. */
export function queueKind(c: Case): 'system' | 'kunde' | 'fag' | 'ferdig' | 'maskin' {
  switch (c.status) {
    case 'waiting_source': return 'system'
    case 'customer_action': return 'kunde'
    case 'needs_review': case 'review_ready': return 'fag'
    case 'decided': return 'ferdig'
    default: return 'maskin'
  }
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  processing: 'Automatisk behandling pågår',
  waiting_source: 'Venter på kilde',
  customer_action: 'Venter på kunde',
  needs_review: 'Å avklare',
  review_ready: 'Klar for faglig vurdering',
  decided: 'Beslutning fattet',
}

export const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  etabler: 'Etabler kundeforhold',
  etabler_med_tiltak: 'Etabler med forsterkede tiltak',
  avslå: 'Avslå oppdraget',
  be_om_mer: 'Be om mer informasjon',
}

export const SECTOR_LABEL = { legal: 'Advokat', accounting: 'Regnskap', real_estate: 'Eiendomsmegling', payments: 'Betalingsforetak' } as const

export function serviceLabel(s: string) {
  return ({ 'company-transfer': 'Selskapsoverdragelse', 'estate': 'Dødsbo', 'advisory': 'Rådgivning' } as Record<string, string>)[s] ?? s
}

/** Nøytral partnerstatus (AML_partner_API.yaml › Check.status). Røper aldri sperrer eller score. */
export function publicStatus(s: CaseStatus): 'received' | 'processing' | 'customer_action_requested' | 'review_ready' | 'closed' {
  switch (s) {
    case 'customer_action': return 'customer_action_requested'
    case 'review_ready': return 'review_ready'
    case 'decided': return 'closed'
    default: return 'processing'
  }
}

export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ---------- Oppbevaring (PRV-03) og kontrollkalender (MON-01) ----------

const addYears = (iso: string, y: number) => { const d = new Date(iso); d.setFullYear(d.getFullYear() + y); return d.toISOString() }
const addMonths = (iso: string, m: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return d.toISOString() }

/** Frist etter land, tiltaksnivå og om et kundeforhold faktisk ble etablert (demo-regler fra §03). */
export function retentionFor(country: Country, outcome: DecisionOutcome, decidedAt: string): Retention {
  const enhanced = outcome === 'etabler_med_tiltak'
  const relationship = outcome === 'etabler' || enhanced
  if (country === 'NO') {
    const years = enhanced ? 10 : 5
    const basis = enhanced
      ? 'NO: 10 år når forsterkede kundetiltak gjaldt (hvitvaskingsloven § 30, forskriften § 6-4) – demo'
      : 'NO: 5 år etter avsluttet forhold eller gjennomført transaksjon (hvitvaskingsloven § 30) – demo'
    return relationship
      ? { years, from: 'Avsluttet kundeforhold', until: null, basis }
      : { years, from: decidedAt, until: addYears(decidedAt, years), basis: `${basis}; ingen etablering, fristen løper fra beslutning` }
  }
  const basis = country === 'SE' ? 'SE: normalt 5 år (lag 2017:630 kap. 5 §§ 3–4) – demo' : 'DK: 5 år fra opphør (hvidvaskloven § 30) – demo'
  return relationship ? { years: 5, from: 'Avsluttet kundeforhold', until: null, basis } : { years: 5, from: decidedAt, until: addYears(decidedAt, 5), basis }
}

export const REVIEW_MONTHS = { lav: 36, middels: 24, høy: 12 } as const

export function nextReview(outcome: DecisionOutcome, risk: RiskAssessment | null, decidedAt: string): string | null {
  if (outcome === 'avslå' || outcome === 'be_om_mer' || !risk) return null
  const band = outcome === 'etabler_med_tiltak' && risk.band === 'lav' ? 'middels' : risk.band
  return addMonths(decidedAt, REVIEW_MONTHS[band])
}

/** En passert dato gir «forfalt», aldri «fornyet» – fornyelse krever en ny kontroll. */
export function reviewState(nextReviewAt: string | null, now = new Date().toISOString()): 'ingen' | 'planlagt' | 'forfalt' {
  if (!nextReviewAt) return 'ingen'
  return nextReviewAt < now ? 'forfalt' : 'planlagt'
}
