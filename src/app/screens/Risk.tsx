import { evaluateBlockers, OUTCOME_LABEL, recommend } from '../../domain/rules'
import { fmt, useStore } from '../../ui/hooks'
import { useApp } from '../context'
import { Badge, Callout, Metric, Panel, SmallTitle, Table, TestPanel, type Tone } from '../ui'

const BAND_TONE: Record<'lav' | 'middels' | 'høy', Tone> = { lav: 'green', middels: 'amber', høy: 'red' }

export function RiskScreen() {
  const { caseId, go } = useApp()
  const c = useStore().cases.find(x => x.id === caseId)!
  const blockers = evaluateBlockers(c)
  const r = c.risk
  const rec = recommend(r, blockers)

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <Metric label="Risikoscore" value={r ? String(r.score) : '–'} help={r ? `Sum av ${r.factors.length} faktorer` : 'Ikke beregnet ennå'} tone={r ? BAND_TONE[r.band] : 'neutral'} />
        <Metric label="Risikonivå" value={r ? r.band[0].toUpperCase() + r.band.slice(1) : '–'} help={r ? `Middels ≥ ${r.thresholds.middels} · høy ≥ ${r.thresholds.høy}` : '–'} tone={r ? BAND_TONE[r.band] : 'neutral'} />
        <Metric label="Policy / versjon" value={r ? `v${r.version}` : '–'} help={r ? `${r.policy} · ${fmt(r.computedAt)}` : '–'} tone="blue" />
        <Metric label="Åpne sperrer" value={String(blockers.length)} help={blockers.length ? 'Vurderes før poengsum' : 'Poengsummen styrer anbefalingen'} tone={blockers.length ? 'red' : 'green'} />
      </div>
      <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Forklarbar risikovurdering" copy="Hver faktor peker til kilde, regel-ID og input som var kjent på beslutningstidspunktet." />
          </div>
          {r ? (
            <>
              <Table headers={['Faktor', 'Verdi', 'Kilde', 'Bidrag']}
                rows={[
                  ...r.factors.map(f => [f.label, f.value, f.source, `+${f.contribution}`]),
                  ['Sum', `Terskler: middels ≥ ${r.thresholds.middels}, høy ≥ ${r.thresholds.høy}`, r.policy, <b>{r.score} ({r.band})</b>],
                ]} />
              <div className="border-t border-[#E7EDF1] p-5">
                <Callout tone={blockers.length ? 'red' : 'green'}>
                  Sperrer vurderes <b>før</b> poengsummen.{' '}
                  {blockers.length
                    ? <>{blockers.length} åpen(e) sperre(r): {blockers.map(b => b.label).join(', ')}. Lav score kan ikke gi klart grunnlag.</>
                    : 'Ingen åpne sperrer – poengsummen styrer anbefalingen.'}
                </Callout>
              </div>
            </>
          ) : <p className="px-5 py-6 text-[12px] text-[#718096]">Risikoprofil er ikke beregnet ennå.</p>}
        </Panel>
        <aside className="space-y-5">
          <Panel className="p-5">
            <SmallTitle title="Tiltaksforslag" copy="Automatisering foreslår, men en autorisert person vurderer og dokumenterer." />
            <div className="mt-4 space-y-2">
              {blockers.map((b, i) => (
                <div key={'b' + i} className="flex justify-between gap-3 border border-[#E2E8ED] p-3 text-[11px]">
                  <span><b className="block font-semibold text-[#44566A]">{b.label}</b><span className="text-[#718096]">{b.detail}</span></span>
                  <span className="self-start"><Badge tone="red">Sperre</Badge></span>
                </div>
              ))}
              {r?.mandatoryMeasures.map(m => (
                <div key={m} className="flex justify-between gap-3 border border-[#E2E8ED] p-3 text-[11px]">
                  <span className="font-semibold text-[#44566A]">{m}</span><Badge tone="amber">Obligatorisk</Badge>
                </div>
              ))}
              {!blockers.length && !r?.mandatoryMeasures.length && <Callout tone="green">Ingen sperrer eller obligatoriske tiltak.</Callout>}
            </div>
            <p className="mt-3 text-[11px] text-[#718096]">Maskinell anbefaling: <b>{OUTCOME_LABEL[rec]}</b></p>
            <button type="button" onClick={() => go('decision')} className="mt-4 w-full border border-[#C9D4DE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#42536A]">Gå til beslutning</button>
          </Panel>
          <TestPanel entries={['Lav score kan ikke overstyre en sperre.', 'Integrasjon eller KI kan ikke fatte sluttbeslutning.', 'Avvik må ha begrunnelse og riktig fullmakt.']} />
        </aside>
      </div>
    </div>
  )
}
