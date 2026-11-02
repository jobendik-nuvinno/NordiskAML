import { useStore, fmt } from '../hooks'
import { useApp } from '../context'
import { Badge, Callout, KeyValues, Panel, SmallTitle, Table, TestPanel, checkTone, mono } from '../ui'

export function IdentityScreen() {
  const { cases } = useStore()
  const { caseId, go } = useApp()
  const c = cases.find(x => x.id === caseId)
  if (!c) return <Panel className="p-5"><SmallTitle title="Saken finnes ikke lenger" /></Panel>
  const reg = c.registry
  const idCheck = c.checks.find(k => k.key === 'identitet')
  const regCheck = c.checks.find(k => k.key === 'register')
  const evidence = c.evidence.filter(e => e.kind === 'register')

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]">
      <div className="space-y-5">
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Identitet og representasjonsrett" copy="Identitet, fullmakt og gyldighet vurderes separat." /></div>
          {reg
            ? <Table headers={['Person / rolle', 'Metode', 'Status', 'Kilde', 'Hentet']}
                rows={reg.roles.map(r => [`${r.name} · ${r.role.toLowerCase()}`, 'Foretaksregister', <Badge key="s" tone="green">Registrert</Badge>, reg.source, fmt(reg.fetchedAt)])} />
            : <p className="px-5 py-4 text-[11px] text-[#718096]">Registeroppslag er ikke fullført{regCheck ? ` – ${regCheck.detail.toLowerCase()}` : ''}.</p>}
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Registeroppføring" copy="Hentet fra foretaksregisteret. Kilde og tidspunkt følger dataene." />
          <div className="mt-4">
            {reg ? (
              <KeyValues width={120} rows={[
                ['Juridisk navn', reg.legalName], ['Org.nr', reg.orgNr], ['Selskapsform', reg.form],
                ['Status', <Badge key="st" tone={reg.status === 'Aktiv' ? 'green' : 'amber'}>{reg.status}</Badge>],
                ['Kilde', reg.source], ['Hentet', fmt(reg.fetchedAt)],
              ]} />
            ) : <Callout tone="amber">Ingen registeroppføring ennå. Saken kan ikke bli klar før kilden har svart.</Callout>}
          </div>
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Registerbevis" copy="Hver innhenting lagres med sjekksum, slik at grunnlaget kan etterprøves." /></div>
          {evidence.length
            ? <Table headers={['Bevis', 'Kilde', 'Innhentet', 'Versjon', 'SHA-256']}
                rows={evidence.map(e => [e.title, e.source, fmt(e.collectedAt), `v${e.version}`, <span key="h" className={mono}>{e.sha256}</span>])} />
            : <p className="px-5 py-4 text-[11px] text-[#718096]">Ingen registerbevis lagret.</p>}
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <div className="flex justify-between gap-3">
            <SmallTitle title="Avklaringsregel" copy="Et vellykket SSO- eller eID-kall er ikke alene tilstrekkelig dokumentert fullmakt." />
            {idCheck && <span className="self-start"><Badge tone={checkTone[idCheck.state][0]}>{checkTone[idCheck.state][1]}</Badge></span>}
          </div>
          {idCheck && (
            <div className="mt-4">
              <Callout tone={idCheck.state === 'ok' ? 'green' : idCheck.state === 'waiting' ? 'red' : 'amber'}>
                <b>{idCheck.label}:</b> {idCheck.detail}
                {(idCheck.source || idCheck.at) && <span className="mt-1 block text-[10px]">{idCheck.source && `Kilde: ${idCheck.source}`}{idCheck.at && ` · ${fmt(idCheck.at)}`}</span>}
              </Callout>
            </div>
          )}
          <button onClick={() => go('ownership')} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Gå til eierstruktur</button>
        </Panel>
        <TestPanel entries={['eID og autorisasjon kontrolleres separat.', 'Alternativ legitimasjon har dokumentert reserveflyt.', 'Utløpt identitet setter ikke av seg selv i gang blindt nytt oppslag.']} />
      </aside>
    </div>
  )
}
