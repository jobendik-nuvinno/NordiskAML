// Appskall i Libans design (AML Command Center): topp med «Test som rolle», sidemeny per rolle, sidehode og
// «Forrige/Neste skjerm». Utvidet med ekstern kunde, funksjon innen «Bruker», aktiv sak og demokontroller.

import { useMemo, useState } from 'react'
import { resetPartnerApi } from '../api/partnerApi'
import { resetDemo, setRegistryDown, STAGE_LABEL, STAGES } from '../api/fakeServer'
import { resetRestricted } from '../api/restrictedServer'
import {
  navigation as designNav, NoticeBar, RenderScreen, roleMeta as designRoleMeta, screenTitles as designTitles,
  type Country, type NavGroup, type Notice,
} from '../design/AMLCommandCenter'
import type { Role } from '../domain/types'
import { showToast, useStore, useToast } from '../ui/hooks'
import { CASE_SCREENS, Ctx, type AppCtx, type DesignRole, type ScreenId, type UserFunction } from './context'
import { LIVE } from './screens'
import { Badge, Label, Panel, SmallTitle, statusText, statusTone } from './ui'

const ROLE_META: Record<DesignRole, { label: string; short: string; description: string; defaultScreen: ScreenId }> = {
  ...designRoleMeta,
  customer: { label: 'Kunde', short: '04', description: 'Ekstern kundeportal', defaultScreen: 'portal' },
}

const FUNCTIONS: { id: UserFunction; label: string; caption: string }[] = [
  { id: 'saksbehandler', label: 'Saksbehandler', caption: 'Starter og avklarer kontroller' },
  { id: 'godkjenner', label: 'Faglig godkjenner', caption: 'Fatter beslutning' },
  { id: 'hvitvaskingsansvarlig', label: 'AML-ansvarlig', caption: 'Skjermet sone og innsikt' },
]

const NAV: Record<DesignRole, NavGroup[]> = {
  platform: designNav.platform,
  admin: designNav.admin,
  user: designNav.user.map(g => g.title === 'OPPFØLGING'
    ? { ...g, items: [...g.items, { id: 'insights' as never, label: 'Innsikt og automatisering', caption: 'AML-ansvarlig' }] }
    : g),
  customer: [{ title: 'KUNDEPORTAL', items: [{ id: 'portal' as never, label: 'Opplysninger om oppdraget' }] }],
}

const TITLES: Record<ScreenId, { eyebrow: string; title: string; copy: string }> = {
  ...designTitles,
  insights: { eyebrow: 'AML-ANSVARLIG / INNSIKT', title: 'Innsikt og automatisering', copy: 'Maskinelt ferdige grunnlag med teller og nevner, restanser, risikofordeling og kildekvalitet – gjenskapbart fra loggen.' },
  portal: { eyebrow: 'SELVBETJENING / KUNDE', title: 'Opplysninger om oppdraget', copy: 'Kundevisning adskilt fra internkontrollen. Du ser bare hva vi trenger fra deg.' },
}

const ALL_SCREENS: ScreenId[] = (Object.keys(NAV) as DesignRole[]).flatMap(r => NAV[r].flatMap(g => g.items.map(i => i.id as ScreenId)))

function backendRole(r: DesignRole, fn: UserFunction): Role {
  return r === 'platform' ? 'partner' : r === 'admin' ? 'admin' : r === 'customer' ? 'kunde' : fn
}

export function AppShell() {
  const state = useStore()
  const [designRole, setDesignRole] = useState<DesignRole>('user')
  const [fn, setFn] = useState<UserFunction>('saksbehandler')
  const [screen, setScreen] = useState<ScreenId>('queue')
  const [caseId, setCaseId] = useState<string | null>(null)
  const [country, setCountry] = useState<Country>('NO')
  const [showMap, setShowMap] = useState(false)
  const [toast, closeToast] = useToast()

  const active = NAV[designRole].flatMap(g => g.items.map(i => i.id as ScreenId))
  const go = (s: ScreenId) => { setScreen(s); setShowMap(false); closeToast() }
  const ctx: AppCtx = useMemo(() => ({
    role: backendRole(designRole, fn), designRole, fn, caseId,
    openCase: (id, s = 'case') => { setCaseId(id); go(s) },
    go,
  }), [designRole, fn, caseId])

  const changeRole = (r: DesignRole) => { setDesignRole(r); go(ROLE_META[r].defaultScreen) }
  const step = (d: number) => go(active[(active.indexOf(screen) + d + active.length) % active.length])
  const notice: Notice | null = toast ? { tone: toast.kind === 'err' ? 'locked' : toast.kind, text: toast.text } : null
  const staticNotify = (n: Notice | null) => n ? showToast(n.text, n.tone === 'locked' ? 'err' : n.tone) : closeToast()
  const Live = LIVE[screen]
  const current = caseId ? state.cases.find(c => c.id === caseId) : undefined

  return (
    <Ctx.Provider value={ctx}>
      <div className="min-h-screen bg-[#F5F7F9] font-sans text-[#172536]">
        <Header role={designRole} onRole={changeRole} onMap={() => setShowMap(true)} registryDown={state.faults.registryDown} />
        <div className="mx-auto max-w-[1800px] px-5 pt-5 lg:px-8"><NoticeBar notice={notice} dismiss={closeToast} /></div>
        <div className="mx-auto flex max-w-[1800px]">
          {showMap ? <ScreenMap go={(r, s) => { setDesignRole(r); go(s) }} /> : (
            <>
              <aside className="hidden w-[250px] shrink-0 border-r border-[#DCE4EB] bg-white lg:block">
                <div className="sticky top-0 h-[calc(100vh-105px)] overflow-y-auto px-4 py-5">
                  <button onClick={() => setShowMap(true)} className="mb-5 flex w-full items-center justify-between border border-[#C9DEDA] bg-[#F3FAF8] px-3 py-2.5 text-left">
                    <span><b className="block text-[10px] uppercase tracking-[0.11em] text-[#176B5B]">Prototypeoversikt</b><small className="block pt-1 text-[10px] text-[#5C716F]">Alle {ALL_SCREENS.length} skjermene</small></span><span className="text-[#176B5B]">→</span>
                  </button>
                  {designRole === 'user' && (
                    <div className="mb-5 border border-[#D5E4E1] bg-[#F7FBFA] p-3">
                      <div className="text-[9px] font-bold tracking-[0.13em] text-[#1C7062]">DIN FUNKSJON</div>
                      <div className="mt-2 space-y-1">
                        {FUNCTIONS.map(f => (
                          <button key={f.id} onClick={() => setFn(f.id)} aria-pressed={fn === f.id}
                            className={'block w-full border px-2.5 py-1.5 text-left ' + (fn === f.id ? 'border-[#176F61] bg-white text-[#155D52]' : 'border-transparent text-[#56677B] hover:border-[#C9DEDA]')}>
                            <b className="block text-[11px]">{f.label}</b><small className="block text-[9px] text-[#718096]">{f.caption}</small>
                          </button>
                        ))}
                      </div>
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
                  <div className="mt-6 border-t border-[#E2E8ED] pt-4">
                    <div className="mb-2 px-2 text-[9px] font-bold tracking-[0.13em] text-[#8592A2]">DEMOKONTROLL</div>
                    <label className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-[#56677B]">
                      <input type="checkbox" checked={state.faults.registryDown} onChange={e => setRegistryDown(e.target.checked)} className="accent-[#B8413E]" />
                      Simuler kildeutfall (503)
                    </label>
                    <button onClick={() => { if (confirm('Tilbakestille demoen til startdata?')) { resetPartnerApi(); resetRestricted(); resetDemo(); setCaseId(null); go(ROLE_META[designRole].defaultScreen) } }}
                      className="mt-1 px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#963531] underline underline-offset-4">Tilbakestill demo</button>
                  </div>
                </div>
              </aside>
              <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
                <div className="flex flex-col justify-between gap-5 border-b border-[#DDE5EC] pb-5 2xl:flex-row 2xl:items-end">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1E776A]">{TITLES[screen].eyebrow}</div>
                    <h1 className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-[#172536]">{TITLES[screen].title}</h1>
                    <p className="mt-1.5 max-w-[760px] text-[13px] leading-6 text-[#617188]">{TITLES[screen].copy}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{designRole === 'user' ? FUNCTIONS.find(f => f.id === fn)!.label : ROLE_META[designRole].label}</Badge>
                    <Badge>Skjerm {ALL_SCREENS.indexOf(screen) + 1} av {ALL_SCREENS.length}</Badge>
                    {!Live && <Badge tone="amber">Designskisse</Badge>}
                  </div>
                </div>
                {CASE_SCREENS.includes(screen) && current && <CaseStrip c={current} />}
                <div className="pt-6">
                  {Live
                    ? (CASE_SCREENS.includes(screen) && !current ? <NeedCase go={go} /> : <Live />)
                    : <RenderScreen screen={screen as never} notify={staticNotify} country={country} chooseCountry={setCountry} go={s => go(s)} />}
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-[#DDE5EC] pt-4">
                  <button onClick={() => step(-1)} className="border border-[#C9D4DE] bg-white px-3.5 py-2 text-[11px] font-bold text-[#506176]">← Forrige skjerm</button>
                  <button onClick={() => step(1)} className="bg-[#173B5B] px-3.5 py-2 text-[11px] font-bold text-white">Neste skjerm →</button>
                </div>
              </main>
            </>
          )}
        </div>
      </div>
    </Ctx.Provider>
  )
}

function Header({ role, onRole, onMap, registryDown }: { role: DesignRole; onRole: (r: DesignRole) => void; onMap: () => void; registryDown: boolean }) {
  return (
    <header className="border-b border-[#DCE4EB] bg-white">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-5 px-5 lg:px-8">
        <div className="flex items-center gap-2.5 border-r border-[#E2E8ED] pr-5">
          <span className="grid h-7 w-7 place-items-center bg-[#173B5B] text-[12px] font-bold text-white">N</span>
          <span><b className="block text-[12px] tracking-[0.14em] text-[#172536]">NORDISK</b><small className="block text-[8px] font-bold tracking-[0.16em] text-[#708096]">COMPLIANCE</small></span>
        </div>
        <nav className="hidden items-center gap-5 text-[12px] font-medium text-[#5D6D80] xl:flex">
          <span className="text-[#173B5B]">Arbeidsflate</span><span>Virksomheter</span><span>Regelsett</span><span>Revisjon</span>
        </nav>
        <div className="ml-auto hidden h-8 w-[300px] items-center border border-[#DCE4EB] bg-[#F8FAFB] px-3 text-[11px] text-[#8A97A8] md:flex">Søk i valgt tilgangsområde</div>
        {registryDown && <Badge tone="red">Kildeutfall simuleres</Badge>}
        <button onClick={onMap} className="hidden border border-[#BBD4CF] bg-[#F4FAF8] px-3 py-2 text-[10px] font-bold text-[#176B5B] lg:block">{ALL_SCREENS.length} SKJERMER</button>
        <div className="hidden border-l border-[#E2E8ED] pl-5 text-right text-[10px] leading-4 text-[#637389] sm:block">
          <b className="block text-[11px] text-[#293B4F]">{ROLE_META[role].label}</b>Testmiljø · EU North
        </div>
      </div>
      <div className="border-t border-[#EEF1F4] bg-[#FCFDFE]">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2 px-5 py-3 lg:px-8">
          <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#708096]">Test som rolle</span>
          {(Object.keys(ROLE_META) as DesignRole[]).map(item => (
            <button key={item} onClick={() => onRole(item)} aria-pressed={role === item}
              className={'flex items-center gap-2 border px-3 py-2 text-left ' + (role === item ? 'border-[#176F61] bg-[#EAF7F3] text-[#155D52]' : 'border-[#DCE4EB] bg-white text-[#56677B] hover:border-[#AFC7C3]')}>
              <span className={'grid h-5 w-5 place-items-center text-[9px] font-bold ' + (role === item ? 'bg-[#176F61] text-white' : 'bg-[#EFF3F6] text-[#718096]')}>{ROLE_META[item].short}</span>
              <span><b className="block text-[11px]">{ROLE_META[item].label}</b><small className="block text-[10px]">{ROLE_META[item].description}</small></span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

function CaseStrip({ c }: { c: NonNullable<ReturnType<typeof useStore>['cases'][number]> }) {
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
      <SmallTitle title="Ingen sak valgt" copy="Denne skjermen viser én sak. Åpne en sak fra arbeidskøen eller start en ny kontroll." />
      <div className="mt-4 flex gap-2">
        <button onClick={() => go('queue')} className="bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white">Til arbeidskø</button>
        <button onClick={() => go('scope')} className="border border-[#C9D4DE] bg-white px-4 py-2.5 text-[11px] font-bold text-[#42536A]">Start ny kontroll</button>
      </div>
    </Panel>
  )
}

function ScreenMap({ go }: { go: (role: DesignRole, screen: ScreenId) => void }) {
  return (
    <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
      <div className="border-b border-[#DDE5EC] pb-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1E776A]">PROTOTYPEOVERSIKT</div>
        <h1 className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-[#172536]">{ALL_SCREENS.length} navigerbare produktflater</h1>
        <p className="mt-1.5 max-w-[790px] text-[13px] leading-6 text-[#617188]">Velg en skjerm for å teste rollen og arbeidsflyten. Navigasjonen etterligner faktisk tilgang: hver rolle ser bare sine sider. Skjermer merket «Levende» bruker den simulerte backenden.</p>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
        {(Object.keys(NAV) as DesignRole[]).map(role => (
          <Panel key={role} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SmallTitle title={ROLE_META[role].label} copy={ROLE_META[role].description} />
              <Badge tone={role === 'platform' ? 'blue' : role === 'admin' ? 'amber' : role === 'user' ? 'green' : 'neutral'}>{NAV[role].flatMap(g => g.items).length} skjermer</Badge>
            </div>
            {NAV[role].map(group => (
              <div key={group.title} className="mt-5">
                <Label>{group.title}</Label>
                <div className="mt-2 divide-y divide-[#E8EDF1] border-y border-[#E8EDF1]">
                  {group.items.map(item => (
                    <button key={item.id} onClick={() => go(role, item.id as ScreenId)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-[#FAFBFC]">
                      <span><b className="block text-[11px] text-[#314357]">{item.label}</b>{item.caption ? <small className="block pt-0.5 text-[9px] text-[#A06B19]">{item.caption}</small> : null}</span>
                      <span className="flex items-center gap-2">{LIVE[item.id as ScreenId] && <Badge tone="green">Levende</Badge>}<span className="text-[12px] text-[#176B5B]">→</span></span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Panel>
        ))}
      </div>
    </main>
  )
}
