import { useSyncExternalStore } from 'react'
import { membersStore, readMembers, TENANT } from '../../api/membersServer'
import { currentVersion, PACKS, policyStore, readVersions } from '../../api/policyServer'
import { commercialView, managementReport } from '../../domain/metrics'
import type { Case } from '../../domain/types'
import { useApp } from '../context'
import { fmt, showToast, useStore } from '../hooks'
import { Badge, btn, Callout, Metric, Panel, SmallTitle, Table, TestPanel } from '../ui'
import { overallHealth, sourceHealth } from './sourceHealth'

const pct = (n: number, d: number) => d ? `${Math.round((n / d) * 100)} %` : '–'
const d = (iso: string) => iso.split('-').reverse().join('.')

/** Nærmeste frist i en restanse – bare dato, aldri kunde eller sak (UX-05). */
const nearestDue = (cs: Case[]) => cs.length ? fmt(cs.map(c => c.dueAt).sort()[0]) : '–'

/**
 * Virksomhetsoversikt (design «TenantOverview», A01) for bedriftsadmin i Nordic Trade AS.
 * Viser bare antall og status – ingen kundenavn, treff eller saksinnhold (UX-05).
 */
export function TenantOverviewScreen() {
  const { go } = useApp()
  const state = useStore()
  useSyncExternalStore(membersStore.subscribe, membersStore.getVersion, membersStore.getVersion)
  useSyncExternalStore(policyStore.subscribe, policyStore.getVersion, policyStore.getVersion)
  const cases = state.cases
  const r = managementReport(cases)
  const v = commercialView(cases)
  const health = sourceHealth(cases, state.faults.registryDown)
  const overall = overallHealth(health)
  const members = readMembers()
  const active = members.filter(m => m.status === 'aktiv')
  const mfa = active.filter(m => m.mfa).length
  const packs = PACKS.filter(p => p.status === 'aktiv')
  const pending = packs.reduce((n, p) => n + readVersions(p.code).filter(x => x.status === 'foreslått').length, 0)
  const open = cases.filter(c => c.status !== 'decided')
  const waiting = r.backlog.customer_action + r.backlog.waiting_source

  const rows: [string, Case[]][] = [
    ['Uten ansvarlig saksbehandler', open.filter(c => !c.owner)],
    ['Venter på kilde', open.filter(c => c.status === 'waiting_source')],
    ['Venter på kunde', open.filter(c => c.status === 'customer_action')],
    ['Krever faglig avklaring', open.filter(c => c.status === 'needs_review')],
    ['Klar for vurdering', open.filter(c => c.status === 'review_ready')],
  ]

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Aktive kontroller" value={String(r.openBacklog)} help={`${cases.length} registrert totalt`} tone="blue" />
          <Metric label="Klar for vurdering" value={String(r.backlog.review_ready)} help="Grunnlag klargjort – venter på faglig beslutning" tone="green" />
          <Metric label="Venter på kunde eller kilde" value={String(waiting)} help={`${r.backlog.customer_action} på kunde · ${r.backlog.waiting_source} på kilde`} tone={r.backlog.waiting_source ? 'red' : waiting ? 'amber' : 'neutral'} />
          <Metric label="Besluttet" value={String(r.backlog.decided)} help="Menneskelig beslutning registrert" tone="neutral" />
        </div>
        {state.faults.registryDown || r.backlog.waiting_source ? (
          <Callout tone="red">
            {state.faults.registryDown ? 'Registerkilden er utilgjengelig (503). ' : 'Kildeutfall har gitt restkø. '}
            {r.backlog.waiting_source} kontroll(er) står i ventestatus og regnes ikke som ferdig kontrollert.
          </Callout>
        ) : null}
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Aktive landpakker og moduler" copy={`${TENANT} · ${packs.map(p => p.name).join(', ')}`} />
            <Badge tone="green">Virksomhet aktiv</Badge>
          </div>
          <div className="grid divide-y divide-[#E7EDF1] md:grid-cols-2 md:divide-x md:divide-y-0">
            {packs.map(p => {
              const cur = currentVersion(p.code)
              return (
                <div key={p.code} className="border-b border-[#E7EDF1] p-4">
                  <b className="block text-[12px] text-[#34465A]">{`${p.code} AML-regelpakke ${cur ? `v${cur.version}` : '– ingen gjeldende'}`}</b>
                  <small className="mt-1 block text-[11px] text-[#718096]">{p.sector} · {cur ? `gjelder fra ${d(cur.validFrom)}` : 'ikke publisert'}</small>
                </div>
              )
            })}
            <div className="border-b border-[#E7EDF1] p-4">
              <b className="block text-[12px] text-[#34465A]">Policyendringer til godkjenning</b>
              <small className="mt-1 block text-[11px] text-[#718096]">{pending ? `${pending} foreslått – krever annen godkjenner` : 'Ingen ventende endringer'}</small>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Restanser som trenger eier" copy="Antall per årsak. Kunder og saksinnhold vises bare i AML-arbeidsflaten." />
          </div>
          <Table headers={['Årsak', 'Antall', 'Nærmeste frist', 'Status']} rows={rows.map(([label, cs]) => [
            label, String(cs.length), nearestDue(cs),
            cs.length ? <Badge tone={label === 'Venter på kilde' ? 'red' : label === 'Klar for vurdering' ? 'green' : 'amber'}>Åpen</Badge> : <Badge tone="neutral">Ingen</Badge>,
          ])} />
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Brukere og tilgang" copy="Medlemskap styres under «Brukere og roller»." />
          <div className="mt-4 space-y-3">
            <div className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">Aktive medlemmer</span><b className="text-[#34465A]">{active.length}</b></div>
            <div className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">MFA-dekning</span><b className="text-[#34465A]">{pct(mfa, active.length)}</b></div>
            <div className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">Kontroller brukt i {v.period}</span><b className="text-[#34465A]">{v.controlsUsed}</b></div>
            <div className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">Kildehelse</span><Badge tone={overall.tone}>{overall.value}</Badge></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <button onClick={() => go('local-policy')} className={btn.link}>Lokal policy</button>
            <button onClick={() => go('data-sources')} className={btn.link}>Datakilder</button>
            <button onClick={() => go('tenant-audit')} className={btn.link}>Revisjon og forbruk</button>
          </div>
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Virksomhetsgrense" copy={`Bedriftsadmin administrerer bare ${TENANT}.`} />
          <div className="mt-4 border-l-2 border-[#B8413E] bg-[#FDF5F4] p-3 text-[11px] leading-5 text-[#734B4A]">Ingen tilgang til Lumen Capital AB, Copenhagen Cargo A/S eller globale plattforminnstillinger.</div>
          <button onClick={() => showToast('Virksomhetsisolering aktiv: bedriftsadmin kan ikke lese, søke i eller endre en annen virksomhet.', 'info')} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser annen virksomhet</button>
        </Panel>
        <TestPanel entries={['Virksomhetsstatus og egen restkø er synlig – som antall, ikke kunder.', 'Medlemskap og delegasjon styres under «Brukere».', 'Globale policyregler er skrivebeskyttet.']} action={() => go('members')} actionLabel="Åpne brukere og roller" />
      </aside>
    </div>
  )
}
