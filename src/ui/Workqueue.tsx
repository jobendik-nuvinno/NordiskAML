import { useState } from 'react'
import { evaluateBlockers, queueKind, SECTOR_LABEL, serviceLabel, sortQueue, STATUS_LABEL } from '../domain/rules'
import type { Case } from '../domain/types'
import { fmtDate, useStore } from './hooks'

const KIND_LABEL = { system: 'System (kilde)', kunde: 'Kunde', fag: 'Saksbehandler', ferdig: '—', maskin: 'Plattformen' } as const
const FILTERS = { alle: 'Alle åpne', fag: 'Krever faglig arbeid', kunde: 'Venter på kunde', system: 'Systemfeil / kilde', ferdig: 'Besluttet' } as const
type Filter = keyof typeof FILTERS

export function statusBadge(c: Case) {
  const cls = c.status === 'review_ready' || c.status === 'decided' ? '' : c.status === 'waiting_source' ? 'err' : c.status === 'processing' ? 'neutral' : 'warn'
  return <span className={`badge ${cls}`}>{STATUS_LABEL[c.status]}</span>
}

export function Workqueue({ open }: { open: (id: string) => void }) {
  const { cases } = useStore()
  const [filter, setFilter] = useState<Filter>('alle')
  const active = cases.filter(c => c.status !== 'decided')
  const shown = sortQueue(cases).filter(c =>
    filter === 'alle' ? c.status !== 'decided' : queueKind(c) === filter)

  return (
    <>
      <div className="cap">Saksbehandler / dagens arbeid</div>
      <h1>Arbeidskø</h1>
      <p className="sub">Hva mangler, hvem skal gjøre noe, og hva bygger konklusjonen på? Sortert etter hastegrad og frist.</p>
      <div className="cards">
        <div className="card"><div className="number">{active.length}</div>Åpne kontroller</div>
        <div className="card"><div className="number">{cases.filter(c => c.status === 'review_ready').length}</div>Klar for faglig vurdering</div>
        <div className="card"><div className="number">{cases.filter(c => c.status === 'customer_action').length}</div>Venter på kunde</div>
        <div className="card"><div className="number">{cases.filter(c => c.status === 'waiting_source').length}</div>Venter på kilde</div>
      </div>
      <article>
        <label className="inline">Vis
          <select value={filter} onChange={e => setFilter(e.target.value as Filter)}>
            {Object.entries(FILTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <table>
          <caption className="sr-only" style={{ position: 'absolute', left: -9999 }}>Kontroller i arbeidskøen</caption>
          <thead><tr><th>Sak</th><th>Status og årsak</th><th>Hvem må handle</th><th>Eier</th><th>Frist</th><th><span style={{ position: 'absolute', left: -9999 }}>Handling</span></th></tr></thead>
          <tbody>
            {shown.map(c => {
              const blocker = evaluateBlockers(c)[0]
              return (
                <tr key={c.id}>
                  <td>
                    {c.urgency === 'haster' && <><span className="badge err">HASTER</span> </>}
                    <span className="bold">{c.name}</span><br />
                    <span className="mut">{c.ref} · {c.scope.country} · {SECTOR_LABEL[c.scope.sector]} · {serviceLabel(c.scope.service)}</span>
                  </td>
                  <td>{statusBadge(c)}{blocker && c.status !== 'processing' && <div className="mut">{blocker.label}</div>}</td>
                  <td>{KIND_LABEL[queueKind(c)]}</td>
                  <td>{c.owner ?? <span className="mut">Ikke tildelt</span>}</td>
                  <td>{fmtDate(c.dueAt)}</td>
                  <td><button onClick={() => open(c.id)} aria-label={`Åpne ${c.name}`}>Åpne</button></td>
                </tr>
              )
            })}
            {shown.length === 0 && <tr><td colSpan={6} className="mut">Ingen saker i dette utvalget.</td></tr>}
          </tbody>
        </table>
      </article>
    </>
  )
}
