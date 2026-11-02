import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { resetDemo, setTiming } from '../api/fakeServer'
import { AppShell } from './Shell'

setTiming([0, 0], 0)
beforeAll(async () => { await resetDemo() })

describe('appskall i Libans design', () => {
  it('rendrer topp, rollekort og sidemeny', () => {
    const html = renderToString(<AppShell />)
    for (const t of ['NORDISK', 'Test som rolle', 'Platform Super Admin', 'Bedriftsadmin', 'Kunde', 'DIN FUNKSJON', 'Arbeidskø']) expect(html).toContain(t)
  })
})
