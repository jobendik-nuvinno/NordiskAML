// Simulert backend i nettleseren (D-001). Async-kall med forsinkelse, rollesjekk på «serversiden» (D-004),
// revisjonslogg med korrelasjons-ID, feilbrytere og lagring i localStorage.

import {
  activeDecision, analyseOwnership, assessRisk, nextReview, retentionFor, beneficialOwners, evaluateBlockers, OUTCOME_LABEL, pct, recommend, sha256,
} from '../domain/rules'
import type {
  AuditEvent, Case, CaseStatus, CheckItem, Country, DecisionOutcome, DecisionSnapshot, Role, Sector, Stage,
} from '../domain/types'
import { DOCUMENTED_OWNERS, ENABLED_COUNTRIES, HISTORY_CASES, REGISTRY, SCREENING, SEED_CASES, SERVICES } from './seed'

export const ACTOR: Record<Role, string> = {
  saksbehandler: 'Nora Berg',
  godkjenner: 'Jonas Eide',
  hvitvaskingsansvarlig: 'Marius A. Viken',
  admin: 'Erik Dahl',
  kunde: 'Kunde via portal',
  partner: 'Partnerintegrasjon',
}
const SYSTEM = 'System'

/** Stillingsbetegnelse per rolle (aktørnavnene over er fiktive personer i testmiljøet). */
export const ROLE_TITLE: Record<Role, string> = {
  saksbehandler: 'Saksbehandler',
  godkjenner: 'Faglig godkjenner',
  hvitvaskingsansvarlig: 'Hvitvaskingsansvarlig',
  admin: 'Bedriftsadministrator',
  kunde: 'Kunde',
  partner: 'Teknisk partner',
}

export class ApiError extends Error {
  constructor(public status: number, public title: string) { super(title) }
}

type Perm = 'case.read' | 'case.create' | 'case.update' | 'doc.request' | 'portal.submit' | 'decision.make' | 'decision.reopen' | 'hit.resolve'
const PERMS: Record<Perm, Role[]> = {
  'case.read': ['saksbehandler', 'godkjenner', 'hvitvaskingsansvarlig'],
  'case.create': ['saksbehandler', 'partner'],
  'case.update': ['saksbehandler', 'godkjenner', 'hvitvaskingsansvarlig'],
  'doc.request': ['saksbehandler', 'godkjenner'],
  'portal.submit': ['kunde'],
  'decision.make': ['godkjenner'],
  'decision.reopen': ['godkjenner', 'hvitvaskingsansvarlig'],
  'hit.resolve': ['saksbehandler', 'godkjenner'],
}

// ---------- Lager ----------

interface State {
  version: number
  seq: number
  cases: Case[]
  faults: { registryDown: boolean }
}

const KEY = 'nordisk-aml-v3'
const storage: Storage | null = (() => { try { return globalThis.localStorage ?? null } catch { return null } })()
const emptyState = (): State => ({ version: 0, seq: 1000, cases: [], faults: { registryDown: false } })

let state: State = load() ?? emptyState()
const listeners = new Set<() => void>()
const pipelines = new Map<string, Promise<void>>()

function load(): State | null {
  try { const raw = storage?.getItem(KEY); return raw ? JSON.parse(raw) as State : null } catch { return null }
}
function commit() {
  state.version++
  try { storage?.setItem(KEY, JSON.stringify(state)) } catch { /* privat modus o.l. */ }
  listeners.forEach(fn => fn())
}

export const store = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
  getVersion: () => state.version,
  get state(): Readonly<State> { return state },
}

// ---------- Tid og forsinkelse ----------

let latency: [number, number] = [300, 800]
let stageMs = 900
/** Kun for tester: slå av forsinkelse. */
export function setTiming(lat: [number, number], stage: number) { latency = lat; stageMs = stage }
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
/** Klokkeforskyvning brukes bare når testdata med historikk bygges (seed). */
let clockOffset = 0
/** Mens testdata bygges, kjøres kall og trinn uten simulert forsinkelse. */
let seeding = false
const now = () => new Date(Date.now() + clockOffset).toISOString()
const uuid = () => crypto.randomUUID()

/** Simulert nettverksforsinkelse, delt med den skjermede tjenesten. */
export const networkDelay = () => sleep(latency[0] + Math.random() * (latency[1] - latency[0]))

async function call<T>(role: Role, perm: Perm, fn: () => T | Promise<T>): Promise<T> {
  if (!seeding) await sleep(latency[0] + Math.random() * (latency[1] - latency[0]))
  if (!PERMS[perm].includes(role)) throw new ApiError(403, `Rollen «${ACTOR[role]}» har ikke tilgang til ${perm}.`)
  const result = await fn()
  commit()
  return result
}

function audit(c: Case, actor: string, action: string, detail = '', decisionId?: string): AuditEvent {
  const e: AuditEvent = { id: uuid(), at: now(), actor, action, detail, correlationId: uuid(), decisionId }
  c.audit.push(e)
  return e
}

export function getCase(id: string): Case {
  const c = state.cases.find(x => x.id === id)
  if (!c) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
  return c
}

function setCheck(c: Case, key: CheckItem['key'], patch: Partial<CheckItem>) {
  const k = c.checks.find(x => x.key === key)!
  Object.assign(k, { at: now() }, patch)
}

// ---------- Automatiske trinn (§04: Avgrense → Innhente → Kontrollere → Klargjøre) ----------

export const STAGES: Stage[] = ['avgrense', 'innhente', 'kontrollere', 'klargjore']
export const STAGE_LABEL: Record<Stage, string> = {
  avgrense: 'Avgrense', innhente: 'Innhente', kontrollere: 'Kontrollere', klargjore: 'Klargjøre',
}

type StageResult = 'continue' | 'stop'

async function runStage(c: Case): Promise<StageResult> {
  switch (c.stage) {
    case 'avgrense': {
      const known = (SERVICES as readonly string[]).includes(c.scope.service)
      const covered = c.scope.service === 'advisory' ? 'uklart' : known ? 'ja' : 'nei'
      c.scope.covered = covered
      c.scope.basis = covered === 'uklart'
        ? 'Uklart om rådgivningen er omfattet – sendt til fagansvarlig'
        : `Hvitvaskingsloven § 4 · ${c.scope.country}-pakke`
      c.scope.responsible = covered === 'uklart' ? 'Fagansvarlig AML' : (c.owner ?? 'Nora Berg')
      setCheck(c, 'formal', { state: covered === 'ja' ? 'ok' : 'open', detail: c.scope.basis, source: 'Oppdragsavgrensning' })
      audit(c, SYSTEM, 'Oppdrag avgrenset', `Omfattet: ${covered}`)
      return 'continue'
    }
    case 'innhente': {
      if (state.faults.registryDown) {
        c.status = 'waiting_source'
        setCheck(c, 'register', { state: 'waiting', detail: 'Registerkilden svarte HTTP 503. Venter – nytt forsøk ved gjenoppretting.', source: 'Foretaksregister' })
        audit(c, SYSTEM, 'Kildeutfall', 'Register svarte 503 – saken står i ventestatus')
        return 'stop'
      }
      const rec = REGISTRY[c.orgNr]
      if (!rec) {
        c.status = 'needs_review'
        setCheck(c, 'register', { state: 'open', detail: 'Ikke funnet i foretaksregisteret', source: 'Foretaksregister' })
        audit(c, SYSTEM, 'Registeroppslag uten treff', c.orgNr)
        return 'stop'
      }
      const fetchedAt = now()
      c.registry = { ...structuredClone(rec.entry), fetchedAt }
      c.name = rec.entry.legalName
      c.subjectId = rec.subjectId
      c.parties = structuredClone(rec.parties)
      c.edges = structuredClone(rec.edges)
      c.status = 'processing'
      setCheck(c, 'register', { state: 'ok', detail: `${rec.entry.legalName} · ${rec.entry.form} · ${rec.entry.status}`, source: rec.entry.source })
      setCheck(c, 'identitet', { state: 'ok', detail: `Representant (${rec.entry.roles[0]?.name}) verifisert, nivå høyt · fullmakt: ${rec.entry.roles[0]?.role}`, source: 'eID-leverandør (test)' })
      c.evidence.push({
        id: uuid(), kind: 'register', title: `Registerutskrift ${rec.entry.legalName}`,
        sha256: await sha256(JSON.stringify(c.registry)), collectedAt: fetchedAt, source: rec.entry.source, version: 1,
      })
      audit(c, SYSTEM, 'Registerdata innhentet', `${rec.entry.source} · ${c.parties.length} parter`)
      return 'continue'
    }
    case 'kontrollere': {
      controlOwnership(c)
      if (c.screening.length === 0) c.screening = structuredClone(SCREENING[c.orgNr] ?? [])
      if (c.screening.some(h => h.list === 'Sanksjon' && h.status === 'open') && c.urgency !== 'haster') {
        c.urgency = 'haster'
        c.dueAt = now()
        audit(c, SYSTEM, 'Hasteoppgave opprettet', 'Potensielt sanksjonstreff – egen hastekanal, klarsignal sperret')
      }
      controlScreening(c)
      audit(c, SYSTEM, 'Kontroller kjørt', 'Eierskap og screening')
      return 'continue'
    }
    case 'klargjore': {
      prepare(c)
      return 'stop'
    }
  }
}

function controlOwnership(c: Case) {
  const a = analyseOwnership(c.subjectId, c.parties, c.edges)
  const ubo = beneficialOwners(a)
  const name = (id: string) => c.parties.find(p => p.id === id)?.name ?? id
  setCheck(c, 'eierskap', a.unresolved.length
    ? { state: 'open', detail: `Uavklart: ${a.unresolved.map(u => name(u.partyId)).join(', ')}`, source: 'Eiergraf' }
    : { state: 'ok', detail: `Reelle rettighetshavere: ${ubo.map(p => `${name(p.partyId)} (${pct(p.total)})`).join(', ') || 'ingen over terskel'}`, source: 'Eiergraf' })
}

function controlScreening(c: Case) {
  const open = c.screening.filter(h => h.status === 'open' || (h.list === 'Sanksjon' && h.status === 'confirmed'))
  const confirmed = c.screening.filter(h => h.status === 'confirmed')
  setCheck(c, 'screening', open.length
    ? { state: 'open', detail: `${open.length} treff til vurdering`, source: 'Screeninglister 2026-11-01' }
    : { state: 'ok', detail: c.screening.length ? `${c.screening.length} treff avklart${confirmed.length ? ` (${confirmed.length} bekreftet)` : ''}` : 'Ingen treff i PEP- og sanksjonslister', source: 'Screeninglister 2026-11-01' })
}

function prepare(c: Case) {
  const version = (c.risk?.version ?? 0) + 1
  c.risk = assessRisk(c, version, now())
  setCheck(c, 'risiko', { state: 'ok', detail: `Score ${c.risk.score} (${c.risk.band}) · ${c.risk.policy}`, source: c.risk.policy })
  c.status = settledStatus(c)
  audit(c, SYSTEM, 'Beslutningsgrunnlag klargjort', `Risiko v${version}: ${c.risk.score} · status: ${c.status}`)
}

function settledStatus(c: Case): CaseStatus {
  if (activeDecision(c)) return 'decided'
  if (c.checks.some(k => k.state === 'waiting')) return 'waiting_source'
  if (c.docRequests.some(r => r.status === 'open')) return 'customer_action'
  return evaluateBlockers(c).length || c.scope.covered !== 'ja' ? 'needs_review' : 'review_ready'
}

function startPipeline(c: Case, instant = false) {
  const run = (async () => {
    for (;;) {
      if (!instant && !seeding) await sleep(stageMs)
      const live = state.cases.find(x => x.id === c.id)
      if (live !== c) return // demoen er tilbakestilt
      const res = await runStage(c)
      if (!instant) commit()
      if (res === 'stop') return
      c.stage = STAGES[STAGES.indexOf(c.stage) + 1]
    }
  })()
  pipelines.set(c.id, run)
  return run
}

/** Kun for tester: vent til automatiske trinn for saken er ferdige. */
export const settled = (id: string) => pipelines.get(id) ?? Promise.resolve()

// ---------- Kommandoer ----------

export interface NewCheckInput {
  orgNr: string
  country: Country
  sector: Sector
  service: string
  externalReference?: string
}

function newCase(input: NewCheckInput, owner: string | null): Case {
  const id = uuid()
  const at = now()
  const due = new Date(Date.parse(now()) + 3 * 864e5).toISOString()
  const pending = (key: CheckItem['key'], label: string): CheckItem => ({ key, label, state: 'pending', detail: 'Ikke kjørt', source: '', at: null })
  return {
    id, ref: `SAK-${++state.seq}`, tenantId: 'tenant-demo-advokat', orgNr: input.orgNr.replace(/\D/g, ''),
    name: `Org.nr ${input.orgNr}`, subjectId: '',
    scope: { country: input.country, sector: input.sector, service: input.service, covered: 'uklart', basis: '', responsible: '' },
    status: 'processing', stage: 'avgrense', urgency: 'normal', owner, createdAt: at, dueAt: due,
    registry: null, parties: [], edges: [],
    checks: [
      pending('identitet', 'Identitet og fullmakt'),
      pending('formal', 'Formål og omfang'),
      pending('register', 'Registeroppslag'),
      pending('eierskap', 'Eierskap og kontroll'),
      pending('screening', 'PEP og sanksjoner'),
      pending('risiko', 'Risikovurdering'),
    ],
    docRequests: [], evidence: [], screening: [], risk: null, decisions: [], audit: [],
  }
}

export function createCheck(role: Role, input: NewCheckInput): Promise<Case> {
  return call(role, 'case.create', () => {
    if (!ENABLED_COUNTRIES.includes(input.country))
      throw new ApiError(422, `Landpakken ${input.country} er ikke godkjent for produksjon.`)
    if (input.sector !== 'legal')
      throw new ApiError(422, 'Sektorpakken er ikke aktivert for denne virksomheten.')
    if (!/^\d{8,10}$/.test(input.orgNr.replace(/\D/g, '')))
      throw new ApiError(422, 'Organisasjonsnummer må ha 8–10 siffer.')
    const c = newCase(input, role === 'saksbehandler' ? ACTOR[role] : null)
    state.cases.push(c)
    audit(c, ACTOR[role], 'Oppdrag registrert', input.externalReference ? `Ekstern ref. ${input.externalReference}` : '')
    startPipeline(c)
    return c
  })
}

export function assignToMe(role: Role, caseId: string) {
  return call(role, 'case.update', () => {
    const c = getCase(caseId)
    c.owner = ACTOR[role]
    audit(c, ACTOR[role], 'Oppgave tildelt', ACTOR[role])
  })
}

/** Gjenopptar fra siste bekreftede posisjon – oppretter ingen ny kontroll (MON-03). */
export function retrySource(role: Role, caseId: string) {
  return call(role, 'case.update', () => {
    const c = getCase(caseId)
    if (c.status !== 'waiting_source') return
    if (state.faults.registryDown) throw new ApiError(503, 'Kilden er fortsatt utilgjengelig.')
    c.status = 'processing'
    audit(c, ACTOR[role], 'Nytt forsøk mot kilde')
    startPipeline(c)
  })
}

export function setRegistryDown(down: boolean) {
  state.faults.registryDown = down
  if (!down) for (const c of state.cases.filter(x => x.status === 'waiting_source')) {
    c.status = 'processing'
    audit(c, SYSTEM, 'Kilde gjenopprettet', 'Gjenopptar fra siste bekreftede posisjon')
    startPipeline(c)
  }
  commit()
}

export function requestDocument(role: Role, caseId: string, partyId: string) {
  return call(role, 'doc.request', () => {
    const c = getCase(caseId)
    const party = c.parties.find(p => p.id === partyId)
    if (!party) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
    if (c.docRequests.some(r => r.partyId === partyId && r.status === 'open')) return
    c.docRequests.push({
      id: uuid(), partyId, status: 'open', draft: '', createdAt: now(), deliveredAt: null, evidenceId: null,
      title: `Eierdokumentasjon for ${party.name}`,
      customerText: `Vi trenger oppdatert dokumentasjon på hvem som eier og kontrollerer ${party.name}, for eksempel aksjeeierbok eller tilsvarende utskrift.`,
    })
    c.status = 'customer_action'
    audit(c, ACTOR[role], 'Vedlegg etterspurt fra kunde', party.name)
  })
}

// ---------- Kundeportal: egen, nøytral projeksjon (KYC-06) ----------

export interface PortalTask { caseId: string; requestId: string; company: string; title: string; text: string; draft: string; done: boolean }

/** Kunden ser bare forespørselen – aldri score, sperrer, treff eller intern status. */
export function portalTasks(): PortalTask[] {
  return state.cases.flatMap(c => c.docRequests.map(r => ({
    caseId: c.id, requestId: r.id, company: c.name, title: r.title, text: r.customerText, draft: r.draft, done: r.status === 'delivered',
  })))
}

export function saveDraft(role: Role, caseId: string, requestId: string, draft: string) {
  return call(role, 'portal.submit', () => {
    const r = getCase(caseId).docRequests.find(x => x.id === requestId)
    if (r && r.status === 'open') r.draft = draft
  })
}

export function submitDocument(role: Role, caseId: string, requestId: string, file: { name: string; bytes: ArrayBuffer } | null) {
  return call(role, 'portal.submit', async () => {
    const c = getCase(caseId)
    const r = c.docRequests.find(x => x.id === requestId)
    if (!r || r.status !== 'open') throw new ApiError(409, 'Forespørselen er allerede besvart.')
    const name = file?.name ?? 'aksjeeierbok-eksempel.pdf'
    const at = now()
    const ev = {
      id: uuid(), kind: 'dokument' as const, title: `${name} (kundeleveranse)`, collectedAt: at, source: 'Kundeportal', version: 1,
      sha256: await sha256(file?.bytes ?? `eksempeldokument:${r.id}:${r.draft}`),
    }
    c.evidence.push(ev)
    Object.assign(r, { status: 'delivered', deliveredAt: at, evidenceId: ev.id })
    const doc = DOCUMENTED_OWNERS[r.partyId]
    if (doc) {
      for (const p of doc.parties) if (!c.parties.some(x => x.id === p.id)) c.parties.push(structuredClone(p))
      for (const e of doc.edges) if (!c.edges.some(x => x.id === e.id)) c.edges.push(structuredClone(e))
    }
    audit(c, ACTOR[role], 'Kunde leverte dokument', `${name} · sha256 ${ev.sha256.slice(0, 12)}…`)
    controlOwnership(c)
    audit(c, SYSTEM, 'Eierskap kontrollert på nytt', c.checks.find(k => k.key === 'eierskap')!.detail)
    prepare(c)
  })
}

// ---------- Screening: avklaring av treff (SCR-04, SCR-05) ----------

export function resolveHit(role: Role, caseId: string, hitId: string, verdict: 'false_positive' | 'confirmed', reason: string, validUntil: string) {
  return call(role, 'hit.resolve', () => {
    const c = getCase(caseId)
    const h = c.screening.find(x => x.id === hitId)
    if (!h) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
    if (reason.trim().length < 10) throw new ApiError(422, 'Begrunnelse er påkrevd (minst 10 tegn).')
    if (verdict === 'false_positive' && !validUntil) throw new ApiError(422, 'Falsk-treff-avklaring må være tidsavgrenset.')
    h.status = verdict
    h.resolution = { reason: reason.trim(), validUntil, by: ACTOR[role], at: now() }
    audit(c, ACTOR[role], verdict === 'false_positive' ? 'Treff avklart som falskt' : 'Treff bekreftet', `${h.list}: ${h.candidate} · gyldig til ${validUntil || '–'}`)
    controlScreening(c)
    prepare(c)
  })
}

/** Ny identitetsopplysning (f.eks. fødselsdato) åpner tidligere avklarte treff for parten igjen. */
export function addIdentityField(role: Role, caseId: string, partyId: string) {
  return call(role, 'case.update', () => {
    const c = getCase(caseId)
    const reopened = c.screening.filter(h => h.partyId === partyId && h.status === 'false_positive')
    for (const h of reopened) { h.status = 'open'; h.resolution = null }
    audit(c, ACTOR[role], 'Ny identitetsopplysning registrert', `Fødselsdato oppdatert · ${reopened.length} treff åpnet for revurdering`)
    controlScreening(c)
    prepare(c)
  })
}

// ---------- Beslutning (RSK-04) og låst grunnlag (PRV-02) ----------

export function decide(role: Role, caseId: string, outcome: DecisionOutcome, reason: string, answers: Record<string, string> = {}) {
  return call(role, 'decision.make', async () => {
    const c = getCase(caseId)
    const blockers = evaluateBlockers(c)
    if (blockers.length) throw new ApiError(409, `Åpne sperrer må lukkes før beslutning: ${blockers.map(b => b.label).join(', ')}.`)
    if (activeDecision(c)) throw new ApiError(409, 'Saken er allerede besluttet. Overprøving krever nytt grunnlag.')
    if (reason.trim().length < 10) throw new ApiError(422, 'Begrunnelse er påkrevd (minst 10 tegn).')
    const establishing = outcome === 'etabler' || outcome === 'etabler_med_tiltak'
    const required = establishing ? (c.risk?.mandatoryMeasures ?? []) : []
    const missing = required.filter(m => (answers[m] ?? '').trim().length < 5)
    if (missing.length) throw new ApiError(422, `Obligatoriske tiltak må besvares enkeltvis: ${missing.join(', ')}.`)
    const recommendation = recommend(c.risk, blockers)
    const snapshot: DecisionSnapshot = structuredClone({
      caseRef: c.ref, scope: c.scope, registry: c.registry, parties: c.parties, edges: c.edges, checks: c.checks,
      risk: c.risk, evidence: c.evidence, screening: c.screening, recommendation, capturedAt: now(),
    })
    const hash = await sha256(JSON.stringify(snapshot))
    const id = uuid()
    c.decisions.push({
      id, outcome, recommendation, deviates: outcome !== recommendation, reason: reason.trim(),
      actor: ACTOR[role], at: snapshot.capturedAt, snapshot, sha256: hash,
      measures: required.map(m => ({ measure: m, answer: answers[m].trim() })),
      retention: retentionFor(c.scope.country, outcome, snapshot.capturedAt),
      nextReviewAt: nextReview(outcome, c.risk, snapshot.capturedAt),
      version: c.decisions.length + 1,
    })
    c.evidence.push({ id: uuid(), kind: 'beslutningsgrunnlag', title: `Beslutningsgrunnlag ${c.ref}`, sha256: hash, collectedAt: snapshot.capturedAt, source: 'Plattform', version: c.decisions.length })
    c.status = 'decided'
    audit(c, ACTOR[role], `Beslutning fattet (versjon ${c.decisions.length}): ${OUTCOME_LABEL[outcome]}`, outcome !== recommendation ? `Avviker fra anbefaling (${OUTCOME_LABEL[recommendation]})` : 'I tråd med anbefaling', id)
  })
}

/**
 * Overprøving og retting (RSK-04, RSK-06): den aktive beslutningen markeres som overprøvd,
 * men grunnlag og hash røres ikke. Saken får nytt beslutningsgrunnlag og må besluttes på nytt.
 */
export function reopenDecision(role: Role, caseId: string, reason: string) {
  return call(role, 'decision.reopen', () => {
    const c = getCase(caseId)
    const d = activeDecision(c)
    if (!d) throw new ApiError(409, 'Saken har ingen aktiv beslutning å overprøve.')
    if (reason.trim().length < 10) throw new ApiError(422, 'Overprøving krever begrunnelse (minst 10 tegn).')
    d.supersededAt = now()
    d.supersededReason = reason.trim()
    d.supersededBy = ACTOR[role]
    audit(c, ACTOR[role], `Beslutning overprøvd (versjon ${d.version})`, reason.trim(), d.id)
    prepare(c)
  })
}

/** Demo: en senere registerendring skal ikke endre det låste beslutningsgrunnlaget. */
export function registerLaterChange(role: Role, caseId: string) {
  return call(role, 'case.update', () => {
    const c = getCase(caseId)
    if (!c.registry) return
    c.registry.roles = [...c.registry.roles.filter(r => r.role !== 'Styreleder'), { role: 'Styreleder', name: 'Nora Eksempel' }]
    c.registry.fetchedAt = now()
    audit(c, SYSTEM, 'Registerendring mottatt', 'Ny styreleder: Nora Eksempel')
  })
}

// ---------- Oppstart og tilbakestilling ----------

async function seed() {
  for (const s of SEED_CASES) {
    clockOffset = -s.createdHoursAgo * 36e5
    const c = newCase(s, s.owner)
    c.urgency = s.urgency
    c.dueAt = new Date(Date.now() + s.dueInDays * 864e5).toISOString()
    state.cases.push(c)
    audit(c, s.owner ?? SYSTEM, 'Oppdrag registrert')
    state.faults.registryDown = !!s.registryDown
    await startPipeline(c, true)
    state.faults.registryDown = false
    clockOffset = 0
  }
  // Saker med historikk: kjøres gjennom de vanlige kommandoene, med klokken satt tilbake.
  seeding = true
  try {
    for (const h of HISTORY_CASES) {
      clockOffset = -h.daysAgo * 864e5
      const c = await createCheck('saksbehandler', h)
      await settled(c.id)
      if (h.requestDocumentFor) await requestDocument('saksbehandler', c.id, h.requestDocumentFor)
      if (h.decide) await decide('godkjenner', c.id, recommend(c.risk, evaluateBlockers(c)), h.decide)
    }
  } finally {
    clockOffset = 0
    seeding = false
  }
}

let resetting: Promise<void> = Promise.resolve()
export function resetDemo(): Promise<void> {
  resetting = resetting.then(async () => {
    state = { ...emptyState(), version: state.version }
    pipelines.clear()
    await seed()
    commit()
  })
  return resetting
}

export const ready: Promise<void> = (async () => {
  if (state.cases.length === 0) return resetDemo()
  for (const c of state.cases.filter(x => x.status === 'processing')) startPipeline(c)
})()
