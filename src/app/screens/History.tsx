import { useState } from 'react'
import { registerLaterChange } from '../../api/fakeServer'
import { OUTCOME_LABEL, reviewState } from '../../domain/rules'
import type { Decision } from '../../domain/types'
import { fmt, useCall, useStore } from '../hooks'
import { useApp } from '../context'
import { Badge, btn, Callout, checkTone, KeyValues, Label, mono, Panel, SmallTitle, Table, TestPanel } from '../ui'

/** Sakshistorikk og oppbevaring (design «History»): revisjonslogg, låst beslutningsgrunnlag og oppbevaringsfrist. */
export function HistoryScreen() {
  const { role, caseId } = useApp()
  const c = useStore().cases.find(x => x.id === caseId)!
  const { busy, run } = useCall()
  const [locked, setLocked] = useState<Decision | null>(null)
  const d = c.decisions[0]
  const review = d ? reviewState(d.nextReviewAt) : 'ingen'
  const events = [...c.audit].reverse()

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]">
      <Panel>
        <div className="border-b border-[#E2E8ED] px-5 py-4">
          <SmallTitle title="Hendelser, beslutninger og oppbevaring" copy="Hva var kjent, hvem gjorde hva, og hvilken policy gjaldt på handlingstidspunktet." />
        </div>
        <Table headers={['Tid', 'Hendelse', 'Detalj', 'Aktør', 'Korrelasjon']} rows={events.map(e => {
          const dec = e.decisionId ? c.decisions.find(x => x.id === e.decisionId) : undefined
          return [
            fmt(e.at),
            <div>{e.action}{dec ? <div className="mt-1"><button type="button" className={btn.link} onClick={() => setLocked(dec)}>Åpne eksakt beslutningsgrunnlag</button></div> : null}</div>,
            e.detail || '–',
            <Badge tone={e.actor === 'System' ? 'neutral' : 'blue'}>{e.actor}</Badge>,
            <span className={mono}>{e.correlationId.slice(0, 8)}</span>,
          ]
        })} />
      </Panel>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Oppbevaring og neste kontroll" copy="Frist styres av landpakke, utfall og eventuelle unntak." />
          <div className="mt-4">
            {d ? (
              <KeyValues width={120} rows={[
                ['Utfall', OUTCOME_LABEL[d.outcome]],
                ['Oppbevaring', `${d.retention.years} år`],
                ['Startpunkt', d.retention.until ? fmt(d.retention.from) : d.retention.from],
                ['Til', d.retention.until ? fmt(d.retention.until) : 'Fastsettes når forholdet avsluttes'],
                ['Grunnlag', d.retention.basis],
                ['Neste kontroll', d.nextReviewAt
                  ? <span className="flex flex-wrap items-center gap-2">{fmt(d.nextReviewAt)} <Badge tone={review === 'forfalt' ? 'red' : 'blue'}>{review === 'forfalt' ? 'Forfalt' : 'Planlagt'}</Badge></span>
                  : 'Ingen – kundeforhold ikke etablert'],
              ]} />
            ) : <Callout tone="blue">Ingen beslutning ennå. Oppbevaringsfrist og neste kontroll fastsettes når saken besluttes.</Callout>}
          </div>
          {d ? (
            <>
              <div className="mt-4"><Callout tone="green">Registeret kan endre seg etter beslutningen. Det låste beslutningsgrunnlaget endres ikke – åpne det fra loggen og sammenlign.</Callout></div>
              <button type="button" disabled={busy} onClick={() => run(() => registerLaterChange(role, c.id), 'Registerendring mottatt – låst grunnlag er uendret')} className={'mt-4 w-full ' + btn.outlineGreen}>Oppdater registerdata</button>
            </>
          ) : null}
        </Panel>
        <TestPanel entries={['Senere korrigering endrer ikke beslutningsbildet historisk.', 'Sletteloggen spilles før gjenåpnet tilgang.', 'Legal hold trenger grunnlag, eier og ny vurderingsdato.']} />
      </aside>
      {locked ? <LockedBasis decision={locked} close={() => setLocked(null)} /> : null}
    </div>
  )
}

/** Skrivebeskyttet visning av det låste beslutningsgrunnlaget (PRV-02). */
function LockedBasis({ decision: d, close }: { decision: Decision; close: () => void }) {
  const s = d.snapshot
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0F2530]/50 p-4" role="dialog" aria-modal="true" aria-label="Låst beslutningsgrunnlag" onKeyDown={e => e.key === 'Escape' && close()}>
      <Panel className="w-full max-w-[760px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Label>Låst beslutningsgrunnlag · skrivebeskyttet</Label>
            <div className="mt-1 text-[15px] font-semibold text-[#172536]">{s.caseRef} · {OUTCOME_LABEL[d.outcome]}</div>
          </div>
          <button type="button" className={btn.secondary} onClick={close} autoFocus>Lukk</button>
        </div>
        <div className="mt-4">
          <KeyValues width={130} rows={[
            ['SHA-256', <span className={mono}>{d.sha256}</span>],
            ['Fanget', fmt(s.capturedAt)],
            ['Besluttet av', d.actor],
            ['Anbefaling', OUTCOME_LABEL[s.recommendation] + (d.deviates ? ' (avvik)' : '')],
            ['Begrunnelse', d.reason],
            ['Registerroller', s.registry ? s.registry.roles.map(r => `${r.role}: ${r.name}`).join(' · ') + ` (hentet ${fmt(s.registry.fetchedAt)})` : '–'],
          ]} />
        </div>
        <div className="mt-5"><Label>Kontroller</Label></div>
        <Table headers={['Kontroll', 'Status', 'Detalj']} rows={s.checks.map(k => [k.label, <Badge tone={checkTone[k.state][0]}>{checkTone[k.state][1]}</Badge>, k.detail])} />
        <div className="mt-5"><Label>Risikofaktorer</Label></div>
        {s.risk
          ? <Table headers={['Faktor', 'Verdi', 'Bidrag']} rows={[...s.risk.factors.map(f => [f.label, f.value, `+${f.contribution}`]), [`Sum (${s.risk.policy} v${s.risk.version})`, s.risk.band, String(s.risk.score)]]} />
          : <div className="mt-2 text-[11px] text-[#718096]">Ingen risikovurdering.</div>}
        <div className="mt-5"><Label>Bevis</Label></div>
        <Table headers={['Bevis', 'SHA-256']} rows={s.evidence.map(ev => [ev.title, <span className={mono}>{ev.sha256.slice(0, 16)}…</span>])} />
      </Panel>
    </div>
  )
}
