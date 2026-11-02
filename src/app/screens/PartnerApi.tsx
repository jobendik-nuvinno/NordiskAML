import { useState, useSyncExternalStore } from 'react'
import { getCheck, postCheck, redeliver, webhookLog, type ApiResponse } from '../../api/partnerApi'
import { Badge, btn, Callout, field, fieldLabel, Label, Panel, SmallTitle, TestPanel } from '../ui'

const EXAMPLE = {
  externalReference: 'demo-1042', country: 'NO', sector: 'legal', partyType: 'organisation',
  subjectReference: 'pty-demo-18', serviceCode: 'company-transfer',
}
const pretty = (v: unknown) => JSON.stringify(v, null, 2)
const fmtHeaders = (h: Record<string, string>) => Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\n')
const code = 'overflow-x-auto whitespace-pre-wrap break-all bg-[#0F2530] p-3 font-mono text-[11px] text-[#D7ECE8]'

type Method = 'POST' | 'GET'

/** Partner-API (design «PartnerApi»): simulert ekstern kontrakt med idempotens og signerte webhooks. */
export function PartnerApiScreen() {
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
    <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-5">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Partnerkontrakt · forespørsel" copy="Saken havner i arbeidskøen som en vanlig kontroll, men partneren ser bare nøytral status." />
            <Badge tone="blue">AML_partner_API.yaml v1.0.0</Badge>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); send(method, key, bodyText) }}>
              <div><label htmlFor="pa-method" className={fieldLabel}>Metode</label>
                <select id="pa-method" className={field} value={method} onChange={e => setMethod(e.target.value as Method)}>
                  <option value="POST">POST /v1/checks</option>
                  <option value="GET">GET /v1/checks/{'{id}'}</option>
                </select></div>
              {method === 'POST' ? (
                <>
                  <div><label htmlFor="pa-key" className={fieldLabel}>Idempotency-Key (16–128 tegn)</label>
                    <input id="pa-key" className={field} value={key} onChange={e => setKey(e.target.value)} /></div>
                  <div><label htmlFor="pa-body" className={fieldLabel}>Body (application/json)</label>
                    <textarea id="pa-body" className={field + ' font-mono'} rows={9} value={bodyText} onChange={e => setBodyText(e.target.value)} spellCheck={false} /></div>
                </>
              ) : (
                <div><label htmlFor="pa-id" className={fieldLabel}>id</label>
                  <input id="pa-id" className={field} value={checkId} onChange={e => setCheckId(e.target.value)} placeholder="uuid fra Location" /></div>
              )}
              {parseError ? <div role="alert"><Callout tone="red">{parseError}</Callout></div> : null}
              <button type="submit" className={'w-full ' + btn.primary} disabled={busy}>{busy ? 'Sender …' : 'Send'}</button>
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" className={btn.outlineGreen} disabled={busy} onClick={() => { setMethod('POST'); send('POST', key, bodyText) }}>Send samme igjen</button>
                <button type="button" className={btn.outlineGreen} disabled={busy} onClick={() => send('POST', key, variant({ externalReference: 'demo-1042-endret' }))}>Endre innhold, samme nøkkel</button>
                <button type="button" className={btn.outlineGreen} disabled={busy} onClick={() => send('POST', 'demo-1042-check-fi-1', variant({ country: 'FI' }))}>Prøv FI</button>
              </div>
            </form>
            <div className="space-y-3" aria-live="polite">
              <Label>Svar</Label>
              {res ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={res.r.status < 400 ? 'green' : 'amber'}>HTTP {res.r.status}</Badge>
                    <span className="text-[11px] text-[#718096]">{res.req}</span>
                  </div>
                  <pre className={code}>{fmtHeaders(res.r.headers)}</pre>
                  <pre className={code}>{pretty(res.r.body)}</pre>
                </>
              ) : <div className="text-[11px] text-[#718096]">Ingen request sendt ennå.</div>}
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Webhook-logg · check.status_updated" copy="Signatur: HMAC-SHA256 over «tidsstempel.rå body». Mottakeren avviser feil signatur og tid utenfor ±300 s, og ignorerer duplikat-eventId." />
          </div>
          <div className="space-y-4 p-5">
            {events.length === 0 ? <div className="text-[11px] text-[#718096]">Ingen hendelser ennå. Opprett en kontroll med POST.</div> : null}
            {events.map(e => (
              <div key={e.event.eventId} className="space-y-3 border border-[#E3E9EE] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{e.event.status}</Badge><span className="text-[11px] text-[#718096]">rev. {e.event.revision} · {new Date(e.event.occurredAt).toLocaleTimeString('nb-NO')}</span></div>
                  <button type="button" className={btn.secondary} onClick={() => redeliver(e.event.eventId)}>Lever på nytt</button>
                </div>
                <pre className={code}>{pretty(e.event)}</pre>
                {e.deliveries.map((d, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label>Levering {i + 1}</Label>
                      <Badge tone={d.verified ? 'green' : 'red'}>{d.verified ? 'Signatur verifisert ✓' : 'Signatur avvist ✗'}</Badge>
                      <Badge tone={d.result === 'Mottatt' ? 'neutral' : 'amber'}>HTTP {d.status} · {d.result}</Badge>
                    </div>
                    <pre className={code}>{fmtHeaders(d.headers)}</pre>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Kontraktsgrense" copy="Partner kan ikke se intern score, mistanke, rapportstatus eller skjermet sak." />
          <div className="mt-4 border-l-2 border-[#1D6F86] bg-[#F1F7FA] p-3 text-[11px] leading-5 text-[#4C6F7C]">GET /checks/{'{id}'} gir kun nøytral fremdrift. Token avgjør tenant, ikke en klientheader. <code>serviceCode</code> kartlegges til internt tjenestefelt, <code>subjectReference</code> til org.nr.</div>
          <button type="button" disabled={busy} onClick={() => send('POST', key, variant({ externalReference: 'demo-1042-endret' }))} className={'mt-4 w-full ' + btn.outlineGreen}>Test idempotens</button>
        </Panel>
        <TestPanel entries={['Fremmed tenant-ID skal aldri gi data.', 'Webhook skal være signert og duplikatsikret.', 'Partnerstatus skal forbli nøytral.']} />
      </aside>
    </div>
  )
}
