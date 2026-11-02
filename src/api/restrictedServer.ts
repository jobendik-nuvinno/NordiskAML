// Skjermet tjeneste for undersøkelser (INV-01, INV-03). Eget lager, egen lagringsnøkkel og egen tilgangsgruppe –
// tilsvarer «RestrictedApi» og separat datalager i §08. Ingenting her skrives til saken eller saksloggen.

import type { Investigation, Role, Signal } from '../domain/types'
import { ACTOR, ApiError, getCase, networkDelay } from './fakeServer'

const KEY = 'nordisk-aml-restricted-v1'
const ACCESS_GROUP: Role[] = ['hvitvaskingsansvarlig']
const REPORTERS: Role[] = ['saksbehandler', 'godkjenner', 'hvitvaskingsansvarlig']

const storage: Storage | null = (() => { try { return globalThis.localStorage ?? null } catch { return null } })()
let investigations: Investigation[] = (() => { try { return JSON.parse(storage?.getItem(KEY) ?? '[]') } catch { return [] } })()
let version = 0
const listeners = new Set<() => void>()
function commit() {
  version++
  try { storage?.setItem(KEY, JSON.stringify(investigations)) } catch { /* privat modus */ }
  listeners.forEach(f => f())
}

export const restrictedStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
  getVersion: () => version,
}

const now = () => new Date().toISOString()
const uuid = () => crypto.randomUUID()

async function guard(role: Role, allowed: Role[]) {
  await networkDelay()
  // Samme svar som for en ikke-eksisterende ressurs: rollen skal ikke kunne utlede at sonen har innhold.
  if (!allowed.includes(role)) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
}

export interface ConcernInput {
  caseId: string | null
  subjectName: string
  kind: Signal['kind']
  description: string
  amount?: string
}

/**
 * Meld intern bekymring eller manuell observasjon (TXN-01: uten kontonummer eller ferdig KYC).
 * Melderen får bare en nøytral kvittering – aldri ID, status eller om saken allerede var under undersøkelse.
 */
export async function reportConcern(role: Role, input: ConcernInput): Promise<{ receipt: 'Mottatt' }> {
  await guard(role, REPORTERS)
  if (input.description.trim().length < 10) throw new ApiError(422, 'Beskriv observasjonen (minst 10 tegn).')
  const subjectName = input.caseId ? getCase(input.caseId).name : input.subjectName.trim()
  if (!subjectName) throw new ApiError(422, 'Oppgi hvem eller hva observasjonen gjelder.')
  const signal: Signal = { id: uuid(), at: now(), kind: input.kind, description: input.description.trim(), amount: input.amount?.trim() || null, by: ACTOR[role] }
  const existing = input.caseId ? investigations.find(i => i.caseId === input.caseId && i.status === 'åpen') : undefined
  if (existing) {
    existing.signals.push(signal)
    existing.timeline.push({ at: signal.at, text: 'Nytt signal knyttet til undersøkelsen', by: 'System' })
  } else {
    investigations.push({
      id: uuid(), ref: `UND-${String(investigations.length + 1).padStart(3, '0')}`, caseId: input.caseId, subjectName,
      createdAt: signal.at, priority: 'normal', owner: null, dueAt: new Date(Date.now() + 5 * 864e5).toISOString(),
      signals: [signal], finding: '', hypothesis: '', status: 'åpen', conclusion: null,
      timeline: [{ at: signal.at, text: `Undersøkelse opprettet fra ${signal.kind === 'internt_tips' ? 'internt tips' : 'manuell observasjon'}`, by: 'System' }],
    })
  }
  commit()
  return { receipt: 'Mottatt' }
}

export async function listInvestigations(role: Role): Promise<Investigation[]> {
  await guard(role, ACCESS_GROUP)
  return structuredClone(investigations)
}

/** Synkron lesing for UI-et i den skjermede sonen. Kalles bare når rollen er i tilgangsgruppen. */
export function readInvestigations(role: Role): Investigation[] {
  return ACCESS_GROUP.includes(role) ? investigations : []
}

type Patch = Partial<Pick<Investigation, 'finding' | 'hypothesis' | 'priority' | 'owner'>>

export async function updateInvestigation(role: Role, id: string, patch: Patch, note?: string) {
  await guard(role, ACCESS_GROUP)
  const inv = investigations.find(i => i.id === id)
  if (!inv) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
  if (inv.status === 'avsluttet') throw new ApiError(409, 'Undersøkelsen er avsluttet.')
  Object.assign(inv, patch)
  const changed = Object.keys(patch).map(k => ({ finding: 'funn', hypothesis: 'hypotese', priority: 'prioritet', owner: 'eier' } as Record<string, string>)[k]).join(', ')
  inv.timeline.push({ at: now(), text: note?.trim() || `Oppdatert: ${changed}`, by: ACTOR[role] })
  commit()
}

export async function closeInvestigation(role: Role, id: string, conclusion: string, reportDecision: 'rapporteres' | 'rapporteres_ikke') {
  await guard(role, ACCESS_GROUP)
  const inv = investigations.find(i => i.id === id)
  if (!inv) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
  if (!inv.finding.trim()) throw new ApiError(422, 'Registrer faktisk funn før avslutning.')
  if (conclusion.trim().length < 20) throw new ApiError(422, 'Avslutning krever en selvstendig konklusjon (minst 20 tegn).')
  inv.status = 'avsluttet'
  inv.conclusion = { text: conclusion.trim(), reportDecision, responsible: ACTOR[role], at: now() }
  inv.timeline.push({ at: inv.conclusion.at, text: `Avsluttet – ${reportDecision === 'rapporteres' ? 'beslutning om rapport til FIU (sendes via godkjent portalrutine, ikke simulert)' : 'ikke rapportert'}`, by: ACTOR[role] })
  commit()
}

export function resetRestricted() {
  investigations = []
  commit()
}
