import { useState } from 'react'
import { portalTasks, saveDraft, submitDocument, type PortalTask } from '../api/fakeServer'
import { useCall, useStore } from './hooks'

export function Portal() {
  useStore()
  const tasks = portalTasks()
  return (
    <>
      <div className="cap">Selvbetjening / fiktiv kunde</div>
      <h1>Opplysninger om oppdraget</h1>
      <p className="sub">Kundevisning adskilt fra internkontrollen. Du ser bare hva vi trenger fra deg.</p>
      {tasks.length === 0 && <article><p>Du har ingen åpne forespørsler.</p></article>}
      <div className="stack">{tasks.map(t => <TaskCard key={t.requestId} t={t} />)}</div>
    </>
  )
}

function TaskCard({ t }: { t: PortalTask }) {
  const [draft, setDraft] = useState(t.draft)
  const [file, setFile] = useState<File | null>(null)
  const { busy, run } = useCall()

  if (t.done) return (
    <article>
      <div className="cap">{t.company}</div>
      <h2>Svaret er registrert</h2>
      <p>Takk. Du trenger ikke gjøre noe mer nå. Vi tar kontakt dersom vi trenger mer.</p>
    </article>
  )

  const send = () => run(async () => {
    const bytes = file ? await file.arrayBuffer() : null
    await submitDocument('kunde', t.caseId, t.requestId, file && bytes ? { name: file.name, bytes } : null)
  }, 'Dokumentet er sendt')

  return (
    <article>
      <div className="cap">{t.company}</div>
      <h2>{t.title}</h2>
      <p>{t.text}</p>
      <label htmlFor={`file-${t.requestId}`}>Dokument (behandles lokalt i demoen – ingenting sendes)</label>
      <input id={`file-${t.requestId}`} className="form" type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <label htmlFor={`note-${t.requestId}`}>Kommentar (valgfritt)</label>
      <textarea id={`note-${t.requestId}`} className="form" rows={3} value={draft} onChange={e => setDraft(e.target.value)} />
      <div className="row" style={{ borderTop: 0 }}>
        <button disabled={busy} onClick={() => run(() => saveDraft('kunde', t.caseId, t.requestId, draft), 'Utkastet er lagret – du kan fortsette senere')}>Lagre utkast</button>
        <button className="primary" disabled={busy} onClick={send}>{file ? 'Send dokument' : 'Send eksempeldokument'}</button>
      </div>
    </article>
  )
}
