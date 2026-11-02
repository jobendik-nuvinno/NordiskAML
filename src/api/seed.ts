// Simulert register og seed-data. Alle navn og nummer er oppdiktede.
// Norske org.nr i demoen starter på 1, slik at de aldri kolliderer med ekte org.nr (8xx/9xx).

import type { Country, OwnershipEdge, Party, RegistryEntry, ScreeningHit, Sector } from '../domain/types'

export interface RegistryRecord {
  entry: Omit<RegistryEntry, 'fetchedAt'>
  subjectId: string
  parties: Party[]
  edges: OwnershipEdge[]
}

const org = (id: string, name: string, idRef: string, country: string, source: string): Party =>
  ({ id, type: 'organisation', name, idRef, country, source })
const person = (id: string, name: string, born: string, country: string, source: string): Party =>
  ({ id, type: 'person', name, idRef: `f. ${born}`, country, source })
const edge = (from: string, to: string, share: number | null, source: string): OwnershipEdge =>
  ({ id: `${from}>${to}`, from, to, share, controlType: 'eierskap', source, validFrom: '2025-01-01' })

const REG_NO = 'Simulert Brønnøysund (demo)'
const REG_SE = 'Simulert Bolagsverket (demo)'
const REG_DK = 'Simulert CVR (demo)'

export const REGISTRY: Record<string, RegistryRecord> = {
  // Demo-hovedløp: 60 % × 60 % = 36 %, utenlandsk ledd uten kjente eiere.
  '100200301': {
    entry: {
      orgNr: '100200301', legalName: 'Fjordlys Eksempel AS', form: 'Aksjeselskap', status: 'Aktiv',
      roles: [{ role: 'Daglig leder', name: 'Kari Eksempel' }, { role: 'Styreleder', name: 'Ola Eksempel' }],
      source: REG_NO,
    },
    subjectId: 'p-fjordlys',
    parties: [
      org('p-fjordlys', 'Fjordlys Eksempel AS', '100200301', 'NO', REG_NO),
      org('p-nordkapp', 'Nordkapp Holding Eksempel AS', '100200302', 'NO', REG_NO),
      org('p-baltic', 'Baltic Invest Eksempel OÜ', 'EE-10002003', 'EE', REG_NO),
      person('p-kari', 'Kari Eksempel', '1971', 'NO', REG_NO),
      person('p-ola', 'Ola Eksempel', '1968', 'NO', REG_NO),
    ],
    edges: [
      edge('p-nordkapp', 'p-fjordlys', 0.6, REG_NO),
      edge('p-baltic', 'p-fjordlys', 0.4, REG_NO),
      edge('p-kari', 'p-nordkapp', 0.6, REG_NO),
      edge('p-ola', 'p-nordkapp', 0.4, REG_NO),
    ],
  },
  // Sirkulær eierkjede: Havn → Brygge → Havn.
  '100300401': {
    entry: {
      orgNr: '100300401', legalName: 'Kystlinje Eksempel AS', form: 'Aksjeselskap', status: 'Aktiv',
      roles: [{ role: 'Daglig leder', name: 'Per Eksempel' }], source: REG_NO,
    },
    subjectId: 'p-kystlinje',
    parties: [
      org('p-kystlinje', 'Kystlinje Eksempel AS', '100300401', 'NO', REG_NO),
      org('p-havn', 'Havn Holding Eksempel AS', '100300402', 'NO', REG_NO),
      org('p-brygge', 'Brygge Invest Eksempel AS', '100300403', 'NO', REG_NO),
      person('p-per', 'Per Eksempel', '1975', 'NO', REG_NO),
    ],
    edges: [
      edge('p-havn', 'p-kystlinje', 1, REG_NO),
      edge('p-brygge', 'p-havn', 0.7, REG_NO),
      edge('p-per', 'p-havn', 0.3, REG_NO),
      edge('p-havn', 'p-brygge', 1, REG_NO),
    ],
  },
  // Screening: navnelikt PEP-treff (mangler fødselsår) og potensielt sanksjonstreff på minoritetseier.
  '100400501': {
    entry: {
      orgNr: '100400501', legalName: 'Havbris Eksempel AS', form: 'Aksjeselskap', status: 'Aktiv',
      roles: [{ role: 'Daglig leder', name: 'Jon Eksempel' }], source: REG_NO,
    },
    subjectId: 'p-havbris',
    parties: [
      org('p-havbris', 'Havbris Eksempel AS', '100400501', 'NO', REG_NO),
      person('p-jon', 'Jon Eksempel', '1966', 'NO', REG_NO),
      person('p-ivan', 'Ivan Eksempelov', '1970', 'NO', REG_NO),
    ],
    edges: [edge('p-jon', 'p-havbris', 0.7, REG_NO), edge('p-ivan', 'p-havbris', 0.3, REG_NO)],
  },
  '5560000101': {
    entry: {
      orgNr: '5560000101', legalName: 'Sund Eksempel AB', form: 'Aktiebolag', status: 'Aktiv',
      roles: [{ role: 'VD', name: 'Anna Exempel' }], source: REG_SE,
    },
    subjectId: 'p-sund',
    parties: [
      org('p-sund', 'Sund Eksempel AB', '5560000101', 'SE', REG_SE),
      person('p-anna', 'Anna Exempel', '1980', 'SE', REG_SE),
    ],
    edges: [edge('p-anna', 'p-sund', 1, REG_SE)],
  },
  '10000101': {
    entry: {
      orgNr: '10000101', legalName: 'Eng Eksempel ApS', form: 'Anpartsselskab', status: 'Aktiv',
      roles: [{ role: 'Direktør', name: 'Mads Eksempel' }], source: REG_DK,
    },
    subjectId: 'p-eng',
    parties: [
      org('p-eng', 'Eng Eksempel ApS', '10000101', 'DK', REG_DK),
      person('p-mads', 'Mads Eksempel', '1983', 'DK', REG_DK),
    ],
    edges: [edge('p-mads', 'p-eng', 1, REG_DK)],
  },
}

/** Hva kundens dokument dokumenterer for et uavklart ledd (brukes når portalen leverer). */
export const DOCUMENTED_OWNERS: Record<string, { parties: Party[]; edges: OwnershipEdge[] }> = {
  'p-baltic': {
    parties: [person('p-liis', 'Liis Eksempel', '1980', 'EE', 'Kundedokument: aksjeeierbok')],
    edges: [
      edge('p-liis', 'p-baltic', 0.9, 'Kundedokument: aksjeeierbok'),
      edge('p-kari', 'p-baltic', 0.1, 'Kundedokument: aksjeeierbok'),
    ],
  },
  'p-havn': {
    parties: [],
    edges: [], // sirkelen løses ikke av kunden alene – krever faglig vurdering
  },
}

const LIST_PEP = 'Demo-PEP NO 2026-10-01'
const LIST_SANK = 'Demo-sanksjonsliste 2026-11-01'

/** Simulert screeningleverandør: råtreff per org.nr. */
export const SCREENING: Record<string, ScreeningHit[]> = {
  '100400501': [
    {
      id: 'hit-jon-pep', partyId: 'p-jon', list: 'PEP', listVersion: LIST_PEP, candidate: 'Jon Eksempel (statssekretær)',
      method: 'Navn + alias, translitterasjon, fødselsår',
      fields: [
        { field: 'Navn', subject: 'Jon Eksempel', candidate: 'Jon Eksempel', match: 'samsvar' },
        { field: 'Fødselsår', subject: '1966', candidate: '–', match: 'mangler' },
        { field: 'Land', subject: 'NO', candidate: 'NO', match: 'samsvar' },
      ],
      status: 'open', resolution: null,
    },
    {
      id: 'hit-ivan-sank', partyId: 'p-ivan', list: 'Sanksjon', listVersion: LIST_SANK, candidate: 'Ivan Eksemplov',
      method: 'Navn + alias, translitterasjon, fødselsår',
      fields: [
        { field: 'Navn', subject: 'Ivan Eksempelov', candidate: 'Ivan Eksemplov', match: 'avvik' },
        { field: 'Fødselsår', subject: '1970', candidate: '1970', match: 'samsvar' },
        { field: 'Land', subject: 'NO', candidate: 'RU', match: 'avvik' },
      ],
      status: 'open', resolution: null,
    },
  ],
}

export interface SeedCase {
  orgNr: string
  country: Country
  sector: Sector
  service: string
  urgency: 'haster' | 'normal'
  owner: string | null
  createdHoursAgo: number
  dueInDays: number
  registryDown?: boolean
}

export const SEED_CASES: SeedCase[] = [
  { orgNr: '100300401', country: 'NO', sector: 'legal', service: 'company-transfer', urgency: 'normal', owner: null, createdHoursAgo: 26, dueInDays: 1 },
  { orgNr: '5560000101', country: 'SE', sector: 'legal', service: 'company-transfer', urgency: 'normal', owner: 'Saksbehandler Demo', createdHoursAgo: 50, dueInDays: 2 },
  { orgNr: '100400501', country: 'NO', sector: 'legal', service: 'company-transfer', urgency: 'normal', owner: null, createdHoursAgo: 2, dueInDays: 5 },
  { orgNr: '10000101', country: 'DK', sector: 'legal', service: 'advisory', urgency: 'normal', owner: null, createdHoursAgo: 4, dueInDays: 3, registryDown: true },
]

export const ENABLED_COUNTRIES: Country[] = ['NO', 'SE', 'DK']
export const SERVICES = ['company-transfer', 'estate', 'advisory'] as const
