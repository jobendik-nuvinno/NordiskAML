import { useState, useSyncExternalStore } from 'react'
import { closeInvestigation, readInvestigations, reportConcern, restrictedStore, updateInvestigation } from '../api/restrictedServer'
import type { Investigation, Role, Signal } from '../domain/types'
import { fmt, fmtDate, useCall } from './hooks'

/** Meldeskjema. Etter innsending vises bare en nøytral kvittering – samme for alle (INV-03). */
export function ConcernForm({ role, caseId, subject, done }: { role: Role; caseId: string | null; subject?: string; done?: () => void }) {
  const [kind, setKind] = useState<Signal['kind']>(caseId ? 'internt_tips' : 'manuell_observasjon')
  const [subjectName, setSubjectName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, run } = useCall()

  if (sent) return (
    <div className="stack">
      <h2>Mottatt</h2>
      <p>Takk. Meldingen er mottatt av ansvarlig funksjon. Du får ingen videre status, og saken behandles som normalt.</p>
      <p className="mut">Ikke informer kunden om meldingen.</p>
      {done && <button onClick={done}>Lukk</button>}
    </div>
  )

  return (
    <form onSubmit={async e => {
      e.preventDefault()
      const r = await run(() => reportConcern(role, { caseId, subjectName, kind, description, amount }))
      if (r) setSent(true)
    }}>
      <p className="mut">Meldingen går til en skjermet funksjon. Den vises ikke i saken, i loggen, for kunden eller for partnere.</p>
      {caseId ? <p><b>Gjelder:</b> {subject}</p> : (
        <>
          <label htmlFor="c-subject">Hvem eller hva gjelder observasjonen?</label>
          <input id="c-subject" className="form" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="F.eks. avbrutt oppdrag – navn på part" />
        </>
      )}
      <label htmlFor="c-kind">Type</label>
      <select id="c-kind" className="form" value={kind} onChange={e => setKind(e.target.value as Signal['kind'])}>
        <option value="internt_tips">Intern bekymring / tips</option>
        <option value="manuell_observasjon">Manuell observasjon (aktivitet eller transaksjon)</option>
      </select>
      <label htmlFor="c-desc">Hva har du observert?</label>
      <textarea id="c-desc" className="form" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
      <label htmlFor="c-amount">Beløp og valuta (valgfritt – kontonummer trengs ikke)</label>
      <input id="c-amount" className="form" value={amount} onChange={e => setAmount(e.target.value)} placeholder="F.eks. 250 000 NOK" />
      <div className="row" style={{ borderTop: 0 }}>
        <button className="primary" disabled={busy}>Send til ansvarlig funksjon</button>
        {done && <button type="button" onClick={done}>Avbryt</button>}
      </div>
    </form>
  )
}

export function ConcernDialog({ role, caseId, subject, close }: { role: Role; caseId: string; subject: string; close: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Meld intern bekymring" onKeyDown={e => e.key === 'Escape' && close()}>
      <article style={{ maxWidth: 560 }}>
        <div className="cap">Intern melding</div>
        <ConcernForm role={role} caseId={caseId} subject={subject} done={close} />
      </article>
    </div>
  )
}

export function RestrictedRoom({ role }: { role: Role }) {
  useSyncExternalStore(restrictedStore.subscribe, restrictedStore.getVersion, restrictedStore.getVersion)
  const list = readInvestigations(role)
  const [openId, setOpenId] = useState<string | null>(null)
  const current = list.find(i => i.id === openId)

  return (
    <>
      <div className="cap">Skjermet sone · egen tilgangsgruppe</div>
      <h1>Undersøkelser</h1>
      <p className="sub">Bare hvitvaskingsansvarlig og stedfortreder har tilgang. Innholdet ligger i et separat lager og påvirker ikke kundesaken, portalen, partnervarsler eller den ordinære loggen.</p>
      {current ? <InvestigationDetail inv={current} role={role} back={() => setOpenId(null)} /> : (
        <article>
          {list.length === 0 && <p className="mut">Ingen undersøkelser. Meld en bekymring fra en sak eller via «Meld observasjon».</p>}
          {list.length > 0 && (
            <table>
              <thead><tr><th>Ref.</th><th>Gjelder</th><th>Signaler</th><th>Prioritet</th><th>Eier</th><th>Frist</th><th>Status</th><th><span style={{ position: 'absolute', left: -9999 }}>Handling</span></th></tr></thead>
              <tbody>
                {list.map(i => (
                  <tr key={i.id}>
                    <td className="bold">{i.ref}</td><td>{i.subjectName}</td><td>{i.signals.length}</td>
                    <td><span className={`badge ${i.priority === 'høy' ? 'err' : 'neutral'}`}>{i.priority}</span></td>
                    <td>{i.owner ?? <span className="mut">Ikke tildelt</span>}</td><td>{fmtDate(i.dueAt)}</td>
                    <td><span className={`badge ${i.status === 'åpen' ? 'warn' : ''}`}>{i.status}</span></td>
                    <td><button onClick={() => setOpenId(i.id)} aria-label={`Åpne ${i.ref}`}>Åpne</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      )}
    </>
  )
}

function InvestigationDetail({ inv, role, back }: { inv: Investigation; role: Role; back: () => void }) {
  const [finding, setFinding] = useState(inv.finding)
  const [hypothesis, setHypothesis] = useState(inv.hypothesis)
  const [priority, setPriority] = useState(inv.priority)
  const [note, setNote] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [decision, setDecision] = useState<'rapporteres' | 'rapporteres_ikke'>('rapporteres_ikke')
  const { busy, run } = useCall()
  const closed = inv.status === 'avsluttet'

  return (
    <div className="grid">
      <article className="stack">
        <div className="row" style={{ borderTop: 0 }}>
          <div><div className="cap">{inv.ref}</div><h2 style={{ margin: 0 }}>{inv.subjectName}</h2></div>
          <button className="end" onClick={back}>Til oversikten</button>
        </div>
        <div>
          <label htmlFor="i-finding">Faktisk funn</label>
          <textarea id="i-finding" className="form" rows={3} value={finding} disabled={closed} onChange={e => setFinding(e.target.value)} />
          <label htmlFor="i-hyp">Hypotese (antakelse – holdes adskilt fra fakta)</label>
          <textarea id="i-hyp" className="form" rows={2} value={hypothesis} disabled={closed} onChange={e => setHypothesis(e.target.value)} />
          <label htmlFor="i-prio">Prioritet</label>
          <select id="i-prio" className="form" value={priority} disabled={closed} onChange={e => setPriority(e.target.value as Investigation['priority'])}>
            <option value="normal">Normal</option><option value="høy">Høy</option>
          </select>
          <label htmlFor="i-note">Notat til tidslinjen (valgfritt)</label>
          <input id="i-note" className="form" value={note} disabled={closed} onChange={e => setNote(e.target.value)} />
          <div className="row" style={{ borderTop: 0 }}>
            <button className="primary" disabled={busy || closed} onClick={() => run(() => updateInvestigation(role, inv.id, { finding, hypothesis, priority }, note), 'Undersøkelsen er oppdatert').then(() => setNote(''))}>Lagre</button>
            {!inv.owner && <button disabled={busy || closed} onClick={() => run(() => updateInvestigation(role, inv.id, { owner: 'Hvitvaskingsansvarlig Demo' }), 'Du er eier')}>Ta eierskap</button>}
          </div>
        </div>
        <h3>Avslutning</h3>
        {inv.conclusion ? (
          <div className="note">
            <b>{inv.conclusion.reportDecision === 'rapporteres' ? 'Besluttet rapportert til FIU' : 'Ikke rapportert'}</b> · {inv.conclusion.responsible} · {fmt(inv.conclusion.at)}<br />{inv.conclusion.text}
            <p className="mut">Selve innsendingen skjer via godkjent portalrutine og simuleres ikke (en myndighetskvittering skal aldri simuleres).</p>
          </div>
        ) : (
          <>
            <label htmlFor="i-concl">Selvstendig konklusjon</label>
            <textarea id="i-concl" className="form" rows={3} value={conclusion} onChange={e => setConclusion(e.target.value)} />
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend className="bold">Beslutning om rapportering</legend>
              <label className="inline"><input type="radio" name="rep" checked={decision === 'rapporteres_ikke'} onChange={() => setDecision('rapporteres_ikke')} /> Rapporteres ikke</label>{' '}
              <label className="inline"><input type="radio" name="rep" checked={decision === 'rapporteres'} onChange={() => setDecision('rapporteres')} /> Rapporteres til FIU</label>
            </fieldset>
            <button className="primary" disabled={busy} onClick={() => run(() => closeInvestigation(role, inv.id, conclusion, decision), 'Undersøkelsen er avsluttet')}>Avslutt undersøkelsen</button>
          </>
        )}
      </article>
      <article>
        <h2>Signaler ({inv.signals.length})</h2>
        {inv.signals.map(s => (
          <div className="row" key={s.id}>
            <span><b>{s.kind === 'internt_tips' ? 'Internt tips' : 'Manuell observasjon'}</b> · <span className="mut">{fmt(s.at)} · {s.by}</span><br />{s.description}{s.amount && <> · <b>{s.amount}</b></>}</span>
          </div>
        ))}
        <h3>Tidslinje</h3>
        {inv.timeline.map((t, i) => <div className="row" key={i}><span className="mut" style={{ minWidth: 92 }}>{fmt(t.at)}</span><span>{t.text}</span><span className="end badge neutral">{t.by}</span></div>)}
        <p className="mut">Frist: {fmt(inv.dueAt)} · Eier: {inv.owner ?? 'ikke tildelt'}</p>
      </article>
    </div>
  )
}
