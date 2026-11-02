// Appskall i Libans design (AML Command Center): topp, sidemeny per rolle og sidehode.
// Rollebytte, funksjon og testmiljøkontroller ligger i brukermenyen øverst til høyre.

import { useEffect, useMemo, useRef, useState } from 'react'
import { resetPartnerApi } from '../api/partnerApi'
import { ACTOR, resetDemo, ROLE_TITLE, setRegistryDown, STAGE_LABEL, STAGES, store } from '../api/fakeServer'
import { resetRestricted } from '../api/restrictedServer'
import {
  navigation as designNav, NoticeBar, RenderScreen, screenTitles as designTitles, type Country, type NavGroup, type Notice,
} from '../design/AMLCommandCenter'
import type { Case, Role } from '../domain/types'
import { showToast, useStore, useToast } from './hooks'
import { CASE_SCREENS, Ctx, type AppCtx, type DesignRole, type ScreenId, type UserFunction } from './context'
import { LIVE } from './screens'
import { buildHash, parseHash } from './route'
import bullLogo from '../assets/bull-logo.png'
import { Badge, Label, Panel, SmallTitle, statusText, statusTone } from './ui'

const ROLES: Record<DesignRole, { label: string; description: string; defaultScreen: ScreenId }> = {
  platform: { label: 'Plattformadministrasjon', description: 'SaaS-plattform og virksomheter', defaultScreen: 'platform-overview' },
  admin: { label: 'Bedriftsadministrasjon', description: 'Egen virksomhet og tilgang', defaultScreen: 'tenant-overview' },
  user: { label: 'AML-arbeidsflate', description: 'Tildelte AML-saker', defaultScreen: 'queue' },
  customer: { label: 'Kundeportal', description: 'Ekstern kunde', defaultScreen: 'portal' },
}

const FUNCTIONS: { id: UserFunction; caption: string }[] = [
  { id: 'saksbehandler', caption: 'Starter og avklarer kontroller' },
  { id: 'godkjenner', caption: 'Fatter beslutning' },
  { id: 'hvitvaskingsansvarlig', caption: 'Skjermet sone og innsikt' },
]

/** Innlogget person per rolle i testmiljøet. */
function persona(r: DesignRole, fn: UserFunction): { name: string; title: string } {
  if (r === 'user') return { name: ACTOR[fn], title: ROLE_TITLE[fn] }
  if (r === 'admin') return { name: ACTOR.admin, title: ROLE_TITLE.admin }
  if (r === 'platform') return { name: 'Ingrid Solheim', title: 'Plattformadministrator' }
  return { name: 'Kari Lund', title: 'Kontaktperson hos kunden' }
}

const NAV: Record<DesignRole, NavGroup[]> = {
  platform: designNav.platform,
  admin: designNav.admin,
  user: designNav.user.map(g => g.title === 'OPPFØLGING'
    ? { ...g, items: [...g.items, { id: 'insights' as never, label: 'Innsikt og automatisering', caption: 'AML-ansvarlig' }] }
    : g),
  customer: [{ title: 'KUNDEPORTAL', items: [{ id: 'portal' as never, label: 'Opplysninger om oppdraget' }] }],
}

/** Toppnavigasjon: snarveier til hovedområdene rollen har tilgang til. */
const TOP_NAV: Record<DesignRole, [string, ScreenId][]> = {
  platform: [['Plattform', 'platform-overview'], ['Regelsett', 'land-packs'], ['Integrasjoner', 'partner-api'], ['Drift', 'operations']],
  admin: [['Virksomhet', 'tenant-overview'], ['Brukere', 'members'], ['Regelsett', 'local-policy'], ['Revisjon', 'tenant-audit']],
  user: [['Arbeidsflate', 'queue'], ['Ny kontroll', 'scope'], ['Oppfølging', 'monitoring']],
  customer: [],
}

const TITLES: Record<ScreenId, { eyebrow: string; title: string; copy: string }> = {
  ...designTitles,
  insights: { eyebrow: 'AML-ANSVARLIG / INNSIKT', title: 'Innsikt og automatisering', copy: 'Maskinelt ferdige grunnlag med teller og nevner, restanser, risikofordeling og kildekvalitet – gjenskapbart fra loggen.' },
  portal: { eyebrow: 'SELVBETJENING', title: 'Opplysninger om oppdraget', copy: 'Her ser du hva vi trenger fra deg for å fullføre kontrollen av oppdraget.' },
}

function readRoute(cases: readonly Case[]) {
  if (typeof window === 'undefined') return {} as ReturnType<typeof parseHash> & { caseId?: string | null; pendingRef?: string }
  const r = parseHash(window.location.hash, (screen, role) => NAV[role].some(g => g.items.some(i => i.id === screen)))
  const c = r.caseRef ? cases.find(x => x.ref === r.caseRef) : undefined
  return { ...r, caseId: r.caseRef ? c?.id ?? null : r.role ? null : undefined, pendingRef: r.caseRef && !c ? r.caseRef : undefined }
}

/** Designets titler bruker eksempelsaken AML-0248; vis aktiv sak i stedet, eller ingen. */
function eyebrow(text: string, ref?: string) {
  if (ref) return text.replace('SAK AML-0248', ref)
  return text.replace(/ \/ SAK AML-0248$/, '').replace(/^SAK AML-0248 \/ /, '')
}

function backendRole(r: DesignRole, fn: UserFunction): Role {
  return r === 'platform' ? 'partner' : r === 'admin' ? 'admin' : r === 'customer' ? 'kunde' : fn
}

export function AppShell() {
  const state = useStore()
  const initial = useMemo(() => readRoute(state.cases), [])
  const [designRole, setDesignRole] = useState<DesignRole>(initial.role ?? 'user')
  const [fn, setFn] = useState<UserFunction>(initial.fn ?? 'saksbehandler')
  const [screen, setScreen] = useState<ScreenId>(initial.screen ?? ROLES[initial.role ?? 'user'].defaultScreen)
  const [caseId, setCaseId] = useState<string | null>(initial.caseId ?? null)
  const caseRef = caseId ? state.cases.find(c => c.id === caseId)?.ref ?? null : null

  // URL ↔ tilstand: tilbake-knapp, oppdatering og lenker til en bestemt side og sak.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = buildHash({ role: designRole, fn, screen, caseRef: CASE_SCREENS.includes(screen) ? caseRef : null })
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
  }, [designRole, fn, screen, caseRef])
  useEffect(() => {
    const onPop = () => {
      const r = readRoute(store.state.cases)
      if (r.role) setDesignRole(r.role)
      if (r.fn) setFn(r.fn)
      if (r.screen) setScreen(r.screen)
      if (r.caseId !== undefined) setCaseId(r.caseId)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // En sak i URL-en kan dukke opp først når testdataene er lastet.
  useEffect(() => {
    if (caseId || !initial.pendingRef) return
    const c = state.cases.find(x => x.ref === initial.pendingRef)
    if (c) setCaseId(c.id)
  }, [state.cases.length])
  const [country, setCountry] = useState<Country>('NO')
  const [toast, closeToast] = useToast()
  const [menuOpen, setMenuOpen] = useState(false)

  const go = (s: ScreenId) => { setScreen(s); setMenuOpen(false); closeToast() }
  const ctx: AppCtx = useMemo(() => ({
    role: backendRole(designRole, fn), designRole, fn, caseId,
    openCase: (id, s = 'case') => { setCaseId(id); go(s) },
    go,
  }), [designRole, fn, caseId])

  const changeRole = (r: DesignRole) => { setDesignRole(r); go(ROLES[r].defaultScreen) }
  const notice: Notice | null = toast ? { tone: toast.kind === 'err' ? 'locked' : toast.kind, text: toast.text } : null
  const staticNotify = (n: Notice | null) => n ? showToast(n.text, n.tone === 'locked' ? 'err' : n.tone) : closeToast()
  const Live = LIVE[screen]
  const current = caseId ? state.cases.find(c => c.id === caseId) : undefined
  const reset = () => {
    if (!confirm('Tilbakestille testmiljøet til startdata?')) return
    resetPartnerApi(); resetRestricted(); resetDemo(); setCaseId(null); go(ROLES[designRole].defaultScreen)
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className="min-h-screen bg-[#F5F7F9] font-sans text-[#172536]">
        <header className="border-b border-[#DCE4EB] bg-white">
          <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-5 px-5 lg:px-8">
            <button onClick={() => setMenuOpen(true)} aria-label="Åpne meny" aria-expanded={menuOpen} className="-ml-1 grid h-8 w-8 place-items-center border border-[#DCE4EB] text-[#42536A] lg:hidden">
              <span aria-hidden="true" className="block h-[10px] w-[14px] border-y-2 border-current before:mt-[2px] before:block before:h-[2px] before:bg-current" />
            </button>
            <div className="flex items-center border-r border-[#E2E8ED] pr-5">
              <img src={bullLogo} alt="Bull" className="h-7 w-auto" />
            </div>
            <nav aria-label="Hovedområder" className="hidden items-center gap-5 text-[12px] font-medium text-[#5D6D80] xl:flex">
              {TOP_NAV[designRole].filter(([, s]) => s !== 'scope' || fn === 'saksbehandler').map(([label, s]) => (
                <button key={s} onClick={() => go(s)} aria-current={screen === s ? 'page' : undefined} className={screen === s ? 'text-[#173B5B]' : 'hover:text-[#173B5B]'}>{label}</button>
              ))}
            </nav>
            {designRole === 'user' ? <CaseSearch cases={state.cases} open={id => ctx.openCase(id)} /> : <div className="ml-auto" />}
            {state.faults.registryDown && <Badge tone="red">Registerkilde utilgjengelig</Badge>}
            <UserMenu role={designRole} fn={fn} onRole={changeRole} onFn={setFn} registryDown={state.faults.registryDown} reset={reset} />
          </div>
        </header>
        <div className="mx-auto flex max-w-[1800px]">
          {menuOpen && <div className="fixed inset-0 z-30 bg-[#172536]/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
          <aside aria-label="Navigasjon" onKeyDown={e => e.key === 'Escape' && setMenuOpen(false)}
            className={(menuOpen ? 'fixed inset-y-0 left-0 z-40 block shadow-[0_12px_32px_rgba(23,37,54,0.18)]' : 'hidden') + ' w-[270px] shrink-0 border-r border-[#DCE4EB] bg-white lg:static lg:block lg:w-[250px] lg:shadow-none'}>
            <div className="h-full overflow-y-auto px-4 py-5 lg:sticky lg:top-0 lg:h-[calc(100vh-57px)]">
              {menuOpen && (
                <div className="mb-4 flex items-center justify-between lg:hidden">
                  <img src={bullLogo} alt="Bull" className="h-6 w-auto" />
                  <button onClick={() => setMenuOpen(false)} className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#56677B] underline underline-offset-4">Lukk</button>
                </div>
              )}
              {designRole === 'user' && (
                <div className="mb-5 border border-[#DCE4EB] p-3">
                  <div className="text-[9px] font-bold tracking-[0.13em] text-[#8592A2]">AKTIV SAK</div>
                  {current ? (
                    <>
                      <b className="mt-2 block text-[11px] text-[#293B4F]">{current.name}</b>
                      <small className="block text-[10px] text-[#718096]">{current.ref} · {current.scope.country}</small>
                      <div className="mt-2"><Badge tone={statusTone(current.status)}>{statusText(current.status)}</Badge></div>
                    </>
                  ) : <p className="mt-2 text-[10px] leading-4 text-[#718096]">Ingen sak valgt. Åpne en sak fra arbeidskøen.</p>}
                  <button onClick={() => go('queue')} className="mt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#176B5B] underline underline-offset-4">{current ? 'Bytt sak' : 'Til arbeidskø'}</button>
                </div>
              )}
              <nav aria-label="Skjermer">
                {NAV[designRole].map(group => (
                  <div key={group.title} className="mb-5">
                    <div className="mb-2 px-2 text-[9px] font-bold tracking-[0.13em] text-[#8592A2]">{group.title}</div>
                    <div className="space-y-0.5">
                      {group.items.map(item => (
                        <button key={item.id} onClick={() => go(item.id as ScreenId)} aria-current={screen === item.id ? 'page' : undefined}
                          className={'w-full border-l-2 px-3 py-2 text-left ' + (screen === item.id ? 'border-[#176F61] bg-[#EEF8F5] text-[#165F54]' : 'border-transparent text-[#56677B] hover:bg-[#F6F8FA]')}>
                          <span className="block text-[11px] font-semibold">{item.label}</span>
                          {item.caption ? <span className="block pt-0.5 text-[9px] text-[#9A6C1B]">{item.caption}</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
            {notice && <div className="mb-5"><NoticeBar notice={notice} dismiss={closeToast} /></div>}
            <div className="border-b border-[#DDE5EC] pb-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1E776A]">{eyebrow(TITLES[screen].eyebrow, CASE_SCREENS.includes(screen) ? current?.ref : undefined)}</div>
              <h1 className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-[#172536]">{TITLES[screen].title}</h1>
              <p className="mt-1.5 max-w-[760px] text-[13px] leading-6 text-[#617188]">{TITLES[screen].copy}</p>
            </div>
            {CASE_SCREENS.includes(screen) && current && <CaseStrip c={current} />}
            <div className="pt-6">
              {Live
                ? (CASE_SCREENS.includes(screen) && !current ? <NeedCase go={go} /> : <Live />)
                : <RenderScreen screen={screen as never} notify={staticNotify} country={country} chooseCountry={setCountry} go={s => go(s)} />}
            </div>
          </main>
        </div>
      </div>
    </Ctx.Provider>
  )
}

/** Lukker et flytende panel ved klikk utenfor eller Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return ref
}

function CaseSearch({ cases, open }: { cases: readonly Case[]; open: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [show, setShow] = useState(false)
  const ref = useDismiss(show, () => setShow(false))
  const term = q.trim().toLowerCase().replace(/\s/g, '')
  const hits = term ? cases.filter(c => [c.name, c.ref, c.orgNr].some(v => v.toLowerCase().replace(/\s/g, '').includes(term))).slice(0, 6) : []
  return (
    <div ref={ref} className="relative ml-auto hidden md:block">
      <label htmlFor="case-search" className="sr-only">Søk i saker</label>
      <input id="case-search" type="search" value={q} onChange={e => { setQ(e.target.value); setShow(true) }} onFocus={() => setShow(true)}
        placeholder="Søk i tildelte saker – navn, saksnr. eller org.nr"
        className="h-8 w-[300px] border border-[#DCE4EB] bg-[#F8FAFB] px-3 text-[11px] text-[#293B4F] placeholder:text-[#8A97A8] outline-none focus:border-[#176F61]" />
      {show && term && (
        <div className="absolute right-0 z-20 mt-1 w-[360px] border border-[#DCE4EB] bg-white shadow-[0_8px_24px_rgba(23,37,54,0.08)]">
          {hits.length === 0 && <p className="px-3 py-3 text-[11px] text-[#718096]">Ingen saker i ditt tilgangsområde samsvarer.</p>}
          {hits.map(c => (
            <button key={c.id} onClick={() => { open(c.id); setQ(''); setShow(false) }} className="flex w-full items-center justify-between gap-3 border-b border-[#E7EDF1] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#F8FAFB]">
              <span><b className="block text-[11px] text-[#293B4F]">{c.name}</b><small className="block text-[10px] text-[#718096]">{c.ref} · org.nr {c.orgNr}</small></span>
              <Badge tone={statusTone(c.status)}>{statusText(c.status)}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function UserMenu({ role, fn, onRole, onFn, registryDown, reset }: {
  role: DesignRole; fn: UserFunction; onRole: (r: DesignRole) => void; onFn: (f: UserFunction) => void; registryDown: boolean; reset: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const me = persona(role, fn)
  const initials = me.name.split(' ').map(p => p[0]).filter(ch => /[A-ZÆØÅ]/.test(ch)).slice(0, 2).join('')
  const item = (active: boolean) => 'flex w-full items-start gap-2.5 px-3 py-2 text-left ' + (active ? 'bg-[#EEF8F5] text-[#155D52]' : 'text-[#42536A] hover:bg-[#F6F8FA]')
  return (
    <div ref={ref} className="relative border-l border-[#E2E8ED] pl-5">
      <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2.5 text-left">
        <span className="grid h-7 w-7 place-items-center bg-[#EEF4FA] text-[10px] font-bold text-[#255A81]" aria-hidden="true">{initials}</span>
        <span className="hidden text-[10px] leading-4 text-[#637389] sm:block"><b className="block text-[11px] text-[#293B4F]">{me.name}</b>{me.title}</span>
        <span className="text-[10px] text-[#8592A2]" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-3 w-[300px] border border-[#DCE4EB] bg-white shadow-[0_12px_32px_rgba(23,37,54,0.12)]">
          <div className="border-b border-[#E7EDF1] px-3 py-3">
            <b className="block text-[12px] text-[#293B4F]">{me.name}</b>
            <small className="block text-[10px] text-[#718096]">{me.title} · Testmiljø · EU North</small>
          </div>
          <div className="border-b border-[#E7EDF1] py-2">
            <div className="px-3 pb-1 text-[9px] font-bold tracking-[0.13em] text-[#8592A2]">BYTT ROLLE</div>
            {(Object.keys(ROLES) as DesignRole[]).map(r => (
              <button key={r} role="menuitemradio" aria-checked={role === r} onClick={() => { onRole(r); setOpen(false) }} className={item(role === r)}>
                <span className={'mt-1 h-1.5 w-1.5 shrink-0 rounded-full ' + (role === r ? 'bg-[#176F61]' : 'bg-transparent')} />
                <span><b className="block text-[11px]">{ROLES[r].label}</b><small className="block text-[10px] text-[#718096]">{ROLES[r].description}</small></span>
              </button>
            ))}
          </div>
          {role === 'user' && (
            <div className="border-b border-[#E7EDF1] py-2">
              <div className="px-3 pb-1 text-[9px] font-bold tracking-[0.13em] text-[#8592A2]">FUNKSJON</div>
              {FUNCTIONS.map(f => (
                <button key={f.id} role="menuitemradio" aria-checked={fn === f.id} onClick={() => { onFn(f.id); setOpen(false) }} className={item(fn === f.id)}>
                  <span className={'mt-1 h-1.5 w-1.5 shrink-0 rounded-full ' + (fn === f.id ? 'bg-[#176F61]' : 'bg-transparent')} />
                  <span><b className="block text-[11px]">{ACTOR[f.id]} · {ROLE_TITLE[f.id]}</b><small className="block text-[10px] text-[#718096]">{f.caption}</small></span>
                </button>
              ))}
            </div>
          )}
          <div className="py-2">
            <div className="px-3 pb-1 text-[9px] font-bold tracking-[0.13em] text-[#8592A2]">TESTMILJØ</div>
            <label className="flex items-center gap-2 px-3 py-2 text-[11px] text-[#42536A]">
              <input type="checkbox" checked={registryDown} onChange={e => setRegistryDown(e.target.checked)} className="accent-[#B8413E]" />
              Simuler at registerkilden er nede (503)
            </label>
            <button role="menuitem" onClick={() => { setOpen(false); reset() }} className="w-full px-3 py-2 text-left text-[11px] font-semibold text-[#963531] hover:bg-[#FDF5F4]">Tilbakestill testdata</button>
          </div>
        </div>
      )}
    </div>
  )
}

function CaseStrip({ c }: { c: Case }) {
  const idx = STAGES.indexOf(c.stage)
  const finished = c.status !== 'processing' && c.status !== 'waiting_source' && c.stage === 'klargjore'
  return (
    <Panel className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
      <div><Label>Aktiv sak</Label><div className="mt-1 text-[13px] font-semibold text-[#172536]">{c.name} <span className="font-normal text-[#718096]">· {c.ref} · org.nr {c.orgNr}</span></div></div>
      <Badge tone={statusTone(c.status)}>{statusText(c.status)}</Badge>
      {c.urgency === 'haster' && <Badge tone="red">Haster</Badge>}
      <ol className="ml-auto flex flex-wrap gap-1.5" aria-label="Automatiske trinn">
        {STAGES.map((s, i) => {
          const done = i < idx || finished
          const stopped = i === idx && c.status === 'waiting_source'
          return (
            <li key={s} className={'border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ' + (done ? 'border-[#BFDCD5] bg-[#EEF8F5] text-[#176B5B]' : stopped ? 'border-[#E7BBB8] bg-[#FDF1F0] text-[#963531]' : i === idx ? 'border-[#176F61] bg-white text-[#176B5B]' : 'border-[#DCE4EB] bg-white text-[#8A97A8]')}>
              {i + 1} · {STAGE_LABEL[s]}{stopped ? ' · venter' : done ? ' ✓' : i === idx ? ' …' : ''}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

function NeedCase({ go }: { go: (s: ScreenId) => void }) {
  return (
    <Panel className="p-5">
      <SmallTitle title="Ingen sak valgt" copy="Denne siden viser én sak. Åpne en sak fra arbeidskøen eller start en ny kontroll." />
      <div className="mt-4 flex gap-2">
        <button onClick={() => go('queue')} className="bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white">Til arbeidskø</button>
        <button onClick={() => go('scope')} className="border border-[#C9D4DE] bg-white px-4 py-2.5 text-[11px] font-bold text-[#42536A]">Start ny kontroll</button>
      </div>
    </Panel>
  )
}
