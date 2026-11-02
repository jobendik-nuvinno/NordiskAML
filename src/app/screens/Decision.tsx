import { useEffect, useState } from 'react'
import { ACTOR, decide } from '../../api/fakeServer'
import { evaluateBlockers, OUTCOME_LABEL, recommend, reviewState } from '../../domain/rules'
import type { Decision, DecisionOutcome } from '../../domain/types'
import { fmt, useCall, useStore } from '../../ui/hooks'
import { useApp } from '../context'
import { Badge, btn, Callout, checkTone, field, fieldLabel, KeyValues, Label, mono, Panel, SmallTitle, Table, TestPanel } from '../ui'
import { OwnershipView } from './Ownership'

function Box({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="border border-[#E2E8ED] p-4">
      <Label>{label}</Label>
      <div className="mt-1 text-[13px] font-semibold text-[#314357]">{value}</div>
      <p className="mt-2 text-[11px] leading-5 text-[#718096]">{help}</p>
    </div>
  )
}

function Retention({ d }: { d: Decision }) {
  const review = reviewState(d.nextReviewAt)
  return (
    <KeyValues width={120} rows={[
      ['Oppbevaring', <>{d.retention.years} år fra {d.retention.until ? fmt(d.retention.from) : d.retention.from.toLowerCase()}{d.retention.until && <> (til {fmt(d.retention.until)})</>}</>],
      ['Grunnlag', <span className="font-normal text-[#718096]">{d.retention.basis}</span>],
      ['Neste kontroll', d.nextReviewAt
        ? <>{fmt(d.nextReviewAt)} <Badge tone={review === 'forfalt' ? 'red' : 'neutral'}>{review === 'forfalt' ? 'Forfalt' : 'Planlagt'}</Badge></>
        : 'Ingen – kundeforhold ikke etablert'],
    ]} />
  )
}

/** Skrivebeskyttet visning av det låste beslutningsgrunnlaget. */
export function SnapshotOverlay({ decision: d, close }: { decision: Decision; close: () => void }) {
  const s = d.snapshot
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#172536]/40 p-6" role="dialog" aria-modal="true" aria-label="Låst beslutningsgrunnlag">
      <div className="mx-auto max-w-[1100px] space-y-5 bg-[#F4F7F9] p-5">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <div>
              <Label>Låst beslutningsgrunnlag · skrivebeskyttet</Label>
              <div className="mt-1 text-[16px] font-semibold text-[#26384B]">{s.caseRef} · {OUTCOME_LABEL[d.outcome]}</div>
              <div className="mt-1 text-[11px] text-[#718096]">Fanget {fmt(s.capturedAt)} · besluttet av {d.actor} · anbefaling {OUTCOME_LABEL[s.recommendation]}</div>
            </div>
            <button type="button" autoFocus onClick={close} className={btn.secondary}>Lukk</button>
          </div>
          <div className="space-y-2 p-5">
            <p className={mono}>SHA-256: {d.sha256}</p>
            <p className="text-[12px] text-[#4E6075]"><b>Begrunnelse:</b> {d.reason}</p>
          </div>
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Register slik det var ved beslutning" copy={s.registry ? `${s.registry.legalName} · ${s.registry.source} · hentet ${fmt(s.registry.fetchedAt)}` : 'Ingen registerdata'} />
          </div>
          <Table headers={['Rolle', 'Navn']} rows={(s.registry?.roles ?? []).map(r => [r.role, r.name])} />
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Eierskap" copy="Eierkjeden slik den var kjent ved beslutning." /></div>
          <OwnershipView subjectId={s.parties[0]?.id ?? ''} parties={s.parties} edges={s.edges} />
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Kontroller" /></div>
          <Table headers={['Kontroll', 'Detalj', 'Status']} rows={s.checks.map(k => [k.label, k.detail, <Badge tone={checkTone[k.state][0]}>{checkTone[k.state][1]}</Badge>])} />
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Risiko" copy={s.risk ? `${s.risk.policy} v${s.risk.version} · ${s.risk.score} (${s.risk.band})` : 'Ikke beregnet'} />
          </div>
          {s.risk && <Table headers={['Faktor', 'Verdi', 'Kilde', 'Bidrag']} rows={s.risk.factors.map(f => [f.label, f.value, f.source, `+${f.contribution}`])} />}
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Bevis" /></div>
          <Table headers={['Bevis', 'Kilde', 'Samlet', 'SHA-256']} rows={s.evidence.map(ev => [ev.title, `${ev.source} v${ev.version}`, fmt(ev.collectedAt), <span className={mono}>{ev.sha256}</span>])} />
        </Panel>
      </div>
    </div>
  )
}

export function DecisionScreen() {
  const { role, caseId } = useApp()
  const c = useStore().cases.find(x => x.id === caseId)!
  const blockers = evaluateBlockers(c)
  const rec = recommend(c.risk, blockers)
  const [outcome, setOutcome] = useState<DecisionOutcome>(rec)
  const [reason, setReason] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [snapshot, setSnapshot] = useState<Decision | null>(null)
  const { busy, run } = useCall()
  const d = c.decisions[0]
  const measures = outcome === 'etabler' || outcome === 'etabler_med_tiltak' ? (c.risk?.mandatoryMeasures ?? []) : []
  const status = d ? 'Fattet' : blockers.length ? 'Sperret' : 'Klar for beslutning'
  const approver = c.risk?.band === 'høy' ? 'Godkjenner · høy risiko' : c.risk?.band === 'middels' ? 'Godkjenner · forhøyet risiko' : 'Faglig godkjenner'

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_0.75fr]">
      <Panel>
        <div className="border-b border-[#E2E8ED] px-5 py-4">
          <SmallTitle title="Beslutningsgrunnlag" copy="Autorisert person vurderer grunnlag, kan avvike med begrunnelse og må følge delegasjon." />
        </div>
        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Box label="Policyversjon" value={c.risk ? `${c.risk.policy} · v${c.risk.version}` : 'Ikke beregnet'} help={c.risk ? `Beregnet ${fmt(c.risk.computedAt)}.` : 'Risikoprofil mangler.'} />
            <Box label="Påkrevd godkjenner" value={approver} help="Plattformen, en integrasjon eller KI kan ikke fatte sluttbeslutning." />
          </div>

          {d ? (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[16px] font-semibold text-[#26384B]">{OUTCOME_LABEL[d.outcome]}</span>
                <Badge tone="green">Beslutning fattet</Badge>
                {d.deviates && <Badge tone="amber">Avviker fra anbefaling</Badge>}
              </div>
              <KeyValues width={120} rows={[
                ['Besluttet av', d.actor],
                ['Tidspunkt', fmt(d.at)],
                ['Begrunnelse', d.reason],
                ['Anbefaling', OUTCOME_LABEL[d.recommendation]],
                ...d.measures.map(m => [m.measure, m.answer] as [string, string]),
              ]} />
              <Retention d={d} />
              <p className={mono}>Grunnlagets SHA-256: {d.sha256}</p>
              <button type="button" className={btn.primary} onClick={() => setSnapshot(d)}>Åpne låst beslutningsgrunnlag</button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {blockers.length > 0 && (
                <div className="border-l-2 border-[#B8413E] bg-[#FDF5F4] p-4 text-[12px] leading-6 text-[#754B49]">
                  <b>Beslutning er sperret.</b>
                  <ul className="mt-1 list-disc pl-5">{blockers.map((b, i) => <li key={i}><b>{b.label}:</b> {b.detail}</li>)}</ul>
                </div>
              )}
              {role !== 'godkjenner' && (
                <Callout tone="amber">Du er innlogget som {ACTOR[role]}. Bare Faglig godkjenner kan fatte beslutning – backend avviser forsøket.</Callout>
              )}
              <fieldset>
                <legend className={fieldLabel}>Utfall</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(OUTCOME_LABEL) as DecisionOutcome[]).map(o => (
                    <label key={o} className={'flex cursor-pointer items-center gap-2 border p-3 text-[12px] font-semibold text-[#3C4D60] ' + (outcome === o ? 'border-[#176F61] bg-[#F0F9F6]' : 'border-[#E2E8ED] bg-white')}>
                      <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} className="accent-[#176F61]" />
                      <span className="flex-1">{OUTCOME_LABEL[o]}</span>
                      {o === rec && <Badge tone="green">Anbefalt</Badge>}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="decision-reason" className={fieldLabel}>Begrunnelse (påkrevd)</label>
                <textarea id="decision-reason" rows={4} className={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="Hva bygger beslutningen på?" />
              </div>
              {measures.length > 0 && (
                <fieldset className="space-y-3">
                  <legend className={fieldLabel}>Obligatoriske tiltak – besvares enkeltvis</legend>
                  {measures.map((m, i) => (
                    <div key={m}>
                      <label htmlFor={`measure-${i}`} className="mb-1 block text-[11px] font-semibold text-[#44566A]">{m}</label>
                      <textarea id={`measure-${i}`} rows={2} className={field} value={answers[m] ?? ''} onChange={e => setAnswers({ ...answers, [m]: e.target.value })} />
                    </div>
                  ))}
                  <p className="text-[11px] text-[#718096]">En samlet kommentar kan ikke kvittere ut et obligatorisk tiltak.</p>
                </fieldset>
              )}
              {outcome !== rec && <Callout tone="blue">Du avviker fra anbefalingen ({OUTCOME_LABEL[rec]}). Begrunn avviket – det loggføres.</Callout>}
              <button type="button" className={btn.primary} disabled={busy || blockers.length > 0}
                onClick={() => run(() => decide(role, c.id, outcome, reason, answers), 'Beslutning registrert og grunnlaget låst')}>
                Fatt beslutning
              </button>
            </div>
          )}
        </div>
      </Panel>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Menneskelig kontroll" copy="En beslutning inneholder aktør, handling, begrunnelse, tidspunkt og eksakt vurdering." />
          <div className="mt-4">
            <KeyValues width={120} rows={[
              ['Saksbehandler', c.owner ?? 'Ikke tildelt'],
              ['Godkjenner', d ? d.actor : role === 'godkjenner' ? ACTOR.godkjenner : 'Ikke tildelt'],
              ['AML-ansvarlig', ACTOR.hvitvaskingsansvarlig],
              ['Beslutningsstatus', status],
            ]} />
          </div>
        </Panel>
        <TestPanel entries={['Saksbehandler godkjenner ikke automatisk.', 'Åpen sperre stopper beslutning – også i backend.', 'Avvik er begrunnet, sporbart og delegert.']} />
      </aside>
      {snapshot && <SnapshotOverlay decision={snapshot} close={() => setSnapshot(null)} />}
    </div>
  )
}
