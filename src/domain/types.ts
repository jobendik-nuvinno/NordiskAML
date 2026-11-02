// Logisk kjerne etter kravspesifikasjonen §09/§10. Alle ID-er er ugjennomsiktige; alle data er fiktive.

export type Role = 'saksbehandler' | 'godkjenner' | 'kunde' | 'partner'
export type Country = 'NO' | 'SE' | 'DK' | 'FI' | 'IS'
export type Sector = 'legal' | 'accounting' | 'real_estate' | 'payments'
export type PartyType = 'person' | 'organisation'

export interface Party {
  id: string
  type: PartyType
  name: string
  idRef: string // org.nr eller fødselsår – aldri personnummer
  country: string
  source: string
}

/** Eierforbindelse: `from` eier/kontrollerer `to`. Ukjent andel lagres som null. */
export interface OwnershipEdge {
  id: string
  from: string
  to: string
  share: number | null
  controlType: 'eierskap' | 'stemmer' | 'avtale'
  source: string
  validFrom: string
}

export interface RegistryEntry {
  orgNr: string
  legalName: string
  form: string
  status: string
  roles: { role: string; name: string }[]
  source: string
  fetchedAt: string
}

export interface Scope {
  country: Country
  sector: Sector
  service: string
  covered: 'ja' | 'nei' | 'uklart'
  basis: string
  responsible: string
}

export type Stage = 'avgrense' | 'innhente' | 'kontrollere' | 'klargjore'

/** Intern saksstatus. Partnere ser bare den nøytrale projeksjonen (se publicStatus). */
export type CaseStatus =
  | 'processing'
  | 'waiting_source'
  | 'customer_action'
  | 'needs_review'
  | 'review_ready'
  | 'decided'

export type CheckState = 'ok' | 'open' | 'waiting' | 'pending'

export interface CheckItem {
  key: 'identitet' | 'formal' | 'register' | 'eierskap' | 'screening' | 'risiko'
  label: string
  state: CheckState
  detail: string
  source: string
  at: string | null
}

export interface DocRequest {
  id: string
  title: string
  /** Nøytral tekst som vises kunden – aldri grunn til undersøkelse eller intern status. */
  customerText: string
  partyId: string
  status: 'open' | 'delivered'
  draft: string
  createdAt: string
  deliveredAt: string | null
  evidenceId: string | null
}

export interface Evidence {
  id: string
  kind: 'register' | 'dokument' | 'beslutningsgrunnlag'
  title: string
  sha256: string
  collectedAt: string
  source: string
  version: number
}

export interface RiskFactor {
  key: 'kunde' | 'produkt' | 'kanal' | 'land' | 'forventet_bruk'
  label: string
  value: string
  contribution: number
  source: string
}

export interface RiskAssessment {
  id: string
  version: number
  policy: string
  factors: RiskFactor[]
  score: number
  band: 'lav' | 'middels' | 'høy'
  thresholds: { middels: number; høy: number }
  mandatoryMeasures: string[]
  computedAt: string
}

export interface Blocker {
  code: 'kilde_utilgjengelig' | 'uavklart_eierskap' | 'sanksjonstreff' | 'uavklart_treff'
  label: string
  detail: string
}

export interface ScreeningHit {
  id: string
  partyId: string
  list: 'PEP' | 'Sanksjon'
  listVersion: string
  candidate: string
  fields: { field: string; subject: string; candidate: string; match: 'samsvar' | 'avvik' | 'mangler' }[]
  method: string
  status: 'open' | 'false_positive' | 'confirmed'
  resolution: { reason: string; validUntil: string; by: string; at: string } | null
}

export type DecisionOutcome = 'etabler' | 'etabler_med_tiltak' | 'avslå' | 'be_om_mer'

export interface DecisionSnapshot {
  caseRef: string
  scope: Scope
  registry: RegistryEntry | null
  parties: Party[]
  edges: OwnershipEdge[]
  checks: CheckItem[]
  risk: RiskAssessment | null
  evidence: Evidence[]
  screening: ScreeningHit[]
  recommendation: DecisionOutcome
  capturedAt: string
}

export interface Decision {
  id: string
  outcome: DecisionOutcome
  recommendation: DecisionOutcome
  deviates: boolean
  reason: string
  actor: string
  at: string
  snapshot: DecisionSnapshot
  sha256: string
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
  detail: string
  correlationId: string
  decisionId?: string
}

export interface Case {
  id: string
  ref: string
  tenantId: string
  orgNr: string
  name: string
  subjectId: string
  scope: Scope
  status: CaseStatus
  stage: Stage
  urgency: 'haster' | 'normal'
  owner: string | null
  createdAt: string
  dueAt: string
  registry: RegistryEntry | null
  parties: Party[]
  edges: OwnershipEdge[]
  checks: CheckItem[]
  docRequests: DocRequest[]
  evidence: Evidence[]
  screening: ScreeningHit[]
  risk: RiskAssessment | null
  decisions: Decision[]
  audit: AuditEvent[]
}
