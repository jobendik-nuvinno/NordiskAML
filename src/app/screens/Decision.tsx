import { useEffect, useState } from 'react'
import { ACTOR, decide, reopenDecision } from '../../api/fakeServer'
import { activeDecision, evaluateBlockers, OUTCOME_LABEL, recommend, reviewState, STATUS_LABEL } from '../../domain/rules'
import type { Decision, DecisionOutcome } from '../../domain/types'
import { fmt, useCall, useStore } from '../hooks'
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
              <Label>{`Låst beslutningsgrunnlag · versjon ${d.version} · skrivebeskyttet`}</Label>
              <div className="mt-1 text-[16px] font-semibold text-[#26384B]">{s.caseRef} · {OUTCOME_LABEL[d.outcome]}</div>
              <div className="mt-1 text-[11px] text-[#718096]">Fanget {fmt(s.capturedAt)} · besluttet av {d.actor} · anbefaling {OUTCOME_LABEL[s.recommendation]}</div>
            </div>
            <button type="button" autoFocus onClick={close} className={btn.secondary}>Lukk</button>
          </div>
          <div className="space-y-2 p-5">
            <p className={mono}>SHA-256: {d.sha256}</p>
            <p className="text-[12px] text-[#4E6075]"><b>Begrunnelse:</b> {d.reason}</p>
            {d.supersededAt && <p className="text-[12px] text-[#4E6075]"><b>Overprøvd</b> {fmt(d.supersededAt)} av {d.supersededBy}: {d.supersededReason}</p>}
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
  const [outcome, setOutcomeState] = useState<DecisionOutcome>(rec)
  const [touched, setTouched] = useState(false)
  const setOutcome = (o: DecisionOutcome) => { setOutcomeState(o); setTouched(true) }
  const [reason, setReason] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [snapshot, setSnapshot] = useState<Decision | null>(null)
  const { busy, run } = useCall()
  const [reopenReason, setReopenReason] = useState('')
  const d = activeDecision(c)
  const ready = c.status === 'review_ready'
  // Følg anbefalingen til brukeren selv velger utfall; tøm skjemaet når en beslutning fattes eller overprøves.
  useEffect(() => { if (!touched) setOutcomeState(rec) }, [rec, touched])
  useEffect(() => { setReason(''); setAnswers({}); setReopenReason(''); setTouched(false); setOutcomeState(rec) }, [d?.id, c.decisions.length])
  const earlier = c.decisions.filter(x => x !== d).reverse()
  const previous = c.decisions[c.decisions.length - 1]
  const canReopen = role === 'godkjenner' || role === 'hvitvaskingsansvarlig'
  const measures = outcome === 'etabler' || outcome === 'etabler_med_tiltak' ? (c.risk?.mandatoryMeasures ?? []) : []
  const status = d ? 'Fattet' : blockers.length ? 'Sperret' : ready ? 'Klar for beslutning' : 'Grunnlaget er ikke klart'
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
                <Badge tone="blue">{`Versjon ${d.version}`}</Badge>
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
              <Callout tone="blue">Et eventuelt svar til kunden er et separat, lovlig svar. Det gjengir ikke interne begrunnelser, vurderinger eller skjermet rapportering.</Callout>
              {canReopen && (
                <div className="border border-[#E2E8ED] p-4">
                  <SmallTitle title="Overprøv beslutning" copy="Brukes ved feil eller nye opplysninger, f.eks. korrigert identitet. Gjeldende versjon bevares uendret, og saken får et nytt beslutningsgrunnlag." />
                  <label htmlFor="reopen-reason" className={'mt-3 ' + fieldLabel}>Begrunnelse for overprøving (påkrevd)</label>
                  <textarea id="reopen-reason" rows={3} className={field} value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder="Hva er feil, og hvilket nytt grunnlag foreligger?" />
                  <button type="button" className={'mt-3 ' + btn.secondary} disabled={busy}
                    onClick={() => run(() => reopenDecision(role, c.id, reopenReason), 'Beslutningen er overprøvd – ny vurdering kreves')}>
                    Overprøv beslutning
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {previous && (
                <Callout tone="green">{`Tidligere beslutning (versjon ${previous.version}) er bevart uendret. Ny beslutning blir versjon ${previous.version + 1}.`}</Callout>
              )}
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
              {!ready && blockers.length === 0 && <Callout tone="amber">Beslutningsgrunnlaget er ikke klart ({STATUS_LABEL[c.status].toLowerCase()}). Beslutning kan fattes når saken er «Klar for faglig vurdering».</Callout>}
              <button type="button" className={btn.primary} disabled={busy || blockers.length > 0 || !ready}
                onClick={() => run(() => decide(role, c.id, outcome, reason, answers), 'Beslutning registrert og grunnlaget låst')}>
                Fatt beslutning
              </button>
            </div>
          )}
        </div>
        {earlier.length > 0 && (
          <div className="border-t border-[#E2E8ED]">
            <div className="px-5 py-4"><SmallTitle title="Tidligere versjoner" copy="Overprøvde beslutninger med uendret låst grunnlag." /></div>
            <Table headers={['Versjon', 'Utfall', 'Besluttet', 'Begrunnelse', 'Overprøvd', 'SHA-256', '']} rows={earlier.map(x => [
              `Versjon ${x.version}`,
              OUTCOME_LABEL[x.outcome],
              <>{x.actor}<div className="text-[11px] text-[#718096]">{fmt(x.at)}</div></>,
              x.reason,
              x.supersededAt ? <>{x.supersededBy} · {fmt(x.supersededAt)}<div className="text-[11px] text-[#718096]">{x.supersededReason}</div></> : '–',
              <span className={mono}>{x.sha256.slice(0, 12)}…</span>,
              <button type="button" className={btn.link} onClick={() => setSnapshot(x)}>Åpne låst grunnlag</button>,
            ])} />
          </div>
        )}
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
