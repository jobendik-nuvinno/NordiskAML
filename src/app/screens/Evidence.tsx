import { useState } from 'react'
import { activeDecision } from '../../domain/rules'
import { requestDocument } from '../../api/fakeServer'
import type { Evidence } from '../../domain/types'
import { fmt, useCall, useStore } from '../hooks'
import { useApp } from '../context'
import { Badge, btn, Callout, field, fieldLabel, mono, Panel, SmallTitle, Table, TestPanel, type Tone } from '../ui'

const KIND: Record<Evidence['kind'], [string, Tone]> = {
  register: ['Register', 'blue'],
  dokument: ['Dokument', 'neutral'],
  beslutningsgrunnlag: ['Beslutningsgrunnlag', 'green'],
}

/** Bevis og forespørsler (design «Evidence»): bevismanifest med versjon og hash, og dokumentforespørsler (PRV-02). */
export function EvidenceScreen() {
  const { role, caseId } = useApp()
  const c = useStore().cases.find(x => x.id === caseId)!
  const { busy, run } = useCall()
  const [picked, setPartyId] = useState('')
  const partyId = picked || c.parties[0]?.id || ''
  const decided = !!activeDecision(c)
  const open = c.docRequests.filter(r => r.status === 'open')
  const partyName = (id: string) => c.parties.find(p => p.id === id)?.name ?? id

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]">
      <div className="space-y-5">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Bevismanifest" copy="Hver fil og kilde har versjon, hash, klassifisering og kobling til kontroll eller beslutning." />
            <Badge tone="blue">{c.evidence.length} bevis</Badge>
          </div>
          {c.evidence.length === 0
            ? <div className="px-5 py-4 text-[11px] text-[#718096]">Ingen bevis samlet ennå.</div>
            : <Table headers={['Bevis', 'Type', 'Kilde', 'Samlet', 'Versjon', 'SHA-256']} rows={c.evidence.map(ev => [
              ev.title,
              <Badge tone={KIND[ev.kind][1]}>{KIND[ev.kind][0]}</Badge>,
              ev.source,
              fmt(ev.collectedAt),
              `v${ev.version}`,
              <span className={mono} title={ev.sha256}>{ev.sha256.slice(0, 12)}…</span>,
            ])} />}
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Dokumentforespørsler" copy="Kunden ser bare nøytral portaltekst – aldri intern begrunnelse." />
          </div>
          {c.docRequests.length === 0
            ? <div className="px-5 py-4 text-[11px] text-[#718096]">Ingen dokumenter etterspurt.</div>
            : <Table headers={['Forespørsel', 'Gjelder', 'Opprettet', 'Levert', 'Status']} rows={c.docRequests.map(r => [
              r.title,
              partyName(r.partyId),
              fmt(r.createdAt),
              fmt(r.deliveredAt),
              r.status === 'open' ? <Badge tone="amber">Venter på kunde</Badge> : <Badge tone="green">Levert</Badge>,
            ])} />}
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Mangler før beslutning" copy="Bevis og dokumentasjon blir ikke «grønne» ved å være gamle eller ufullstendige." />
          <div className="mt-4 space-y-3">
            {open.length === 0
              ? <Callout tone="green">Ingen åpne dokumentforespørsler.</Callout>
              : open.map(r => <Callout key={r.id} tone="amber"><b>{r.title}</b><br />Etterspurt {fmt(r.createdAt)}. Kunden har ikke levert, og forespørselen kan ikke lukke sperren før dokumentet er mottatt.</Callout>)}
          </div>
          {decided ? <div className="mt-4"><Callout tone="blue">Saken er besluttet. Nye opplysninger etterspørres etter overprøving av beslutningen.</Callout></div> : <form className="mt-4" onSubmit={e => { e.preventDefault(); run(() => requestDocument(role, c.id, partyId), 'Kundeforespørsel opprettet med nøytral portaltekst') }}>
            <label htmlFor="ev-party" className={fieldLabel}>Be om eierdokumentasjon for</label>
            <select id="ev-party" className={field} value={partyId} onChange={e => setPartyId(e.target.value)}>
              {c.parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" disabled={busy || !partyId} className={'mt-3 w-full ' + btn.primary}>Be om dokument</button>
          </form>}
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Låst grunnlag (PRV-02)" copy="Ved beslutning fanges et øyeblikksbilde av hele grunnlaget og legges i manifestet som eget bevis med SHA-256." />
          <div className="mt-4 border-l-2 border-[#1D6F86] bg-[#F1F7FA] p-3 text-[11px] leading-5 text-[#4C6F7C]">
            Ny dokumentversjon legges til som ny rad – tidligere versjoner og hash beholdes, slik at grunnlaget kan verifiseres i ettertid.
          </div>
        </Panel>
        <TestPanel entries={['Kildeutfall og råfunn beholdes som eget resultat.', 'Bevis kan verifiseres innenfor lovlig oppbevaring.', 'Portalviser bare etterspurt dokument, ikke intern begrunnelse.']} />
      </aside>
    </div>
  )
}
