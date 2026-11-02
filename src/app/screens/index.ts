// Levende skjermer. Skjermer som ikke står her vises som Libans statiske design (src/design/AMLCommandCenter.tsx).
import type { ComponentType } from 'react'
import type { ScreenId } from '../context'
import { CaseOverviewScreen } from './CaseOverview'
import { CustomerInviteScreen } from './CustomerInvite'
import { DecisionScreen } from './Decision'
import { EvidenceScreen } from './Evidence'
import { HistoryScreen } from './History'
import { IdentityScreen } from './Identity'
import { InsightsScreen } from './Insights'
import { InvestigationScreen } from './Investigation'
import { LandPacksScreen } from './LandPacks'
import { MembersScreen } from './Members'
import { MonitoringScreen } from './Monitoring'
import { OwnershipScreen } from './Ownership'
import { PartnerApiScreen } from './PartnerApi'
import { PortalScreen } from './Portal'
import { QueueScreen } from './Queue'
import { RiskScreen } from './Risk'
import { ScopeScreen } from './Scope'
import { ScreeningScreen } from './Screening'
import { TenantAuditScreen } from './TenantAudit'
import { DataSourcesScreen } from './DataSources'
import { OperationsScreen } from './Operations'
import { TenantOverviewScreen } from './TenantOverview'

export const LIVE: Partial<Record<ScreenId, ComponentType>> = {
  queue: QueueScreen,
  scope: ScopeScreen,
  case: CaseOverviewScreen,
  'customer-portal': CustomerInviteScreen,
  identity: IdentityScreen,
  ownership: OwnershipScreen,
  screening: ScreeningScreen,
  risk: RiskScreen,
  evidence: EvidenceScreen,
  decision: DecisionScreen,
  monitoring: MonitoringScreen,
  history: HistoryScreen,
  investigation: InvestigationScreen,
  'partner-api': PartnerApiScreen,
  'tenant-audit': TenantAuditScreen,
  'land-packs': LandPacksScreen,
  members: MembersScreen,
  insights: InsightsScreen,
  portal: PortalScreen,
  'tenant-overview': TenantOverviewScreen,
  'data-sources': DataSourcesScreen,
  operations: OperationsScreen,
}
