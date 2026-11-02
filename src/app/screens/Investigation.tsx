import { useState, useSyncExternalStore } from 'react'
import { closeInvestigation, readInvestigations, reportConcern, restrictedStore, updateInvestigation } from '../../api/restrictedServer'
import type { Investigation, Role, Signal } from '../../domain/types'
import { fmt, useCall } from '../../ui/hooks'
import { useApp } from '../context'
import { Badge, btn, Callout, field, fieldLabel, KeyValues, Label, Panel, SmallTitle, Table, TestPanel, type Tone } from '../ui'

/** Skjermet undersøkelsesrom (design «Investigation», INV-01/INV-03). Innhold vises bare for tilgangsgruppen. */
export function InvestigationScreen() {
  const { role } = useApp()
  const member = role === 'hvitvaskingsansvarlig'
  return (
    <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
      <Panel className="overflow-hidden">
        <div className="border-b border-[#E4C2BF] bg-[#FFF7F6] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SmallTitle title="Skjermet undersøkelsesrom" copy="Ikke en del av ordinær søk, portal, partner-API, webhook eller support." />
            <Badge tone="red">Separat tilgangsgruppe</Badge>
          </div>
        </div>
        <div className="p-5">{member ? <Room role={role} /> : <Protected role={role} />}</div>
      </Panel>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Tilgangstest" copy="Vanlig bruker, kunde, partner og support kan ikke utlede at denne saken eksisterer." />
          <div className="mt-4"><Callout tone="red">AT-07 · ingen avsløring: ordinært søk, partner-API, portal og support returnerer ikke status, metadata eller treff på skjermet undersøkelse. Utenfor tilgangsgruppen svarer tjenesten som om ressursen ikke finnes.</Callout></div>
        </Panel>
        <TestPanel entries={['Undersøkelse har eget livsløp og tilgangsregel.', 'Ugjennomsiktige referanser brukes mot vanlig sak.', 'Rapportutkast krever AML-ansvarlig og korrekt kanal.']} />
      </aside>
    </div>
  )
}

/** Vanlig bruker: ingen innsyn, bare et meldeskjema som alltid svarer «Mottatt». */
function Protected({ role }: { role: Role }) {
  return (
    <div className="space-y-5">
      <div className="border border-dashed border-[#D9C0BE] bg-[#FFFDFC] p-5 text-[12px] leading-6 text-[#765654]">
        Beskyttet visning: undersøkelsesdetaljer er ikke tilgjengelige for din rolle. Tilgang avgjøres per sak, privilegium og access group.
      </div>
      <ConcernForm role={role} />
    </div>
  )
}

function ConcernForm({ role }: { role: Role }) {
  const [kind, setKind] = useState<Signal['kind']>('manuell_observasjon')
  const [subjectName, setSubjectName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, run } = useCall()

  if (sent) return (
    <div role="status" className="space-y-3">
      <SmallTitle title="Mottatt" copy="Takk. Meldingen er mottatt av ansvarlig funksjon. Du får ingen videre status, og saken behandles som normalt." />
      <Callout tone="amber">Ikke informer kunden om meldingen.</Callout>
      <button type="button" className={btn.secondary} onClick={() => { setSent(false); setSubjectName(''); setDescription(''); setAmount('') }}>Meld en ny observasjon</button>
    </div>
  )

  return (
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault()
      const r = await run(() => reportConcern(role, { caseId: null, subjectName, kind, description, amount }))
      if (r) setSent(true)
    }}>
      <SmallTitle title="Meld intern bekymring / manuell observasjon" copy="Meldingen går til en skjermet funksjon. Den vises ikke i saken, i loggen, for kunden eller for partnere." />
      <div><label htmlFor="c-subject" className={fieldLabel}>Hvem eller hva gjelder observasjonen?</label>
        <input id="c-subject" className={field} value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="F.eks. avbrutt oppdrag – navn på part" /></div>
      <div><label htmlFor="c-kind" className={fieldLabel}>Type</label>
        <select id="c-kind" className={field} value={kind} onChange={e => setKind(e.target.value as Signal['kind'])}>
          <option value="internt_tips">Intern bekymring / tips</option>
          <option value="manuell_observasjon">Manuell observasjon (aktivitet eller transaksjon)</option>
        </select></div>
      <div><label htmlFor="c-desc" className={fieldLabel}>Hva har du observert?</label>
        <textarea id="c-desc" className={field} rows={4} value={description} onChange={e => setDescription(e.target.value)} /></div>
      <div><label htmlFor="c-amount" className={fieldLabel}>Beløp og valuta (valgfritt – kontonummer trengs ikke)</label>
        <input id="c-amount" className={field} value={amount} onChange={e => setAmount(e.target.value)} placeholder="F.eks. 250 000 NOK" /></div>
      <button type="submit" disabled={busy} className={btn.primary}>Send til ansvarlig funksjon</button>
    </form>
  )
}

/** Tilgangsgruppen: levende liste over undersøkelser og detaljvisning. */
function Room({ role }: { role: Role }) {
  useSyncExternalStore(restrictedStore.subscribe, restrictedStore.getVersion, restrictedStore.getVersion)
  const list = readInvestigations(role)
  const [openId, setOpenId] = useState<string | null>(null)
  const current = list.find(i => i.id === openId)
  const open = list.filter(i => i.status === 'åpen')
  const high = open.filter(i => i.priority === 'høy').length
  const cards: [string, string, Tone][] = [
    ['Triage', `${open.length} åpne`, open.length ? 'amber' : 'green'],
    ['Høy prioritet', String(high), high ? 'red' : 'neutral'],
    ['Rapporteringsfrist', 'Ingen automatikk', 'neutral'],
  ]

  if (current) return <Detail inv={current} role={role} back={() => setOpenId(null)} />
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">{cards.map(([k, v, t]) => (
        <div key={k} className="border border-[#E3E9EE] p-4"><Label>{k}</Label><div className="mt-2 text-[12px] font-semibold text-[#34465A]">{v}</div><div className="mt-3"><Badge tone={t}>Kontrollert</Badge></div></div>
      ))}</div>
      {list.length === 0
        ? <div className="text-[11px] text-[#718096]">Ingen undersøkelser. Meldinger fra saker eller manuelle observasjoner havner her.</div>
        : <div className="-mx-5 border-t border-[#E2E8ED]"><Table headers={['Ref.', 'Gjelder', 'Siste signal', 'Signaler', 'Prioritet', 'Eier', 'Frist', 'Status', '']} rows={list.map(i => [
          i.ref, i.subjectName, i.signals[i.signals.length - 1]?.description ?? '–', String(i.signals.length),
          <Badge tone={i.priority === 'høy' ? 'red' : 'neutral'}>{i.priority}</Badge>,
          i.owner ?? 'Ikke tildelt', fmt(i.dueAt),
          <Badge tone={i.status === 'åpen' ? 'amber' : 'green'}>{i.status}</Badge>,
          <button type="button" className={btn.link} onClick={() => setOpenId(i.id)} aria-label={`Åpne ${i.ref}`}>Åpne</button>,
        ])} /></div>}
    </div>
  )
}

function Detail({ inv, role, back }: { inv: Investigation; role: Role; back: () => void }) {
  const [finding, setFinding] = useState(inv.finding)
  const [hypothesis, setHypothesis] = useState(inv.hypothesis)
  const [priority, setPriority] = useState(inv.priority)
  const [note, setNote] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [decision, setDecision] = useState<'rapporteres' | 'rapporteres_ikke'>('rapporteres_ikke')
  const { busy, run } = useCall()
  const closed = inv.status === 'avsluttet'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>{inv.ref}</Label><div className="mt-1 text-[15px] font-semibold text-[#172536]">{inv.subjectName}</div></div>
        <button type="button" className={btn.secondary} onClick={back}>Til oversikten</button>
      </div>
      <KeyValues rows={[['Status', <Badge tone={closed ? 'green' : 'amber'}>{inv.status}</Badge>], ['Eier', inv.owner ?? 'Ikke tildelt'], ['Frist', fmt(inv.dueAt)], ['Opprettet', fmt(inv.createdAt)]]} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div><label htmlFor="i-finding" className={fieldLabel}>Faktisk funn</label>
            <textarea id="i-finding" className={field} rows={3} value={finding} disabled={closed} onChange={e => setFinding(e.target.value)} /></div>
          <div><label htmlFor="i-hyp" className={fieldLabel}>Hypotese (antakelse – holdes adskilt fra fakta)</label>
            <textarea id="i-hyp" className={field} rows={2} value={hypothesis} disabled={closed} onChange={e => setHypothesis(e.target.value)} /></div>
          <div><label htmlFor="i-prio" className={fieldLabel}>Prioritet</label>
            <select id="i-prio" className={field} value={priority} disabled={closed} onChange={e => setPriority(e.target.value as Investigation['priority'])}>
              <option value="normal">Normal</option><option value="høy">Høy</option>
            </select></div>
          <div><label htmlFor="i-note" className={fieldLabel}>Notat til tidslinjen (valgfritt)</label>
            <input id="i-note" className={field} value={note} disabled={closed} onChange={e => setNote(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn.primary} disabled={busy || closed} onClick={() => run(() => updateInvestigation(role, inv.id, { finding, hypothesis, priority }, note), 'Undersøkelsen er oppdatert').then(() => setNote(''))}>Lagre</button>
            {!inv.owner && <button type="button" className={btn.secondary} disabled={busy || closed} onClick={() => run(() => updateInvestigation(role, inv.id, { owner: 'Hvitvaskingsansvarlig Demo' }), 'Du er eier')}>Ta eierskap</button>}
          </div>
          <div className="pt-2"><SmallTitle title="Avslutning" /></div>
          {inv.conclusion ? (
            <Callout tone={inv.conclusion.reportDecision === 'rapporteres' ? 'red' : 'green'}>
              <b>{inv.conclusion.reportDecision === 'rapporteres' ? 'Besluttet rapportert til FIU' : 'Ikke rapportert'}</b> · {inv.conclusion.responsible} · {fmt(inv.conclusion.at)}<br />{inv.conclusion.text}
              <br /><span>Selve innsendingen til FIU skjer via godkjent portalrutine og simuleres ikke – en myndighetskvittering skal aldri simuleres.</span>
            </Callout>
          ) : (
            <div className="space-y-3">
              <div><label htmlFor="i-concl" className={fieldLabel}>Selvstendig konklusjon</label>
                <textarea id="i-concl" className={field} rows={3} value={conclusion} onChange={e => setConclusion(e.target.value)} /></div>
              <fieldset>
                <legend className={fieldLabel}>Beslutning om rapportering</legend>
                <div className="flex flex-wrap gap-4 text-[12px] text-[#3C4D60]">
                  <label className="flex items-center gap-2"><input type="radio" name="rep" checked={decision === 'rapporteres_ikke'} onChange={() => setDecision('rapporteres_ikke')} /> Rapporteres ikke</label>
                  <label className="flex items-center gap-2"><input type="radio" name="rep" checked={decision === 'rapporteres'} onChange={() => setDecision('rapporteres')} /> Rapporteres til FIU</label>
                </div>
              </fieldset>
              <Callout tone="blue">Innsending til FIU simuleres ikke. Beslutningen registreres her; selve rapporten sendes via godkjent portalrutine.</Callout>
              <button type="button" className={btn.danger} disabled={busy} onClick={() => run(() => closeInvestigation(role, inv.id, conclusion, decision), 'Undersøkelsen er avsluttet')}>Avslutt undersøkelsen</button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <Label>Signaler ({inv.signals.length})</Label>
          {inv.signals.map(s => (
            <div key={s.id} className="border border-[#E3E9EE] p-3 text-[11px] leading-5 text-[#4E6075]">
              <b className="text-[#27384B]">{s.kind === 'internt_tips' ? 'Internt tips' : 'Manuell observasjon'}</b> · {fmt(s.at)} · {s.by}<br />{s.description}{s.amount ? <> · <b>{s.amount}</b></> : null}
            </div>
          ))}
          <Label>Tidslinje</Label>
          <div className="divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">
            {inv.timeline.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[11px] text-[#4E6075]">
                <span><span className="text-[#718096]">{fmt(t.at)}</span> · {t.text}</span><Badge>{t.by}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
