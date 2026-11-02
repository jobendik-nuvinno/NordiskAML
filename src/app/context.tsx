import { createContext, useContext } from 'react'
import type { ScreenId as DesignScreenId } from '../design/AMLCommandCenter'
import type { Role } from '../domain/types'

/** Designets tre roller pluss ekstern kunde (kundeportalen er adskilt fra internflaten). */
export type DesignRole = 'platform' | 'admin' | 'user' | 'customer'
/** Funksjon innen rollen «Bruker» – styrer hvilken backend-rolle kallene gjøres som. */
export type UserFunction = 'saksbehandler' | 'godkjenner' | 'hvitvaskingsansvarlig'
export type ScreenId = DesignScreenId | 'insights' | 'portal'

export interface AppCtx {
  /** Rollen kallene mot den simulerte backenden gjøres som. */
  role: Role
  /** Innlogget person (navn) – brukes der regler krever ulike personer, f.eks. to godkjennere. */
  actor: string
  designRole: DesignRole
  fn: UserFunction
  /** Aktiv sak for de sakstilknyttede skjermene (Saksoversikt, Eierskap, Screening …). */
  caseId: string | null
  openCase: (id: string, screen?: ScreenId) => void
  go: (screen: ScreenId) => void
}

export const Ctx = createContext<AppCtx | null>(null)
export function useApp(): AppCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp utenfor AppShell')
  return c
}

/** Skjermer som viser én sak. */
export const CASE_SCREENS: ScreenId[] = ['case', 'identity', 'ownership', 'screening', 'risk', 'evidence', 'decision', 'history']
