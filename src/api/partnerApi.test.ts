import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemo, setTiming, settled, store } from './fakeServer'
import { getCheck, postCheck, receiver, redeliver, resetPartnerApi, sign, webhookLog, webhooksIdle, WEBHOOK_KEY_ID } from './partnerApi'

setTiming([0, 0], 0)

const body = {
  externalReference: 'demo-1042', country: 'NO', sector: 'legal', partyType: 'organisation',
  subjectReference: 'pty-demo-18', serviceCode: 'company-transfer',
}
const KEY = 'demo-1042-check-v1'
const UUID = /^[0-9a-f-]{36}$/

beforeEach(async () => { resetPartnerApi(); await resetDemo() })

describe('POST /v1/checks', () => {
  it('identisk gjentakelse med samme nøkkel gir samme ID (202)', async () => {
    const a = await postCheck(KEY, body)
    const b = await postCheck(KEY, { ...body })
    expect(a.status).toBe(202)
    expect(b.status).toBe(202)
    expect((b.body as { id: string }).id).toBe((a.body as { id: string }).id)
    expect(a.headers.Location).toBe(`/v1/checks/${(a.body as { id: string }).id}`)
    expect(store.state.cases.filter(c => c.orgNr === '100200301')).toHaveLength(1)
  })
  it('samme nøkkel med annet innhold gir 409 Problem', async () => {
    await postCheck(KEY, body)
    const r = await postCheck(KEY, { ...body, externalReference: 'demo-1043' })
    expect(r.status).toBe(409)
    expect(r.headers['Content-Type']).toBe('application/problem+json')
    expect(r.body).toMatchObject({ status: 409, correlationId: expect.stringMatching(UUID) })
  })
  it('FI gir 422 Problem med correlationId', async () => {
    const r = await postCheck('demo-fi-check-0001', { ...body, country: 'FI' })
    expect(r.status).toBe(422)
    expect(Object.keys(r.body as object).sort()).toEqual(['correlationId', 'status', 'title', 'type'])
  })
  it('nøkkel under 16 tegn gir 400', async () => {
    expect((await postCheck('kort', body)).status).toBe(400)
  })
  it('ukjente felt gir 400', async () => {
    expect((await postCheck(KEY, { ...body, score: 1 })).status).toBe(400)
  })
})

describe('GET /v1/checks/{id}', () => {
  it('seed-saker er ikke synlige for partneren (404)', async () => {
    const r = await getCheck(store.state.cases[0].id)
    expect(r.status).toBe(404)
    expect(r.body).toMatchObject({ status: 404, correlationId: expect.stringMatching(UUID) })
  })
  it('returnerer bare de fire nøytrale feltene', async () => {
    const id = ((await postCheck(KEY, body)).body as { id: string }).id
    await settled(id)
    const r = await getCheck(id)
    expect(r.status).toBe(200)
    expect(Object.keys(r.body as object).sort()).toEqual(['externalReference', 'id', 'status', 'updatedAt'])
    expect(['received', 'processing', 'customer_action_requested', 'review_ready', 'closed']).toContain((r.body as { status: string }).status)
  })
})

describe('webhook check.status_updated', () => {
  it('signaturen verifiseres; endret body avvises', async () => {
    const id = ((await postCheck(KEY, body)).body as { id: string }).id
    await settled(id)
    await webhooksIdle()
    const entry = webhookLog.get()[0]
    expect(entry.event).toMatchObject({ type: 'check.status_updated', checkId: id })
    const d = entry.deliveries[0]
    expect(d).toMatchObject({ status: 204, verified: true, result: 'Mottatt' })
    expect(d.headers['X-AML-Key-Id']).toBe(WEBHOOK_KEY_ID)
    expect(d.headers['X-AML-Signature']).toBe(await sign(d.headers['X-AML-Timestamp'], entry.rawBody))
    const tampered = entry.rawBody.replace(entry.event.status, 'closed')
    expect(await receiver.receive(d.headers, tampered)).toMatchObject({ status: 401, verified: false })
  })
  it('gammelt tidsstempel avvises', async () => {
    const ts = String(Math.floor(Date.now() / 1000) - 301)
    const raw = '{"eventId":"x"}'
    const r = await receiver.receive({ 'X-AML-Timestamp': ts, 'X-AML-Key-Id': WEBHOOK_KEY_ID, 'X-AML-Signature': await sign(ts, raw) }, raw)
    expect(r.status).toBe(401)
  })
  it('ny levering av samme eventId ignoreres', async () => {
    const id = ((await postCheck(KEY, body)).body as { id: string }).id
    await settled(id)
    await webhooksIdle()
    const entry = webhookLog.get()[0]
    await redeliver(entry.event.eventId)
    expect(entry.deliveries).toHaveLength(2)
    expect(entry.deliveries[1]).toMatchObject({ status: 204, verified: true, result: 'Duplikat ignorert' })
  })
})
