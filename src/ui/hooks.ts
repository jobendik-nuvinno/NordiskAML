import { useState, useSyncExternalStore } from 'react'
import { ApiError, store } from '../api/fakeServer'

export function useStore() {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion)
  return store.state
}

// Enkel toast-kanal for svar og feil fra den simulerte backenden.
type Toast = { text: string; kind: 'ok' | 'err' } | null
let toast: Toast = null
const toastListeners = new Set<() => void>()
export function showToast(text: string, kind: 'ok' | 'err' = 'ok') {
  toast = { text, kind }
  toastListeners.forEach(f => f())
}
export function useToast(): [Toast, () => void] {
  const t = useSyncExternalStore(fn => { toastListeners.add(fn); return () => { toastListeners.delete(fn) } }, () => toast, () => toast)
  return [t, () => { toast = null; toastListeners.forEach(f => f()) }]
}

/** Kjører et kall mot backenden med «busy»-tilstand og viser feil som toast. */
export function useCall() {
  const [busy, setBusy] = useState(false)
  const run = async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true)
    try {
      const r = await fn()
      if (ok) showToast(ok)
      return r
    } catch (e) {
      showToast(e instanceof ApiError ? `${e.status} · ${e.title}` : String(e), 'err')
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

export const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : '–'
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
