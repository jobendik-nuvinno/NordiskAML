import { useState, type FormEvent } from 'react'
import { ACTOR, createCheck } from '../../api/fakeServer'
import { ENABLED_COUNTRIES, SERVICES } from '../../api/seed'
import { POLICY, SECTOR_LABEL, serviceLabel } from '../../domain/rules'
import type { Country, Sector } from '../../domain/types'
import { useCall } from '../../ui/hooks'
import { useApp } from '../context'
import { Callout, Label, Panel, SmallTitle, TestPanel, btn, field } from '../ui'

const COUNTRIES: { code: Country; name: string }[] = [
  { code: 'NO', name: 'Norge' }, { code: 'SE', name: 'Sverige' }, { code: 'DK', name: 'Danmark' },
  { code: 'FI', name: 'Finland' }, { code: 'IS', name: 'Island' },
]
const DEMO = [
  ['100 200 301', 'Fjordlys Eksempel AS', 'Hovedløp'],
  ['100 300 401', 'Kystlinje Eksempel AS', 'Sirkulær eierkjede'],
  ['100 400 501', 'Havbris Eksempel AS', 'Screeningtreff'],
  ['5560000101', 'Sund Eksempel AB', 'SE, ren struktur'],
]

export function ScopeScreen() {
  const { role, openCase } = useApp()
  const [orgNr, setOrgNr] = useState('100 200 301')
  const [country, setCountry] = useState<Country>('NO')
  const [sector, setSector] = useState<Sector>('legal')
  const [service, setService] = useState<string>('company-transfer')
  const { busy, run } = useCall()
  const allowed = role === 'saksbehandler'
  const countryOk = ENABLED_COUNTRIES.includes(country)
  const sectorOk = sector === 'legal'
  const digits = orgNr.replace(/\D/g, '')
  const orgOk = /^\d{8,10}$/.test(digits)
  const covered = countryOk && sectorOk

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const c = await run(() => createCheck(role, { orgNr, country, sector, service }), 'Kontroll startet: omfang, land og ansvarlig er lagret.')
    if (c) openCase(c.id)
  }
  const box = 'border border-[#DCE4EB] bg-[#FBFCFD] p-3'
  const select = field + ' mt-1 border-[#DCE4EB] bg-white font-semibold text-[#314357]'

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
      <Panel className="p-5">
        <SmallTitle title="Oppdragsavgrensing" copy="Samme klient kan ha forskjellige AML-utfall per land, sektor og tjeneste." />
        {!allowed && <div className="mt-4"><Callout tone="amber">Bare saksbehandler kan starte en kontroll. Bytt funksjon til «Saksbehandler» for å registrere oppdraget.</Callout></div>}
        <form onSubmit={submit}>
          <fieldset disabled={!allowed || busy} className="mt-5 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Oppdrag</legend>
            <div className={box}>
              <label htmlFor="scope-orgnr"><Label>Organisasjonsnummer</Label></label>
              <input id="scope-orgnr" className={select} value={orgNr} onChange={e => setOrgNr(e.target.value)} inputMode="numeric" autoComplete="off" required aria-describedby="scope-demo" />
            </div>
            <div className={box}>
              <label htmlFor="scope-country"><Label>Land</Label></label>
              <select id="scope-country" className={select} value={country} onChange={e => setCountry(e.target.value as Country)}>
                {COUNTRIES.map(c => {
                  const on = ENABLED_COUNTRIES.includes(c.code)
                  return <option key={c.code} value={c.code} disabled={!on}>{c.name}{on ? '' : ' – landpakke ikke godkjent'}</option>
                })}
              </select>
            </div>
            <div className={box}>
              <label htmlFor="scope-sector"><Label>Sektor</Label></label>
              <select id="scope-sector" className={select} value={sector} onChange={e => setSector(e.target.value as Sector)}>
                {(Object.keys(SECTOR_LABEL) as Sector[]).map(s => <option key={s} value={s} disabled={s !== 'legal'}>{SECTOR_LABEL[s]}{s === 'legal' ? '' : ' – ikke aktivert'}</option>)}
              </select>
            </div>
            <div className={box}>
              <label htmlFor="scope-service"><Label>Tjeneste</Label></label>
              <select id="scope-service" className={select} value={service} onChange={e => setService(e.target.value)}>
                {SERVICES.map(s => <option key={s} value={s}>{serviceLabel(s)}</option>)}
              </select>
            </div>
            <div className={box}><Label>Ansvarlig</Label><div className="mt-1 text-[12px] font-semibold text-[#314357]">{allowed ? ACTOR[role] : 'Saksbehandler'}</div></div>
            <div className={box}><Label>Registerkilde</Label><div className="mt-1 text-[12px] font-semibold text-[#314357]">{country === 'SE' ? 'Simulert Bolagsverket' : country === 'DK' ? 'Simulert CVR' : 'Simulert Brønnøysund'}</div></div>
          </fieldset>
          <div className="mt-5 border border-[#D5E4E1] bg-[#F7FBFA] p-4" aria-live="polite">
            <Label>Forslag fra regelmotor</Label>
            <div className="mt-2 text-[13px] font-semibold text-[#284253]">
              {covered ? `Kontroll er omfattet · ${country} AML-regelpakke · ${POLICY}` : 'Kan ikke startes · pakken er ikke aktivert'}
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[#617188]">
              {covered
                ? `${SECTOR_LABEL[sector]} · ${serviceLabel(service)}. Krever eierstruktur, representasjonsrett, screening og risikovurdering før beslutning.`
                : 'Ingen lands- eller sektoraktivering på usikkert grunnlag. Uavklart grense går til fagansvarlig.'}
              {!orgOk && ' Organisasjonsnummer må ha 8–10 siffer.'}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" disabled={!allowed || busy} className={btn.primary}>{busy ? 'Starter …' : 'Start kontroll'}</button>
          </div>
        </form>
      </Panel>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Avgrensingsregel" copy="Jurisdiksjon bestemmes av rapporteringspliktig, oppdrag og aktivitet - ikke av språk eller statsborgerskap alene." />
          <div className="mt-4 space-y-2">
            {['Land og sektor må være aktivert.', 'Uavklart grense går til fagansvarlig.', 'Beslutning lagrer hjemmel og ansvarlig.'].map(item => (
              <div key={item} className="flex gap-2 border border-[#E2E8ED] p-3 text-[11px] text-[#536478]"><i className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#238A75]" />{item}</div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <div id="scope-demo"><SmallTitle title="Fiktive demoforetak" copy="Ukjent nummer gir «ikke funnet i simulert register»." /></div>
          <div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">
            {DEMO.map(([nr, name, note]) => (
              <button key={nr} type="button" disabled={!allowed} onClick={() => { setOrgNr(nr); setCountry(nr.startsWith('556') ? 'SE' : 'NO') }}
                className="flex w-full items-center justify-between gap-3 py-3 text-left text-[11px] disabled:cursor-default">
                <span><b className="text-[#34465A]">{nr}</b> <span className="text-[#536478]">{name}</span></span>
                <span className="text-[#718096]">{note}</span>
              </button>
            ))}
          </div>
        </Panel>
        <TestPanel entries={['To oppdrag for samme kunde kan få ulikt utfall.', 'Ingen lands- eller sektoraktivering på usikkert grunnlag.', 'Systemet viser hvilken policyversjon som styrer.']} />
      </aside>
    </div>
  )
}
