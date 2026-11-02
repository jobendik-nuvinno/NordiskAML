// Simulert implementasjon av AML_partner_API.yaml (createCheck, getCheck, webhook checkStatusUpdated).
// Ingen ekte HTTP: funksjonene returnerer { status, headers, body } slik en server ville svart.

import { publicStatus } from '../domain/rules'
import type { Country, Sector } from '../domain/types'
import { ApiError, createCheck, getCase, store } from './fakeServer'

export type PublicStatus = ReturnType<typeof publicStatus>
export interface Check { id: string; externalReference: string; status: PublicStatus; updatedAt: string }
export interface Problem { type: string; title: string; status: number; correlationId: string }
export interface ApiResponse<T = unknown> { status: number; headers: Record<string, string>; body: T }
export interface PublicEvent {
  eventId: string; type: 'check.status_updated'; occurredAt: string; checkId: string; status: PublicStatus; revision: number
}

const COUNTRIES = ['NO', 'SE', 'DK', 'FI', 'IS'] as const
const ENABLED: string[] = ['NO', 'SE', 'DK']
const SECTORS = ['legal', 'accounting', 'real_estate', 'payments'] as const
const PARTY_TYPES = ['person', 'organisation'] as const
const NEW_CHECK_KEYS = ['externalReference', 'country', 'sector', 'partyType', 'subjectReference', 'serviceCode']

/** Virksomhetsinterne, ugjennomsiktige partsreferanser → org.nr (serverkartlegging). */
export const SUBJECT_MAP: Record<string, string> = {
  'pty-demo-18': '100200301', // Fjordlys Eksempel AS
  'pty-demo-21': '5560000101', // Sund Eksempel AB
}

const PROBLEM_TYPE: Record<number, string> = {
  400: '/problems/ugyldig-syntaks', 403: '/problems/mangler-tillatelse', 404: '/problems/ikke-funnet',
  409: '/problems/idempotens-konflikt', 422: '/problems/valideringsfeil', 503: '/problems/utilgjengelig',
}

function problem(status: number, title: string): ApiResponse<Problem> {
  return {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
    body: { type: PROBLEM_TYPE[status] ?? 'about:blank', title, status, correlationId: crypto.randomUUID() },
  }
}

// ---------- Partnerens egne kontroller (virksomhetsisolasjon) ----------

interface PartnerCheck { id: string; externalReference: string; lastStatus: PublicStatus; revision: number; updatedAt: string }
const checks = new Map<string, PartnerCheck>()
const idempotency = new Map<string, { bodyKey: string; response: Promise<ApiResponse> }>()

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(v)
}

function toCheck(pc: PartnerCheck): Check {
  return { id: pc.id, externalReference: pc.externalReference, status: pc.lastStatus, updatedAt: pc.updatedAt }
}

function validate(body: unknown): ApiResponse<Problem> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return problem(400, 'Requestbody må være et JSON-objekt.')
  const b = body as Record<string, unknown>
  const extra = Object.keys(b).filter(k => !NEW_CHECK_KEYS.includes(k))
  if (extra.length) return problem(400, `Ukjente felt er ikke tillatt: ${extra.join(', ')}.`)
  const missing = NEW_CHECK_KEYS.filter(k => b[k] === undefined)
  if (missing.length) return problem(400, `Påkrevde felt mangler: ${missing.join(', ')}.`)
  for (const [k, max] of [['externalReference', 100], ['subjectReference', 100], ['serviceCode', 60]] as const) {
    const v = b[k]
    if (typeof v !== 'string' || v.length < 1 || v.length > max) return problem(400, `${k} må være tekst på 1–${max} tegn.`)
  }
  if (!(COUNTRIES as readonly unknown[]).includes(b.country)) return problem(400, `country må være en av ${COUNTRIES.join(', ')}.`)
  if (!(SECTORS as readonly unknown[]).includes(b.sector)) return problem(400, `sector må være en av ${SECTORS.join(', ')}.`)
  if (!(PARTY_TYPES as readonly unknown[]).includes(b.partyType)) return problem(400, `partyType må være en av ${PARTY_TYPES.join(', ')}.`)
  if (!ENABLED.includes(b.country as string)) return problem(422, `Landpakken ${b.country} er ikke aktivert for virksomheten.`)
  if (b.sector !== 'legal') return problem(422, 'Sektorpakken er ikke aktivert for denne virksomheten.')
  if (!SUBJECT_MAP[b.subjectReference as string]) return problem(422, 'Ukjent subjectReference for virksomheten.')
  return null
}

/** POST /v1/checks */
export function postCheck(idempotencyKey: string, body: unknown): Promise<ApiResponse> {
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16 || idempotencyKey.length > 128)
    return Promise.resolve(problem(400, 'Idempotency-Key må være 16–128 tegn.'))
  const bodyKey = canonical(body)
  const prior = idempotency.get(idempotencyKey)
  if (prior) {
    if (prior.bodyKey !== bodyKey)
      return Promise.resolve(problem(409, 'Idempotency-Key er allerede brukt med et annet innhold.'))
    return prior.response
  }
  const response = execute(body)
  idempotency.set(idempotencyKey, { bodyKey, response })
  // Feil lagres ikke: en rettet request kan sendes på nytt med samme nøkkel.
  response.then(r => { if (r.status >= 400) idempotency.delete(idempotencyKey) })
  return response
}

async function execute(body: unknown): Promise<ApiResponse> {
  const invalid = validate(body)
  if (invalid) return invalid
  const b = body as Record<string, string>
  try {
    const c = await createCheck('partner', {
      orgNr: SUBJECT_MAP[b.subjectReference], country: b.country as Country, sector: b.sector as Sector,
      service: b.serviceCode, externalReference: b.externalReference,
    })
    const pc: PartnerCheck = { id: c.id, externalReference: b.externalReference, lastStatus: 'received', revision: 0, updatedAt: c.createdAt }
    checks.set(c.id, pc)
    ensureWebhooks()
    observe()
    return { status: 202, headers: { 'Content-Type': 'application/json', Location: `/v1/checks/${c.id}` }, body: toCheck(pc) }
  } catch (e) {
    if (e instanceof ApiError) return problem(e.status, e.title)
    return problem(503, 'Tjenesten er midlertidig utilgjengelig.')
  }
}

/** GET /v1/checks/{id} – bare egne kontroller, bare nøytral status. */
export async function getCheck(id: string): Promise<ApiResponse> {
  const pc = checks.get(id)
  if (!pc) return problem(404, 'Ressurs ikke tilgjengelig')
  try { getCase(id) } catch { return problem(404, 'Ressurs ikke tilgjengelig') }
  observe()
  return { status: 200, headers: { 'Content-Type': 'application/json' }, body: toCheck(pc) }
}

// ---------- Webhook (checkStatusUpdated) ----------

export const WEBHOOK_KEY_ID = 'demo-key-1'
const WEBHOOK_SECRET = 'demo-webhook-secret-ikke-for-produksjon'
const enc = new TextEncoder()
let hmacKey: Promise<CryptoKey> | null = null
const key = () => (hmacKey ??= crypto.subtle.importKey('raw', enc.encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']))
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('')

export async function sign(timestamp: string, rawBody: string): Promise<string> {
  return hex(await crypto.subtle.sign('HMAC', await key(), enc.encode(`${timestamp}.${rawBody}`)))
}

export interface Delivery { at: string; headers: Record<string, string>; status: number; result: string; verified: boolean }
export interface WebhookLogEntry { event: PublicEvent; rawBody: string; deliveries: Delivery[] }

const log: WebhookLogEntry[] = []
const logListeners = new Set<() => void>()
let chain: Promise<void> = Promise.resolve()
let unsubscribe: (() => void) | null = null

export const webhookLog = {
  get: (): readonly WebhookLogEntry[] => log,
  subscribe(fn: () => void) { logListeners.add(fn); return () => { logListeners.delete(fn) } },
}
/** Kun for tester/UI: vent til alle køede leveranser er ferdige. */
export const webhooksIdle = () => chain

function ensureWebhooks() { unsubscribe ??= store.subscribe(observe) }

function observe() {
  for (const pc of checks.values()) {
    let status: PublicStatus
    try { status = publicStatus(getCase(pc.id).status) } catch { continue }
    if (status === pc.lastStatus) continue
    pc.lastStatus = status
    pc.revision++
    pc.updatedAt = new Date().toISOString()
    const event: PublicEvent = {
      eventId: crypto.randomUUID(), type: 'check.status_updated', occurredAt: pc.updatedAt,
      checkId: pc.id, status, revision: pc.revision,
    }
    const entry: WebhookLogEntry = { event, rawBody: JSON.stringify(event), deliveries: [] }
    log.unshift(entry)
    deliver(entry)
  }
}

function deliver(entry: WebhookLogEntry): Promise<void> {
  chain = chain.then(async () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const headers = {
      'Content-Type': 'application/json', 'X-AML-Timestamp': ts, 'X-AML-Key-Id': WEBHOOK_KEY_ID,
      'X-AML-Signature': await sign(ts, entry.rawBody),
    }
    const r = await receiver.receive(headers, entry.rawBody)
    entry.deliveries.push({ at: new Date().toISOString(), headers, ...r })
    logListeners.forEach(fn => fn())
  })
  return chain
}

/** Lever samme hendelse (samme eventId) på nytt – mottaker skal ignorere duplikatet. */
export function redeliver(eventId: string): Promise<void> {
  const entry = log.find(e => e.event.eventId === eventId)
  return entry ? deliver(entry) : Promise.resolve()
}

// ---------- Simulert mottaker hos partneren ----------

const seen = new Set<string>()
export const receiver = {
  async receive(headers: Record<string, string>, rawBody: string, nowMs = Date.now()): Promise<{ status: number; verified: boolean; result: string }> {
    const ts = headers['X-AML-Timestamp']
    const sig = headers['X-AML-Signature'] ?? ''
    if (headers['X-AML-Key-Id'] !== WEBHOOK_KEY_ID) return { status: 401, verified: false, result: 'Avvist: ukjent nøkkel-ID' }
    if (!/^\d+$/.test(ts ?? '') || Math.abs(nowMs / 1000 - Number(ts)) > 300)
      return { status: 401, verified: false, result: 'Avvist: tidsstempel utenfor ±300 s' }
    const bytes = sig.match(/^[0-9a-f]{64}$/) ? new Uint8Array(sig.match(/../g)!.map(h => parseInt(h, 16))) : null
    const ok = !!bytes && await crypto.subtle.verify('HMAC', await key(), bytes, enc.encode(`${ts}.${rawBody}`))
    if (!ok) return { status: 401, verified: false, result: 'Avvist: ugyldig signatur' }
    const event = JSON.parse(rawBody) as PublicEvent
    if (seen.has(event.eventId)) return { status: 204, verified: true, result: 'Duplikat ignorert' }
    seen.add(event.eventId)
    return { status: 204, verified: true, result: 'Mottatt' }
  },
}

/** Kun for tester og «tilbakestill demo»: tøm partnerens tilstand. */
export function resetPartnerApi() {
  checks.clear(); idempotency.clear(); log.length = 0; seen.clear()
  unsubscribe?.(); unsubscribe = null
  chain = Promise.resolve()
  logListeners.forEach(fn => fn())
}
