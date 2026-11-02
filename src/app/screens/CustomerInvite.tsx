import { requestDocument } from '../../api/fakeServer'
import { analyseOwnership } from '../../domain/rules'
import { fmt, useCall, useStore } from '../../ui/hooks'
import { useApp } from '../context'
import { Badge, Callout, Panel, SmallTitle, Table, TestPanel, btn, mono } from '../ui'

export function CustomerInviteScreen() {
  const { cases } = useStore()
  const { role, caseId, go } = useApp()
  const { busy, run } = useCall()
  const active = caseId ? cases.find(c => c.id === caseId) : undefined
  const scope = active ? [active] : cases
  const requests = scope.flatMap(c => c.docRequests.map(r => ({ c, r })))
  const unresolved = active?.parties.length ? analyseOwnership(active.subjectId, active.parties, active.edges).unresolved : []
  const toRequest = active ? unresolved.filter(u => !active.docRequests.some(r => r.partyId === u.partyId && r.status === 'open')) : []
  const open = requests.filter(x => x.r.status === 'open').length

  const rows = requests.map(({ c, r }) => {
    const ev = r.evidenceId ? c.evidence.find(e => e.id === r.evidenceId) : undefined
    return [
      <div key="t"><div>{r.title}</div>{!active && <div className="mt-1 text-[11px] font-normal text-[#718096]">{c.ref} · {c.name}</div>}</div>,
      <Badge key="s" tone={r.status === 'delivered' ? 'green' : 'amber'}>{r.status === 'delivered' ? 'Mottatt' : 'Mangler'}</Badge>,
      fmt(r.createdAt),
      fmt(r.deliveredAt),
      ev ? <span key="h" className={mono}>{ev.sha256}</span> : '–',
    ]
  })

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.12fr_0.88fr]">
      <div className="space-y-5">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Kundeforespørsler" copy={active ? `Forespørsler sendt til kundeportalen for ${active.ref} · ${active.name}.` : 'Forespørsler sendt til kundeportalen på tvers av alle saker.'} />
            <Badge tone={open ? 'amber' : 'green'}>{open} åpne</Badge>
          </div>
          {requests.length
            ? <Table headers={['Forespørsel', 'Status', 'Sendt', 'Levert', 'Bevis (SHA-256)']} rows={rows} />
            : <p className="px-5 py-4 text-[11px] text-[#718096]">Ingen forespørsler er sendt til kunden ennå.</p>}
        </Panel>
        {active && (
          <Panel className="p-5">
            <SmallTitle title="Be kunden om opplysninger" copy="Forespørselen bygges fra uavklarte eierledd i saken." />
            <div className="mt-4 space-y-2">
              {toRequest.map(u => <Callout key={u.partyId} tone="amber"><b>{u.reason === 'sirkel' ? 'Sirkulær eierkjede' : 'Manglende eierledd'}:</b> {u.detail}</Callout>)}
              {toRequest.length === 0 && <p className="text-[11px] text-[#718096]">{unresolved.length ? 'Alle uavklarte eierledd er allerede etterspurt.' : 'Ingen uavklarte eierledd som krever dokumentasjon fra kunden.'}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy || toRequest.length === 0} className={btn.primary}
                onClick={() => run(async () => { for (const u of toRequest) await requestDocument(role, active.id, u.partyId) }, 'Forespørsel sendt til kundeportalen')}>
                Be om eierdokumentasjon
              </button>
              <button onClick={() => go('case')} className={btn.secondary}>Tilbake til saken</button>
            </div>
          </Panel>
        )}
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Hva er bevisst skjult?" copy="Kunden ser bare nøytral tekst om hva som skal leveres. Kundegrensesnittet har en annen API-projeksjon enn saksflaten." />
          <div className="mt-4 space-y-2">
            {['Intern risikoscore', 'PEP- og sanksjonsresultat', 'Rapportstatus eller mistanke', 'Skjermet undersøkelse', 'Saksbehandlers fritekst'].map(item => (
              <div key={item} className="flex items-center justify-between border border-[#E8EDEF] p-3 text-[11px]"><span className="text-[#536478]">{item}</span><Badge tone="red">Skjult</Badge></div>
            ))}
          </div>
          {requests[0] && (
            <div className="mt-4 border border-[#DCE4EB] bg-[#FBFCFD] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#758397]">Kunden ser</div>
              <div className="mt-2 text-[12px] font-semibold text-[#26384B]">{requests[0].r.title}</div>
              <p className="mt-1 text-[11px] leading-5 text-[#617188]">{requests[0].r.customerText}</p>
            </div>
          )}
        </Panel>
        <TestPanel entries={['Kunden ser kun hva den skal levere.', 'Levert dokument lagres som bevis med sjekksum.', 'Portal og saksflate bruker ulike data-projeksjoner.']} />
      </aside>
    </div>
  )
}
