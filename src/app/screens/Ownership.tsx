import { requestDocument } from '../../api/fakeServer'
import { analyseOwnership, beneficialOwners, pct, POLICY, UBO_THRESHOLD } from '../../domain/rules'
import type { OwnershipEdge, Party } from '../../domain/types'
import { useCall, useStore } from '../hooks'
import { useApp } from '../context'
import { Badge, Callout, Panel, SmallTitle, Table, TestPanel } from '../ui'

const CONTROL_LABEL: Record<OwnershipEdge['controlType'], string> = { eierskap: 'økonomisk', stemmer: 'stemmerett', avtale: 'avtale' }

function OwnerNodes({ id, parties, edges, chain, onRequest, requested }: {
  id: string; parties: Party[]; edges: OwnershipEdge[]; chain: string[]
  onRequest?: (partyId: string) => void; requested: Set<string>
}) {
  const owners = edges.filter(e => e.to === id)
  if (owners.length === 0) return null
  return (
    <ul className="ml-5 mt-2 space-y-2 border-l border-[#B7C4CE] pl-4">
      {owners.map(e => {
        const p = parties.find(x => x.id === e.from)
        const cycle = chain.includes(e.from)
        const leafOrg = !cycle && p?.type === 'organisation' && !edges.some(x => x.to === e.from)
        const border = cycle ? 'border-[#E7BBB8] bg-[#FFF7F6]' : leafOrg ? 'border-[#E3C9A1] bg-white' : 'border-[#C5DCD7] bg-white'
        return (
          <li key={e.id}>
            <div className={'inline-block min-w-[260px] border p-3 ' + border}>
              <div className="flex flex-wrap items-center gap-2">
                <b className={'text-[11px] ' + (cycle ? 'text-[#963531]' : 'text-[#2B4350]')}>{p?.name ?? e.from}</b>
                <Badge tone="neutral">{pct(e.share)} {CONTROL_LABEL[e.controlType]}</Badge>
                {cycle && <Badge tone="red">↻ Sirkel – uavklart</Badge>}
                {leafOrg && <Badge tone="amber">Uavklart</Badge>}
              </div>
              <small className="mt-1 block text-[10px] text-[#718096]">
                {p?.type === 'person' ? `Person, f. ${p.idRef}` : `${p?.idRef ?? ''} · ${p?.country ?? ''}`} · Kilde: {e.source} · fra {e.validFrom}
              </small>
              {leafOrg && (
                <div className="mt-2 text-[10px] text-[#82510E]">
                  Ingen kjente eiere.{' '}
                  {requested.has(e.from)
                    ? <span className="font-bold">Dokumentasjon etterspurt.</span>
                    : onRequest && <button type="button" onClick={() => onRequest(e.from)} className="font-bold text-[#176B5B] underline underline-offset-4">Be om dokumentasjon</button>}
                </div>
              )}
            </div>
            {!cycle && <OwnerNodes id={e.from} parties={parties} edges={edges} chain={[...chain, e.from]} onRequest={onRequest} requested={requested} />}
          </li>
        )
      })}
    </ul>
  )
}

/** Eierkjede + beregnet andel per person. Gjenbrukbar for låst beslutningsgrunnlag. */
export function OwnershipView({ subjectId, parties, edges, onRequest, requested = new Set() }: {
  subjectId: string; parties: Party[]; edges: OwnershipEdge[]; onRequest?: (partyId: string) => void; requested?: Set<string>
}) {
  const a = analyseOwnership(subjectId, parties, edges)
  const ubo = new Set(beneficialOwners(a).map(p => p.partyId))
  const name = (id: string) => parties.find(p => p.id === id)?.name ?? id
  const subject = parties.find(p => p.id === subjectId)
  return (
    <>
      <div className="overflow-x-auto bg-[#FBFCFD] p-6" aria-label="Eierkjede">
        <div className="inline-block border-2 border-[#176F61] bg-[#F0F9F6] px-4 py-3">
          <b className="block text-[12px] text-[#1D4B5A]">{subject?.name ?? subjectId}</b>
          <small className="mt-1 block text-[10px] text-[#51726E]">Målselskap</small>
        </div>
        <OwnerNodes id={subjectId} parties={parties} edges={edges} chain={[subjectId]} onRequest={onRequest} requested={requested} />
      </div>
      <Table
        headers={['Person', 'Økonomisk andel', 'Stier', 'Klassifisering']}
        rows={a.persons.map(p => [
          name(p.partyId),
          pct(p.total),
          <div className="space-y-1 text-[11px] text-[#718096]">{p.paths.map((s, i) => <div key={i}>{[...s.chain].reverse().map(name).join(' → ')} ({pct(s.share)})</div>)}</div>,
          ubo.has(p.partyId) ? <Badge tone="green">Reell rettighetshaver</Badge> : <Badge tone="neutral">Under terskel</Badge>,
        ])}
      />
      {a.persons.length === 0 && <p className="px-5 py-4 text-[11px] text-[#718096]">Ingen personer funnet i eierkjeden.</p>}
      <div className="space-y-3 border-t border-[#E7EDF1] px-5 py-4">
        {a.unresolved.length > 0 && (
          <Callout tone="amber">
            <b>Uavklart struktur:</b> {a.unresolved.map(u => (u.reason === 'sirkel' ? 'Sirkel: ' : '') + u.detail).join('; ')}.<br />
            Tomme registerdata betyr ikke at selskapet mangler reelle rettighetshavere.
          </Callout>
        )}
        <p className="text-[11px] leading-5 text-[#718096]">
          Regel: {POLICY} – økonomisk andel over {UBO_THRESHOLD * 100} % (&gt; 25 %) gir reell rettighetshaver. Andelen multipliseres per ledd
          (60 % × 60 % = 36 %) og vurderes separat fra faktisk kontroll.
        </p>
      </div>
    </>
  )
}

export function OwnershipScreen() {
  const { role, caseId } = useApp()
  const c = useStore().cases.find(x => x.id === caseId)!
  const { busy, run } = useCall()
  const requested = new Set(c.docRequests.map(r => r.partyId))
  const a = c.parties.length ? analyseOwnership(c.subjectId, c.parties, c.edges) : null
  const request = (pid: string) => { if (!busy) void run(() => requestDocument(role, c.id, pid), 'Forespørsel sendt til kundeportalen') }

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
          <SmallTitle title="Eierstruktur og kontroll" copy="Grafen skiller økonomisk andel, stemmerett og faktisk kontroll." />
          {a && (a.unresolved.length ? <Badge tone="red">{a.unresolved.length} uavklart</Badge> : <Badge tone="green">Avklart</Badge>)}
        </div>
        {c.parties.length
          ? <OwnershipView subjectId={c.subjectId} parties={c.parties} edges={c.edges} onRequest={request} requested={requested} />
          : <p className="px-5 py-6 text-[12px] text-[#718096]">Eierdata er ikke innhentet ennå.</p>}
      </Panel>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Avvik som krever faglig vurdering" copy="Ukjent ledd, motstridende rettighet eller sirkulær eierkjede får forklaring - ikke automatisk klarstatus." />
          <div className="mt-4 space-y-2">
            {a && a.unresolved.length === 0 && <Callout tone="green">Ingen uavklarte eierledd. Reelle rettighetshavere er beregnet fra kildene.</Callout>}
            {a?.unresolved.map(u => (
              <Callout key={u.partyId} tone="red">
                <b>{u.reason === 'sirkel' ? 'Sirkulær eierkjede' : 'Manglende eierledd'}:</b> {u.detail}
                {u.reason === 'manglende_ledd' && (
                  requested.has(u.partyId)
                    ? <div className="mt-1 font-bold">Dokumentasjon etterspurt fra kunden.</div>
                    : <button type="button" disabled={busy} onClick={() => request(u.partyId)} className="mt-3 block w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Be om dokumentasjon</button>
                )}
              </Callout>
            ))}
          </div>
        </Panel>
        <TestPanel entries={['Økonomisk andel og kontrollrett er separate felt.', 'Kilde og tidsperiode vises for hver relasjon.', 'Sirkel eller ukjent ledd gir aldri «ingen eier».']} />
      </aside>
    </div>
  )
}
