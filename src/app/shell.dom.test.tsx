// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeAll, describe, expect, it } from 'vitest'
import { resetDemo, setTiming } from '../api/fakeServer'
import { AppShell } from './Shell'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
setTiming([0, 0], 0)
beforeAll(async () => { await resetDemo() })

describe('navigasjon i nettleser', () => {
  it('ett sidehode uansett hvor mange menypunkter man klikker på', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => root.render(<AppShell />))
    const nav = () => [...host.querySelectorAll('nav[aria-label="Skjermer"] button')] as HTMLButtonElement[]
    for (const label of ['Identitet og fullmakt', 'Eierskap og kontroll', 'Screening', 'Rapportering og kvittering', 'Løpende oppfølging', 'Arbeidskø', 'Identitet og fullmakt']) {
      const b = nav().find(x => x.textContent?.includes(label))!
      await act(async () => b.click())
      expect(host.querySelectorAll('h1')).toHaveLength(1)
    }
    expect(host.querySelector('h1')?.textContent).toBe('Identitet og representasjonsrett')
    await act(async () => root.unmount())
  })
})
