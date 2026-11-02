import { commercialView } from '../../domain/metrics'
import { useStore } from '../hooks'
import { Badge, Callout, Metric, Panel, SmallTitle, Table, TestPanel } from '../ui'

/**
 * Revisjon og ledelsesrapport for bedriftsadmin (design «TenantAudit»), kommersiell visning (UX-05):
 * bare forbruk av kontroller. Kunder, treff, risiko og rapportstatus vises aldri her.
 */
export function TenantAuditScreen() {
  const v = commercialView(useStore().cases)
  return (
    <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Kontroller brukt" value={String(v.controlsUsed)} help={`Registrerte kontroller i ${v.period}`} tone="green" />
          <Metric label="Periode" value={v.period} help="Inneværende fakturaperiode" tone="blue" />
          <Metric label="Visning" value="Kommersiell" help="Uten kunde- og saksinnhold" tone="neutral" />
        </div>
        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Hva denne visningen inneholder" copy="Etterprøvbart forbruk uten å putte rå persondata eller saksinnhold i ledelsesrapporten." />
          </div>
          <Table headers={['Opplysning', 'Kommersiell visning', 'Begrunnelse']} rows={[
            ['Antall kontroller brukt', <Badge tone="green">Vises</Badge>, 'Grunnlag for forbruk og fakturering'],
            ['Kunder og saksnavn', <Badge tone="red">Skjult</Badge>, 'Ikke nødvendig for kommersiell rolle'],
            ['Screeningtreff', <Badge tone="red">Skjult</Badge>, 'Fagopplysning – bare saksbehandling'],
            ['Risikonivå', <Badge tone="red">Skjult</Badge>, 'Fagopplysning – bare saksbehandling'],
            ['Rapportstatus', <Badge tone="red">Skjult</Badge>, 'Skjermet sone – kan ikke utledes'],
          ]} />
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Ledelsesrapport" copy="Kvalitet, friksjon og risikodekning vises i AML-ansvarliges interne innsikt – ikke her." />
          <div className="mt-4 space-y-3">
            <div className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">Kontroller brukt i {v.period}</span><b className="text-[#34465A]">{v.controlsUsed}</b></div>
          </div>
          <div className="mt-4"><Callout tone="blue">Kunder, treff, risiko og rapportstatus er skjult for kommersiell rolle (UX-05).</Callout></div>
        </Panel>
        <TestPanel entries={['Eksport skal ikke inneholde skjermet sak eller rå persondata.', 'Revisor har tidsbegrenset, autorisert lesing.', 'Målinger skiller eksterne ventetider fra aktiv tid.']} />
      </aside>
    </div>
  )
}
