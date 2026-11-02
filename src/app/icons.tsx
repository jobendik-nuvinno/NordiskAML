// Enkle linjeikoner (24×24, strek) for navigasjon og sidehoder. Arver farge fra teksten rundt.
import type { ScreenId } from './context'

const P: Record<string, string> = {
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  plus: 'M12 8v8M8 12h8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  id: 'M3 5h18v14H3zM7 15c.6-1.6 1.9-2.4 3-2.4s2.4.8 3 2.4M10 10.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2M15 9h3M15 12h3',
  network: 'M12 4v5M12 9l-6 6M12 9l6 6M10 2h4v4h-4zM4 15h4v4H4zM16 15h4v4h-4z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3ZM10.5 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12.3 12.3 15 15',
  gauge: 'M4 16a8 8 0 1 1 16 0M12 16l4-5M4 16h2M18 16h2',
  clip: 'M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1L13 4.4a3.3 3.3 0 0 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.1-7.1',
  check: 'M9 12l2 2 4-4M12 3l2.4 1.8 3 .2.9 2.9 2.2 2.1-1 2.8 1 2.8-2.2 2.1-.9 2.9-3 .2L12 21l-2.4-1.8-3-.2-.9-2.9L3.5 14l1-2.8-1-2.8 2.2-2.1.9-2.9 3-.2L12 3Z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 14h2v2H9z',
  swap: 'M7 7h13l-3-3M17 17H4l3 3',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  building: 'M4 21V5l8-2v18M12 7l8 2v12M8 8h.01M8 12h.01M8 16h.01M16 12h.01M16 16h.01M2 21h20',
  book: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5ZM18 19v2H6M8 7h6',
  plug: 'M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  lifebuoy: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M16 3.5a4 4 0 0 1 0 7.5M22 21c0-3.1-1.9-5.7-4.6-6.6',
  alert: 'M12 3 2 21h20L12 3ZM12 10v5M12 18h.01',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  layout: 'M3 4h18v16H3zM3 9h18M9 9v11',
  audit: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 13l2 2 4-4',
  inbox: 'M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6l2-8Z',
}

const SCREEN_ICON: Record<ScreenId, keyof typeof P> = {
  queue: 'list', scope: 'plus', case: 'folder', 'customer-portal': 'mail', identity: 'id', ownership: 'network',
  screening: 'shield', risk: 'gauge', evidence: 'clip', decision: 'check', monitoring: 'calendar', transactions: 'swap',
  history: 'clock', investigation: 'lock', reporting: 'send', insights: 'chart', 'platform-overview': 'grid',
  'tenant-onboarding': 'building', 'land-packs': 'book', 'partner-api': 'plug', operations: 'activity',
  'support-access': 'lifebuoy', 'tenant-overview': 'building', members: 'users', 'business-risk': 'alert',
  'local-policy': 'file', 'data-sources': 'database', 'portal-setup': 'layout', 'tenant-audit': 'audit', portal: 'inbox',
}

export function Icon({ name, size = 16, className = '' }: { name: keyof typeof P; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={P[name]} />
    </svg>
  )
}

export const ScreenIcon = ({ screen, size, className }: { screen: ScreenId; size?: number; className?: string }) =>
  <Icon name={SCREEN_ICON[screen] ?? 'grid'} size={size} className={className} />
