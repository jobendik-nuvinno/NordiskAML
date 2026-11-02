import { useSyncExternalStore } from 'react'
import { TENANT } from '../../api/membersServer'
import { webhookLog } from '../../api/partnerApi'
import { fmt, useStore } from '../hooks'
import { Badge, Callout, Metric, Panel, SmallTitle, Table, TestPanel } from '../ui'
import { overallHealth, sourceHealth } from './sourceHealth'

const sub = 'mt-1 block text-[10px] font-normal text-[#718096]'
const deliveries = () => webhookLog.get().reduce((n, e) => n + 1 + e.deliveries.length, 0)

/**
 * Datakilder og rettigheter (design «DataSources», A05). Hver leverandørnøkkel og registertilgang er knyttet til
 * avtalt rett, omfang og formål (INT-04). Status er levende og påvirkes av kildeutfall i testmiljøet.
 */
export function DataSourcesScreen() {
  const state = useStore()
  useSyncExternalStore(webhookLog.subscribe, deliveries, deliveries)
  const health = sourceHealth(state.cases, state.faults.registryDown)
  const overall = overallHealth(health)
  const hits = state.cases.flatMap(c => c.screening)
  const listVersion = (list: 'PEP' | 'Sanksjon', fallback: string) =>
    [...new Set(hits.filter(h => h.list === list).map(h => h.listVersion))].sort().at(-1) ?? fallback
  const lastRegistry = health.map(h => h.lastSuccess).filter((x): x is string => !!x).sort().at(-1) ?? null
  const lastWebhook = webhookLog.get().flatMap(e => e.deliveries).map(x => x.at).sort().at(-1) ?? null
  const key = (id: string) => <span className="font-mono text-[10px] text-[#536478]">{id}<span className={sub}>Egen nøkkel · {TENANT}</span></span>

  const rows = [
    ...health.map(h => [
      <span>{h.src.label}<span className={sub}>{h.src.source}</span></span>,
      <span>Bedriftskontroll<span className={sub}>Hvitvaskingsloven – kundetiltak</span></span>,
      `Oppslag per kontroll, ${h.src.country}-kunder`,
      key(h.src.keyId),
      <span><Badge tone={h.tone}>{h.status}</Badge>{h.backlog ? <span className={sub}>{h.backlog} i restkø</span> : null}</span>,
      fmt(h.lastSuccess),
    ]),
    [
      <span>Reelle rettighetshavere NO<span className={sub}>Register over reelle rettighetshavere</span></span>,
      <span>Kontroll av reelle rettighetshavere<span className={sub}>Særskilt tilgang for rapporteringspliktige</span></span>,
      'Bare ved aktiv kundekontroll',
      key('nta-rrh-01'),
      <Badge tone="amber">Særskilt tilgang</Badge>,
      '–',
    ],
    [
      'eID-leverandør',
      'Identitet og signatur',
      'Representant og fullmakt',
      key('nta-eid-01'),
      <Badge tone="amber">Testavtale</Badge>,
      fmt(lastRegistry),
    ],
    [
      'PEP-liste',
      'PEP-kontroll',
      'Parter i aktive kontroller',
      key('nta-screen-01'),
      <span><Badge tone="green">Aktiv</Badge><span className={sub}>{listVersion('PEP', 'PEP-liste NO 2026-10-01')}</span></span>,
      fmt(lastRegistry),
    ],
    [
      'Sanksjonsliste',
      'Sanksjonsscreening',
      'Parter i aktive kontroller',
      key('nta-screen-01'),
      <span><Badge tone="green">Aktiv</Badge><span className={sub}>{listVersion('Sanksjon', 'Sanksjonsliste 2026-11-01')}</span></span>,
      fmt(lastRegistry),
    ],
    [
      'Partner-API',
      'Avtalt oppstart av kontroll',
      'Status – ingen intern beslutning',
      key('demo-key-1'),
      <Badge tone="blue">Testmiljø</Badge>,
      fmt(lastWebhook),
    ],
  ]

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Registerkilder" value={overall.value} help={state.faults.registryDown ? 'Registeret svarer 503' : `${health.filter(h => h.tone === 'green').length} av ${health.length} tilgjengelige uten restkø`} tone={overall.tone} />
          <Metric label="Restkø" value={String(health.reduce((n, h) => n + h.backlog, 0))} help="Kontroller som venter på kilde" tone={health.some(h => h.backlog) ? 'red' : 'neutral'} />
          <Metric label="Kildeutfall" value={String(health.reduce((n, h) => n + h.outages, 0))} help="Registrert i revisjonsloggen" tone="neutral" />
        </div>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Datakilder og behandlingsgrunnlag" copy="Hvert oppslag har avtalt rett, omfang og formål, egen nøkkel for virksomheten og definert feilmåte." />
          </div>
          <Table headers={['Kilde', 'Avtalt rett og formål', 'Omfang', 'Nøkkel', 'Status', 'Siste vellykkede oppslag']} rows={rows} />
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Kildeutfall" copy="Reservegrunnlag må aldri fremstå som registerbekreftet." />
          <div className="mt-4">
            {state.faults.registryDown
              ? <Callout tone="red">Registerkilden er utilgjengelig (503). Nye kontroller settes i ventestatus og gjenopptas fra siste bekreftede posisjon.</Callout>
              : <Callout tone={overall.tone === 'green' ? 'green' : 'amber'}>{overall.tone === 'green' ? 'Alle registerkilder svarer og har vellykkede oppslag.' : 'Minst én kilde mangler vellykket oppslag eller har restkø – status er ikke grønn.'}</Callout>}
          </div>
          <div className="mt-3 text-[11px] leading-5 text-[#718096]">Tilgjengelighet styres fra testmiljø-menyen under brukermenyen.</div>
        </Panel>
        <Panel className="p-5">
          <SmallTitle title="Rett til oppslag" copy="INT-04" />
          <div className="mt-4"><Callout tone="blue">Leverandørnøkler og registertilganger er knyttet til {TENANT} og gjenbrukes aldri mellom virksomheter.</Callout></div>
        </Panel>
        <TestPanel entries={['Kilde, alder og lisens følger bevispakken.', 'Feilresultat er et eget kontrollutfall.', 'Formål og avtale styrer hvert oppslag.']} />
      </aside>
    </div>
  )
}
