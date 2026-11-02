import { retrySource } from '../../api/fakeServer'
import { OUTCOME_LABEL, reviewState } from '../../domain/rules'
import { fmt, useCall, useStore } from '../../ui/hooks'
import { useApp } from '../context'
import { Badge, btn, Callout, Metric, Panel, SmallTitle, Table, TestPanel } from '../ui'

/** Løpende oppfølging (design «Monitoring»): kontrollkalender, saker som venter på kilde (MON-03) og gjenåpning. */
export function MonitoringScreen() {
  const { role, openCase } = useApp()
  const { cases } = useStore()
  const { busy, run } = useCall()
  const decided = cases.filter(c => c.decisions.length)
    .map(c => ({ c, d: c.decisions[0] }))
    .sort((a, b) => (a.d.nextReviewAt ?? '9').localeCompare(b.d.nextReviewAt ?? '9'))
  const waiting = cases.filter(c => c.status === 'waiting_source')
  const overdue = decided.filter(x => reviewState(x.d.nextReviewAt) === 'forfalt').length
  const planned = decided.filter(x => reviewState(x.d.nextReviewAt) === 'planlagt').length

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Planlagte kontroller" value={String(planned)} help="Besluttede kundeforhold med neste kontrolldato" tone="blue" />
          <Metric label="Forfalt" value={String(overdue)} help="Passert dato gir aldri «fornyet»" tone={overdue ? 'red' : 'green'} />
          <Metric label="Venter på kilde" value={String(waiting.length)} help="Gjenopptas fra siste bekreftede posisjon" tone={waiting.length ? 'amber' : 'green'} />
        </div>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Kontrollkalender" copy="Neste kontroll fastsettes ved beslutning ut fra risikonivå." />
            <Badge tone="blue">{decided.length} aktive oppfølginger</Badge>
          </div>
          {decided.length === 0
            ? <div className="px-5 py-4 text-[11px] text-[#718096]">Ingen besluttede saker ennå. Kontrollkalenderen fylles når en sak besluttes.</div>
            : <Table headers={['Kunde / kontroll', 'Utfall', 'Besluttet', 'Neste kontroll', 'Status', '']} rows={decided.map(({ c, d }) => {
              const st = reviewState(d.nextReviewAt)
              return [
                <span>{c.name}<br /><span className="text-[10px] font-normal text-[#718096]">{c.ref}</span></span>,
                OUTCOME_LABEL[d.outcome],
                fmt(d.at),
                d.nextReviewAt ? fmt(d.nextReviewAt) : 'Ingen',
                st === 'forfalt' ? <Badge tone="red">Forfalt</Badge> : st === 'planlagt' ? <Badge tone="blue">Planlagt</Badge> : <Badge>Ingen</Badge>,
                <button type="button" className={btn.link} onClick={() => openCase(c.id, 'history')} aria-label={`Åpne historikk for ${c.name}`}>Åpne</button>,
              ]
            })} />}
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Venter på kilde (MON-03)" copy="Kildesvikt vises som manglende dekning – aldri som «ren» status. Nytt forsøk oppretter ingen ny kontroll." />
          </div>
          {waiting.length === 0
            ? <div className="px-5 py-4 text-[11px] text-[#718096]">Ingen saker venter på kilde.</div>
            : <Table headers={['Kunde', 'Land', 'Siden', 'Status', '']} rows={waiting.map(c => [
              <span>{c.name}<br /><span className="text-[10px] font-normal text-[#718096]">{c.ref}</span></span>,
              c.scope.country,
              fmt(c.audit[c.audit.length - 1]?.at ?? c.createdAt),
              <Badge tone="red">Venter på kilde</Badge>,
              <button type="button" disabled={busy} className={btn.outlineGreen} onClick={() => run(() => retrySource(role, c.id), 'Nytt forsøk startet')} aria-label={`Prøv kilden igjen for ${c.name}`}>Prøv kilden igjen</button>,
            ])} />}
          <div className="border-t border-[#E2E8ED] px-5 py-4 text-[11px] text-[#617188]">
            Demo: bryteren for registerfeil (503) i sidemenyen styrer om kilden svarer. Er feilen fortsatt på, gir nytt forsøk 503 og saken blir stående.
          </div>
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Gjenåpning ved endring" copy="Endringer og leverandørfeil synliggjøres før en kontroll blir utdatert." />
          <div className="mt-4 space-y-3">
            <Callout tone="blue">Screeningavklaringer har en gyldighetsdato. Når den passeres, eller listen gir nytt treff, gjenåpnes avklaringen og må vurderes på nytt.</Callout>
            <Callout tone="amber">En forfalt kontroll blir aldri automatisk fornyet – fornyelse krever en ny kontroll med nytt grunnlag.</Callout>
          </div>
        </Panel>
        <TestPanel entries={['Endret kundebilde oppretter ansvarlig oppgave.', 'Re-screening er rolle- og friststyrt.', 'Kildeutfall har reserve, dekningsgrad og restkø.']} />
      </aside>
    </div>
  )
}
