import { useState } from 'react'
import { ACTOR, resetDemo, setRegistryDown } from '../api/fakeServer'
import type { Role } from '../domain/types'
import { CaseView } from './CaseView'
import { useStore, useToast } from './hooks'
import { NewCheck } from './NewCheck'
import { PartnerConsole } from './PartnerConsole'
import { resetPartnerApi } from '../api/partnerApi'
import { Portal } from './Portal'
import { Workqueue } from './Workqueue'

export type Page = { name: 'queue' } | { name: 'new' } | { name: 'case'; id: string }

const ROLES: Role[] = ['saksbehandler', 'godkjenner', 'kunde', 'partner']

export function App() {
  const state = useStore()
  const [role, setRole] = useState<Role>('saksbehandler')
  const [page, setPage] = useState<Page>({ name: 'queue' })
  const [toast, closeToast] = useToast()
  const internal = role === 'saksbehandler' || role === 'godkjenner'

  return (
    <>
      <header className="top">
        <span className="mark" aria-hidden="true">N</span>
        <span className="logo">Nordisk AML</span>
        <div className="controls">
          <label className="inline">Rolle
            <select value={role} onChange={e => setRole(e.target.value as Role)}>
              {ROLES.map(r => <option key={r} value={r}>{ACTOR[r]}</option>)}
            </select>
          </label>
          <label className="inline">
            <input type="checkbox" checked={state.faults.registryDown} onChange={e => setRegistryDown(e.target.checked)} />
            Simuler kildeutfall (503)
          </label>
          <button onClick={() => { if (confirm('Tilbakestille demoen til startdata?')) { resetPartnerApi(); resetDemo(); setPage({ name: 'queue' }) } }}>
            Tilbakestill demo
          </button>
        </div>
      </header>
      <main>
        {internal && (
          <nav className="tabs" aria-label="Arbeidsflate">
            <button className={page.name === 'queue' ? 'on' : ''} aria-current={page.name === 'queue' ? 'page' : undefined} onClick={() => setPage({ name: 'queue' })}>Arbeidskø</button>
            {role === 'saksbehandler' && (
              <button className={page.name === 'new' ? 'on' : ''} aria-current={page.name === 'new' ? 'page' : undefined} onClick={() => setPage({ name: 'new' })}>Ny kontroll</button>
            )}
          </nav>
        )}
        <section aria-live="polite">
          {internal && page.name === 'queue' && <Workqueue open={id => setPage({ name: 'case', id })} />}
          {internal && page.name === 'new' && role === 'saksbehandler' && <NewCheck role={role} created={id => setPage({ name: 'case', id })} />}
          {internal && page.name === 'new' && role !== 'saksbehandler' && <Workqueue open={id => setPage({ name: 'case', id })} />}
          {internal && page.name === 'case' && <CaseView role={role} id={page.id} back={() => setPage({ name: 'queue' })} />}
          {role === 'kunde' && <Portal />}
          {role === 'partner' && <PartnerConsole />}
        </section>
        <footer className="tiny">
          Prototype med simulert backend i nettleseren. Kun fiktive data – ingen registeroppslag, lagring hos tredjepart eller sending.
          Rollene simulerer ulike brukere; tilgang håndheves i den simulerte backenden.
        </footer>
      </main>
      {toast && (
        <div className={`toast ${toast.kind}`} role={toast.kind === 'err' ? 'alert' : 'status'}>
          {toast.text}<button onClick={closeToast} aria-label="Lukk melding">×</button>
        </div>
      )}
    </>
  )
}
