import { useState } from 'react'
import { addIdentityField, resolveHit } from '../../api/fakeServer'
import type { Case, Role, ScreeningHit } from '../../domain/types'
import { fmt, useCall, useStore } from '../hooks'
import { useApp } from '../context'
import { Badge, btn, Callout, field, fieldLabel, Panel, SmallTitle, Table, TestPanel, type Tone } from '../ui'

const HIT_STATUS: Record<ScreeningHit['status'], [Tone, string]> = {
  open: ['amber', 'Må vurderes'], false_positive: ['green', 'Avklart: falskt treff'], confirmed: ['red', 'Bekreftet treff'],
}
const MATCH_TONE: Record<ScreeningHit['fields'][number]['match'], Tone> = { samsvar: 'green', avvik: 'red', mangler: 'amber' }

function HitPanel({ c, h, role }: { c: Case; h: ScreeningHit; role: Role }) {
  const [reason, setReason] = useState('')
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10))
  const { busy, run } = useCall()
  const party = c.parties.find(p => p.id === h.partyId)
  const sanction = h.list === 'Sanksjon'
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
        <SmallTitle title={`${party?.name ?? h.partyId} ↔ ${h.candidate}`} copy={`${sanction ? 'Sanksjon · hastekanal' : 'PEP'} · matchmetode: ${h.method}`} />
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">{h.list} · {h.listVersion}</Badge>
          <Badge tone={HIT_STATUS[h.status][0]}>{HIT_STATUS[h.status][1]}</Badge>
        </div>
      </div>
      <Table headers={['Felt', 'Part', 'Listekandidat', 'Vurdering']}
        rows={h.fields.map(f => [f.field, f.subject || '–', f.candidate || '–', <Badge tone={MATCH_TONE[f.match]}>{f.match}</Badge>])} />
      <div className="space-y-4 border-t border-[#E7EDF1] p-5">
        <Callout tone={sanction ? 'red' : 'amber'}>
          {sanction
            ? <><b>Sanksjon = hastekanal.</b> Potensielt treff sperrer klarsignal til det er avklart; en lav score kan ikke overstyre.</>
            : <><b>PEP gir forsterkede tiltak</b> – ikke automatisk avslag. Navnelikhet alene er ikke et treff.</>}
        </Callout>
        {h.resolution ? (
          <div className="border border-[#E2E8ED] p-4 text-[11px] leading-5 text-[#536478]">
            <b className="text-[#34465A]">{h.status === 'false_positive' ? 'Avklart som falskt treff' : 'Bekreftet treff'}</b> av {h.resolution.by} · {fmt(h.resolution.at)}
            {h.resolution.validUntil && <> · gjelder til {h.resolution.validUntil}</>}
            <p className="mt-1">Begrunnelse: {h.resolution.reason}</p>
            {h.status === 'false_positive' && (
              <button type="button" disabled={busy} className={'mt-3 ' + btn.outlineGreen}
                onClick={() => run(() => addIdentityField(role, c.id, h.partyId), 'Ny opplysning registrert – treffet er åpnet for revurdering')}>
                Registrer ny fødselsdato for {party?.name}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-[1fr_200px]">
            <div>
              <label htmlFor={`r-${h.id}`} className={fieldLabel}>Begrunnelse (påkrevd)</label>
              <textarea id={`r-${h.id}`} rows={2} className={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="Hvilke felt skiller personene?" />
            </div>
            <div>
              <label htmlFor={`v-${h.id}`} className={fieldLabel}>Gjelder til</label>
              <input id={`v-${h.id}`} type="date" className={field} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button type="button" disabled={busy} className={btn.secondary}
                onClick={() => run(() => resolveHit(role, c.id, h.id, 'false_positive', reason, validUntil), 'Treffet er avklart som falskt')}>Avklar som falskt treff</button>
              <button type="button" disabled={busy} className={btn.primary}
                onClick={() => run(() => resolveHit(role, c.id, h.id, 'confirmed', reason, ''), 'Treffet er bekreftet')}>Bekreft treff</button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

export function ScreeningScreen() {
  const { role, caseId, go } = useApp()
  const c = useStore().cases.find(x => x.id === caseId)!
  const check = c.checks.find(k => k.key === 'screening')
  const open = c.screening.filter(h => h.status === 'open')
  const sanctions = c.screening.filter(h => h.list === 'Sanksjon' && h.status !== 'false_positive')

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]">
      <div className="space-y-5">
        {c.screening.length === 0 ? (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
              <SmallTitle title="Screeningresultater" copy="Råfunn beholdes; senere avklaring erstatter ikke opprinnelig resultat." />
              <Badge tone={check?.state === 'pending' ? 'neutral' : 'green'}>{check?.state === 'pending' ? 'Ikke kjørt' : 'Ingen treff'}</Badge>
            </div>
            <Table headers={['Part', 'Kontroll', 'Treffgrunnlag', 'Status']}
              rows={c.parties.map(p => [p.name, 'PEP / sanksjon', check?.state === 'pending' ? 'Ikke kjørt ennå' : 'Ingen treff',
                check?.state === 'pending' ? <Badge tone="neutral">Venter</Badge> : <Badge tone="green">Klar</Badge>])} />
            {check?.at && <p className="px-5 py-3 text-[11px] text-[#718096]">Kontrollert {fmt(check.at)} · {check.source}</p>}
          </Panel>
        ) : c.screening.map(h => <HitPanel key={h.id} c={c} h={h} role={role} />)}
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Hastekanal for sanksjon" copy="Potensielt sanksjonstreff kan ikke ligge i ordinær kø eller påstå at ekstern stans er gjort." />
          <div className="mt-4">
            {sanctions.length
              ? <Callout tone="red">{sanctions.map(h => `${h.candidate} (${h.listVersion})`).join(', ')}: mulig sanksjonstreff sperrer klarsignal. AML-ansvarlig og stedfortreder varsles.</Callout>
              : <Callout tone="green">Ingen åpne sanksjonstreff.</Callout>}
          </div>
          <p className="mt-3 text-[11px] text-[#718096]">{open.length} treff til vurdering · {c.screening.length - open.length} avklart.</p>
          <button type="button" onClick={() => go('risk')} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Se risiko og tiltak</button>
        </Panel>
        <TestPanel entries={['Navnelikhet alene gir ikke avslag.', 'Ny identitet eller listeversjon åpner revurdering.', 'Kritisk treff stopper klarering umiddelbart.']} />
      </aside>
    </div>
  )
}
