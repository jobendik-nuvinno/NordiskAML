import { useState, useSyncExternalStore } from 'react'
import { getCheck, postCheck, redeliver, webhookLog, type ApiResponse } from '../api/partnerApi'

const EXAMPLE = {
  externalReference: 'demo-1042', country: 'NO', sector: 'legal', partyType: 'organisation',
  subjectReference: 'pty-demo-18', serviceCode: 'company-transfer',
}
const pretty = (v: unknown) => JSON.stringify(v, null, 2)
const fmtHeaders = (h: Record<string, string>) => Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\n')

type Method = 'POST' | 'GET'

export function PartnerConsole() {
  const [method, setMethod] = useState<Method>('POST')
  const [key, setKey] = useState('demo-1042-check-v1')
  const [bodyText, setBodyText] = useState(pretty(EXAMPLE))
  const [checkId, setCheckId] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ req: string; r: ApiResponse } | null>(null)
  const [parseError, setParseError] = useState('')
  const logVersion = () => webhookLog.get().reduce((n, e) => n + e.deliveries.length, webhookLog.get().length)
  useSyncExternalStore(webhookLog.subscribe, logVersion, logVersion)
  const events = webhookLog.get()

  async function send(m: Method, k: string, text: string) {
    setParseError('')
    let body: unknown
    if (m === 'POST') {
      try { body = JSON.parse(text) } catch { setParseError('Body er ikke gyldig JSON.'); return }
    }
    setBusy(true)
    try {
      const r = m === 'POST' ? await postCheck(k, body) : await getCheck(checkId.trim())
      if (m === 'POST' && r.status === 202) setCheckId((r.body as { id: string }).id)
      setRes({ req: m === 'POST' ? `POST /v1/checks · Idempotency-Key: ${k}` : `GET /v1/checks/${checkId.trim()}`, r })
    } finally { setBusy(false) }
  }

  function variant(patch: Record<string, unknown>) {
    let base: Record<string, unknown> = EXAMPLE
    try { base = JSON.parse(bodyText) } catch { /* bruk eksempelet */ }
    const text = pretty({ ...base, ...patch })
    setMethod('POST')
    setBodyText(text)
    return text
  }

  return (
    <div className="stack">
      <section className="card stack" aria-labelledby="pc-title">
        <div className="row">
          <h2 id="pc-title">Partner-API (simulert)</h2>
          <span className="badge">AML_partner_API.yaml v1.0.0</span>
        </div>
        <p className="mut">
          Simulert implementasjon av den eksterne kontrakten. Saken havner i arbeidskøen som en vanlig kontroll, men partneren
          ser bare nøytral status. <code>serviceCode</code> kartlegges til internt tjenestefelt, <code>subjectReference</code> til org.nr.
        </p>
        <div className="grid">
          <div className="form stack">
            <label>
              <span className="cap">Metode</span>
              <select value={method} onChange={e => setMethod(e.target.value as Method)}>
                <option value="POST">POST /v1/checks</option>
                <option value="GET">GET /v1/checks/{'{id}'}</option>
              </select>
            </label>
            {method === 'POST' ? (
              <>
                <label>
                  <span className="cap">Idempotency-Key (16–128 tegn)</span>
                  <input value={key} onChange={e => setKey(e.target.value)} />
                </label>
                <label>
                  <span className="cap">Body (application/json)</span>
                  <textarea rows={10} value={bodyText} onChange={e => setBodyText(e.target.value)} spellCheck={false} />
                </label>
              </>
            ) : (
              <label>
                <span className="cap">id</span>
                <input value={checkId} onChange={e => setCheckId(e.target.value)} placeholder="uuid fra Location" />
              </label>
            )}
            {parseError && <p role="alert" className="badge warn">{parseError}</p>}
            <div className="row">
              <button className="primary" disabled={busy} onClick={() => send(method, key, bodyText)}>
                {busy ? 'Sender …' : 'Send'}
              </button>
            </div>
            <div className="row">
              <button disabled={busy} onClick={() => { setMethod('POST'); send('POST', key, bodyText) }}>Send samme igjen</button>
              <button disabled={busy} onClick={() => send('POST', key, variant({ externalReference: 'demo-1042-endret' }))}>
                Endre innhold med samme nøkkel
              </button>
              <button disabled={busy} onClick={() => send('POST', 'demo-1042-check-fi-1', variant({ country: 'FI' }))}>Prøv FI</button>
            </div>
          </div>
          <div className="stack" aria-live="polite">
            <span className="cap">Svar</span>
            {res ? (
              <>
                <div className="row">
                  <span className={res.r.status < 400 ? 'badge' : 'badge warn'}>HTTP {res.r.status}</span>
                  <span className="mut">{res.req}</span>
                </div>
                <pre className="code">{fmtHeaders(res.r.headers)}</pre>
                <pre className="code">{pretty(res.r.body)}</pre>
              </>
            ) : <p className="mut">Ingen request sendt ennå.</p>}
          </div>
        </div>
      </section>

      <section className="card stack" aria-labelledby="wh-title">
        <h2 id="wh-title">Webhook-logg · check.status_updated</h2>
        <p className="mut">
          Signatur: HMAC-SHA256 (Web Crypto) over «tidsstempel.rå body», hex. Mottakeren avviser feil signatur og tid utenfor
          ±300 s, og ignorerer duplikat-eventId.
        </p>
        {events.length === 0 && <p className="mut">Ingen hendelser ennå. Opprett en kontroll med POST.</p>}
        {events.map(e => (
          <article key={e.event.eventId} className="card stack">
            <div className="row">
              <strong>{e.event.status}</strong>
              <span className="mut">rev. {e.event.revision} · {new Date(e.event.occurredAt).toLocaleTimeString('nb-NO')}</span>
              <span className="end">
                <button onClick={() => redeliver(e.event.eventId)}>Lever på nytt</button>
              </span>
            </div>
            <pre className="code">{pretty(e.event)}</pre>
            {e.deliveries.map((d, i) => (
              <div key={i} className="stack">
                <div className="row">
                  <span className="cap">Levering {i + 1}</span>
                  <span className={d.verified ? 'badge' : 'badge warn'}>
                    {d.verified ? 'Signatur verifisert ✓' : 'Signatur avvist ✗'}
                  </span>
                  <span className={d.result === 'Mottatt' ? 'mut' : 'badge warn'}>HTTP {d.status} · {d.result}</span>
                </div>
                <pre className="code">{fmtHeaders(d.headers)}</pre>
              </div>
            ))}
          </article>
        ))}
      </section>
    </div>
  )
}
