import { useState, type FormEvent } from 'react'
import { createCheck } from '../api/fakeServer'
import { ENABLED_COUNTRIES, SERVICES } from '../api/seed'
import { SECTOR_LABEL, serviceLabel } from '../domain/rules'
import type { Country, Role, Sector } from '../domain/types'
import { useCall } from './hooks'

const COUNTRIES: { code: Country; name: string }[] = [
  { code: 'NO', name: 'Norge' }, { code: 'SE', name: 'Sverige' }, { code: 'DK', name: 'Danmark' },
  { code: 'FI', name: 'Finland' }, { code: 'IS', name: 'Island' },
]

export function NewCheck({ role, created }: { role: Role; created: (id: string) => void }) {
  const [orgNr, setOrgNr] = useState('100 200 301')
  const [country, setCountry] = useState<Country>('NO')
  const [sector, setSector] = useState<Sector>('legal')
  const [service, setService] = useState<string>('company-transfer')
  const { busy, run } = useCall()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const c = await run(() => createCheck(role, { orgNr, country, sector, service }), 'Kontroll startet')
    if (c) created(c.id)
  }

  return (
    <>
      <div className="cap">Saksbehandler / nytt oppdrag</div>
      <h1>Start kontroll</h1>
      <p className="sub">Plattformen avgrenser oppdraget, henter registerdata, kontrollerer og klargjør et beslutningsgrunnlag.</p>
      <div className="grid">
        <article>
          <form onSubmit={submit}>
            <label htmlFor="orgnr">Organisasjonsnummer</label>
            <input id="orgnr" className="form" value={orgNr} onChange={e => setOrgNr(e.target.value)} inputMode="numeric" autoComplete="off" required aria-describedby="orgnr-hint" />
            <label htmlFor="country">Land (jurisdiksjon for oppdraget)</label>
            <select id="country" className="form" value={country} onChange={e => setCountry(e.target.value as Country)}>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code} disabled={!ENABLED_COUNTRIES.includes(c.code)}>
                  {c.name}{ENABLED_COUNTRIES.includes(c.code) ? '' : ' – landpakke ikke godkjent'}
                </option>
              ))}
            </select>
            <label htmlFor="sector">Sektor</label>
            <select id="sector" className="form" value={sector} onChange={e => setSector(e.target.value as Sector)}>
              {(Object.keys(SECTOR_LABEL) as Sector[]).map(s => (
                <option key={s} value={s} disabled={s !== 'legal'}>{SECTOR_LABEL[s]}{s === 'legal' ? '' : ' – ikke aktivert'}</option>
              ))}
            </select>
            <label htmlFor="service">Tjeneste</label>
            <select id="service" className="form" value={service} onChange={e => setService(e.target.value)}>
              {SERVICES.map(s => <option key={s} value={s}>{serviceLabel(s)}</option>)}
            </select>
            <button className="primary" disabled={busy}>{busy ? 'Starter …' : 'Start kontroll'}</button>
          </form>
        </article>
        <article id="orgnr-hint">
          <h2>Fiktive demoforetak</h2>
          <div className="row"><span className="bold">100 200 301</span> Fjordlys Eksempel AS<span className="end mut">Hovedløp</span></div>
          <div className="row"><span className="bold">100 300 401</span> Kystlinje Eksempel AS<span className="end mut">Sirkulær eierkjede</span></div>
          <div className="row"><span className="bold">5560000101</span> Sund Eksempel AB<span className="end mut">SE, ren struktur</span></div>
          <p className="mut">Ukjent nummer gir «ikke funnet i simulert register». Kryss av for kildeutfall i toppen for å se ventestatus.</p>
        </article>
      </div>
    </>
  )
}
