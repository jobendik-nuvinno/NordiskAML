import { automationRate, managementReport, type RiskBand } from '../../domain/metrics'
import { STATUS_LABEL } from '../../domain/rules'
import type { CaseStatus } from '../../domain/types'
import { useStore } from '../../ui/hooks'
import { Badge, Callout, Metric, Panel, SmallTitle, Table, TestPanel } from '../ui'

const pctText = (r: number) => `${Math.round(r * 1000) / 10} %`
const RISK_LABEL: Record<RiskBand, string> = { lav: 'Lav', middels: 'Middels', høy: 'Høy', ikke_vurdert: 'Ikke vurdert' }

function Rows({ rows }: { rows: [string, string | number][] }) {
  return (
    <div className="mt-4 space-y-3">
      {rows.map(([k, v]) => <div key={k} className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">{k}</span><b className="text-[#34465A]">{v}</b></div>)}
    </div>
  )
}

/** Intern innsikt for AML-ansvarlig: automatiseringsgrad (teller/nevner) og ledelsesrapport, beregnet fra revisjonsloggen. */
export function InsightsScreen() {
  const { cases } = useStore()
  const m = automationRate(cases)
  const r = managementReport(cases)
  const name = (ref: string) => cases.find(c => c.ref === ref)?.name ?? ref

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Maskinelt klargjort" value={pctText(m.rate)} help={`${m.numerator} / ${m.denominator} påbegynte kontroller`} tone="green" />
          <Metric label="Frafall" value={String(m.denominator - m.numerator)} help={`Manuell innhenting, venter eller stoppet · utelatt: ${m.omitted.reduce((n, o) => n + o.count, 0)}`} tone="amber" />
          <Metric label="Beslutninger" value={String(m.humanDecisions)} help={`Menneskelige · automatiske: ${m.automatedDecisions}`} tone="blue" />
        </div>
        <Callout tone="amber">Målet om ≥ 70 % maskinelt ferdige grunnlag er en pilotambisjon, ikke et målt resultat. Tallene gjelder bare demodataene ({m.totalCases} saker, andel av alle: {pctText(m.shareOfAll)}).</Callout>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Utvalg per sak" copy="Teller: grunnlag klart for faglig vurdering med bare systemhendelser etter registrering. Nevner: alle påbegynte kontroller, også ventende og stoppede. En menneskelig beslutning gjør aldri saken til en automatisk beslutning." />
          </div>
          <Table headers={['Sak', 'Talt med', 'Årsak fra loggen']} rows={m.perCase.map(p => [
            <span>{name(p.ref)}<br /><span className="text-[10px] font-normal text-[#718096]">{p.ref}</span></span>,
            !p.started ? <Badge>Utelatt</Badge> : p.automated ? <Badge tone="green">Maskinelt ferdig</Badge> : <Badge tone="amber">Frafall</Badge>,
            p.reason,
          ])} />
          {m.excluded.length > 0 ? (
            <div className="border-t border-[#E2E8ED] px-5 py-4">
              <SmallTitle title="Frafall etter årsak" />
              <Rows rows={m.excluded.map(e => [e.reason, e.count])} />
            </div>
          ) : null}
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Ledelsesrapport · restanser" copy="Kvalitet, friksjon og risikodekning – ikke bare volum." />
          <Rows rows={[...(Object.keys(r.backlog) as CaseStatus[]).map(s => [STATUS_LABEL[s], r.backlog[s]] as [string, number]), ['Åpne totalt', r.openBacklog]]} />
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Risikofordeling" />
          <Rows rows={(Object.keys(r.risk) as RiskBand[]).map(b => [RISK_LABEL[b], r.risk[b]])} />
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Kildekvalitet og tiltak" />
          <Rows rows={[
            ['Kildeutfall (logg)', r.sourceOutages], ['Venter på kilde nå', r.waitingOnSource], ['Kilde gjenopprettet', r.sourceRecoveries],
            ['Åpne PEP-/sanksjonstreff', r.openHits], ['Obligatoriske tiltak', r.measures], ['Manuelle handlinger (logg)', r.manualActions],
          ]} />
        </Panel>
        <TestPanel entries={['Alle tall beregnes fra revisjonsloggen.', 'Ventende og stoppede kontroller er med i nevneren.', 'Plattformen fatter aldri automatiske beslutninger.']} />
      </aside>
    </div>
  )
}
