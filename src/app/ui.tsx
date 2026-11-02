// Designprimitiver fra Libans MagicPath-design (src/design/AMLCommandCenter.tsx), pluss det de levende skjermene
// trenger i samme visuelle språk. Ikke innfør nye farger eller former her – bruk designets verdier.

import type { ReactNode } from 'react'
import { STATUS_LABEL } from '../domain/rules'
import type { CaseStatus, CheckItem } from '../domain/types'
import type { Tone } from '../design/AMLCommandCenter'

export { Badge, Label, Metric, Panel, SmallTitle, Table, TestPanel } from '../design/AMLCommandCenter'
export type { Tone } from '../design/AMLCommandCenter'

/** Knappestiler, ordrett fra designet. */
export const btn = {
  primary: 'bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:border disabled:border-[#D6DDE5] disabled:bg-[#F3F5F7] disabled:text-[#9AA6B4]',
  navy: 'bg-[#173B5B] px-3.5 py-2 text-[11px] font-bold text-white',
  secondary: 'border border-[#C9D4DE] bg-white px-4 py-2.5 text-[11px] font-bold text-[#42536A] disabled:cursor-not-allowed disabled:text-[#9AA6B4]',
  outlineGreen: 'border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B] disabled:cursor-not-allowed disabled:text-[#9AA6B4]',
  danger: 'border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]',
  disabled: 'cursor-not-allowed border border-[#D6DDE5] bg-[#F3F5F7] px-3 py-2.5 text-[11px] font-bold text-[#99A6B5]',
  link: 'text-[10px] font-bold uppercase tracking-[0.08em] text-[#176B5B] underline underline-offset-4',
}

/** Felt i designets stil (boksene i «Opprett virksomhet»). */
export const field = 'w-full border border-[#CBD6E0] bg-[#FBFCFD] px-3 py-2.5 text-[12px] text-[#3C4D60] outline-none focus:border-[#176F61]'
export const fieldLabel = 'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#758397]'

/** Sperre-/varselblokker med venstre kantlinje, som i designets «Neste steg» og rapportering. */
export function Callout({ tone, children }: { tone: 'red' | 'amber' | 'green' | 'blue'; children: ReactNode }) {
  const c = {
    red: 'border-[#B8413E] bg-[#FDF5F4] text-[#754B49]',
    amber: 'border-[#C27A13] bg-[#FCF5E7] text-[#72561D]',
    green: 'border-[#238A75] bg-[#F7FBFA] text-[#355F57]',
    blue: 'border-[#2D6D9F] bg-[#EEF4FA] text-[#285B80]',
  }[tone]
  return <div className={'border-l-2 p-3 text-[11px] leading-5 ' + c}>{children}</div>
}

/** Nøkkel/verdi-liste som i designets «Sakskontekst». */
export function KeyValues({ rows, width = 96 }: { rows: [string, ReactNode][]; width?: number }) {
  return (
    <div className="divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-3 py-3" style={{ gridTemplateColumns: `${width}px 1fr` }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8692A1]">{k}</span>
          <span className="text-[11px] font-semibold text-[#405166]">{v}</span>
        </div>
      ))}
    </div>
  )
}

export function statusTone(s: CaseStatus): Tone {
  switch (s) {
    case 'review_ready': case 'decided': return 'green'
    case 'waiting_source': return 'red'
    case 'processing': return 'neutral'
    case 'customer_action': return 'blue'
    default: return 'amber'
  }
}
export const statusText = (s: CaseStatus) => STATUS_LABEL[s]

export const checkTone: Record<CheckItem['state'], [Tone, string]> = {
  ok: ['green', 'OK'], open: ['amber', 'Åpent'], waiting: ['red', 'Venter på kilde'], pending: ['neutral', 'Ikke kjørt'],
}

export const mono = 'font-mono text-[10px] break-all text-[#718096]'
