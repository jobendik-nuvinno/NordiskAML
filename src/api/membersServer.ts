// Simulert medlems- og tilgangstjeneste for virksomheten (S13, R-056/R-060, SEC-02/SEC-06).
// Eget lager og egen lagringsnøkkel, som restrictedServer. Alle endringer logges med aktør og tidspunkt.

import { ApiError, networkDelay } from './fakeServer'

const KEY = 'nordisk-aml-members-v1'
export const TENANT = 'Nordic Trade AS'

export type MemberRole = 'saksbehandler' | 'godkjenner' | 'hvitvaskingsansvarlig' | 'stedfortreder' | 'bedriftsadministrator' | 'revisor'
export type MemberStatus = 'aktiv' | 'invitert' | 'deaktivert'

export const ROLE_LABEL: Record<MemberRole, string> = {
  saksbehandler: 'Saksbehandler',
  godkjenner: 'Faglig godkjenner',
  hvitvaskingsansvarlig: 'Hvitvaskingsansvarlig',
  stedfortreder: 'Stedfortreder hvitvaskingsansvarlig',
  bedriftsadministrator: 'Bedriftsadministrator',
  revisor: 'Revisor (kun lesing)',
}
export const ALL_ROLES = Object.keys(ROLE_LABEL) as MemberRole[]
/** Roller som gir tilgang til saksbehandling og beslutninger. */
export const CASE_ROLES: MemberRole[] = ['saksbehandler', 'godkjenner', 'hvitvaskingsansvarlig', 'stedfortreder']

export interface Member {
  id: string
  name: string
  email: string
  roles: MemberRole[]
  status: MemberStatus
  sso: 'Entra ID'
  mfa: boolean
  lastLogin: string | null
  accessExpires: string | null
  activeSessions: number
}

export interface MemberAuditEntry { id: string; at: string; actor: string; action: string; target: string; detail: string }

export type GrantStatus = 'aktiv' | 'trukket tilbake' | 'utløpt'
export interface SupportGrant {
  id: string
  requestedBy: 'Plattformsupport'
  reason: string
  grantedBy: string
  grantedAt: string
  expiresAt: string
  status: GrantStatus
  revokedAt: string | null
}

interface State { members: Member[]; grants: SupportGrant[]; audit: MemberAuditEntry[] }

export const MAX_SUPPORT_HOURS = 8
const DAY = 864e5
const iso = (ms: number) => new Date(ms).toISOString()
const uuid = () => crypto.randomUUID()

function seed(): State {
  const t = Date.now()
  const m = (id: string, name: string, local: string, roles: MemberRole[], extra: Partial<Member> = {}): Member => ({
    id, name, email: `${local}@nordictrade.example`, roles, status: 'aktiv', sso: 'Entra ID', mfa: true,
    lastLogin: iso(t - 2 * 36e5), accessExpires: null, activeSessions: 1, ...extra,
  })
  return {
    members: [
      m('m-nora', 'Nora Berg', 'nora.berg', ['saksbehandler'], { lastLogin: iso(t - 20 * 6e4) }),
      m('m-jonas', 'Jonas Eide', 'jonas.eide', ['godkjenner'], { lastLogin: iso(t - 3 * 36e5) }),
      m('m-marius', 'Marius A. Viken', 'marius.viken', ['hvitvaskingsansvarlig'], { lastLogin: iso(t - 26 * 36e5) }),
      m('m-sara', 'Sara Holm', 'sara.holm', ['stedfortreder'], { lastLogin: iso(t - 4 * DAY), activeSessions: 0 }),
      m('m-erik', 'Erik Dahl', 'erik.dahl', ['bedriftsadministrator'], { lastLogin: iso(t - 5 * 6e4) }),
      m('m-tone', 'Tone Lie', 'tone.lie', ['revisor'], { mfa: true, lastLogin: iso(t - 6 * DAY), accessExpires: iso(t + 18 * DAY), activeSessions: 0 }),
      m('m-lars', 'Lars Moen', 'lars.moen', ['saksbehandler'], { status: 'invitert', mfa: false, lastLogin: null, activeSessions: 0 }),
    ],
    grants: [],
    audit: [{ id: uuid(), at: iso(t - 7 * DAY), actor: 'System', action: 'Medlemsliste synkronisert fra Entra ID', target: TENANT, detail: '7 medlemmer' }],
  }
}

const storage: Storage | null = (() => { try { return globalThis.localStorage ?? null } catch { return null } })()
let state: State = (() => { try { const s = storage?.getItem(KEY); return s ? JSON.parse(s) as State : seed() } catch { return seed() } })()
let version = 0
const listeners = new Set<() => void>()
function commit() {
  version++
  try { storage?.setItem(KEY, JSON.stringify(state)) } catch { /* privat modus */ }
  listeners.forEach(f => f())
}

export const membersStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
  getVersion: () => version,
}

export function readMembers(): Member[] { return state.members }
export function readMemberAudit(): MemberAuditEntry[] { return state.audit }
/** Supporttilganger med utløp beregnet ved lesing: en aktiv tilgang forbi utløpstidspunktet er «utløpt». */
export function readSupportGrants(at = Date.now()): SupportGrant[] {
  return state.grants.map(g => g.status === 'aktiv' && Date.parse(g.expiresAt) <= at ? { ...g, status: 'utløpt' as const } : g)
}

function log(actor: string, action: string, target: string, detail = '') {
  state.audit.unshift({ id: uuid(), at: iso(Date.now()), actor, action, target, detail })
}

async function asAdmin(actor: string): Promise<Member> {
  await networkDelay()
  const me = state.members.find(m => m.name === actor && m.status === 'aktiv')
  if (!me || !me.roles.includes('bedriftsadministrator'))
    throw new ApiError(403, 'Bare bedriftsadministrator kan administrere brukere og tilganger.')
  return me
}

function find(id: string): Member {
  const m = state.members.find(x => x.id === id)
  if (!m) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
  return m
}

const rolesText = (roles: MemberRole[]) => roles.map(r => ROLE_LABEL[r]).join(', ')

function validateRoles(actorMember: Member, target: Member | null, roles: MemberRole[]) {
  if (roles.length === 0) throw new ApiError(422, 'Velg minst én rolle.')
  if (roles.some(r => !ALL_ROLES.includes(r))) throw new ApiError(422, 'Ukjent rolle.')
  if (target?.id === actorMember.id && roles.some(r => CASE_ROLES.includes(r) && !target.roles.includes(r)))
    throw new ApiError(403, 'Administrator kan ikke tildele seg selv saksbehandler-, godkjenner- eller AML-ansvarlig-rolle.')
  if (roles.includes('revisor') && roles.some(r => CASE_ROLES.includes(r)))
    throw new ApiError(422, 'Arbeidsdeling: revisor kan ikke samtidig ha en saksrolle.')
}

/** Kaster 409 hvis endringen etterlater virksomheten uten aktiv hvitvaskingsansvarlig. */
function guardLastAml(target: Member, remainsAml: boolean) {
  if (remainsAml || target.status !== 'aktiv' || !target.roles.includes('hvitvaskingsansvarlig')) return
  const others = state.members.filter(m => m.id !== target.id && m.status === 'aktiv' && m.roles.includes('hvitvaskingsansvarlig'))
  if (others.length === 0)
    throw new ApiError(409, 'Virksomheten må ha minst én aktiv hvitvaskingsansvarlig. Utpek en ny før endringen.')
}

export interface InviteInput { name: string; email: string; role: MemberRole; accessExpires?: string | null }

export async function inviteMember(actor: string, input: InviteInput): Promise<Member> {
  const me = await asAdmin(actor)
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (name.length < 2) throw new ApiError(422, 'Oppgi navn.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(422, 'Oppgi en gyldig e-postadresse.')
  if (state.members.some(m => m.email === email && m.status !== 'deaktivert')) throw new ApiError(409, 'Det finnes allerede en bruker med denne e-postadressen.')
  validateRoles(me, null, [input.role])
  const accessExpires = input.role === 'revisor' ? (input.accessExpires ?? iso(Date.now() + 30 * DAY)) : (input.accessExpires ?? null)
  const member: Member = { id: uuid(), name, email, roles: [input.role], status: 'invitert', sso: 'Entra ID', mfa: false, lastLogin: null, accessExpires, activeSessions: 0 }
  state.members.push(member)
  log(actor, 'Bruker invitert', name, `${email} · ${ROLE_LABEL[input.role]}${accessExpires ? ` · utløper ${accessExpires.slice(0, 10)}` : ''}`)
  commit()
  return structuredClone(member)
}

export async function changeRole(actor: string, memberId: string, roles: MemberRole[]): Promise<Member> {
  const me = await asAdmin(actor)
  const target = find(memberId)
  if (target.status === 'deaktivert') throw new ApiError(409, 'Brukeren er deaktivert. Reaktiver før rolleendring.')
  const next = [...new Set(roles)]
  validateRoles(me, target, next)
  if (target.id === me.id && !next.includes('bedriftsadministrator') && !state.members.some(m => m.id !== me.id && m.status === 'aktiv' && m.roles.includes('bedriftsadministrator')))
    throw new ApiError(409, 'Virksomheten må ha minst én aktiv bedriftsadministrator.')
  guardLastAml(target, next.includes('hvitvaskingsansvarlig'))
  const before = target.roles
  target.roles = next
  log(actor, 'Rolle endret', target.name, `${rolesText(before)} → ${rolesText(next)}`)
  commit()
  return structuredClone(target)
}

export async function deactivateMember(actor: string, memberId: string): Promise<Member> {
  const me = await asAdmin(actor)
  const target = find(memberId)
  if (target.status === 'deaktivert') throw new ApiError(409, 'Brukeren er allerede deaktivert.')
  if (target.id === me.id) throw new ApiError(409, 'Du kan ikke deaktivere din egen administratortilgang.')
  guardLastAml(target, false)
  const sessions = target.activeSessions
  target.status = 'deaktivert'
  target.activeSessions = 0
  log(actor, 'Tilgang trukket tilbake, aktive sesjoner avsluttet', target.name, `${sessions} sesjon${sessions === 1 ? '' : 'er'} avsluttet · gjelder umiddelbart`)
  commit()
  return structuredClone(target)
}

export async function reactivateMember(actor: string, memberId: string): Promise<Member> {
  await asAdmin(actor)
  const target = find(memberId)
  if (target.status !== 'deaktivert') throw new ApiError(409, 'Brukeren er ikke deaktivert.')
  target.status = target.lastLogin ? 'aktiv' : 'invitert'
  log(actor, 'Bruker reaktivert', target.name, `${rolesText(target.roles)} · ny innlogging med SSO og MFA kreves`)
  commit()
  return structuredClone(target)
}

/** Tidsavgrenset supporttilgang (SEC-02): begrunnelse er påkrevd og varigheten er maks 8 timer. */
export async function grantSupportAccess(actor: string, reason: string, hours: number): Promise<SupportGrant> {
  await asAdmin(actor)
  const why = reason.trim()
  if (why.length < 10) throw new ApiError(422, 'Supporttilgang krever begrunnelse (minst 10 tegn).')
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_SUPPORT_HOURS)
    throw new ApiError(422, `Varighet må være mellom 1 og ${MAX_SUPPORT_HOURS} timer.`)
  const t = Date.now()
  const g: SupportGrant = { id: uuid(), requestedBy: 'Plattformsupport', reason: why, grantedBy: actor, grantedAt: iso(t), expiresAt: iso(t + hours * 36e5), status: 'aktiv', revokedAt: null }
  state.grants.unshift(g)
  log(actor, 'Supporttilgang gitt', 'Plattformsupport', `${hours} t · ${why}`)
  commit()
  return structuredClone(g)
}

export async function revokeSupportAccess(actor: string, grantId: string): Promise<SupportGrant> {
  await asAdmin(actor)
  const g = state.grants.find(x => x.id === grantId)
  if (!g) throw new ApiError(404, 'Ressurs ikke tilgjengelig')
  const current = readSupportGrants().find(x => x.id === grantId)!
  if (current.status !== 'aktiv') throw new ApiError(409, `Supporttilgangen er allerede ${current.status}.`)
  g.status = 'trukket tilbake'
  g.revokedAt = iso(Date.now())
  log(actor, 'Supporttilgang trukket tilbake', 'Plattformsupport', g.reason)
  commit()
  return structuredClone(g)
}

export function resetMembers() {
  state = seed()
  commit()
}
