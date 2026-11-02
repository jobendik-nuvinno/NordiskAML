import { useState } from 'react'
import { ACTOR, assignToMe, requestDocument, retrySource } from '../../api/fakeServer'
import { reportConcern } from '../../api/restrictedServer'
import { analyseOwnership, evaluateBlockers, OUTCOME_LABEL, SECTOR_LABEL, serviceLabel } from '../../domain/rules'
import type { Case, Role, Signal } from '../../domain/types'
import { fmt, useCall, useStore } from '../hooks'
import { useApp } from '../context'
import { Badge, Callout, KeyValues, Label, Panel, SmallTitle, TestPanel, btn, checkTone, field, fieldLabel } from '../ui'

const COVERED = { ja: 'Ja', nei: 'Nei', uklart: 'Uklart' } as const

export function CaseOverviewScreen() {
  const { cases } = useStore()
  const { caseId } = useApp()
  const c = cases.find(x => x.id === caseId)
  if (!c) return <Panel className="p-5"><SmallTitle title="Saken finnes ikke lenger" /></Panel>
  return <CaseOverview c={c} />
}

function CaseOverview({ c }: { c: Case }) {
  const { role, go } = useApp()
  const { busy, run } = useCall()
  const [concern, setConcern] = useState(false)
  const blockers = evaluateBlockers(c)
  const analysis = c.parties.length ? analyseOwnership(c.subjectId, c.parties, c.edges) : null
  const unresolved = analysis?.unresolved ?? []
  const openHits = c.screening.filter(h => h.status === 'open')
  const okChecks = c.checks.filter(k => k.state === 'ok').length
  const openReq = c.docRequests.filter(r => r.status === 'open')
  const requested = (partyId: string) => openReq.some(r => r.partyId === partyId)
  const pendingRequests = unresolved.filter(u => !requested(u.partyId))

  const requestAll = () => run(async () => {
    for (const u of pendingRequests) await requestDocument(role, c.id, u.partyId)
  }, 'Forespørsel sendt til kundeportalen')

  return (
    <div className="grid gap-5 2xl:grid-cols-[0.55fr_1fr_0.62fr]">
      <aside className="space-y-5">
        <Panel className="p-5">
          <Label>Sakskontekst</Label>
          <div className="mt-4">
            <KeyValues rows={[
              ['Kunde', c.name],
              ['Jurisdiksjon', `${c.scope.country} / ${c.registry?.form ?? SECTOR_LABEL[c.scope.sector]}`],
              ['Risikonivå', c.risk ? `${c.risk.band[0].toUpperCase()}${c.risk.band.slice(1)} (${c.risk.score})` : 'Ikke vurdert'],
              ['Ansvarlig', c.owner ?? 'Ikke tildelt'],
              ['Datagrunnlag', `${okChecks} av ${c.checks.length} kontroller`],
            ]} />
          </div>
          {c.owner !== ACTOR[role] && (
            <button disabled={busy} onClick={() => run(() => assignToMe(role, c.id), 'Oppgaven er tildelt deg')} className={'mt-4 w-full ' + btn.outlineGreen}>Ta ansvar for oppgaven</button>
          )}
          <button onClick={() => go('ownership')} className={'mt-2.5 w-full ' + btn.secondary}>Åpne eierstruktur</button>
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Omfangsvurdering" copy={`${SECTOR_LABEL[c.scope.sector]} · ${serviceLabel(c.scope.service)}`} />
          <div className="mt-4">
            <KeyValues rows={[
              ['Omfattet', <Badge key="o" tone={c.scope.covered === 'ja' ? 'green' : c.scope.covered === 'nei' ? 'neutral' : 'amber'}>{COVERED[c.scope.covered]}</Badge>],
              ['Hjemmel', c.scope.basis || '–'],
              ['Ansvarlig', c.scope.responsible || '–'],
            ]} />
          </div>
        </Panel>
        <TestPanel entries={['Kilde, alder og forklaring følger kontrollen.', 'Sperre holder beslutning tilbake.', 'Bevis åpnes bare ved nødvendig arbeid.']} />
      </aside>

      <Panel>
        <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Kontrollgrunnlag" copy={`Åpne spørsmål og neste handling for ${c.ref}.`} /></div>
        <ul>
          {c.checks.map(k => (
            <li key={k.key} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#E7EDF1] px-5 py-4 last:border-b-0">
              <span>
                <b className="block text-[12px] text-[#2B3C50]">{k.label}</b>
                <small className="mt-1 block text-[11px] leading-5 text-[#718096]">{k.detail}</small>
                {(k.source || k.at) && <small className="mt-0.5 block text-[10px] text-[#8692A1]">{k.source && `Kilde: ${k.source}`}{k.source && k.at && ' · '}{k.at && fmt(k.at)}</small>}
              </span>
              <span className="self-start"><Badge tone={checkTone[k.state][0]}>{checkTone[k.state][1]}</Badge></span>
            </li>
          ))}
        </ul>
      </Panel>

      <aside className="space-y-5">
        <Panel className="p-5">
          <div className="flex justify-between gap-3">
            <SmallTitle title="Neste steg" copy="En åpen sperre stopper klarsignal." />
            <Badge tone={blockers.length ? 'red' : 'green'}>{blockers.length === 1 ? '1 sperre' : `${blockers.length} sperrer`}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {blockers.map((b, i) => <Callout key={i} tone="red"><b>Sperre: {b.label}.</b> {b.detail}</Callout>)}
            {c.status === 'needs_review' && c.scope.covered !== 'ja' && (
              <Callout tone="amber">Uklart om oppdraget er omfattet. Sendt til {c.scope.responsible || 'fagansvarlig'} for faglig avklaring.</Callout>
            )}
          </div>
          <NextAction c={c} role={role} busy={busy}
            retry={() => run(() => retrySource(role, c.id), 'Nytt forsøk startet')}
            request={pendingRequests.length ? requestAll : null}
            openHits={openHits.length} unresolved={unresolved.length} openReq={openReq} go={go} />
        </Panel>
        <Panel className="p-5">
          {!concern ? (
            <>
              <SmallTitle title="Intern bekymring" copy="Går til skjermet funksjon og vises ikke i saken." />
              <button onClick={() => setConcern(true)} className={'mt-3 ' + btn.link}>Meld intern bekymring</button>
            </>
          ) : <ConcernForm role={role} caseId={c.id} subject={c.name} close={() => setConcern(false)} />}
        </Panel>
      </aside>
    </div>
  )
}

function NextAction({ c, busy, retry, request, openHits, unresolved, openReq, go }: {
  c: Case; role: Role; busy: boolean; retry: () => void; request: (() => void) | null
  openHits: number; unresolved: number; openReq: Case['docRequests']; go: ReturnType<typeof useApp>['go']
}) {
  const p = 'mt-4 text-[11px] leading-5 text-[#536478]'
  const primary = 'mt-4 w-full ' + btn.primary
  switch (c.status) {
    case 'processing':
      return <p className={p}>Plattformen jobber. Trinnene oppdateres fortløpende.</p>
    case 'waiting_source':
      return <>
        <p className={p}>Kilden svarte ikke gyldig. Saken er <b>ikke</b> ferdig kontrollert og kan ikke bli klar før kilden svarer.</p>
        <button disabled={busy} onClick={retry} className={primary}>Prøv kilden igjen</button>
      </>
    case 'customer_action':
      return <>
        <div className="mt-4 space-y-1">{openReq.map(r => <p key={r.id} className="text-[11px] text-[#536478]"><b>{r.title}</b> · sendt {fmt(r.createdAt)}</p>)}</div>
        <div className="mt-3"><Callout tone="blue">Venter på kunde. Forespørselen ligger i kundeportalen.</Callout></div>
      </>
    case 'needs_review':
      return <>
        {unresolved > 0 && (request
          ? <button disabled={busy} onClick={request} className={primary}>Be om opplysninger</button>
          : <p className={p}>Opplysninger er etterspurt fra kunden.</p>)}
        {openHits > 0 && <button onClick={() => go('screening')} className={(unresolved > 0 ? 'mt-2.5 w-full ' + btn.outlineGreen : primary)}>Avklar {openHits} screeningtreff</button>}
        <button disabled className={'mt-2.5 w-full ' + btn.disabled}>Gå til beslutning</button>
      </>
    case 'review_ready':
      return <>
        <p className={p}>Kontrollene er ferdige. Grunnlaget er maskinelt klargjort – det er <b>ikke</b> en beslutning.</p>
        <button onClick={() => go('decision')} className={primary}>Gå til beslutning</button>
      </>
    case 'decided': {
      const d = c.decisions[0]
      return <>
        <p className={p}><b>{OUTCOME_LABEL[d.outcome]}</b> · besluttet av {d.actor} {fmt(d.at)}.</p>
        <button onClick={() => go('history')} className={'mt-4 w-full ' + btn.outlineGreen}>Se historikk og låst grunnlag</button>
      </>
    }
  }
}

/** Meldeskjema i designets stil. Etter innsending vises bare «Mottatt» (INV-03). */
function ConcernForm({ role, caseId, subject, close }: { role: Role; caseId: string; subject: string; close: () => void }) {
  const [kind, setKind] = useState<Signal['kind']>('internt_tips')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, run } = useCall()
  if (sent) return (
    <div role="status">
      <SmallTitle title="Mottatt" copy="Takk. Meldingen er mottatt av ansvarlig funksjon. Du får ingen videre status, og saken behandles som normalt." />
      <p className="mt-2 text-[11px] text-[#718096]">Ikke informer kunden om meldingen.</p>
      <button onClick={close} className={'mt-3 ' + btn.secondary}>Lukk</button>
    </div>
  )
  return (
    <form onSubmit={async e => {
      e.preventDefault()
      const r = await run(() => reportConcern(role, { caseId, subjectName: '', kind, description, amount }))
      if (r) setSent(true)
    }}>
      <SmallTitle title="Meld intern bekymring" copy={`Gjelder: ${subject}. Meldingen vises ikke i saken, i loggen, for kunden eller for partnere.`} />
      <label htmlFor="concern-kind" className={fieldLabel + ' mt-4'}>Type</label>
      <select id="concern-kind" className={field} value={kind} onChange={e => setKind(e.target.value as Signal['kind'])}>
        <option value="internt_tips">Intern bekymring / tips</option>
        <option value="manuell_observasjon">Manuell observasjon (aktivitet eller transaksjon)</option>
      </select>
      <label htmlFor="concern-desc" className={fieldLabel + ' mt-3'}>Hva har du observert?</label>
      <textarea id="concern-desc" rows={4} className={field} value={description} onChange={e => setDescription(e.target.value)} />
      <label htmlFor="concern-amount" className={fieldLabel + ' mt-3'}>Beløp og valuta (valgfritt)</label>
      <input id="concern-amount" className={field} value={amount} onChange={e => setAmount(e.target.value)} placeholder="F.eks. 250 000 NOK" />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btn.primary}>Send til ansvarlig funksjon</button>
        <button type="button" onClick={close} className={btn.secondary}>Avbryt</button>
      </div>
    </form>
  )
}
