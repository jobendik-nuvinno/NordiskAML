import { useState } from 'react'
import {
  ACTOR, addIdentityField, assignToMe, decide, resolveHit, registerLaterChange, requestDocument, retrySource, STAGE_LABEL, STAGES,
} from '../api/fakeServer'
import {
  analyseOwnership, beneficialOwners, reviewState, evaluateBlockers, OUTCOME_LABEL, pct, recommend, SECTOR_LABEL, serviceLabel,
  UBO_THRESHOLD,
} from '../domain/rules'
import type { Case, CheckItem, Decision, DecisionOutcome, OwnershipEdge, Party, Role, ScreeningHit } from '../domain/types'
import { fmt, useCall, useStore } from './hooks'
import { ConcernDialog } from './Restricted'
import { statusBadge } from './Workqueue'

const TABS = ['Oversikt', 'Eierskap', 'Screening', 'Risiko', 'Beslutning', 'Historikk'] as const
type Tab = typeof TABS[number]

export function CaseView({ role, id, back }: { role: Role; id: string; back: () => void }) {
  const { cases } = useStore()
  const c = cases.find(x => x.id === id)
  const [tab, setTab] = useState<Tab>('Oversikt')
  const [snapshot, setSnapshot] = useState<Decision | null>(null)
  const [concern, setConcern] = useState(false)
  if (!c) return <article><p>Saken finnes ikke lenger.</p><button onClick={back}>Til arbeidskøen</button></article>

  return (
    <>
      <div className="cap">Saksbehandler / {c.ref}</div>
      <h1>{c.name}</h1>
      <p className="sub">
        {c.scope.country} · {SECTOR_LABEL[c.scope.sector]} · {serviceLabel(c.scope.service)} · org.nr {c.orgNr} · {statusBadge(c)}
      </p>
      <Stepper c={c} />
      <nav className="tabs" aria-label="Saksfaner">
        {TABS.map(t => (
          <button key={t} className={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      {tab === 'Oversikt' && <Overview c={c} role={role} goto={setTab} />}
      {tab === 'Eierskap' && <Ownership c={c} role={role} />}
      {tab === 'Screening' && <Screening c={c} role={role} />}
      {tab === 'Risiko' && <Risk c={c} />}
      {tab === 'Beslutning' && <DecisionPanel c={c} role={role} openSnapshot={setSnapshot} />}
      {tab === 'Historikk' && <History c={c} role={role} openSnapshot={setSnapshot} />}
      {snapshot && <SnapshotView d={snapshot} close={() => setSnapshot(null)} />}
      <p className="mut" style={{ marginTop: 18 }}>
        <button className="link" onClick={() => setConcern(true)}>Meld intern bekymring</button> – går til skjermet funksjon og vises ikke i saken.
      </p>
      {concern && <ConcernDialog role={role} caseId={c.id} subject={c.name} close={() => setConcern(false)} />}
    </>
  )
}

function Stepper({ c }: { c: Case }) {
  const idx = STAGES.indexOf(c.stage)
  const finished = c.status !== 'processing' && c.status !== 'waiting_source' && c.stage === 'klargjore'
  return (
    <ol className="steps" aria-label="Automatiske trinn">
      {STAGES.map((s, i) => {
        const done = i < idx || finished
        const stopped = i === idx && c.status === 'waiting_source'
        const cls = done ? 'done' : stopped ? 'stopped' : i === idx ? 'current' : ''
        return (
          <li key={s} className={`step ${cls}`} style={{ listStyle: 'none' }}>
            <span className="bold">{i + 1} · {STAGE_LABEL[s]}</span><br />
            <span className="mut">{done ? 'Fullført' : stopped ? 'Venter på kilde' : i === idx ? 'Pågår …' : 'Venter'}</span>
          </li>
        )
      })}
    </ol>
  )
}

const CHECK_BADGE: Record<CheckItem['state'], [string, string]> = {
  ok: ['', 'OK'], open: ['warn', 'Åpent'], waiting: ['err', 'Venter på kilde'], pending: ['neutral', 'Ikke kjørt'],
}

function Overview({ c, role, goto }: { c: Case; role: Role; goto: (t: Tab) => void }) {
  const blockers = evaluateBlockers(c)
  const { busy, run } = useCall()
  const analysis = c.parties.length ? analyseOwnership(c.subjectId, c.parties, c.edges) : null
  const openReq = c.docRequests.filter(r => r.status === 'open')

  return (
    <div className="grid">
      <article>
        <h2>Kontroller</h2>
        {c.checks.map(k => (
          <div className="row" key={k.key}>
            <div>
              <span className="bold">{k.label}</span><br />
              <span className="mut">{k.detail}{k.source && ` · Kilde: ${k.source}`}{k.at && ` · ${fmt(k.at)}`}</span>
            </div>
            <span className={`end badge ${CHECK_BADGE[k.state][0]}`}>{CHECK_BADGE[k.state][1]}</span>
          </div>
        ))}
        <h3>Omfangsvurdering</h3>
        <p className="mut">
          Omfattet: <b>{c.scope.covered}</b> · {c.scope.basis || '–'} · Ansvarlig: {c.scope.responsible || '–'}
        </p>
      </article>
      <article className="stack">
        <div className="cap">Neste handling</div>
        {c.status === 'processing' && <p>Plattformen jobber. Trinnene oppdateres fortløpende.</p>}
        {c.status === 'waiting_source' && (
          <>
            <h2>Venter på registerkilde</h2>
            <p>Kilden svarte ikke gyldig. Saken er <b>ikke</b> ferdig kontrollert og kan ikke bli klar før kilden svarer.</p>
            <button className="primary" disabled={busy} onClick={() => run(() => retrySource(role, c.id), 'Nytt forsøk startet')}>Prøv kilden igjen</button>
          </>
        )}
        {c.status === 'needs_review' && analysis && analysis.unresolved.length > 0 && (
          <>
            <h2>Eierdokumentasjon</h2>
            {analysis.unresolved.map(u => (
              <div key={u.partyId} className="note warn">
                <b>{u.reason === 'sirkel' ? 'Sirkulær eierkjede' : 'Manglende eierledd'}:</b> {u.detail}
                <div style={{ marginTop: 8 }}>
                  <button className="primary" disabled={busy} onClick={() => run(() => requestDocument(role, c.id, u.partyId), 'Forespørsel sendt til kundeportalen')}>
                    Etterspør vedlegg fra kunden
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
        {c.status === 'needs_review' && c.screening.some(h => h.status !== 'false_positive') && (
          <>
            <h2>Screeningtreff</h2>
            <p>{c.screening.filter(h => h.status === 'open').length} treff må avklares faglig.{c.screening.some(h => h.list === 'Sanksjon' && h.status !== 'false_positive') && <> <b>Sanksjonstreff går i hastekanal.</b></>}</p>
            <button className="primary" onClick={() => goto('Screening')}>Gå til screening</button>
          </>
        )}
        {c.status === 'needs_review' && c.scope.covered !== 'ja' && (
          <div className="note warn">Uklart om oppdraget er omfattet. Sendt til {c.scope.responsible} for faglig avklaring.</div>
        )}
        {c.status === 'customer_action' && (
          <>
            <h2>Venter på kunde</h2>
            {openReq.map(r => <p key={r.id}>{r.title} · sendt {fmt(r.createdAt)}</p>)}
            <p className="mut">Bytt rolle til «Kunde (portal)» for å svare i demoen.</p>
          </>
        )}
        {c.status === 'review_ready' && (
          <>
            <h2>Klar for faglig vurdering</h2>
            <p>Kontrollene er ferdige. Grunnlaget er maskinelt klargjort – det er <b>ikke</b> en beslutning.</p>
            <button className="primary" onClick={() => goto('Beslutning')}>Gå til beslutning</button>
          </>
        )}
        {c.status === 'decided' && (
          <>
            <h2>{OUTCOME_LABEL[c.decisions[0].outcome]}</h2>
            <p>Besluttet av {c.decisions[0].actor} {fmt(c.decisions[0].at)}.</p>
            <button onClick={() => goto('Historikk')}>Se historikk og låst grunnlag</button>
          </>
        )}
        <h3>Sperrer</h3>
        {blockers.length === 0
          ? <p className="mut">Ingen åpne sperrer.</p>
          : blockers.map((b, i) => <div className="row" key={i}><span className="badge err">Sperre</span><span><b>{b.label}</b><br /><span className="mut">{b.detail}</span></span></div>)}
        <h3>Ansvar</h3>
        <div className="row">
          <span>{c.owner ?? 'Ikke tildelt'}</span>
          {c.owner !== ACTOR[role] && <button className="end" disabled={busy} onClick={() => run(() => assignToMe(role, c.id), 'Oppgaven er tildelt deg')}>Ta ansvar for oppgaven</button>}
        </div>
      </article>
    </div>
  )
}

function OwnerTree({ id, parties, edges, chain, onRequest, requested }: {
  id: string; parties: Party[]; edges: OwnershipEdge[]; chain: string[]
  onRequest?: (partyId: string) => void; requested: Set<string>
}) {
  const owners = edges.filter(e => e.to === id)
  const name = (pid: string) => parties.find(p => p.id === pid)
  if (owners.length === 0) return null
  return (
    <ul className="tree">
      {owners.map(e => {
        const p = name(e.from)
        const cycle = chain.includes(e.from)
        const leafOrg = !cycle && p?.type === 'organisation' && !edges.some(x => x.to === e.from)
        return (
          <li key={e.id}>
            <b>{p?.name ?? e.from}</b> <span className="mut">({p?.type === 'person' ? `person, ${p.idRef}` : `${p?.idRef}, ${p?.country}`})</span>{' '}
            <span className="badge neutral">{pct(e.share)} {e.controlType}</span>{' '}
            <span className="mut">Kilde: {e.source}</span>
            {cycle && <> <span className="badge err">↻ Sirkel – uavklart</span></>}
            {leafOrg && <> <span className="badge warn">Uavklart: ingen kjente eiere</span>
              {onRequest && !requested.has(e.from) && <> <button className="link" onClick={() => onRequest(e.from)}>Etterspør vedlegg</button></>}
              {requested.has(e.from) && <span className="mut"> · vedlegg etterspurt</span>}
            </>}
            {!cycle && <OwnerTree id={e.from} parties={parties} edges={edges} chain={[...chain, e.from]} onRequest={onRequest} requested={requested} />}
          </li>
        )
      })}
    </ul>
  )
}

export function OwnershipBody({ subjectId, parties, edges, onRequest, requested = new Set() }: {
  subjectId: string; parties: Party[]; edges: OwnershipEdge[]; onRequest?: (id: string) => void; requested?: Set<string>
}) {
  const a = analyseOwnership(subjectId, parties, edges)
  const ubo = new Set(beneficialOwners(a).map(p => p.partyId))
  const name = (id: string) => parties.find(p => p.id === id)?.name ?? id
  const subject = parties.find(p => p.id === subjectId)
  return (
    <>
      <h3>Eierkjede</h3>
      <p className="bold" style={{ margin: 0 }}>{subject?.name}</p>
      <OwnerTree id={subjectId} parties={parties} edges={edges} chain={[subjectId]} onRequest={onRequest} requested={requested} />
      <h3>Beregnet økonomisk andel per person</h3>
      <table>
        <thead><tr><th>Person</th><th>Økonomisk andel</th><th>Stier</th><th>Klassifisering</th></tr></thead>
        <tbody>
          {a.persons.map(p => (
            <tr key={p.partyId}>
              <td className="bold">{name(p.partyId)}</td>
              <td>{pct(p.total)}</td>
              <td className="mut">{p.paths.map((s, i) => <div key={i}>{[...s.chain].reverse().map(name).join(' → ')} ({pct(s.share)})</div>)}</td>
              <td>{ubo.has(p.partyId) ? <span className="badge">Reell rettighetshaver</span> : <span className="badge neutral">Under terskel</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {a.unresolved.length > 0 && <div className="note warn">Uavklart struktur: {a.unresolved.map(u => u.detail).join('; ')}. Tomme registerdata betyr ikke at selskapet mangler reelle rettighetshavere.</div>}
      <p className="mut">Regel: NO-legal 1.0 (demo) – økonomisk andel over {UBO_THRESHOLD * 100} % gir reell rettighetshaver. Andelen multipliseres per ledd (60 % × 60 % = 36 %) og vurderes separat fra faktisk kontroll.</p>
    </>
  )
}

function Ownership({ c, role }: { c: Case; role: Role }) {
  const { run } = useCall()
  if (!c.parties.length) return <article><p className="mut">Eierdata er ikke innhentet ennå.</p></article>
  const requested = new Set(c.docRequests.map(r => r.partyId))
  return (
    <article>
      <h2>Eierskapsgrunnlag</h2>
      <OwnershipBody subjectId={c.subjectId} parties={c.parties} edges={c.edges} requested={requested}
        onRequest={pid => run(() => requestDocument(role, c.id, pid), 'Forespørsel sendt til kundeportalen')} />
    </article>
  )
}

const HIT_STATUS: Record<ScreeningHit['status'], [string, string]> = {
  open: ['warn', 'Til vurdering'], false_positive: ['', 'Avklart: falskt treff'], confirmed: ['err', 'Bekreftet treff'],
}

function Screening({ c, role }: { c: Case; role: Role }) {
  if (!c.screening.length) return <article><p className="mut">Ingen treff i PEP- og sanksjonslistene{c.checks.find(k => k.key === 'screening')?.state === 'pending' ? ' (ikke kjørt ennå)' : ''}.</p></article>
  return <div className="stack">{c.screening.map(h => <HitCard key={h.id} c={c} h={h} role={role} />)}</div>
}

function HitCard({ c, h, role }: { c: Case; h: ScreeningHit; role: Role }) {
  const [reason, setReason] = useState('')
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10))
  const { busy, run } = useCall()
  const party = c.parties.find(p => p.id === h.partyId)
  return (
    <article>
      <div className="row" style={{ borderTop: 0 }}>
        <div>
          <div className="cap">{h.list === 'Sanksjon' ? 'Sanksjon · hastekanal' : 'PEP'} · {h.listVersion}</div>
          <h2 style={{ margin: 0 }}>{party?.name} ↔ {h.candidate}</h2>
        </div>
        <span className={`end badge ${HIT_STATUS[h.status][0]}`}>{HIT_STATUS[h.status][1]}</span>
      </div>
      <table>
        <thead><tr><th>Felt</th><th>Part</th><th>Listekandidat</th><th>Vurdering</th></tr></thead>
        <tbody>
          {h.fields.map(f => (
            <tr key={f.field}><td className="bold">{f.field}</td><td>{f.subject}</td><td>{f.candidate}</td>
              <td><span className={`badge ${f.match === 'samsvar' ? '' : f.match === 'avvik' ? 'err' : 'warn'}`}>{f.match}</span></td></tr>
          ))}
        </tbody>
      </table>
      <p className="mut">Matchmetode: {h.method}. {h.list === 'Sanksjon' ? 'Potensielt treff sperrer klarsignal til det er avklart; en lav score kan ikke overstyre.' : 'Bekreftet PEP gir forsterkede tiltak – ikke automatisk avslag.'}</p>
      {h.resolution ? (
        <div className="note">
          <b>{h.status === 'false_positive' ? 'Avklart som falskt treff' : 'Bekreftet'}</b> av {h.resolution.by} {fmt(h.resolution.at)}
          {h.resolution.validUntil && <> · gyldig til {h.resolution.validUntil}</>}<br />{h.resolution.reason}
          {h.status === 'false_positive' && (
            <div style={{ marginTop: 8 }}>
              <button disabled={busy} onClick={() => run(() => addIdentityField(role, c.id, h.partyId), 'Ny opplysning registrert – treffet er åpnet for revurdering')}>
                Simuler ny fødselsdato for {party?.name}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <label htmlFor={`r-${h.id}`}>Begrunnelse (påkrevd)</label>
          <textarea id={`r-${h.id}`} className="form" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Hvilke felt skiller personene?" />
          <label htmlFor={`v-${h.id}`}>Avklaringen gjelder til</label>
          <input id={`v-${h.id}`} type="date" className="form" style={{ maxWidth: 220 }} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          <div className="row" style={{ borderTop: 0 }}>
            <button disabled={busy} onClick={() => run(() => resolveHit(role, c.id, h.id, 'false_positive', reason, validUntil), 'Treffet er avklart som falskt')}>Avklar som falskt treff</button>
            <button className="primary" disabled={busy} onClick={() => run(() => resolveHit(role, c.id, h.id, 'confirmed', reason, ''), 'Treffet er bekreftet')}>Bekreft treff</button>
          </div>
        </>
      )}
    </article>
  )
}

function Risk({ c }: { c: Case }) {
  const blockers = evaluateBlockers(c)
  if (!c.risk) return <article><p className="mut">Risikoprofil er ikke beregnet ennå.</p></article>
  return (
    <article>
      <h2>Forklarbar risikoprofil</h2>
      <p className="mut">{c.risk.policy} · versjon {c.risk.version} · beregnet {fmt(c.risk.computedAt)}</p>
      <div className={`note ${blockers.length ? 'warn' : ''}`}>
        Sperrer vurderes <b>før</b> poengsummen. {blockers.length
          ? `${blockers.length} åpen(e) sperre(r): ${blockers.map(b => b.label).join(', ')}. Lav score kan ikke gi klart grunnlag.`
          : 'Ingen åpne sperrer – poengsummen styrer anbefalingen.'}
      </div>
      <table>
        <thead><tr><th>Faktor</th><th>Verdi</th><th>Kilde</th><th>Bidrag</th></tr></thead>
        <tbody>
          {c.risk.factors.map(f => <tr key={f.key}><td className="bold">{f.label}</td><td>{f.value}</td><td className="mut">{f.source}</td><td>+{f.contribution}</td></tr>)}
          <tr><td className="bold">Sum</td><td colSpan={2}>Terskler: middels ≥ {c.risk.thresholds.middels}, høy ≥ {c.risk.thresholds.høy}</td><td className="bold">{c.risk.score} ({c.risk.band})</td></tr>
        </tbody>
      </table>
      {c.risk.mandatoryMeasures.length > 0 && <p>Obligatoriske tiltak: {c.risk.mandatoryMeasures.join(', ')}</p>}
    </article>
  )
}

function DecisionPanel({ c, role, openSnapshot }: { c: Case; role: Role; openSnapshot: (d: Decision) => void }) {
  const blockers = evaluateBlockers(c)
  const rec = recommend(c.risk, blockers)
  const [outcome, setOutcome] = useState<DecisionOutcome>(rec)
  const [reason, setReason] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const { busy, run } = useCall()
  const d = c.decisions[0]
  const measures = outcome === 'etabler' || outcome === 'etabler_med_tiltak' ? (c.risk?.mandatoryMeasures ?? []) : []

  if (d) return (
    <article>
      <h2>Beslutning: {OUTCOME_LABEL[d.outcome]}</h2>
      <p>{d.actor} · {fmt(d.at)}</p>
      <p><b>Begrunnelse:</b> {d.reason}</p>
      <p className="mut">Maskinell anbefaling: {OUTCOME_LABEL[d.recommendation]}{d.deviates && ' – beslutningen avviker, med begrunnelse'}.</p>
      {d.measures.length > 0 && <><h3>Forsterkede tiltak</h3>{d.measures.map(m => <p key={m.measure}><b>{m.measure}:</b> {m.answer}</p>)}</>}
      <RetentionInfo d={d} />
      <p className="hash">Grunnlagets SHA-256: {d.sha256}</p>
      <button className="primary" onClick={() => openSnapshot(d)}>Åpne det låste beslutningsgrunnlaget</button>
    </article>
  )

  return (
    <div className="grid">
      <article>
        <h2>Menneskelig beslutning</h2>
        {role !== 'godkjenner' && <div className="note warn">Du er innlogget som {ACTOR[role]}. Bare Faglig godkjenner kan fatte beslutning – backend avviser forsøket.</div>}
        {blockers.length > 0 && <div className="note warn">Beslutning er sperret: {blockers.map(b => b.label).join(', ')}.</div>}
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend className="bold">Utfall</legend>
          {(Object.keys(OUTCOME_LABEL) as DecisionOutcome[]).map(o => (
            <label key={o} className="inline" style={{ display: 'flex', margin: '6px 0' }}>
              <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} />
              {OUTCOME_LABEL[o]}{o === rec && <span className="badge neutral">Anbefalt</span>}
            </label>
          ))}
        </fieldset>
        <label htmlFor="reason">Begrunnelse (påkrevd)</label>
        <textarea id="reason" className="form" rows={4} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Hva bygger beslutningen på?" />
        {measures.length > 0 && (
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="bold">Obligatoriske tiltak – besvares enkeltvis</legend>
            {measures.map((m, i) => (
              <div key={m}>
                <label htmlFor={`m-${i}`}>{m}</label>
                <textarea id={`m-${i}`} className="form" rows={2} value={answers[m] ?? ''} onChange={e => setAnswers({ ...answers, [m]: e.target.value })} />
              </div>
            ))}
            <p className="mut">En samlet kommentar kan ikke kvittere ut et obligatorisk tiltak.</p>
          </fieldset>
        )}
        {outcome !== rec && <p className="mut">Du avviker fra anbefalingen ({OUTCOME_LABEL[rec]}). Begrunn avviket.</p>}
        <button className="primary" disabled={busy || blockers.length > 0}
          onClick={() => run(() => decide(role, c.id, outcome, reason, answers), 'Beslutning registrert og grunnlaget låst')}>
          Fatt beslutning
        </button>
      </article>
      <article>
        <div className="cap">Maskinelt klargjort grunnlag</div>
        <h2>Anbefaling: {OUTCOME_LABEL[rec]}</h2>
        <p className="mut">Risiko {c.risk ? `${c.risk.score} (${c.risk.band})` : '–'} · {c.evidence.length} bevis · {c.checks.filter(k => k.state === 'ok').length}/{c.checks.length} kontroller OK</p>
        <p className="mut">Plattformen, en integrasjon eller KI kan ikke fatte sluttbeslutning. Beslutningen låser et øyeblikksbilde av hele grunnlaget.</p>
      </article>
    </div>
  )
}

function RetentionInfo({ d }: { d: Decision }) {
  const review = reviewState(d.nextReviewAt)
  return (
    <div className="note">
      <b>Oppbevaring:</b> {d.retention.years} år fra {d.retention.until ? fmt(d.retention.from) : d.retention.from.toLowerCase()}
      {d.retention.until && <> (til {fmt(d.retention.until)})</>}<br /><span className="mut">{d.retention.basis}</span><br />
      <b>Neste kontroll:</b> {d.nextReviewAt ? <>{fmt(d.nextReviewAt)} <span className={`badge ${review === 'forfalt' ? 'err' : 'neutral'}`}>{review === 'forfalt' ? 'Forfalt' : 'Planlagt'}</span></> : 'Ingen – kundeforhold ikke etablert'}
    </div>
  )
}

function History({ c, role, openSnapshot }: { c: Case; role: Role; openSnapshot: (d: Decision) => void }) {
  const { busy, run } = useCall()
  return (
    <div className="grid">
      <article>
        <h2>Hendelseslogg</h2>
        {c.audit.map(e => {
          const d = e.decisionId ? c.decisions.find(x => x.id === e.decisionId) : undefined
          return (
            <div className="row" key={e.id}>
              <span className="mut" style={{ minWidth: 92 }}>{fmt(e.at)}</span>
              <span>
                <b>{e.action}</b>{e.detail && <> · <span className="mut">{e.detail}</span></>}<br />
                <span className="hash">korrelasjon {e.correlationId.slice(0, 8)}</span>
                {d && <> · <button className="link" onClick={() => openSnapshot(d)}>Åpne eksakt beslutningsgrunnlag</button></>}
              </span>
              <span className="end badge neutral">{e.actor}</span>
            </div>
          )
        })}
        {c.decisions.length > 0 && (
          <p className="mut">Demo: simuler at registeret endrer seg etter beslutningen – det låste grunnlaget skal ikke endres.{' '}
            <button disabled={busy} onClick={() => run(() => registerLaterChange(role, c.id), 'Registerendring mottatt')}>Simuler senere registerendring</button>
          </p>
        )}
      </article>
      <article>
        <h2>Bevis</h2>
        {c.evidence.map(ev => (
          <div className="row" key={ev.id}>
            <span><b>{ev.title}</b><br /><span className="mut">{ev.source} · {fmt(ev.collectedAt)} · v{ev.version}</span><br /><span className="hash">sha256 {ev.sha256}</span></span>
          </div>
        ))}
      </article>
    </div>
  )
}

function SnapshotView({ d, close }: { d: Decision; close: () => void }) {
  const s = d.snapshot
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Låst beslutningsgrunnlag" onKeyDown={e => e.key === 'Escape' && close()}>
      <article className="stack">
        <div className="row" style={{ borderTop: 0 }}>
          <div><div className="cap">Låst beslutningsgrunnlag · skrivebeskyttet</div><h2 style={{ margin: 0 }}>{s.caseRef} · {OUTCOME_LABEL[d.outcome]}</h2></div>
          <button className="end" onClick={close} autoFocus>Lukk</button>
        </div>
        <p className="mut">Fanget {fmt(s.capturedAt)} · besluttet av {d.actor} · anbefaling {OUTCOME_LABEL[s.recommendation]}</p>
        <p className="hash">SHA-256: {d.sha256}</p>
        <p><b>Begrunnelse:</b> {d.reason}</p>
        <h3>Register slik det var ved beslutning</h3>
        <p className="mut">{s.registry?.legalName} · hentet {fmt(s.registry?.fetchedAt ?? null)} · {s.registry?.roles.map(r => `${r.role}: ${r.name}`).join(' · ')}</p>
        <OwnershipBody subjectId={s.parties[0]?.id ?? ''} parties={s.parties} edges={s.edges} />
        <h3>Kontroller</h3>
        {s.checks.map(k => <div className="row" key={k.key}><span>{k.label}</span><span className="mut">{k.detail}</span><span className="end badge">{CHECK_BADGE[k.state][1]}</span></div>)}
        <h3>Risiko</h3>
        <p className="mut">{s.risk ? `${s.risk.policy} v${s.risk.version}: ${s.risk.factors.map(f => `${f.label} +${f.contribution}`).join(', ')} = ${s.risk.score} (${s.risk.band})` : '–'}</p>
        <h3>Bevis</h3>
        {s.evidence.map(ev => <div key={ev.id} className="mut">{ev.title} · <span className="hash">{ev.sha256.slice(0, 16)}…</span></div>)}
      </article>
    </div>
  )
}
