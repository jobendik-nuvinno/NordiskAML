import { useState } from 'react'
import { ACTOR } from '../../api/fakeServer'
import { evaluateBlockers, queueKind, SECTOR_LABEL, serviceLabel, sortQueue } from '../../domain/rules'
import { fmtDate, useStore } from '../../ui/hooks'
import { useApp } from '../context'
import { Badge, Metric, Panel, SmallTitle, Table, TestPanel, btn, statusText, statusTone } from '../ui'

const KIND_LABEL = { system: 'System (kilde)', kunde: 'Kunde', fag: 'Saksbehandler', ferdig: '—', maskin: 'Plattformen' } as const
const FILTERS = { alle: 'Alle', fag: 'Krever faglig arbeid', kunde: 'Venter på kunde', system: 'Systemfeil', ferdig: 'Besluttet' } as const
type Filter = keyof typeof FILTERS

export function QueueScreen() {
  const { cases } = useStore()
  const { role, openCase, go } = useApp()
  const [filter, setFilter] = useState<Filter>('alle')
  const active = cases.filter(c => c.status !== 'decided')
  const count = (f: Filter) => f === 'alle' ? active.length : cases.filter(c => queueKind(c) === f).length
  const shown = sortQueue(cases).filter(c => filter === 'alle' ? c.status !== 'decided' : queueKind(c) === filter)
  const urgent = active.filter(c => c.urgency === 'haster').length
  const mine = active.filter(c => c.owner === ACTOR[role]).length

  const rows = shown.map(c => {
    const blocker = c.status !== 'processing' ? evaluateBlockers(c)[0] : undefined
    return [
      <div key="sak">
        <div className="flex flex-wrap items-center gap-2">{c.urgency === 'haster' && <Badge tone="red">Haster</Badge>}<span>{c.ref}</span><span className="font-semibold text-[#27384B]">{c.name}</span></div>
        <div className="mt-1 text-[11px] font-normal text-[#718096]">{c.scope.country} · {SECTOR_LABEL[c.scope.sector]} · {serviceLabel(c.scope.service)}</div>
      </div>,
      <div key="arsak">
        <Badge tone={statusTone(c.status)}>{statusText(c.status)}</Badge>
        {blocker && <div className="mt-1 text-[11px] text-[#718096]">{blocker.label}</div>}
      </div>,
      KIND_LABEL[queueKind(c)],
      c.owner ?? <span className="text-[#8692A1]">Ikke tildelt</span>,
      fmtDate(c.dueAt),
      <button key="apne" onClick={() => openCase(c.id)} aria-label={`Åpne ${c.name}`} className="text-[11px] font-bold text-[#176B5B]">Åpne →</button>,
    ]
  })

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <Metric label="Åpne kontroller" value={String(active.length)} help={`${urgent} haster`} tone="blue" />
          <Metric label="Klar for vurdering" value={String(cases.filter(c => c.status === 'review_ready').length)} help="Maskinelt klargjort grunnlag" tone="green" />
          <Metric label="Venter på kunde" value={String(cases.filter(c => c.status === 'customer_action').length)} help="Forespørsel i kundeportalen" tone="amber" />
          <Metric label="Venter på kilde" value={String(cases.filter(c => c.status === 'waiting_source').length)} help="Systemfeil – ikke ferdig kontrollert" tone="red" />
        </div>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Prioritert arbeidskø" copy="Sortert etter hastegrad, frist og status. Hva mangler, og hvem må handle?" />
            <button onClick={() => go('scope')} className="bg-[#176F61] px-3.5 py-2 text-[11px] font-bold text-white">Start ny kontroll</button>
          </div>
          <div role="group" aria-label="Filtrer arbeidskøen" className="flex flex-wrap gap-x-4 gap-y-2 border-b border-[#E7EDF1] bg-[#FBFCFD] px-5 py-3 text-[11px] text-[#718096]">
            {(Object.keys(FILTERS) as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={filter === f ? 'font-bold text-[#176B5B]' : 'hover:text-[#176B5B]'}>
                {FILTERS[f]} {count(f)}
              </button>
            ))}
          </div>
          <Table headers={['Sak', 'Årsak', 'Hvem må handle', 'Eier', 'Frist', 'Handling']} rows={rows} />
          {shown.length === 0 && <div className="border-t border-[#E7EDF1] px-5 py-4 text-[11px] text-[#718096]">Ingen saker i dette utvalget.</div>}
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Din tilgang" copy={`${ACTOR[role]} · ${role}`} />
          <div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">
            {[['Saker i kø', String(active.length)], ['Tildelt deg', String(mine)], ['Haster', String(urgent)], ['Krever faglig arbeid', String(count('fag'))]].map(row => (
              <div key={row[0]} className="flex justify-between py-3 text-[11px]"><span className="text-[#718096]">{row[0]}</span><b className="text-[#34465A]">{row[1]}</b></div>
            ))}
          </div>
          <button onClick={() => go('scope')} className={'mt-4 w-full ' + btn.outlineGreen}>Start ny kontroll</button>
        </Panel>
        <TestPanel entries={['Arbeidskø viser bare tildelte/autoriserte saker.', 'Høy risiko og frister er prioriterte.', 'Åpen sperre kan ikke overstyres av lav score.']}
          action={shown[0] ? () => openCase(shown[0].id) : undefined} actionLabel="Åpne øverste sak" />
      </aside>
    </div>
  )
}
