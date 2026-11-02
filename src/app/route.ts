// Lesbare URL-er: #/<område>/<funksjon>/<side>[/<saksnr>]. Saksnummer (SAK-1004) er ugjennomsiktig og trygt i URL-en.
import type { DesignRole, ScreenId, UserFunction } from './context'

export interface Route { role: DesignRole; fn: UserFunction; screen: ScreenId; caseRef: string | null }

const ROLE_SLUG: Record<DesignRole, string> = { platform: 'plattform', admin: 'virksomhet', user: 'arbeidsflate', customer: 'kunde' }
const FN_SLUG: Record<UserFunction, string> = { saksbehandler: 'saksbehandler', godkjenner: 'godkjenner', hvitvaskingsansvarlig: 'aml-ansvarlig' }
const invert = <K extends string>(r: Record<K, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [v, k])) as Record<string, K>
const SLUG_ROLE = invert(ROLE_SLUG)
const SLUG_FN = invert(FN_SLUG)

export function buildHash(r: Route): string {
  const parts = [ROLE_SLUG[r.role], ...(r.role === 'user' ? [FN_SLUG[r.fn]] : []), r.screen, ...(r.caseRef ? [r.caseRef] : [])]
  return '#/' + parts.join('/')
}

export function parseHash(hash: string, isScreen: (s: string, role: DesignRole) => boolean): Partial<Route> {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const role = SLUG_ROLE[parts.shift() ?? '']
  if (!role) return {}
  const fn = role === 'user' ? SLUG_FN[parts[0] ?? ''] : undefined
  if (fn) parts.shift()
  const screen = parts[0] && isScreen(parts[0], role) ? parts[0] as ScreenId : undefined
  const caseRef = screen && /^SAK-\d+$/.test(parts[1] ?? '') ? parts[1] : null
  return { role, ...(fn ? { fn } : {}), ...(screen ? { screen } : {}), caseRef }
}
