import { useSyncExternalStore } from 'react'
import { webhookLog } from '../../api/partnerApi'
import { PACKS, policyStore, readVersions } from '../../api/policyServer'
import { fmt, showToast, useStore } from '../hooks'
import { Badge, Callout, KeyValues, Metric, Panel, SmallTitle, Table, TestPanel } from '../ui'
import { duration, latency, overallHealth, since, sourceHealth } from './sourceHealth'

const deliveries = () => webhookLog.get().reduce((n, e) => n + 1 + e.deliveries.length, 0)

/**
 * Driftsinnsikt (design «Operations», P05) for plattformdrift. Bare tekniske helsetall (SEC-02):
 * ingen kundenavn, treff eller saksinnhold – heller ikke saksreferanser.
 */
export function OperationsScreen() {
  const state = useStore()
  useSyncExternalStore(webhookLog.subscribe, deliveries, deliveries)
  useSyncExternalStore(policyStore.subscribe, policyStore.getVersion, policyStore.getVersion)
  const health = sourceHealth(state.cases, state.faults.registryDown)
  const overall = overallHealth(health)
  const backlog = state.cases.filter(c => c.status === 'waiting_source').length
  const lastOk = health.map(h => h.lastSuccess).filter((x): x is string => !!x).sort().at(-1) ?? null
  const lat = latency(state.cases)
  const log = webhookLog.get()
  const sent = log.flatMap(e => e.deliveries)
  const failed = sent.filter(x => x.status >= 300 || !x.verified).length
  const queued = log.filter(e => e.deliveries.length === 0).length
  const pending = PACKS.reduce((n, p) => n + readVersions(p.code).filter(v => v.status === 'foreslått').length, 0)

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Kildehelse" value={overall.value} help={state.faults.registryDown ? 'Registeret svarer 503' : lastOk ? `Siste vellykkede oppslag for ${since(lastOk)} siden` : 'Ingen vellykket oppslag registrert'} tone={overall.tone} />
          <Metric label="Restkø" value={String(backlog)} help="Kontroller som venter på kilde" tone={backlog ? 'red' : 'neutral'} />
          <Metric label="Webhook-leveranser" value={String(sent.length)} help={`${failed} feilet · ${queued} i kø`} tone={failed ? 'amber' : 'blue'} />
        </div>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Eksterne avhengigheter" copy="Kildesvikt vises som manglende dekning – aldri som «ren» status. Tom eller delvis feed gir ikke grønt." />
          </div>
          <Table headers={['Avhengighet', 'Status', 'Siste vellykkede oppslag', 'Restkø', 'Reserve']} rows={health.map(h => [
            h.src.source,
            <Badge tone={h.tone}>{h.status}</Badge>,
            h.lastSuccess ? `${fmt(h.lastSuccess)} (${since(h.lastSuccess)} siden)` : 'Aldri',
            String(h.backlog),
            h.tone === 'green' ? 'Ikke nødvendig' : 'Ventestatus · dokumentforespørsel',
          ])} />
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Kontrolldekning og forsinkelse" copy="Kildeforsinkelse holdes adskilt fra intern behandlingstid (MON-06)." />
          </div>
          <div className="p-5">
            <KeyValues width={210} rows={[
              ['Kildeforsinkelse (venting på kilde)', `${duration(lat.sourceAvgMs)} i snitt · ${lat.sourceCases} kontroller berørt`],
              ['Intern behandlingstid', `${duration(lat.internalAvgMs)} i snitt · ${lat.internalCases} kontroller klargjort`],
              ['Tid siden siste vellykkede oppslag', since(lastOk)],
              ['Publiseringstid fra kilde', <Badge tone="amber">Mangler telemetri</Badge>],
              ['Policyendringer til godkjenning', String(pending)],
            ]} />
            <div className="mt-4"><Callout tone="amber">Manglende telemetri flagges og telles ikke som oppetid (OPS-01).</Callout></div>
          </div>
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Personvern i drift" copy="SEC-02" />
          <div className="mt-4"><Callout tone="blue">Ingen kundenavn, treff eller saksinnhold. Drift ser bare tekniske tall.</Callout></div>
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Sikkerhetsbremse" copy="Kritisk falsk klarering, lekkasje eller data på tvers av virksomheter stanser berørt automasjon." />
          <button onClick={() => showToast('Automasjon er stanset for berørt kilde, bevis er sikret og ansvarlig er varslet.', 'info')} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser sikkerhetsbremse</button>
        </Panel>
        <TestPanel entries={['Tom feed må ikke gi grønn status.', 'Reserveprosess skal fremgå på kontrollgrunnlaget.', 'Drift viser helse uten å utlevere kundesaker.']} />
      </aside>
    </div>
  )
}
