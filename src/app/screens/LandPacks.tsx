import { useState, useSyncExternalStore } from 'react'
import { ApiError } from '../../api/fakeServer'
import {
  approveVersion, currentVersion, MANDATORY_MEASURES, PACKS, policyStore, proposeVersion, readAudit, readVersions,
  rejectVersion, rollback, suggestVersion, versionAt, type PackCode, type PolicyVersion, type VersionStatus,
} from '../../api/policyServer'
import { useApp } from '../context'
import { fmt, showToast, useCall } from '../hooks'
import { Badge, btn, Callout, field, fieldLabel, KeyValues, Label, Panel, SmallTitle, Table, TestPanel, type Tone } from '../ui'

const STATUS: Record<VersionStatus, [Tone, string]> = {
  utkast: ['neutral', 'Utkast'], foreslått: ['amber', 'Krever godkjenning'], publisert: ['green', 'Publisert'], trukket: ['red', 'Avvist'],
}
const d = (iso: string) => iso.split('-').reverse().join('.')
const todayIso = () => new Date().toISOString().slice(0, 10)

/** Landpakker (design «LandPacks»): versjonerte regelpakker med totrinnspublisering og virkedato. */
export function LandPacksScreen() {
  const { actor } = useApp()
  useSyncExternalStore(policyStore.subscribe, policyStore.getVersion, policyStore.getVersion)
  const { busy, run } = useCall()
  const [pack, setPack] = useState<PackCode>('NO')
  const [asOf, setAsOf] = useState(todayIso())
  const [form, setForm] = useState({ version: '', validFrom: '', changeSummary: '', sourceRef: '' })
  const [remove, setRemove] = useState<string[]>([])
  const [rejection, setRejection] = useState('')
  const [reasons, setReasons] = useState<Record<string, string>>({})

  const versions = readVersions(pack)
  const current = currentVersion(pack)
  const atDate = versionAt(pack, asOf)
  const pending = versions.filter(v => v.status === 'foreslått')
  const audit = readAudit(pack)
  const measures = [...MANDATORY_MEASURES, ...(current?.optionalMeasures ?? [])]

  async function propose() {
    setRejection('')
    try {
      await proposeVersion(actor, pack, { ...form, version: form.version || suggestVersion(pack), removeMeasures: remove })
      showToast(`Versjon foreslått av ${actor}. En annen person må godkjenne før publisering.`)
      setForm({ version: '', validFrom: '', changeSummary: '', sourceRef: '' })
      setRemove([])
    } catch (e) {
      const text = e instanceof ApiError ? `${e.status} · ${e.title}` : String(e)
      setRejection(text)
      showToast(text, 'err')
    }
  }

  const row = (v: PolicyVersion) => {
    const [tone, label] = STATUS[v.status]
    const isCurrent = current?.id === v.id
    const canRollback = v.status === 'publisert' && current && !isCurrent && v.validFrom < current.validFrom
    return [
      <span>v{v.version}{isCurrent ? <span className="ml-2"><Badge tone="blue">Gjeldende</Badge></span> : null}
        {v.rolledBackFrom ? <small className="block pt-1 text-[10px] font-normal text-[#718096]">Tilbakeføring til v{versions.find(x => x.id === v.rolledBackFrom)?.version ?? '?'}</small> : null}</span>,
      d(v.validFrom),
      <Badge tone={tone}>{label}</Badge>,
      v.proposedBy,
      v.approvedBy ?? '–',
      canRollback
        ? <button disabled={busy} onClick={() => run(() => rollback(actor, pack, v.id), `Tilbakeføring til v${v.version} er foreslått og venter på en annen godkjenner.`)} className={btn.link}>Tilbakefør</button>
        : '',
    ]
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-5">
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Regelpakker i drift" copy="Hver pakke har eier, kilde, virkedato og godkjent versjon." />
          </div>
          <Table
            headers={['Pakke', 'Sektor', 'Virkedato', 'Status', 'Eier']}
            rows={PACKS.map(p => {
              if (p.status !== 'aktiv') return [
                <span className="text-[#99A6B5]">{p.code} · {p.name}</span>, p.sector, '–', <Badge tone="neutral">Ikke godkjent</Badge>, p.owner,
              ]
              const cur = currentVersion(p.code)
              const waiting = readVersions(p.code).some(v => v.status === 'foreslått')
              return [
                <button onClick={() => setPack(p.code)} className={'text-left ' + (pack === p.code ? 'text-[#176B5B] underline underline-offset-4' : '')}>
                  {`${p.code} v${cur?.version ?? '–'}`}
                </button>,
                p.sector,
                cur ? d(cur.validFrom) : '–',
                waiting ? <Badge tone="amber">Krever godkjenning</Badge> : <Badge tone="green">Publisert</Badge>,
                cur?.owner ?? p.owner,
              ]
            })}
          />
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title={`Versjonshistorikk · ${pack}`} copy="Publiserte versjoner er låst. Tilbakeføring lager en ny versjon – ingenting slettes." />
            {current ? <Badge tone="green">Gjeldende v{current.version}</Badge> : null}
          </div>
          <Table headers={['Versjon', 'Gyldig fra', 'Status', 'Foreslått av', 'Godkjent av', '']} rows={[...versions].reverse().map(row)} />
          {current ? (
            <div className="border-t border-[#E2E8ED] p-5">
              <KeyValues width={130} rows={[
                ['Kilde', current.sourceRef],
                ['Eier', current.owner],
                ['Endring', current.changeSummary],
                ['Påkrevde tiltak', current.mandatoryMeasures.join(' · ')],
                ['Øvrige tiltak', current.optionalMeasures.join(' · ') || '–'],
              ]} />
            </div>
          ) : null}
          <div className="border-t border-[#E2E8ED] p-5">
            <Label>Totrinnspublisering</Label>
            {pending.length === 0 ? (
              <p className="mt-3 text-[11px] text-[#718096]">Ingen versjoner venter på godkjenning for {pack}.</p>
            ) : pending.map(v => (
              <div key={v.id} className="mt-3 border border-[#DCE4EB] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-[12px] text-[#27384B]">{pack} v{v.version} · gyldig fra {d(v.validFrom)}</b>
                  <Badge tone="amber">Krever godkjenning</Badge>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#536478]">{v.changeSummary}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="border border-[#DCE4EB] p-3"><b className="text-[11px] text-[#314357]">1 · Foreslått av</b><div className="mt-1 text-[12px] text-[#617188]">{v.proposedBy} · {fmt(v.proposedAt)}</div></div>
                  <div className="border border-[#DCE4EB] p-3"><b className="text-[11px] text-[#314357]">2 · Må godkjennes av</b><div className="mt-1 text-[12px] text-[#617188]">Annen faglig godkjenner enn {v.proposedBy}</div></div>
                </div>
                {v.proposedBy === actor ? (
                  <div className="mt-3"><Callout tone="amber">Du ({actor}) foreslo denne versjonen. En annen person må godkjenne. Bytt person i brukermenyen for å godkjenne som en annen.</Callout></div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <button disabled={busy} onClick={() => run(() => approveVersion(actor, v.id), `${pack} v${v.version} er godkjent av ${actor} og publisert.`)} className={btn.primary}>Godkjenn og publiser</button>
                  <input className={field + ' max-w-[260px]'} placeholder="Begrunnelse for avvisning" value={reasons[v.id] ?? ''} onChange={e => setReasons({ ...reasons, [v.id]: e.target.value })} />
                  <button disabled={busy} onClick={() => run(() => rejectVersion(actor, v.id, reasons[v.id] ?? ''), `${pack} v${v.version} er avvist.`)} className={btn.danger}>Avvis</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <SmallTitle title={`Ny versjon · ${pack}`} copy={`Foreslås av ${actor}. Publisering krever godkjenning fra en annen person.`} />
          <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); propose() }}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label><span className={fieldLabel}>Versjon</span><input className={field} placeholder={suggestVersion(pack)} value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></label>
              <label><span className={fieldLabel}>Gyldig fra</span><input type="date" className={field} value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} /></label>
              <label><span className={fieldLabel}>Kilde</span><input className={field} placeholder={current?.sourceRef ?? ''} value={form.sourceRef} onChange={e => setForm({ ...form, sourceRef: e.target.value })} /></label>
            </div>
            <label className="block"><span className={fieldLabel}>Endringsbeskrivelse</span><textarea rows={2} className={field} value={form.changeSummary} onChange={e => setForm({ ...form, changeSummary: e.target.value })} /></label>
            <div>
              <span className={fieldLabel}>Deaktiver tiltak</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {measures.map(m => (
                  <label key={m} className="flex items-center gap-2 border border-[#E2E8ED] p-2.5 text-[11px] text-[#536478]">
                    <input type="checkbox" checked={remove.includes(m)} onChange={e => setRemove(e.target.checked ? [...remove, m] : remove.filter(x => x !== m))} />
                    {m}{MANDATORY_MEASURES.includes(m) ? <span className="ml-auto"><Badge tone="blue">Påkrevd</Badge></span> : null}
                  </label>
                ))}
              </div>
            </div>
            {rejection ? <Callout tone="red">Avvist: {rejection}</Callout> : null}
            <button disabled={busy} className={btn.primary}>Foreslå versjon</button>
          </form>
        </Panel>
      </div>

      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Hvilken versjon gjaldt?" copy="En tilbakedatert kontroll bruker versjonen som gjaldt på datoen." />
          <label className="mt-4 block"><span className={fieldLabel}>Dato</span><input type="date" className={field} value={asOf} onChange={e => setAsOf(e.target.value)} /></label>
          <div className="mt-3">
            {atDate ? (
              <Callout tone="green"><b>{pack} v{atDate.version}</b> gjaldt {d(asOf)} (gyldig fra {d(atDate.validFrom)}). Kilde: {atDate.sourceRef}. {atDate.changeSummary}</Callout>
            ) : (
              <Callout tone="amber">Ingen publisert {pack}-versjon gjaldt {asOf ? d(asOf) : 'valgt dato'}.</Callout>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title={`Revisjonslogg · ${pack}`} copy="Alle forslag, godkjenninger og avviste forsøk." /></div>
          <div className="max-h-[420px] divide-y divide-[#E7EDF1] overflow-y-auto">
            {audit.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-5 py-3 text-[11px]">
                <span><b className="block text-[#34465A]">{a.text}</b><small className="text-[#718096]">{a.actor} · {fmt(a.at)}</small></span>
                {a.outcome === 'avvist' ? <Badge tone="red">Avvist</Badge> : null}
              </div>
            ))}
          </div>
        </Panel>

        <TestPanel entries={[
          'Samme person kan ikke både foreslå og sluttgodkjenne.',
          'Påkrevde tiltak kan ikke slås av – forsøk avvises og logges.',
          'Virkedato og regelversjon følger beslutningen.',
          'Tilbakeføring går til siste gyldige versjon uten å slette historikk.',
        ]} />
      </aside>
    </div>
  )
}
