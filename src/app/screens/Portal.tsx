import { useState } from 'react'
import { portalTasks, saveDraft, submitDocument, type PortalTask } from '../../api/fakeServer'
import { useCall, useStore } from '../hooks'
import { Badge, Label, Panel, SmallTitle, btn, field, fieldLabel } from '../ui'

/** Ekstern kundeportal. Viser bare hva kunden skal levere – aldri score, status, treff eller sperrer (KYC-06). */
export function PortalScreen() {
  useStore()
  const tasks = portalTasks()
  const open = tasks.filter(t => !t.done).length
  return (
    <div className="grid gap-5 2xl:grid-cols-[1.12fr_0.88fr]">
      <div className="space-y-5">
        {tasks.length === 0 && <Panel className="p-5"><SmallTitle title="Du har ingen åpne forespørsler" copy="Vi tar kontakt dersom vi trenger opplysninger fra deg." /></Panel>}
        {tasks.map(t => <TaskCard key={t.requestId} t={t} />)}
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Oversikt" copy="Dette er forespørslene vi har sendt deg." />
          <div className="mt-4 divide-y divide-[#E2E8ED] border-y border-[#E2E8ED]">
            {tasks.map(t => (
              <div key={t.requestId} className="flex items-center justify-between gap-3 py-3 text-[12px]">
                <span className="font-semibold text-[#3C4D60]">{t.title}</span>
                <Badge tone={t.done ? 'green' : 'amber'}>{t.done ? 'Mottatt' : 'Mangler'}</Badge>
              </div>
            ))}
            {tasks.length === 0 && <div className="py-3 text-[11px] text-[#718096]">Ingen forespørsler.</div>}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[#718096]">{open ? `${open} forespørsel${open === 1 ? '' : 'er'} venter på svar. Du kan lagre og fullføre senere.` : 'Du trenger ikke gjøre noe nå.'}</p>
        </Panel>
      </aside>
    </div>
  )
}

function TaskCard({ t }: { t: PortalTask }) {
  const [draft, setDraft] = useState(t.draft)
  const [file, setFile] = useState<File | null>(null)
  const { busy, run } = useCall()

  if (t.done) return (
    <Panel className="p-5">
      <Label>{t.company}</Label>
      <div className="mt-2 text-[16px] font-semibold text-[#26384B]" role="status">Svaret er registrert</div>
      <p className="mt-2 max-w-[620px] text-[12px] leading-6 text-[#617188]">Takk. Du trenger ikke gjøre noe mer nå. Vi tar kontakt dersom vi trenger mer.</p>
    </Panel>
  )

  const send = () => run(async () => {
    const bytes = file ? await file.arrayBuffer() : null
    await submitDocument('kunde', t.caseId, t.requestId, file && bytes ? { name: file.name, bytes } : null)
  }, 'Dokumentet er sendt')

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><Label>{t.company}</Label><Badge tone="amber">Mangler</Badge></div>
      <div className="mt-4 border border-[#DCE4EB] bg-[#FBFCFD] p-5">
        <div className="text-[16px] font-semibold text-[#26384B]">{t.title}</div>
        <p className="mt-2 max-w-[620px] text-[12px] leading-6 text-[#617188]">{t.text}</p>
        <label htmlFor={`file-${t.requestId}`} className={fieldLabel + ' mt-5'}>Dokument (PDF eller bilde)</label>
        <input id={`file-${t.requestId}`} type="file" className={field} onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <label htmlFor={`note-${t.requestId}`} className={fieldLabel + ' mt-4'}>Kommentar (valgfritt)</label>
        <textarea id={`note-${t.requestId}`} rows={3} className={field} value={draft} onChange={e => setDraft(e.target.value)} />
        <div className="mt-5 flex flex-wrap gap-2">
          <button disabled={busy} onClick={send} className={btn.primary}>{file ? 'Send dokument' : 'Send uten vedlegg'}</button>
          <button disabled={busy} onClick={() => run(() => saveDraft('kunde', t.caseId, t.requestId, draft), 'Utkastet er lagret – du kan fortsette senere')} className={btn.secondary}>Lagre utkast</button>
        </div>
      </div>
    </Panel>
  )
}
