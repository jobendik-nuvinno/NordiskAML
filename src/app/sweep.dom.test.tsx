// @vitest-environment jsdom
// Gjennomkjøring før kundevisning: klikker gjennom alle roller, funksjoner og skjermer i en ekte DOM og
// feiler på krasj, React-advarsler, flere sidehoder eller synlig «undefined/NaN/Invalid Date».
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemo, setRegistryDown, setTiming, store } from '../api/fakeServer'
import { resetMembers } from '../api/membersServer'
import { resetPartnerApi } from '../api/partnerApi'
import { resetPolicies } from '../api/policyServer'
import { resetRestricted } from '../api/restrictedServer'
import { AppShell } from './Shell'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
setTiming([0, 0], 0)

let host: HTMLDivElement
let root: Root
let problems: string[]
const spies: ReturnType<typeof vi.spyOn>[] = []

beforeEach(async () => {
  resetPartnerApi(); resetRestricted(); resetPolicies(); resetMembers()
  await resetDemo()
  window.history.replaceState(null, '', '#/')
  problems = []
  for (const m of ['error', 'warn'] as const)
    spies.push(vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { problems.push(`console.${m}: ${a.map(String).join(' ').slice(0, 300)}`) }))
  window.confirm = () => true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<AppShell />))
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  spies.splice(0).forEach(s => s.mockRestore())
  setRegistryDown(false)
})

const tick = () => act(async () => { await new Promise(r => setTimeout(r, 5)) })
const buttons = (scope: ParentNode = host) => [...scope.querySelectorAll('button')] as HTMLButtonElement[]
const byText = (text: string, scope: ParentNode = host) => {
  const b = buttons(scope).find(x => x.textContent?.replace(/\s+/g, ' ').includes(text))
  if (!b) throw new Error(`Fant ikke knappen «${text}» på «${host.querySelector('h1')?.textContent}»`)
  return b
}
/** Som en ekte mus: mousedown (lukker åpne menyer) og deretter klikk. */
const click = async (b: HTMLElement) => {
  await act(async () => { b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); b.click() })
  await tick()
}
const navLabels = () => [...host.querySelectorAll('nav[aria-label="Skjermer"] button')].map(b => b.textContent ?? '')

function assertPageOk(where: string) {
  expect(host.querySelectorAll('h1'), `${where}: antall h1`).toHaveLength(1)
  const text = host.textContent ?? ''
  for (const bad of ['undefined', 'NaN', 'Invalid Date', '[object Object]', 'null ·', '· null'])
    expect(text.includes(bad), `${where}: synlig «${bad}»`).toBe(false)
  expect(problems, where).toEqual([])
}

async function chooseRole(label: string, fn?: string) {
  await click(host.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement)
  await click(byText(label, host.querySelector('[role="menu"]')!))
  if (fn) {
    await click(host.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement)
    await click(byText(fn, host.querySelector('[role="menu"]')!))
  }
}

async function visitAll(where: string) {
  const labels = navLabels()
  for (const l of labels) {
    const b = [...host.querySelectorAll('nav[aria-label="Skjermer"] button')].find(x => x.textContent === l) as HTMLButtonElement
    await click(b)
    assertPageOk(`${where} › ${l}`)
  }
  return labels.length
}

describe('gjennomkjøring av alle skjermer', () => {
  it('alle roller og funksjoner, uten aktiv sak', async () => {
    let n = 0
    for (const fn of ['Saksbehandler', 'Faglig godkjenner', 'Hvitvaskingsansvarlig']) {
      await chooseRole('AML-arbeidsflate', fn)
      n += await visitAll(`Bruker/${fn}`)
    }
    for (const r of ['Plattformadministrasjon', 'Bedriftsadministrasjon', 'Kundeportal']) {
      await chooseRole(r)
      n += await visitAll(r)
    }
    expect(n).toBeGreaterThan(40)
  })

  it('hver sak i hver sakstilstand, alle sakssider, alle funksjoner', async () => {
    for (const fn of ['Saksbehandler', 'Faglig godkjenner', 'Hvitvaskingsansvarlig']) {
      await chooseRole('AML-arbeidsflate', fn)
      for (const c of store.state.cases) {
        await click(byText('Arbeidskø', host.querySelector('nav[aria-label="Skjermer"]')!))
        const open = host.querySelector(`button[aria-label="Åpne ${c.name}"]`) as HTMLButtonElement | null
        if (!open) continue // besluttede saker vises ikke under «Alle åpne»
        await click(open)
        await visitAll(`${fn} › ${c.name} (${c.status})`)
      }
    }
  })

  it('kildeutfall og tilbakestilling midt i arbeidet gir ingen feil', async () => {
    await chooseRole('AML-arbeidsflate', 'Saksbehandler')
    await click(host.querySelector(`button[aria-label^="Åpne Kystlinje"]`)!)
    await click(host.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement)
    const box = host.querySelector('[role="menu"] input[type="checkbox"]') as HTMLInputElement
    await act(async () => box.click()); await tick()
    await visitAll('Kildeutfall')
    await click(host.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement)
    await click(byText('Tilbakestill testdata', host.querySelector('[role="menu"]')!))
    await tick()
    await visitAll('Etter tilbakestilling')
  })

  it('demomanuset (kortversjon) med ekte klikk: org.nr → sperre → kundeportal → beslutning → låst grunnlag → overprøving', async () => {
    const type = async (el: HTMLTextAreaElement | HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!
      await act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })) })
    }
    const waitFor = async (ok: () => boolean, what: string) => {
      for (let i = 0; i < 100 && !ok(); i++) await tick()
      expect(ok(), what).toBe(true)
    }
    const nav = (label: string) => click(byText(label, host.querySelector('nav[aria-label="Skjermer"]')!))
    const h1 = () => host.querySelector('h1')?.textContent

    await chooseRole('AML-arbeidsflate', 'Saksbehandler')
    // 1–2: ny kontroll på org.nr
    await nav('Ny kontroll og avgrensing')
    await click(byText('Start kontroll'))
    await waitFor(() => h1() === 'Saksoversikt', 'åpner saken etter start')
    const fjord = () => store.state.cases.find(c => c.orgNr === '100200301')!
    await waitFor(() => fjord().status === 'needs_review', 'trinnene går ferdig og saken får sperre')
    assertPageOk('Saksoversikt etter start')
    expect(host.textContent).toContain('Fjordlys Eksempel AS')
    // 3: eierskap → be om dokumentasjon
    await nav('Eierskap og kontroll')
    expect(host.textContent).toContain('36 %')
    await click(byText('Be om dokumentasjon'))
    await waitFor(() => fjord().status === 'customer_action', 'forespørsel sendt')
    assertPageOk('Eierskap etter forespørsel')
    // 4: kundeportal
    await chooseRole('Kundeportal')
    expect(host.textContent).toContain('Baltic Invest Eksempel')
    expect(host.textContent).not.toMatch(/score|sanksjon|sperre/i)
    await click(buttons().filter(b => b.textContent === 'Send uten vedlegg').at(-1)!)
    await waitFor(() => fjord().status === 'review_ready', 'kunden leverer, sperren løftes')
    assertPageOk('Kundeportal etter levering')
    // 6: godkjenner beslutter
    await chooseRole('AML-arbeidsflate', 'Faglig godkjenner')
    await nav('Arbeidskø')
    await click(host.querySelector('button[aria-label="Åpne Fjordlys Eksempel AS"]')!)
    await nav('Beslutning')
    await type(host.querySelector('#decision-reason') as HTMLTextAreaElement, 'Eierskap dokumentert av kunden, forsterkede tiltak for utenlandsk ledd.')
    await click(byText('Fatt beslutning'))
    await waitFor(() => fjord().status === 'decided', 'beslutning fattet')
    assertPageOk('Beslutning fattet')
    expect(host.textContent).toContain('10 år')
    // låst grunnlag i overlegg, lukkes med Escape
    await click(byText('Åpne låst beslutningsgrunnlag'))
    expect(host.querySelector('[role="dialog"]')).not.toBeNull()
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); host.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    await tick()
    expect(host.querySelector('[role="dialog"]'), 'Escape lukker overlegget').toBeNull()
    // historikk: registerendring endrer ikke låst grunnlag
    await nav('Sakshistorikk og oppbevaring')
    await click(byText('Oppdater registerdata'))
    await waitFor(() => fjord().registry?.roles.some(r => r.name === 'Nora Eksempel') ?? false, 'registerendring mottatt')
    expect(fjord().decisions[0].snapshot.registry?.roles.some(r => r.name === 'Nora Eksempel')).toBe(false)
    assertPageOk('Historikk etter registerendring')
    // 7: overprøving
    await nav('Beslutning')
    await type(host.querySelector('#reopen-reason') as HTMLTextAreaElement, 'Korrigert identitet for reell rettighetshaver – nytt grunnlag.')
    await click(byText('Overprøv beslutning', host.querySelector('main')!))
    await waitFor(() => fjord().status !== 'decided', 'saken åpnes for ny beslutning')
    assertPageOk('Etter overprøving')
    expect(host.textContent).toContain('Tidligere beslutning (versjon 1)')
    expect((host.querySelector('#decision-reason') as HTMLTextAreaElement).value, 'skjemaet er tømt etter overprøving').toBe('')
  })
})
