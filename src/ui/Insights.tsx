import { STATUS_LABEL } from '../domain/rules'
import { automationRate, commercialView, managementReport, type RiskBand } from '../domain/metrics'
import type { CaseStatus } from '../domain/types'
import { useStore } from './hooks'

const pctText = (r: number) => `${Math.round(r * 1000) / 10} %`
const RISK_LABEL: Record<RiskBand, string> = { lav: 'Lav', middels: 'Middels', høy: 'Høy', ikke_vurdert: 'Ikke vurdert' }

export function Insights({ view }: { view: 'intern' | 'kommersiell' }) {
  const { cases } = useStore()

  if (view === 'kommersiell') {
    const v = commercialView(cases)
    return (
      <>
        <div className="cap">Kommersiell administrator / forbruk</div>
        <h1>Forbruk</h1>
        <div className="cards">
          <div className="card"><div className="number">{v.controlsUsed}</div>Kontroller forbrukt i {v.period}</div>
        </div>
        <p className="note">
          Denne visningen viser bare antall forbrukte kontroller. Kunder, treff, risiko og rapportstatus er skjult
          for kommersiell rolle (UX-05).
        </p>
      </>
    )
  }

  const m = automationRate(cases)
  const r = managementReport(cases)
  const name = (ref: string) => cases.find(c => c.ref === ref)?.name ?? ref

  return (
    <>
      <div className="cap">Ledelse / innsikt</div>
      <h1>Innsikt</h1>
      <p className="sub">Andel maskinelt ferdige grunnlag og ledelsesrapport. Alle tall beregnes fra revisjonsloggen.</p>

      <div className="cards">
        <div className="card">
          <div className="number">{pctText(m.rate)}</div>
          Maskinelt ferdig grunnlag
          <div className="mut">{m.numerator} / {m.denominator} påbegynte kontroller</div>
        </div>
        <div className="card">
          <div className="number">{m.denominator - m.numerator}</div>
          Frafall (manuell innhenting, venter, stoppet)
          <div className="mut">Utelatt fra nevner: {m.omitted.reduce((n, o) => n + o.count, 0)}</div>
        </div>
        <div className="card">
          <div className="number">{m.totalCases}</div>
          Saker totalt
          <div className="mut">Andel av alle saker: {pctText(m.shareOfAll)}</div>
        </div>
        <div className="card">
          <div className="number">{m.humanDecisions}</div>
          Menneskelige beslutninger
          <div className="mut">Automatiske beslutninger: {m.automatedDecisions}</div>
        </div>
      </div>

      <p className="note warn">
        Målet om ≥ 70 % maskinelt ferdige grunnlag er en pilotambisjon, ikke et målt resultat. Tallene over gjelder
        bare demodataene.
      </p>

      <div className="grid">
        <article>
          <h2>Utvalg per sak</h2>
          <p className="mut">
            Teller: kontroller der grunnlaget ble klart for faglig vurdering med bare systemhendelser etter registrering.
            Nevner: alle påbegynte kontroller, også ventende og stoppede. En menneskelig beslutning gjør aldri
            saken til en automatisk beslutning.
          </p>
          <table>
            <thead><tr><th>Sak</th><th>Talt med</th><th>Årsak fra loggen</th></tr></thead>
            <tbody>
              {m.perCase.map(p => (
                <tr key={p.ref}>
                  <td><span className="bold">{name(p.ref)}</span><br /><span className="mut">{p.ref}</span></td>
                  <td>
                    {!p.started ? <span className="badge neutral">Utelatt</span>
                      : p.automated ? <span className="badge">Maskinelt ferdig</span>
                        : <span className="badge warn">Frafall</span>}
                  </td>
                  <td>{p.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {m.excluded.length > 0 && (
            <>
              <h3>Frafall etter årsak</h3>
              {m.excluded.map(e => (
                <div className="row" key={e.reason}>{e.reason}<span className="end badge neutral">{e.count}</span></div>
              ))}
            </>
          )}
        </article>

        <div className="stack">
          <article>
            <h2>Restanser</h2>
            {(Object.keys(r.backlog) as CaseStatus[]).map(s => (
              <div className="row" key={s}>{STATUS_LABEL[s]}<span className="end bold">{r.backlog[s]}</span></div>
            ))}
            <div className="row"><span className="bold">Åpne totalt</span><span className="end bold">{r.openBacklog}</span></div>
          </article>
          <article>
            <h2>Risikofordeling</h2>
            {(Object.keys(r.risk) as RiskBand[]).map(b => (
              <div className="row" key={b}>{RISK_LABEL[b]}<span className="end bold">{r.risk[b]}</span></div>
            ))}
          </article>
          <article>
            <h2>Kildekvalitet og tiltak</h2>
            <div className="row">Kildeutfall (logg)<span className={`end badge ${r.sourceOutages ? 'err' : ''}`}>{r.sourceOutages}</span></div>
            <div className="row">Venter på kilde nå<span className="end bold">{r.waitingOnSource}</span></div>
            <div className="row">Kilde gjenopprettet<span className="end bold">{r.sourceRecoveries}</span></div>
            <div className="row">Åpne PEP-/sanksjonstreff<span className={`end badge ${r.openHits ? 'warn' : ''}`}>{r.openHits}</span></div>
            <div className="row">Obligatoriske tiltak<span className="end bold">{r.measures}</span></div>
            <div className="row">Manuelle handlinger (logg)<span className="end bold">{r.manualActions}</span></div>
          </article>
        </div>
      </div>
    </>
  )
}
