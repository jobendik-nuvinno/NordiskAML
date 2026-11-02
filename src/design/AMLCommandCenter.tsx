import { useState } from 'react';
export type Role = 'platform' | 'admin' | 'user';
export type Country = 'NO' | 'SE' | 'DK';
export type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';
export type Notice = {
  tone: 'ok' | 'locked' | 'info';
  text: string;
};
export type ScreenId = 'platform-overview' | 'tenant-onboarding' | 'land-packs' | 'partner-api' | 'operations' | 'support-access' | 'tenant-overview' | 'members' | 'business-risk' | 'local-policy' | 'data-sources' | 'portal-setup' | 'tenant-audit' | 'queue' | 'scope' | 'case' | 'customer-portal' | 'identity' | 'ownership' | 'screening' | 'risk' | 'evidence' | 'decision' | 'monitoring' | 'transactions' | 'history' | 'investigation' | 'reporting';
export type NavItem = {
  id: ScreenId;
  label: string;
  caption?: string;
};
export type NavGroup = {
  title: string;
  items: NavItem[];
};
const countryConfig: Record<Country, {
  name: string;
  form: string;
  pack: string;
  registry: string;
}> = {
  NO: {
    name: 'Norge',
    form: 'AS',
    pack: 'NO AML-regelpakke',
    registry: 'Brønnøysundregistrene'
  },
  SE: {
    name: 'Sverige',
    form: 'AB',
    pack: 'SE AML-regelpakke',
    registry: 'Bolagsverket'
  },
  DK: {
    name: 'Danmark',
    form: 'A/S',
    pack: 'DK AML-regelpakke',
    registry: 'CVR'
  }
};
export const roleMeta: Record<Role, {
  label: string;
  short: string;
  description: string;
  defaultScreen: ScreenId;
}> = {
  platform: {
    label: 'Platform Super Admin',
    short: '01',
    description: 'SaaS-plattform og tenants',
    defaultScreen: 'platform-overview'
  },
  admin: {
    label: 'Bedriftsadmin',
    short: '02',
    description: 'Egen virksomhet og tilgang',
    defaultScreen: 'tenant-overview'
  },
  user: {
    label: 'Bruker',
    short: '03',
    description: 'Tildelte AML-saker',
    defaultScreen: 'queue'
  }
};
export const navigation: Record<Role, NavGroup[]> = {
  platform: [{
    title: 'PLATTFORM',
    items: [{
      id: 'platform-overview',
      label: 'Plattformoversikt'
    }, {
      id: 'tenant-onboarding',
      label: 'Opprett virksomhet'
    }, {
      id: 'land-packs',
      label: 'Landpakker og policy'
    }]
  }, {
    title: 'DRIFT OG KONTROLL',
    items: [{
      id: 'partner-api',
      label: 'Integrasjoner og partner-API'
    }, {
      id: 'operations',
      label: 'Driftsinnsikt'
    }, {
      id: 'support-access',
      label: 'Supporttilgang og testlab'
    }]
  }],
  admin: [{
    title: 'VIRKSOMHET',
    items: [{
      id: 'tenant-overview',
      label: 'Virksomhetsoversikt'
    }, {
      id: 'members',
      label: 'Brukere, roller og SSO'
    }, {
      id: 'business-risk',
      label: 'Virksomhetsrisiko og omfang'
    }, {
      id: 'local-policy',
      label: 'Lokal policy og rutiner'
    }]
  }, {
    title: 'OPPSETT OG REVISJON',
    items: [{
      id: 'data-sources',
      label: 'Datakilder og rettigheter'
    }, {
      id: 'portal-setup',
      label: 'Kundeportal-oppsett'
    }, {
      id: 'tenant-audit',
      label: 'Revisjon og ledelsesrapport'
    }]
  }],
  user: [{
    title: 'ARBEIDSKØ',
    items: [{
      id: 'queue',
      label: 'Arbeidskø'
    }, {
      id: 'scope',
      label: 'Ny kontroll og avgrensing'
    }, {
      id: 'case',
      label: 'Saksoversikt'
    }, {
      id: 'customer-portal',
      label: 'Kundeinvitasjon og portal'
    }]
  }, {
    title: 'KONTROLLER',
    items: [{
      id: 'identity',
      label: 'Identitet og fullmakt'
    }, {
      id: 'ownership',
      label: 'Eierskap og kontroll'
    }, {
      id: 'screening',
      label: 'Screening'
    }, {
      id: 'risk',
      label: 'Risiko og tiltak'
    }, {
      id: 'evidence',
      label: 'Bevis og forespørsler'
    }, {
      id: 'decision',
      label: 'Beslutning'
    }]
  }, {
    title: 'OPPFØLGING',
    items: [{
      id: 'monitoring',
      label: 'Løpende oppfølging'
    }, {
      id: 'transactions',
      label: 'Transaksjonsvarsler',
      caption: 'G3'
    }, {
      id: 'history',
      label: 'Sakshistorikk og oppbevaring'
    }, {
      id: 'investigation',
      label: 'Skjermet undersøkelse',
      caption: 'Særskilt tilgang'
    }, {
      id: 'reporting',
      label: 'Rapportering og kvittering',
      caption: 'AML-ansvarlig'
    }]
  }]
};
export const screenTitles: Record<ScreenId, {
  eyebrow: string;
  title: string;
  copy: string;
}> = {
  'platform-overview': {
    eyebrow: 'SAAS / PLATTFORMNIVÅ',
    title: 'Plattformoversikt',
    copy: 'Tenantportefølje, aktive landpakker og teknisk helse - uten kundesaker eller treff.'
  },
  'tenant-onboarding': {
    eyebrow: 'PLATTFORM / ONBOARDING',
    title: 'Opprett virksomhet',
    copy: 'Opprett tenant med land, juridisk form, modul, miljø og første bedrifsadministrator.'
  },
  'land-packs': {
    eyebrow: 'PLATTFORM / REGELVERK',
    title: 'Landpakker og policy',
    copy: 'Versjoner, virkedatoer og totrinnsgodkjenning for globale minimumskontroller.'
  },
  'partner-api': {
    eyebrow: 'PLATTFORM / INTEGRASJONER',
    title: 'Integrasjoner og partner-API',
    copy: 'Kontrakter, scopes, webhooks og nøytral partnerstatus per virksomhet.'
  },
  operations: {
    eyebrow: 'PLATTFORM / DRIFT',
    title: 'Driftsinnsikt',
    copy: 'Kildehelse, feilkøer og dekningsgrad - ikke kundespesifikke saker.'
  },
  'support-access': {
    eyebrow: 'PLATTFORM / TILGANG',
    title: 'Supporttilgang og testlab',
    copy: 'Tidsbegrenset, godkjent og loggført tilgang; standard er avslag.'
  },
  'tenant-overview': {
    eyebrow: 'VIRKSOMHET / NORDIC TRADE AS',
    title: 'Virksomhetsoversikt',
    copy: 'Egen tenant, aktive landpakker, ansvarlige og AML-arbeid som trenger oppfølging.'
  },
  members: {
    eyebrow: 'VIRKSOMHET / TILGANG',
    title: 'Brukere, roller og SSO',
    copy: 'Medlemskap, faglig delegasjon, virkeområde, MFA og utløp for din virksomhet.'
  },
  'business-risk': {
    eyebrow: 'VIRKSOMHET / STYRING',
    title: 'Virksomhetsrisiko og omfang',
    copy: 'Produkter, geografi, kundetyper og kontroller - skilt mellom iboende og gjenværende risiko.'
  },
  'local-policy': {
    eyebrow: 'VIRKSOMHET / STYRING',
    title: 'Lokal policy og rutiner',
    copy: 'Lokale skjerpelser kan legges til, men obligatoriske plattformkrav kan ikke slås av.'
  },
  'data-sources': {
    eyebrow: 'VIRKSOMHET / DATA',
    title: 'Datakilder og rettigheter',
    copy: 'Registertilganger, screeningleverandører, formål og reserveprosesser for egen virksomhet.'
  },
  'portal-setup': {
    eyebrow: 'VIRKSOMHET / KUNDEPORTAL',
    title: 'Kundeportal-oppsett',
    copy: 'Nøytrale invitasjoner, dokumentforespørsler og kundekommunikasjon uten interne vurderinger.'
  },
  'tenant-audit': {
    eyebrow: 'VIRKSOMHET / REVISJON',
    title: 'Revisjon og ledelsesrapport',
    copy: 'Tilgangsspor, restanser, dekningsgrad og manuell tid for Nordic Trade AS.'
  },
  queue: {
    eyebrow: 'AML-ARBEIDSFLATE / ARBEIDSKØ',
    title: 'Arbeidskø',
    copy: 'Tildelte saker, prioritet, frist, datakvalitet og neste handling.'
  },
  scope: {
    eyebrow: 'AML-ARBEIDSFLATE / NY SAK',
    title: 'Ny kontroll og avgrensing',
    copy: 'Avklar land, sektor, tjeneste, oppdragsomfang, hjemmel og ansvarlig før kontrollen starter.'
  },
  case: {
    eyebrow: 'AML-ARBEIDSFLATE / SAK AML-0248',
    title: 'Saksoversikt',
    copy: 'Samlet kontrollgrunnlag med åpne spørsmål, kilder, ansvar og blokkerende forhold.'
  },
  'customer-portal': {
    eyebrow: 'KUNDEPORTAL / EKSTERN VISNING',
    title: 'Kundeinvitasjon og portalstatus',
    copy: 'Kunden ser bare hva som skal leveres og nøytral fremdrift - aldri intern risiko, mistanke eller rapportstatus.'
  },
  identity: {
    eyebrow: 'SAK AML-0248 / KUNDEKONTROLL',
    title: 'Identitet og representasjonsrett',
    copy: 'eID, alternativ legitimasjon, fullmakt, gyldighet og manuelle avklaringer.'
  },
  ownership: {
    eyebrow: 'SAK AML-0248 / KYB',
    title: 'Eierskap og kontroll',
    copy: 'Skille mellom økonomisk andel, stemmerett og faktisk kontroll med kilde og tidsperiode.'
  },
  screening: {
    eyebrow: 'SAK AML-0248 / SCREENING',
    title: 'Screening',
    copy: 'PEP, sanksjoner og negativ omtale med råfunn, avklaring og separat hastekanal.'
  },
  risk: {
    eyebrow: 'SAK AML-0248 / VURDERING',
    title: 'Risiko og tiltak',
    copy: 'Forklarbare faktorer, obligatoriske sperrer og foreslåtte forsterkede tiltak.'
  },
  evidence: {
    eyebrow: 'SAK AML-0248 / DOKUMENTASJON',
    title: 'Bevis og forespørsler',
    copy: 'Bevismanifest, kilder, dokumentversjoner, hash og manglende kundeopplysninger.'
  },
  decision: {
    eyebrow: 'SAK AML-0248 / BESLUTNING',
    title: 'Beslutning',
    copy: 'Menneskelig godkjenning, delegasjon, begrunnet avvik og eksakt policyversjon.'
  },
  monitoring: {
    eyebrow: 'AML-ARBEIDSFLATE / OPPFØLGING',
    title: 'Løpende oppfølging',
    copy: 'Rescreening, endringsvarsler, kildedekning og ansvarlige oppgaver.'
  },
  transactions: {
    eyebrow: 'AML-ARBEIDSFLATE / TRANSAKSJONER',
    title: 'Transaksjonsvarsler',
    copy: 'G3-modul for batchinntak, scenarioforklaring, avstemming og oppfølging av varsler.'
  },
  history: {
    eyebrow: 'SAK AML-0248 / HISTORIKK',
    title: 'Sakshistorikk og oppbevaring',
    copy: 'Etterprøvbare hendelser, beslutninger, bevaringsgrunnlag og avslutningsløp.'
  },
  investigation: {
    eyebrow: 'SKJERMET SONE / SÆRSKILT TILGANG',
    title: 'Skjermet undersøkelse',
    copy: 'Separat tilgangsgruppe, triage og rapportarbeid. Skal ikke oppdages i ordinært søk, portal, API eller support.'
  },
  reporting: {
    eyebrow: 'SKJERMET SONE / RAPPORTERING',
    title: 'Rapportering og kvittering',
    copy: 'Landtilpasset rapportutkast, obligatoriske felt, innsending og avstemming av kvittering.'
  }
};
export function Badge({
  children,
  tone = 'neutral'
}: {
  children: any;
  tone?: Tone;
}) {
  const colors: Record<Tone, string> = {
    neutral: 'border-[#D7E0E8] bg-[#F4F7F9] text-[#506176]',
    green: 'border-[#BFDCD5] bg-[#EEF8F5] text-[#176B5B]',
    amber: 'border-[#E8D39E] bg-[#FCF5E7] text-[#82510E]',
    red: 'border-[#E7BBB8] bg-[#FDF1F0] text-[#963531]',
    blue: 'border-[#C8D8E8] bg-[#EEF4FA] text-[#255A81]'
  };
  return <span className={'inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current before:opacity-60 ' + colors[tone]}>{children}</span>;
}
export function Panel({
  children,
  className = ''
}: {
  children: any;
  className?: string;
}) {
  return <section className={'border border-[#DCE4EB] bg-white shadow-[0_1px_2px_rgba(23,37,54,0.04),0_6px_18px_-8px_rgba(23,37,54,0.08)] ' + className}>{children}</section>;
}
export function Label({
  children
}: {
  children: any;
}) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#758397]">{children}</div>;
}
export function SmallTitle({
  title,
  copy
}: {
  title: string;
  copy?: string;
}) {
  return <div><div className="text-[13px] font-semibold text-[#293B4F]">{title}</div>{copy ? <div className="mt-1 text-[11px] leading-5 text-[#718096]">{copy}</div> : null}</div>;
}
export function Metric({
  label,
  value,
  help,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  help: string;
  tone?: Tone;
}) {
  const dot: Record<Tone, string> = {
    neutral: 'bg-[#7E8FA5]',
    green: 'bg-[#238A75]',
    amber: 'bg-[#C27A13]',
    red: 'bg-[#BA4541]',
    blue: 'bg-[#2D6D9F]'
  };
  return <Panel className="relative overflow-hidden p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(23,37,54,0.05),0_12px_28px_-12px_rgba(23,37,54,0.18)]"><span aria-hidden="true" className={'absolute inset-x-0 top-0 h-[3px] ' + dot[tone]} /><div className="flex items-start justify-between gap-3"><Label>{label}</Label><i className={'mt-1.5 h-2 w-2 rounded-full ' + dot[tone]} /></div><div className="mt-3 text-[28px] font-semibold tabular-nums tracking-[-0.04em] text-[#172536]">{value}</div><div className="mt-1 text-[11px] leading-5 text-[#718096]">{help}</div></Panel>;
}
export function Table({
  headers,
  rows
}: {
  headers: string[];
  rows: any[][];
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-[#F8FAFB] text-[10px] font-bold uppercase tracking-[0.1em] text-[#758397]"><tr>{headers.map(header => <th key={header} className="px-5 py-3">{header}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr className="border-t border-[#E7EDF1]"><td colSpan={headers.length} className="px-5 py-4 text-[12px] text-[#8692A1]">Ingen oppføringer ennå.</td></tr> : null}{rows.map((row, index) => <tr key={index} className="border-t border-[#E7EDF1] text-[12px] text-[#4E6075] transition-colors hover:bg-[#F7FAFA]">{row.map((cell, cellIndex) => <td key={cellIndex} className={'px-5 py-3.5 ' + (cellIndex === 0 ? 'font-semibold text-[#27384B]' : '')}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function TestPanel({
  title = 'Kontrollregler',
  entries,
  action,
  actionLabel = 'Kontroller'
}: {
  title?: string;
  entries: string[];
  action?: () => void;
  actionLabel?: string;
}) {
  return <section className="border border-[#D5E4E1] bg-[#F7FBFA] p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C7062]">{title}</span></div><ul className="mt-3 space-y-2">{entries.map(entry => <li key={entry} className="flex gap-2 text-[11px] leading-5 text-[#536478]"><i className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#24977F]" />{entry}</li>)}</ul>{action ? <button onClick={action} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">{actionLabel}</button> : null}</section>;
}
export function NoticeBar({
  notice,
  dismiss
}: {
  notice: Notice | null;
  dismiss: () => void;
}) {
  if (!notice) return null;
  const color = notice.tone === 'locked' ? 'border-[#E3B7B4] bg-[#FDF1F0] text-[#8E302E]' : notice.tone === 'ok' ? 'border-[#BFDCD5] bg-[#EEF8F5] text-[#176B5B]' : 'border-[#C8D8E8] bg-[#EEF4FA] text-[#285B80]';
  return <div role="status" className={'flex items-center justify-between gap-4 border px-4 py-3 text-[12px] font-medium ' + color}><span>{notice.text}</span><button onClick={dismiss} className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] underline underline-offset-4">Lukk</button></div>;
}
export function Header({
  role,
  onRole,
  onMap
}: {
  role: Role;
  onRole: (role: Role) => void;
  onMap: () => void;
}) {
  return <header className="border-b border-[#DCE4EB] bg-white"><div className="mx-auto flex h-14 max-w-[1800px] items-center gap-5 px-5 lg:px-8"><div className="flex items-center gap-2.5 border-r border-[#E2E8ED] pr-5"><span className="grid h-7 w-7 place-items-center bg-[#173B5B] text-[12px] font-bold text-white">N</span><span><b className="block text-[12px] tracking-[0.14em] text-[#172536]">NORDISK</b><small className="block text-[8px] font-bold tracking-[0.16em] text-[#708096]">COMPLIANCE</small></span></div><nav className="hidden items-center gap-5 text-[12px] font-medium text-[#5D6D80] xl:flex"><button className="text-[#173B5B]">Arbeidsflate</button><button>Virksomheter</button><button>Regelsett</button><button>Revisjon</button></nav><div className="ml-auto hidden h-8 w-[300px] items-center border border-[#DCE4EB] bg-[#F8FAFB] px-3 text-[11px] text-[#8A97A8] md:flex">Søk i valgt tilgangsområde</div><button onClick={onMap} className="hidden border border-[#BBD4CF] bg-[#F4FAF8] px-3 py-2 text-[10px] font-bold text-[#176B5B] lg:block">28 SKJERMER</button><div className="hidden border-l border-[#E2E8ED] pl-5 text-right text-[10px] leading-4 text-[#637389] sm:block"><b className="block text-[11px] text-[#293B4F]">{roleMeta[role].label}</b>Testmiljø · EU North</div></div><div className="border-t border-[#EEF1F4] bg-[#FCFDFE]"><div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2 px-5 py-3 lg:px-8"><span className="mr-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#708096]">Test som rolle</span>{(Object.keys(roleMeta) as Role[]).map(item => <button key={item} onClick={() => onRole(item)} className={'flex items-center gap-2 border px-3 py-2 text-left ' + (role === item ? 'border-[#176F61] bg-[#EAF7F3] text-[#155D52]' : 'border-[#DCE4EB] bg-white text-[#56677B] hover:border-[#AFC7C3]')}><span className={'grid h-5 w-5 place-items-center text-[9px] font-bold ' + (role === item ? 'bg-[#176F61] text-white' : 'bg-[#EFF3F6] text-[#718096]')}>{roleMeta[item].short}</span><span><b className="block text-[11px]">{roleMeta[item].label}</b><small className="block text-[10px]">{roleMeta[item].description}</small></span></button>)}</div></div></header>;
}
export function Sidebar({
  role,
  screen,
  go,
  openMap
}: {
  role: Role;
  screen: ScreenId;
  go: (screen: ScreenId) => void;
  openMap: () => void;
}) {
  return <aside className="hidden w-[250px] shrink-0 border-r border-[#DCE4EB] bg-white lg:block"><div className="sticky top-0 h-[calc(100vh-105px)] overflow-y-auto px-4 py-5"><button onClick={openMap} className="mb-5 flex w-full items-center justify-between border border-[#C9DEDA] bg-[#F3FAF8] px-3 py-2.5 text-left"><span><b className="block text-[10px] uppercase tracking-[0.11em] text-[#176B5B]">Prototypeoversikt</b><small className="block pt-1 text-[10px] text-[#5C716F]">Alle 28 skjermene</small></span><span className="text-[#176B5B]">→</span></button>{navigation[role].map(group => <div key={group.title} className="mb-5"><div className="mb-2 px-2 text-[9px] font-bold tracking-[0.13em] text-[#8592A2]">{group.title}</div><div className="space-y-0.5">{group.items.map(item => <button key={item.id} onClick={() => go(item.id)} className={'w-full border-l-2 px-3 py-2 text-left ' + (screen === item.id ? 'border-[#176F61] bg-[#EEF8F5] text-[#165F54]' : 'border-transparent text-[#56677B] hover:bg-[#F6F8FA]')}><span className="block text-[11px] font-semibold">{item.label}</span>{item.caption ? <span className="block pt-0.5 text-[9px] text-[#9A6C1B]">{item.caption}</span> : null}</button>)}</div></div>)}</div></aside>;
}
export function Page({
  id,
  role,
  screenNumber,
  total,
  back,
  next,
  children
}: {
  id: ScreenId;
  role: Role;
  screenNumber: number;
  total: number;
  back: () => void;
  next: () => void;
  children: any;
}) {
  const data = screenTitles[id];
  return <main className="min-w-0 flex-1 px-5 py-7 lg:px-8"><div className="flex flex-col justify-between gap-5 border-b border-[#DDE5EC] pb-5 2xl:flex-row 2xl:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1E776A]">{data.eyebrow}</div><h1 className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-[#172536]">{data.title}</h1><p className="mt-1.5 max-w-[760px] text-[13px] leading-6 text-[#617188]">{data.copy}</p></div><div className="flex items-center gap-2"><Badge tone="blue">{roleMeta[role].label}</Badge><Badge>Skjerm {screenNumber} av {total}</Badge></div></div><div className="pt-6">{children}</div><div className="mt-7 flex items-center justify-between border-t border-[#DDE5EC] pt-4"><button onClick={back} className="border border-[#C9D4DE] bg-white px-3.5 py-2 text-[11px] font-bold text-[#506176]">← Forrige skjerm</button><button onClick={next} className="bg-[#173B5B] px-3.5 py-2 text-[11px] font-bold text-white">Neste skjerm →</button></div></main>;
}
export function ScreenMap({
  go
}: {
  go: (role: Role, screen: ScreenId) => void;
}) {
  return <main className="min-w-0 flex-1 px-5 py-7 lg:px-8"><div className="border-b border-[#DDE5EC] pb-5"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1E776A]">PROTOTYPEOVERSIKT</div><h1 className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-[#172536]">28 navigerbare produktflater</h1><p className="mt-1.5 max-w-[790px] text-[13px] leading-6 text-[#617188]">Velg en skjerm for å teste rollen og arbeidsflyten. Navigasjonen etterligner faktisk tilgang: hver rolle ser bare sine sider.</p></div><div className="mt-6 grid gap-5 2xl:grid-cols-3">{(Object.keys(navigation) as Role[]).map(role => <Panel key={role} className="p-5"><div className="flex items-center justify-between gap-3"><SmallTitle title={roleMeta[role].label} copy={roleMeta[role].description} /><Badge tone={role === 'platform' ? 'blue' : role === 'admin' ? 'amber' : 'green'}>{navigation[role].flatMap(group => group.items).length} skjermer</Badge></div>{navigation[role].map(group => <div key={group.title} className="mt-5"><Label>{group.title}</Label><div className="mt-2 divide-y divide-[#E8EDF1] border-y border-[#E8EDF1]">{group.items.map(item => <button key={item.id} onClick={() => go(role, item.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-[#FAFBFC]"><span><b className="block text-[11px] text-[#314357]">{item.label}</b>{item.caption ? <small className="block pt-0.5 text-[9px] text-[#A06B19]">{item.caption}</small> : null}</span><span className="text-[12px] text-[#176B5B]">→</span></button>)}</div></div>)}</Panel>)}</div></main>;
}
export function PlatformOverview({
  notify,
  go
}: {
  notify: (notice: Notice) => void;
  go: (screen: ScreenId) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]"><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Metric label="Aktive tenants" value="3" help="NO, SE og DK er aktivert" tone="blue" /><Metric label="Kildehelse" value="98,7 %" help="1 forsinket listeoppdatering" tone="green" /><Metric label="Åpne driftsavvik" value="2" help="Begge har reserveprosess" tone="amber" /></div><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Tenantportefølje" copy="Operativ status og abonnement uten kundesaker." /><button onClick={() => go('tenant-onboarding')} className="bg-[#176F61] px-3.5 py-2 text-[11px] font-bold text-white">Opprett virksomhet</button></div><Table headers={['Virksomhet', 'Land / form', 'Moduler', 'Teknisk status', 'Data']} rows={[['Nordic Trade AS', 'NO · AS', 'KYC, KYB, Screening', <Badge tone="green">Operativ</Badge>, 'Teknisk metadata'], ['Lumen Capital AB', 'SE · AB', 'KYC, KYB', <Badge tone="amber">Oppsett</Badge>, 'Teknisk metadata'], ['Copenhagen Cargo A/S', 'DK · A/S', 'KYC, KYB, Screening', <Badge tone="green">Operativ</Badge>, 'Teknisk metadata']]} /></Panel></div><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Plattformgrense" copy="Kundedata og skjermede saker er ikke en del av plattformoversikten." /><div className="mt-4 border-l-2 border-[#B8413E] bg-[#FDF5F4] p-3 text-[11px] leading-5 text-[#734B4A]">Ingen standardtilgang til kundedokumenter, intern risiko, treff eller undersøkelsesrom.</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: Platform Super Admin må ha godkjent, tidsbegrenset og loggført supporttilgang før kundedata kan vises.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser kundesakstilgang</button></Panel><TestPanel entries={['Tenantstatus er synlig, men ikke sak eller dokumentinnhold.', 'Forsøk å åpne kundesak uten supporttilgang skal avvises.', '«Opprett virksomhet» støtter AS, AB og A/S.']} action={() => go('support-access')} actionLabel="Åpne supporttilgang" /></aside></div>;
}
export function TenantOnboarding({
  country,
  chooseCountry,
  notify
}: {
  country: Country;
  chooseCountry: (value: Country) => void;
  notify: (notice: Notice) => void;
}) {
  const config = countryConfig[country];
  return <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]"><Panel><div className="flex items-center justify-between border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Ny tenant" copy="Landpakken bestemmer juridisk form, registerkilde og godkjent modulsett." /><Badge tone="blue">Steg 1 av 3</Badge></div><div className="grid lg:grid-cols-[0.7fr_1.3fr]"><div className="border-b border-[#E2E8ED] p-5 lg:border-b-0 lg:border-r"><Label>Velg jurisdiksjon</Label><div className="mt-3 space-y-2">{(Object.keys(countryConfig) as Country[]).map(code => <button key={code} onClick={() => chooseCountry(code)} className={'flex w-full items-center justify-between border p-3 text-left ' + (code === country ? 'border-[#176F61] bg-[#EEF8F5]' : 'border-[#DCE4EB] bg-white hover:border-[#B3C8C5]')}><span><b className="block text-[12px] text-[#26384B]">{countryConfig[code].name}</b><small className="block pt-1 text-[10px] text-[#718096]">{code} · {countryConfig[code].form}</small></span><span className="text-[10px] font-bold text-[#176B5B]">{code === country ? 'VALGT' : 'VELG'}</span></button>)}</div><div className="mt-4 border border-dashed border-[#D8E0E8] bg-[#F8FAFC] p-3 text-[11px] leading-5 text-[#697A8E]"><b className="text-[#42536A]">Finland og Island</b><br />Deaktivert til landpakke er faglig godkjent.</div></div><div className="p-5"><div className="flex gap-2"><Badge tone="green">{country} {config.form}</Badge><Badge>{config.pack}</Badge></div><h2 className="mt-4 text-[19px] font-semibold text-[#172536]">Virksomhet i {config.name}</h2><div className="mt-4 grid border border-[#E1E7EC] sm:grid-cols-2"><div className="border-b border-[#E1E7EC] p-3 sm:border-b-0 sm:border-r"><Label>Selskapsform</Label><div className="mt-1 text-[13px] font-semibold text-[#28394D]">{config.form}</div></div><div className="p-3"><Label>Registerkilde</Label><div className="mt-1 text-[13px] font-semibold text-[#28394D]">{config.registry}</div></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="border border-[#CBD6E0] bg-[#FBFCFD] px-3 py-3 text-[12px] text-[#3C4D60]">Eksempelvirksomhet {config.form}</div><div className="border border-[#CBD6E0] bg-[#FBFCFD] px-3 py-3 text-[12px] text-[#3C4D60]">Første tenant-admin</div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => notify({
              tone: 'ok',
              text: 'Kontroll fullført: tenant med ' + country + ' ' + config.form + ', landpakke, moduler og tenant-admin er opprettet.'
            })} className="bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white">Opprett virksomhet</button><button onClick={() => notify({
              tone: 'info',
              text: 'Forhåndsvisning: tilgang, abonnement og miljø blir opprettet uten å åpne kundedata.'
            })} className="border border-[#C9D4DE] bg-white px-4 py-2.5 text-[11px] font-bold text-[#42536A]">Se oppsett</button></div></div></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Valgte moduler" copy="Kan aktiveres kun når land og sektor er validert." /><div className="mt-4 space-y-2">{[['Kundekontroll', 'KYC og kundeportal'], ['Bedriftskontroll', 'KYB og reelt eierskap'], ['Screening', 'PEP, sanksjoner, omtale'], ['Transaksjoner', 'G3 · ikke aktivert']].map(row => <div key={row[0]} className="flex items-center justify-between border border-[#E3E9EE] p-3"><span><b className="block text-[11px] text-[#34465A]">{row[0]}</b><small className="block pt-1 text-[10px] text-[#738196]">{row[1]}</small></span><Badge tone={row[0] === 'Transaksjoner' ? 'neutral' : 'green'}>{row[0] === 'Transaksjoner' ? 'Senere' : 'Valgt'}</Badge></div>)}</div></Panel><TestPanel entries={['Norge oppretter AS, Sverige AB og Danmark A/S.', 'FI/IS skal være deaktivert før godkjent landpakke.', 'Tenant-admin får bare tilgang til sin virksomhet.']} /></aside></div>;
}
export function LandPacks({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Regelpakker i drift" copy="Hver pakke har eier, kilde, virkedato og godkjent versjon." /></div><Table headers={['Pakke', 'Sektor', 'Virkedato', 'Status', 'Eier']} rows={[['NO v1.4', 'Advokat', '01.01.2027', <Badge tone="green">Publisert</Badge>, 'Fagansvarlig AML'], ['SE v0.9', 'Advokat', 'Simulering', <Badge tone="amber">Krever godkjenning</Badge>, 'Fagansvarlig AML'], ['DK v0.9', 'Advokat', 'Simulering', <Badge tone="amber">Krever godkjenning</Badge>, 'Fagansvarlig AML']]} /><div className="border-t border-[#E2E8ED] p-5"><Label>Totrinnspublisering</Label><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="border border-[#DCE4EB] p-3"><b className="text-[11px] text-[#314357]">1 · Foreslått av</b><div className="mt-1 text-[12px] text-[#617188]">Lina Nilsen · endring i PEP-regel</div></div><div className="border border-[#DCE4EB] p-3"><b className="text-[11px] text-[#314357]">2 · Må godkjennes av</b><div className="mt-1 text-[12px] text-[#617188]">Annen faglig godkjenner</div></div></div></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Simuler før publisering" copy="Ny regel kan testes på historisk tidspunkt uten å bli produksjonsregel." /><button onClick={() => notify({
          tone: 'ok',
          text: 'Simulering opprettet: SE v0.9 er kjørt mot testgrunnlag og venter på en annen godkjenner.'
        })} className="mt-4 w-full bg-[#176F61] px-3 py-2.5 text-[11px] font-bold text-white">Kjør simulering</button><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: samme bruker kan ikke både foreslå og sluttgodkjenne obligatorisk policy.'
        })} className="mt-2.5 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser egen-godkjenning</button></Panel><TestPanel entries={['Lokal policy kan skjerpe, men ikke slå av plattformkrav.', 'Virkedato og regelversjon følger beslutningen.', 'Tilbakeføring går til siste gyldige versjon.']} /></aside></div>;
}
export function PartnerApi({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]"><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Partnerkontrakter" copy="Ekstern tilgang gir bare avtalte, nøytrale felt." /><Badge tone="blue">OpenAPI 3.1</Badge></div><Table headers={['Klient', 'Scopes', 'Webhook', 'Kvotestatus', 'Siste aktivitet']} rows={[['LawSaaS sandbox', 'checks.read, checks.write', 'Aktiv', <Badge tone="green">Innenfor</Badge>, '10:42'], ['ERP test partner', 'transactions.write', 'Av', <Badge tone="amber">G3</Badge>, 'I går'], ['Nordic portal', 'checks.read', 'Aktiv', <Badge tone="green">Innenfor</Badge>, '09:18']]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Kontraktsgrense" copy="Partner kan ikke se intern score, mistanke, rapportstatus eller skjermet sak." /><div className="mt-4 border-l-2 border-[#1D6F86] bg-[#F1F7FA] p-3 text-[11px] leading-5 text-[#4C6F7C]">GET /checks/{'{id}'} gir kun nøytral fremdrift. Token avgjør tenant, ikke en klientheader.</div><button onClick={() => notify({
          tone: 'ok',
          text: 'Kontroll fullført: identisk POST med samme idempotensnøkkel returnerer samme ressurs; endret innhold gir 409-konflikt.'
        })} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Verifiser idempotens</button></Panel><TestPanel entries={['Fremmed tenant-ID skal aldri gi data.', 'Webhook skal være signert og duplikatsikret.', 'Partnerstatus skal forbli nøytral.']} /></aside></div>;
}
export function Operations({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]"><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Metric label="Tilgjengelighet" value="99,96 %" help="Siste 30 dager" tone="green" /><Metric label="Feilkø" value="12" help="3 krever manuell oppfølging" tone="amber" /><Metric label="Kildedekning" value="98,7 %" help="1 feed forsinket" tone="blue" /></div><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Eksterne avhengigheter" copy="Kildesvikt vises som manglende dekning - aldri som «ren» status." /></div><Table headers={['Avhengighet', 'Status', 'Sist kontrollert', 'Reserve']} rows={[['Nordisk screening v3', <Badge tone="green">Frisk</Badge>, '10:31', 'Ikke nødvendig'], ['Bolagsverket', <Badge tone="amber">Forsinket</Badge>, '09:48', 'Dokumentforespørsel'], ['CVR', <Badge tone="green">Frisk</Badge>, '10:29', 'Ikke nødvendig']]} /></Panel></div><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Sikkerhetsbremse" copy="Kritisk falsk klarering, lekkasje eller data på tvers av virksomheter stanser berørt automasjon." /><button onClick={() => notify({
          tone: 'locked',
          text: 'Testmodus: automasjon er stanset for berørt kilde, bevis er sikret og ansvarlig er varslet.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser sikkerhetsbremse</button></Panel><TestPanel entries={['Tom feed må ikke gi grønn status.', 'Reserveprosess skal fremgå på kontrollgrunnlaget.', 'Drift viser helse uten å utlevere kundesaker.']} /></aside></div>;
}
export function SupportAccess({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]"><Panel className="p-5"><div className="flex items-start justify-between gap-3"><SmallTitle title="Bestill supporttilgang" copy="Adgang til tenantdata krever eksplisitt kunde-/tenantgodkjenning, begrunnelse, scope og utløp." /><Badge tone="red">Standard avslag</Badge></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Virksomhet', 'Nordic Trade AS'], ['Begrunnelse', 'Feilsøk dokumenthenting'], ['Omfang', 'Teknisk hendelse #INC-1042'], ['Utløp', '30 min etter godkjenning']].map(row => <div key={row[0]} className="border border-[#DCE4EB] bg-[#FBFCFD] p-3"><Label>{row[0]}</Label><div className="mt-1 text-[12px] font-semibold text-[#314357]">{row[1]}</div></div>)}</div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: mangler tenantgodkjenning. Kundedata kan ikke åpnes før tilgang er godkjent og tidsbegrenset.'
        })} className="border border-[#D5A9A6] bg-white px-3.5 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser uten godkjenning</button><button onClick={() => notify({
          tone: 'ok',
          text: 'Simulert tilgang er godkjent, begrunnet, begrenset til teknisk feilsøk og utløper om 30 minutter. Hendelsen er loggført.'
        })} className="bg-[#176F61] px-3.5 py-2.5 text-[11px] font-bold text-white">Simuler godkjent tilgang</button></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Testlab · akseptanseprøver" copy="Synlig testpakke for isolering, skjermet sak, API, landpakker og roller." /><div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">{[['AT-03', 'Uavklart eier'], ['AT-05', 'Sanksjon og hastekanal'], ['AT-07', 'Ingen avsløring'], ['AT-10', 'API og isolering'], ['AT-13', 'Land og ikrafttredelse']].map(row => <div key={row[0]} className="flex items-center justify-between py-3 text-[11px]"><span><b className="text-[#34465A]">{row[0]}</b><span className="pl-2 text-[#718096]">{row[1]}</span></span><Badge tone="blue">Planlagt</Badge></div>)}</div></Panel><TestPanel entries={['Support ser teknisk helse uten standard innsyn.', 'Skjermet sak kan ikke oppdages via portal, API eller support.', 'Hver sensitiv operasjon får rolle-, scope- og utløpskontroll.']} /></aside></div>;
}
export function TenantOverview({
  notify,
  go
}: {
  notify: (notice: Notice) => void;
  go: (screen: ScreenId) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]"><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Metric label="Åpne saker" value="12" help="4 trenger handling i dag" tone="amber" /><Metric label="Kontrolldekning" value="94 %" help="3 kilder må fornyes" tone="blue" /><Metric label="Forfalte oppgaver" value="2" help="Én er kritisk" tone="red" /></div><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Aktive landpakker og moduler" copy="Nordic Trade AS · Norge · AS" /><Badge tone="green">Tenant aktiv</Badge></div><div className="grid divide-y divide-[#E7EDF1] md:grid-cols-2 md:divide-x md:divide-y-0">{[['NO AML-regelpakke v1.4', 'Advokat · publisert'], ['Kunde- og bedriftkontroll', 'Aktiv'], ['Screening og rescreening', 'Aktiv'], ['Transaksjonsmodul', 'G3 · ikke aktivert']].map(row => <div key={row[0]} className="p-4"><b className="block text-[12px] text-[#34465A]">{row[0]}</b><small className="mt-1 block text-[11px] text-[#718096]">{row[1]}</small></div>)}</div></Panel><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Oppgaver som trenger eier" copy="Prioritert fra AML-arbeidsflaten." /></div><Table headers={['Sak', 'Årsak', 'Frist', 'Ansvarlig']} rows={[['AML-0248', 'Uavklart eierstruktur', 'I dag 15:00', 'Nora Berg'], ['AML-0239', 'Kildeutfall', 'I morgen', 'Erik Olsen'], ['AML-0221', 'Rescreening forfalt', '05.11', 'Marius Viken']]} /></Panel></div><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Virksomhetsgrense" copy="Bedriftsadmin administrerer bare Nordic Trade AS." /><div className="mt-4 border-l-2 border-[#B8413E] bg-[#FDF5F4] p-3 text-[11px] leading-5 text-[#734B4A]">Ingen tilgang til Lumen Capital AB, Copenhagen Cargo A/S eller globale plattforminnstillinger.</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Tenant-isolering aktiv: Bedriftsadmin kan ikke lese, søke i eller endre en annen virksomhet.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser annen tenant</button></Panel><TestPanel entries={['Virksomhetsstatus og egen restkø er synlig.', 'Medlemskap og delegasjon styres under «Brukere».', 'Globale policyregler er skrivebeskyttet.']} action={() => go('members')} actionLabel="Åpne brukere og roller" /></aside></div>;
}
export function Members({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]"><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Medlemskap og faglig delegasjon" copy="Rolle, virkeområde og utløp kontrolleres ved hver sensitiv operasjon." /><button onClick={() => notify({
          tone: 'ok',
          text: 'Kontroll fullført: ny bruker er invitert til Nordic Trade AS med avgrenset saksbehandlerrolle.'
        })} className="bg-[#176F61] px-3.5 py-2 text-[11px] font-bold text-white">Inviter bruker</button></div><Table headers={['Medlem', 'Rolle', 'Virkeområde', 'Utløp', 'Status']} rows={[['Lina Nilsen', 'Bedriftsadmin', 'Nordic Trade AS', 'Ingen', <Badge tone="green">Aktiv</Badge>], ['Marius A. Viken', 'AML-ansvarlig', 'Alle AML-saker', '31.12.2027', <Badge tone="green">Aktiv</Badge>], ['Nora Berg', 'Saksbehandler', 'Tildelte saker', '31.12.2026', <Badge tone="green">Aktiv</Badge>], ['Erik Olsen', 'Godkjenner', 'Forhøyet risiko', '31.12.2026', <Badge tone="green">Aktiv</Badge>], ['Auditor 2026', 'Revisor', 'Kun lesing', '20.11.2026', <Badge tone="amber">Tidsbegrenset</Badge>]]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Arbeidsdeling" copy="Faglig rolle er en underrettighet innenfor Bruker, ikke en fjerde hovedrolle." /><div className="mt-4 space-y-2">{[['Saksbehandler', 'Starter kontroll og avklarer funn'], ['Godkjenner', 'Beslutter innen delegasjon'], ['AML-ansvarlig', 'Vurderer mistanke og rapport'], ['Revisor', 'Autorisert lesing med utløp']].map(row => <div key={row[0]} className="border border-[#E2E8ED] p-3 text-[11px]"><b className="block text-[#34465A]">{row[0]}</b><span className="mt-1 block text-[#718096]">{row[1]}</span></div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: godkjenner kan ikke godkjenne sin egen endring av obligatorisk policy.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser arbeidsdeling</button></Panel><TestPanel entries={['Deprovisjonering skal gjelde umiddelbart.', 'Revisor får kun autorisert, tidsavgrenset lesing.', 'MFA og SSO er tilgangskontroll - ikke KYC-bevis.']} /></aside></div>;
}
export function BusinessRisk({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  const factors = [['Produkter og tjenester', 'Forhøyet', 'Klientmidler og selskapsoverdragelser', 'amber'], ['Geografi', 'Moderat', 'Nordisk virkeområde', 'green'], ['Kundetyper', 'Forhøyet', 'Komplekse eierstrukturer', 'amber'], ['Kanaler', 'Moderat', 'Digital innhenting + rådgiver', 'green']];
  return <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Virksomhetsrisiko" copy="Registrer iboende risiko, tiltak og gjenværende risiko per virksomhetsområde." /></div><div className="grid sm:grid-cols-2">{factors.map(factor => <div key={factor[0]} className="border-b border-r border-[#E7EDF1] p-5 last:border-b-0"><div className="flex justify-between gap-3"><b className="text-[12px] text-[#34465A]">{factor[0]}</b><Badge tone={factor[3] as Tone}>{factor[1]}</Badge></div><p className="mt-2 text-[11px] leading-5 text-[#718096]">{factor[2]}</p><button onClick={() => notify({
            tone: 'info',
            text: factor[0] + ': kontrolltiltak er åpnet for oppdatering og krever ny signering ved vesentlig endring.'
          })} className="mt-3 text-[11px] font-bold text-[#176B5B]">Se tiltak →</button></div>)}</div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Oppdragsomfang" copy="Samme klient kan ha to oppdrag med ulikt land, tjeneste og AML-utfall." /><div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">{[['Selskapsoverdragelse', 'Omfattet'], ['Prosessoppdrag', 'Avklar virkeområde'], ['Klientmidler', 'Forsterket kontroll']].map(row => <div key={row[0]} className="flex items-center justify-between py-3 text-[11px]"><b className="text-[#34465A]">{row[0]}</b><Badge tone={row[1] === 'Omfattet' ? 'green' : 'amber'}>{row[1]}</Badge></div>)}</div><button onClick={() => notify({
          tone: 'ok',
          text: 'Kontroll fullført: nytt tjenesteområde gjør berørte rutiner synlige og krever ny signering.'
        })} className="mt-4 w-full bg-[#176F61] px-3 py-2.5 text-[11px] font-bold text-white">Verifiser ny tjeneste</button></Panel><TestPanel entries={['Iboende og gjenværende risiko holdes separat.', 'Uklart omfang rutes til fagansvarlig.', 'Kunde- og sektorgrense følger hvert oppdrag.']} /></aside></div>;
}
export function LocalPolicy({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Lokale policytilpasninger" copy="Lokale regler kan skjerpe minimumskrav, aldri deaktivere dem." /></div><Table headers={['Kontroll', 'Plattformminimum', 'Lokal tilpasning', 'Status']} rows={[['Reell rettighetshaver', 'Kreves', 'Ekstra dokument ved > 25 %', <Badge tone="green">Godkjent</Badge>], ['Kilde til midler', 'Risikoavhengig', 'Kreves ved klientmidler', <Badge tone="green">Godkjent</Badge>], ['Sanksjonsscreening', 'Kreves', 'Kan ikke endres', <Badge tone="blue">Låst</Badge>], ['Oppfriskningsintervall', 'Risikoavhengig', '12 mnd ved forhøyet', <Badge tone="amber">Venter attest</Badge>]]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Endringsflyt" copy="Foreslå, faglig gjennomgå, attestér og publiser med komplett spor." /><div className="mt-4 grid gap-2">{[['1', 'Foreslått', 'Lina Nilsen'], ['2', 'Faglig gjennomgang', 'Marius Viken'], ['3', 'Attest / publisering', 'Venter']].map(row => <div key={row[0]} className="flex items-center gap-3 border border-[#E2E8ED] p-3"><span className="grid h-5 w-5 place-items-center bg-[#EFF4F6] text-[9px] font-bold text-[#607188]">{row[0]}</span><span className="text-[11px]"><b className="block text-[#34465A]">{row[1]}</b><small className="text-[#718096]">{row[2]}</small></span></div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: obligatorisk sanksjonsscreening kan ikke slås av av lokal virksomhetspolicy.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser obligatorisk regel</button></Panel><TestPanel entries={['Lokale regler kan skjerpe, ikke svekke.', 'Endringer trenger gjennomgang og attest.', 'Publisert policy knyttes til beslutninger.']} /></aside></div>;
}
export function DataSources({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Datakilder og behandlingsgrunnlag" copy="Hvert oppslag har tillatt hensikt, ansvarlig kilde og definert feilmåte." /></div><Table headers={['Kilde', 'Formål', 'Status', 'Reserveprosess', 'Sist verifisert']} rows={[['Foretaksregister', 'Bedriftskontroll', <Badge tone="green">Aktiv</Badge>, 'Kundedokumentasjon', '10:31'], ['Nordisk screening v3', 'PEP / sanksjon / medier', <Badge tone="green">Aktiv</Badge>, 'Sperre ved foreldet liste', '10:29'], ['eID leverandør', 'Identitet og signatur', <Badge tone="amber">Testavtale</Badge>, 'Manuell legitimasjon', 'I går'], ['Partner API', 'Avtalt oppstart av kontroll', <Badge tone="blue">Sandbox</Badge>, 'Ingen intern beslutning', '09:18']]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Kildeutfall" copy="Reservegrunnlag må aldri fremstå som registerbekreftet." /><button onClick={() => notify({
          tone: 'locked',
          text: 'Test: forsinket screeningliste har åpnet sperre og ansvarlig oppgave. Systemet viser ikke «ingen treff».'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Simuler kildesvikt</button></Panel><TestPanel entries={['Kilde, alder og lisens følger bevispakken.', 'Feilresultat er et eget kontrollutfall.', 'Formål og avtale styrer hvert oppslag.']} /></aside></div>;
}
export function PortalSetup({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.12fr_0.88fr]"><Panel className="p-5"><SmallTitle title="Kundeportal og meldingsmal" copy="Eksterne mottar bare oppgaver og nøytral status - ikke interne vurderinger." /><div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Avsender', 'Nordic Trade AS · compliance'], ['Invitasjonsgyldighet', '7 dager'], ['Identitetsalternativ', 'eID eller dokument'], ['Nøytral status', '«Vi behandler opplysningene»']].map(row => <div key={row[0]} className="border border-[#DCE4EB] bg-[#FBFCFD] p-3"><Label>{row[0]}</Label><div className="mt-1 text-[12px] font-semibold text-[#314357]">{row[1]}</div></div>)}</div><div className="mt-5 border border-[#DCE4EB] p-4"><Label>Meldingsforhåndsvisning</Label><p className="mt-2 text-[12px] leading-6 text-[#536478]">«For å fullføre oppdraget trenger vi noen opplysninger og dokumenter. Du kan lagre utkast og komme tilbake senere.»</p></div><button onClick={() => notify({
        tone: 'ok',
        text: 'Kontroll fullført: nøytral kundeinvitasjon er sendt. Ingen intern score, mistanke eller rapportstatus er med.'
      })} className="mt-5 bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white">Send testinvitasjon</button></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Eksterne grenser" copy="Kunde og teknisk partner får ikke utledbar informasjon om intern sak eller undersøkelse." /><div className="mt-4 space-y-2">{['Ingen intern risiko eller score', 'Ingen mistanke eller rapportstatus', 'Ingen fritekst fra saksbehandler', 'Ingen skjermet sak i søk eller varsel'].map(item => <div key={item} className="flex gap-2 border border-[#E2E8ED] p-3 text-[11px] text-[#536478]"><i className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#238A75]" />{item}</div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: kundeportal kan ikke vise eller avsløre at en skjermet undersøkelse finnes.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser skjermet sak</button></Panel><TestPanel entries={['Utløpt og videresendt lenke skal avvises.', 'Kunden kan lagre utkast.', 'Kunde ser kun egne leveranseoppgaver.']} /></aside></div>;
}
export function TenantAudit({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]"><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Metric label="Maskinelt klargjort" value="71 %" help="Standardkontroller denne måneden" tone="green" /><Metric label="Median aktiv tid" value="34 min" help="Mål: minst 40 % reduksjon" tone="blue" /><Metric label="Restkø" value="12" help="4 trenger handling i dag" tone="amber" /></div><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Tilgangs- og beslutningsspor" copy="Etterprøvbart uten å putte rå persondata i ordinær hendelseslogg." /></div><Table headers={['Tidspunkt', 'Handling', 'Utført av', 'Objekt', 'Korrelasjon']} rows={[['10:42', 'Medlemskap attestert', 'Lina Nilsen', 'Erik Olsen', 'evt-83f1'], ['10:31', 'Screening kjørt', 'System', 'AML-0248', 'run-b2c4'], ['09:58', 'Bevis lagt til', 'Nora Berg', 'AML-0248', 'evt-f4d9'], ['I går', 'Policyversjon lest', 'Marius Viken', 'NO v1.4', 'evt-7b1e']]} /></Panel></div><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Ledelsesrapport" copy="Kvalitet, friksjon og risikodekning - ikke bare volum." /><div className="mt-4 space-y-3">{[['Kontrolldekning', '94 %'], ['Kildeutfall med reserve', '1'], ['Ubesvarte kundeforespørsler', '3'], ['Kritiske scenarioer rett routet', '100 %']].map(row => <div key={row[0]} className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">{row[0]}</span><b className="text-[#34465A]">{row[1]}</b></div>)}</div><button onClick={() => notify({
          tone: 'info',
          text: 'Ledelsesrapport klargjort med restkø, dekning, manuell tid og tiltak for Nordic Trade AS.'
        })} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Generer testrapport</button></Panel><TestPanel entries={['Eksport skal ikke inneholde skjermet sak eller rå persondata.', 'Revisor har tidsbegrenset, autorisert lesing.', 'Målinger skiller eksterne ventetider fra aktiv tid.']} /></aside></div>;
}
export function Queue({
  notify,
  go
}: {
  notify: (notice: Notice) => void;
  go: (screen: ScreenId) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]"><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Tildelte saker" copy="Filtrer på status, frist, risiko og neste handling." /><button onClick={() => go('scope')} className="bg-[#176F61] px-3.5 py-2 text-[11px] font-bold text-white">Start ny kontroll</button></div><div className="border-b border-[#E7EDF1] bg-[#FBFCFD] px-5 py-3 text-[11px] text-[#718096]"><span className="mr-4 font-bold text-[#176B5B]">Alle 12</span><span className="mr-4">Krever handling 4</span><span className="mr-4">Forhøyet risiko 3</span><span>Forfalt 2</span></div><Table headers={['Sak', 'Kunde', 'Årsak', 'Frist', 'Status']} rows={[['AML-0248', 'Nordic Trade AS', 'Uavklart eierstruktur', 'I dag 15:00', <Badge tone="red">Sperret</Badge>], ['AML-0239', 'Aurora Property AS', 'Kildeutfall', 'I morgen', <Badge tone="amber">Oppfølging</Badge>], ['AML-0221', 'Fjord Partners AS', 'Årlig oppfriskning', '05.11', <Badge tone="blue">I arbeid</Badge>], ['AML-0216', 'Venture North AS', 'Screening avklart', '06.11', <Badge tone="green">Klar for beslutning</Badge>]]} /><div className="border-t border-[#E2E8ED] px-5 py-4"><button onClick={() => go('case')} className="text-[11px] font-bold text-[#176B5B]">Åpne AML-0248 →</button></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Din tilgang" copy="Nora Berg · Saksbehandler · kun tildelte saker" /><div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">{[['Saker i kø', '12'], ['Oppgaver i dag', '4'], ['Godkjennerrettighet', 'Ikke tildelt'], ['Skjermet tilgang', 'Ikke tildelt']].map(row => <div key={row[0]} className="flex justify-between py-3 text-[11px]"><span className="text-[#718096]">{row[0]}</span><b className="text-[#34465A]">{row[1]}</b></div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Ingen tilgang: Bruker kan ikke administrere medlemskap, integrasjoner eller data for annen tenant.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser administrasjon</button></Panel><TestPanel entries={['Arbeidskø viser bare tildelte/autoriserte saker.', 'Høy risiko og frister er prioriterte.', 'Åpen sperre kan ikke overstyres av lav score.']} action={() => go('case')} actionLabel="Åpne kontrollgrunnlag" /></aside></div>;
}
export function Scope({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]"><Panel className="p-5"><SmallTitle title="Oppdragsavgrensing" copy="Samme klient kan ha forskjellige AML-utfall per land, sektor og tjeneste." /><div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Kunde', 'Nordic Trade AS'], ['Land', 'Norge'], ['Sektor', 'Advokat'], ['Tjeneste', 'Selskapsoverdragelse'], ['Representant', 'Kari Lund'], ['Ansvarlig', 'Nora Berg']].map(row => <div key={row[0]} className="border border-[#DCE4EB] bg-[#FBFCFD] p-3"><Label>{row[0]}</Label><div className="mt-1 text-[12px] font-semibold text-[#314357]">{row[1]}</div></div>)}</div><div className="mt-5 border border-[#D5E4E1] bg-[#F7FBFA] p-4"><Label>Forslag fra regelmotor</Label><div className="mt-2 text-[13px] font-semibold text-[#284253]">Kontroll er omfattet · NO AML-regelpakke v1.4</div><p className="mt-1 text-[11px] leading-5 text-[#617188]">Krever eierstruktur, representasjonsrett, screening og risikovurdering før beslutning.</p></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => notify({
          tone: 'ok',
          text: 'Kontroll startet: omfang, hjemmel, land og ansvarlig er lagret for AML-0248.'
        })} className="bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white">Start kontroll</button><button onClick={() => notify({
          tone: 'info',
          text: 'Uklart oppdrag sendt til fagansvarlig. Fortrolig informasjon er ikke eksportert.'
        })} className="border border-[#C9D4DE] bg-white px-4 py-2.5 text-[11px] font-bold text-[#42536A]">Be om faglig avklaring</button></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Avgrensingsregel" copy="Jurisdiksjon bestemmes av rapporteringspliktig, oppdrag og aktivitet - ikke av språk eller statsborgerskap alene." /><div className="mt-4 space-y-2">{['Land og sektor må være aktivert.', 'Uavklart grense går til fagansvarlig.', 'Beslutning lagrer hjemmel og ansvarlig.'].map(item => <div key={item} className="flex gap-2 border border-[#E2E8ED] p-3 text-[11px] text-[#536478]"><i className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#238A75]" />{item}</div>)}</div></Panel><TestPanel entries={['To oppdrag for samme kunde kan få ulikt utfall.', 'Ingen lands- eller sektoraktivering på usikkert grunnlag.', 'Systemet viser hvilken policyversjon som styrer.']} /></aside></div>;
}
export function Case({
  notify,
  go
}: {
  notify: (notice: Notice) => void;
  go: (screen: ScreenId) => void;
}) {
  const controls = [['Reell rettighetshaver', 'Sperret', 'Signert eierstruktur mangler.', 'red'], ['Sanksjon og PEP', 'Ingen treff', 'Kontrollert i Nordisk screening v3.', 'green'], ['Foretaks- og eierregister', 'Oppfølging', 'Kilde må avstemmes mot kundedokumentasjon.', 'amber'], ['Formål og forventet aktivitet', 'Klar', 'Dokumentert og internkontrollert.', 'green']];
  return <div className="grid gap-5 2xl:grid-cols-[0.55fr_1fr_0.62fr]"><aside className="space-y-5"><Panel className="p-5"><Label>Sakskontekst</Label><div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">{[['Kunde', 'Nordic Trade AS'], ['Jurisdiksjon', 'Norge / AS'], ['Risikonivå', 'Forhøyet'], ['Ansvarlig', 'Nora Berg'], ['Datagrunnlag', '4 av 5 kontroller']].map(row => <div key={row[0]} className="grid grid-cols-[96px_1fr] gap-3 py-3"><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8692A1]">{row[0]}</span><span className="text-[11px] font-semibold text-[#405166]">{row[1]}</span></div>)}</div><button onClick={() => go('ownership')} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Åpne eierstruktur</button></Panel><TestPanel entries={['Kilde, alder og forklaring følger kontrollen.', 'Sperre holder beslutning tilbake.', 'Bevis åpnes bare ved nødvendig arbeid.']} /></aside><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Kontrollgrunnlag" copy="Åpne spørsmål og neste handling for AML-0248." /></div>{controls.map(row => <button key={row[0]} onClick={() => notify({
        tone: 'info',
        text: row[0] + ': ' + row[2]
      })} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#E7EDF1] px-5 py-4 text-left last:border-b-0 hover:bg-[#FBFCFD]"><span><b className="block text-[12px] text-[#2B3C50]">{row[0]}</b><small className="mt-1 block text-[11px] leading-5 text-[#718096]">{row[2]}</small></span><span className="self-start"><Badge tone={row[3] as Tone}>{row[1]}</Badge></span></button>)}</Panel><aside className="space-y-5"><Panel className="p-5"><div className="flex justify-between gap-3"><SmallTitle title="Neste steg" copy="En åpen sperre stopper klarsignal." /><Badge tone="red">1 sperre</Badge></div><div className="mt-4 border-l-2 border-[#B8413E] bg-[#FDF5F4] p-3 text-[11px] leading-5 text-[#754B49]"><b>Sperre:</b> Signert eierstruktur mangler før menneskelig beslutning.</div><button onClick={() => go('evidence')} className="mt-4 w-full bg-[#176F61] px-3 py-2.5 text-[11px] font-bold text-white">Be om opplysninger</button><button onClick={() => go('decision')} className="mt-2.5 w-full border border-[#D6DDE5] bg-[#F3F5F7] px-3 py-2.5 text-[11px] font-bold text-[#99A6B5]">Gå til beslutning</button></Panel></aside></div>;
}
export function CustomerPortal({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.12fr_0.88fr]"><Panel className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><SmallTitle title="Ekstern kundevisning" copy="Dette er innholdet kunden kan se i sin sikre portal." /><Badge tone="blue">Nøytral status</Badge></div><div className="mt-5 border border-[#DCE4EB] bg-[#FBFCFD] p-5"><div className="text-[16px] font-semibold text-[#26384B]">Vi trenger noen opplysninger</div><p className="mt-2 max-w-[620px] text-[12px] leading-6 text-[#617188]">For å behandle oppdraget trenger vi bekreftelse av representasjonsrett og oppdatert eierstruktur. Du kan lagre og fullføre senere.</p><div className="mt-5 divide-y divide-[#E2E8ED] border-y border-[#E2E8ED]">{[['Bekreft representasjonsrett', 'Mangler'], ['Last opp signert eierstruktur', 'Mangler'], ['Beskriv formål og forventet aktivitet', 'Mottatt']].map(row => <div key={row[0]} className="flex items-center justify-between gap-3 py-3 text-[12px]"><span className="font-semibold text-[#3C4D60]">{row[0]}</span><Badge tone={row[1] === 'Mottatt' ? 'green' : 'amber'}>{row[1]}</Badge></div>)}</div><button onClick={() => notify({
          tone: 'ok',
          text: 'Kundeportalen har lagret et utkast. Den interne vurderingen er fortsatt skjult.'
        })} className="mt-5 bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white">Lagre testutkast</button></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Hva er bevisst skjult?" copy="Kundegrensesnittet har en annen API-projeksjon enn saksflaten." /><div className="mt-4 space-y-2">{['Intern risikoscore', 'PEP- og sanksjonsresultat', 'Rapportstatus eller mistanke', 'Skjermet undersøkelse', 'Saksbehandlers fritekst'].map(item => <div key={item} className="flex items-center justify-between border border-[#E8EDEF] p-3 text-[11px]"><span className="text-[#536478]">{item}</span><Badge tone="red">Skjult</Badge></div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: kundeportalen kan ikke utlede at en skjermet undersøkelse eller rapport eksisterer.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser ingen avsløring</button></Panel><TestPanel entries={['Kunden ser kun hva den skal levere.', 'Utløpt lenke gir ingen tilgang.', 'Portal og saksflate bruker ulike data-projeksjoner.']} /></aside></div>;
}
export function Identity({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Identitet og representasjonsrett" copy="Identitet, fullmakt og gyldighet vurderes separat." /></div><Table headers={['Person / rolle', 'Metode', 'Status', 'Gyldig til', 'Neste steg']} rows={[['Kari Lund · styreleder', 'Nordisk eID', <Badge tone="green">Verifisert</Badge>, '12.08.2027', 'Kontrollert'], ['Anders Holm · fullmektig', 'Signert fullmakt', <Badge tone="amber">Avklar</Badge>, '31.12.2026', 'Bekreft omfang'], ['Ola Strand · eier', 'Pass + video', <Badge tone="green">Verifisert</Badge>, '09.04.2030', 'Kontrollert']]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Avklaringsregel" copy="Et vellykket SSO- eller eID-kall er ikke alene tilstrekkelig dokumentert fullmakt." /><div className="mt-4 border-l-2 border-[#C27A13] bg-[#FCF5E7] p-3 text-[11px] leading-5 text-[#72561D]">Anders Holm har gyldig identitet, men representasjonsretten omfatter ikke tydelig dette oppdraget.</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Kontroll holdes åpen: gyldig identitet uten tilstrekkelig fullmakt gir ikke klarstatus.'
        })} className="mt-4 w-full border border-[#DEC78F] bg-white px-3 py-2.5 text-[11px] font-bold text-[#82510E]">Verifiser manglende fullmakt</button></Panel><TestPanel entries={['eID og autorisasjon kontrolleres separat.', 'Alternativ legitimasjon har dokumentert reserveflyt.', 'Utløpt identitet setter ikke av seg selv i gang blindt nytt oppslag.']} /></aside></div>;
}
export function Ownership({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Eierstruktur og kontroll" copy="Grafen skiller økonomisk andel, stemmerett og faktisk kontroll." /></div><div className="relative min-h-[330px] overflow-hidden bg-[#FBFCFD] p-6"><div className="absolute left-1/2 top-[53%] h-px w-[64%] -translate-x-1/2 -rotate-[18deg] bg-[#B7C4CE]" /><div className="absolute left-1/2 top-[53%] h-px w-[58%] -translate-x-1/2 rotate-[23deg] bg-[#B7C4CE]" /><div className="absolute left-[21%] top-[21%] w-[120px] border border-[#C5DCD7] bg-white p-3 text-center"><b className="block text-[11px] text-[#2B4350]">Kari Lund</b><small className="mt-1 block text-[10px] text-[#718096]">35 % økonomisk</small></div><div className="absolute right-[19%] top-[22%] w-[120px] border border-[#E3C9A1] bg-white p-3 text-center"><b className="block text-[11px] text-[#2B4350]">Fjordhold AS</b><small className="mt-1 block text-[10px] text-[#718096]">27 % økonomisk</small></div><div className="absolute left-1/2 top-[48%] w-[150px] -translate-x-1/2 border-2 border-[#176F61] bg-[#F0F9F6] p-4 text-center"><b className="block text-[12px] text-[#1D4B5A]">Nordic Trade AS</b><small className="mt-1 block text-[10px] text-[#51726E]">Målselskap</small></div><div className="absolute bottom-[11%] left-[18%] w-[135px] border border-[#E7BBB8] bg-[#FFF7F6] p-3 text-center"><b className="block text-[11px] text-[#963531]">Uavklart kontroll</b><small className="mt-1 block text-[10px] text-[#874C49]">62 % stemmerett</small></div><div className="absolute bottom-[11%] right-[17%] w-[120px] border border-[#C5DCD7] bg-white p-3 text-center"><b className="block text-[11px] text-[#2B4350]">Ivan Petrov</b><small className="mt-1 block text-[10px] text-[#718096]">18 % eierandel</small></div></div><Table headers={['Part', 'Relasjon', 'Andel / kontroll', 'Bevis', 'Status']} rows={[['Kari Lund', 'Direkte eier', '35 % økonomisk', 'Register + signatur', <Badge tone="green">Verifisert</Badge>], ['Fjordhold AS', 'Direkte eier', '27 % økonomisk', 'Register', <Badge tone="green">Verifisert</Badge>], ['Uavklart kontroll', 'Stemmerett', '62 % kontroll', 'Mangler', <Badge tone="red">Sperre</Badge>]]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Avvik som krever faglig vurdering" copy="Ukjent ledd, motstridende rettighet eller sirkulær eierkjede får forklaring - ikke automatisk klarstatus." /><button onClick={() => notify({
          tone: 'locked',
          text: 'Uavklart eier er routet til fagperson. Saken kan ikke få automatisk klarstatus.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser uavklart eier</button></Panel><TestPanel entries={['Økonomisk andel og kontrollrett er separate felt.', 'Kilde og tidsperiode vises for hver relasjon.', 'Ny faktisk kontrollør skal screenes.']} /></aside></div>;
}
export function Screening({
  notify,
  go
}: {
  notify: (notice: Notice) => void;
  go: (screen: ScreenId) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]"><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Screeningresultater" copy="Råfunn beholdes; senere avklaring erstatter ikke opprinnelig resultat." /><Badge tone="blue">Listeversjon 2026.11</Badge></div><Table headers={['Part', 'Kontroll', 'Treffgrunnlag', 'Avklaring', 'Status']} rows={[['Kari Lund', 'PEP', 'Navn + fødselsdato', 'Forsterket tiltak', <Badge tone="amber">Må vurderes</Badge>], ['Ivan Petrov', 'Sanksjon', 'Navnelikhet', 'Mangler identitetsfelt', <Badge tone="amber">Avklar</Badge>], ['Nordic Trade AS', 'Negativ omtale', '2 artikler', 'Én dementert', <Badge tone="blue">Dokumentert</Badge>], ['Fjordhold AS', 'Sanksjon', 'Ingen treff', 'Kontrollert 10:31', <Badge tone="green">Klar</Badge>]]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Hastekanal for sanksjon" copy="Potensielt sanksjonstreff kan ikke ligge i ordinær kø eller påstå at ekstern stans er gjort." /><div className="mt-4 border-l-2 border-[#B8413E] bg-[#FDF5F4] p-3 text-[11px] leading-5 text-[#754B49]">Én mulig match på Ivan Petrov mangler bekreftende identitetsfelt. AML-ansvarlig og stedfortreder varsles.</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Hastekanal aktivert: ingen klarering, ingen simulert frys. Varsel og tidsstempel er loggført.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser sanksjonskanal</button><button onClick={() => go('risk')} className="mt-2.5 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Se risiko og tiltak</button></Panel><TestPanel entries={['Navnelikhet alene gir ikke avslag.', 'Ny identitet eller listeversjon åpner revurdering.', 'Kritisk treff stopper klarering umiddelbart.']} /></aside></div>;
}
export function Risk({
  notify,
  go
}: {
  notify: (notice: Notice) => void;
  go: (screen: ScreenId) => void;
}) {
  const factors = [['Eierstruktur', 'Uavklart', 'Sperre', 'red'], ['Kundeformål', 'Dokumentert', 'Lavere risiko', 'green'], ['PEP', 'Bekreftet', 'Forsterkede tiltak', 'amber'], ['Sanksjoner', 'Navnelikhet', 'Må avklares', 'amber'], ['Geografi', 'Norge', 'Normal', 'green']];
  return <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Forklarbar risikovurdering" copy="Hver faktor peker til kilde, regel-ID og input som var kjent på beslutningstidspunktet." /></div><div className="grid divide-y divide-[#E7EDF1] md:grid-cols-2 md:divide-x md:divide-y-0">{factors.map(factor => <div key={factor[0]} className="p-5"><div className="flex justify-between gap-3"><b className="text-[12px] text-[#34465A]">{factor[0]}</b><Badge tone={factor[3] as Tone}>{factor[1]}</Badge></div><p className="mt-2 text-[11px] text-[#718096]">{factor[2]}</p><button onClick={() => notify({
            tone: 'info',
            text: factor[0] + ': kilde, regel-ID og forklaring er åpnet i kontrollgrunnlaget.'
          })} className="mt-3 text-[11px] font-bold text-[#176B5B]">Se forklaring →</button></div>)}</div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Tiltaksforslag" copy="Automatisering foreslår, men en autorisert person vurderer og dokumenterer." /><div className="mt-4 space-y-2">{[['Be om signert eierstruktur', 'Obligatorisk'], ['Kilde til midler / formue', 'PEP-tiltak'], ['Avklar sanksjonsnavnelikhet', 'Hastekanal']].map(row => <div key={row[0]} className="flex justify-between gap-3 border border-[#E2E8ED] p-3 text-[11px]"><span className="font-semibold text-[#44566A]">{row[0]}</span><Badge tone={row[1] === 'Obligatorisk' ? 'red' : 'amber'}>{row[1]}</Badge></div>)}</div><button onClick={() => go('decision')} className="mt-4 w-full border border-[#C9D4DE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#42536A]">Gå til beslutning</button></Panel><TestPanel entries={['Lav score kan ikke overstyre en sperre.', 'Integrasjon eller KI kan ikke fatte sluttbeslutning.', 'Avvik må ha begrunnelse og riktig fullmakt.']} /></aside></div>;
}
export function Evidence({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]"><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Bevismanifest" copy="Hver fil og kilde har versjon, hash, klassifisering og kobling til kontroll eller beslutning." /><button onClick={() => notify({
          tone: 'ok',
          text: 'Kundeforespørsel opprettet: signert eierstruktur kreves, med nøytral portaltekst og frist.'
        })} className="bg-[#176F61] px-3.5 py-2 text-[11px] font-bold text-white">Be om dokument</button></div><Table headers={['Bevis', 'Kilde / versjon', 'Samlet', 'Klassifisering', 'Status']} rows={[['Eierstruktur.pdf', 'Kundeopplasting v1', '09:47', 'Fortrolig', <Badge tone="amber">Utdatert signatur</Badge>], ['Foretaksutskrift', 'Brønnøysund v3', '10:02', 'Register', <Badge tone="green">Gyldig</Badge>], ['Screeningresultat', 'Nordisk v2026.11', '10:31', 'Kontrollbevis', <Badge tone="green">Gyldig</Badge>], ['Fullmakt.pdf', 'Kundeopplasting v2', '10:05', 'Fortrolig', <Badge tone="green">Gyldig</Badge>]]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Mangler før beslutning" copy="Bevis og dokumentasjon blir ikke «grønne» ved å være gamle eller ufullstendige." /><div className="mt-4 border-l-2 border-[#C27A13] bg-[#FCF5E7] p-3 text-[11px] leading-5 text-[#72561D]"><b>Signert eierstruktur</b><br />Kunde har lastet opp fil, men den mangler bekreftet signatur og kan ikke lukke sperren.</div><button onClick={() => notify({
          tone: 'info',
          text: 'Test: oppdatert dokumentversjon er lagt til som ny bevisversjon. Tidligere fil beholdes i manifestet.'
        })} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Simuler ny dokumentversjon</button></Panel><TestPanel entries={['Kildeutfall og råfunn beholdes som eget resultat.', 'Bevis kan verifiseres innenfor lovlig oppbevaring.', 'Portalviser bare etterspurt dokument, ikke intern begrunnelse.']} /></aside></div>;
}
export function Decision({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1fr_0.75fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Beslutningsgrunnlag" copy="Autorisert person vurderer grunnlag, kan avvike med begrunnelse og må følge delegasjon." /></div><div className="p-5"><div className="grid gap-4 md:grid-cols-2"><div className="border border-[#E2E8ED] p-4"><Label>Policyversjon</Label><div className="mt-1 text-[13px] font-semibold text-[#314357]">NO AML-regelpakke v1.4</div><p className="mt-2 text-[11px] leading-5 text-[#718096]">Gyldig på tidspunktet for kontrollen.</p></div><div className="border border-[#E2E8ED] p-4"><Label>Påkrevd godkjenner</Label><div className="mt-1 text-[13px] font-semibold text-[#314357]">Godkjenner · forhøyet risiko</div><p className="mt-2 text-[11px] leading-5 text-[#718096]">Kan ikke være samme person som endret policy.</p></div></div><div className="mt-4 border-l-2 border-[#B8413E] bg-[#FDF5F4] p-4 text-[12px] leading-6 text-[#754B49]"><b>Beslutning er sperret.</b><br />Uavklart eierstruktur og mulig sanksjonsnavnelikhet må avklares før saken kan sendes til godkjenning.</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => notify({
            tone: 'info',
            text: 'Avviksutkast åpnet: begrunnelse, grunnlag og faglig hjemmel må fylles ut før det kan sendes.'
          })} className="border border-[#C9D4DE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#42536A]">Utarbeid begrunnet avvik</button><button disabled className="cursor-not-allowed border border-[#D6DDE5] bg-[#F3F5F7] px-3 py-2.5 text-[11px] font-bold text-[#9AA6B4]">Send til godkjenning</button></div></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Menneskelig kontroll" copy="En beslutning inneholder aktør, handling, begrunnelse, tidspunkt og eksakt vurdering." /><div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">{[['Saksbehandler', 'Nora Berg'], ['Godkjenner', 'Ikke tildelt'], ['AML-ansvarlig', 'Marius Viken'], ['Beslutningsstatus', 'Sperret']].map(row => <div key={row[0]} className="flex justify-between py-3 text-[11px]"><span className="text-[#718096]">{row[0]}</span><b className="text-[#34465A]">{row[1]}</b></div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: åpen sperre og manglende godkjennerrettighet forhindrer sluttbeslutning.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser beslutningssperre</button></Panel><TestPanel entries={['Saksbehandler godkjenner ikke automatisk.', 'Godkjenner kan ikke godkjenne egen policyendring.', 'Avvik er begrunnet, sporbar og delegert.']} /></aside></div>;
}
export function Monitoring({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]"><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Kontrollkalender og endringsvarsler" copy="Fornyelser, rescreening, kildeendring og ansvarlige oppgaver." /><Badge tone="blue">34 aktive oppfølginger</Badge></div><Table headers={['Kunde / kontroll', 'Hendelse', 'Frist', 'Ansvarlig', 'Status']} rows={[['Nordic Trade AS', 'Eieroppfriskning', 'I dag 15:00', 'Nora Berg', <Badge tone="red">Sperre</Badge>], ['Aurora Property AS', 'Kildeutfall - screening', 'I morgen', 'Erik Olsen', <Badge tone="amber">Oppfølging</Badge>], ['Fjord Partners AS', 'Årlig rescreening', '05.11', 'Marius Viken', <Badge tone="blue">Planlagt</Badge>], ['Venture North AS', 'Endret styre', '07.11', 'Nora Berg', <Badge tone="amber">Ny kontroll</Badge>]]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Dekning og kildehelse" copy="Endringer og leverandørfeil synliggjøres før en kontroll blir utdatert." /><div className="mt-4 space-y-3">{[['Screeningliste', 'Frisk', 'green'], ['Foretaksregister', 'Frisk', 'green'], ['Eierregister', 'Forsinket', 'amber'], ['Kundeportal', 'Frisk', 'green']].map(row => <div key={row[0]} className="flex justify-between text-[11px]"><span className="text-[#718096]">{row[0]}</span><Badge tone={row[2] as Tone}>{row[1]}</Badge></div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Test: tom eller delvis feed har ikke satt kontroller «rene»; restkø og kildeversjon er synlig.'
        })} className="mt-4 w-full border border-[#DEC78F] bg-white px-3 py-2.5 text-[11px] font-bold text-[#82510E]">Verifiser kildeutfall</button></Panel><TestPanel entries={['Endret kundebilde oppretter ansvarlig oppgave.', 'Re-screening er rolle- og friststyrt.', 'Kildeutfall har reserve, dekningsgrad og restkø.']} /></aside></div>;
}
export function History({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]"><Panel><div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Hendelser, beslutninger og oppbevaring" copy="Hva var kjent, hvem gjorde hva, og hvilken policy gjaldt på handlingstidspunktet." /></div><Table headers={['Tid', 'Hendelse', 'Aktør', 'Grunnlag', 'Resultat']} rows={[['10:31', 'Screening kjørt', 'System', 'Liste v2026.11', '1 avklaring'], ['10:05', 'Fullmakt mottatt', 'Kundeportal', 'Dokument v2', 'Verifisert'], ['09:58', 'Eierstruktur vurdert', 'Nora Berg', 'Register + kundeopplysning', 'Sperre'], ['09:12', 'Kontroll startet', 'Nora Berg', 'NO v1.4', 'Pågår']]} /></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Oppbevaring" copy="Frist styres av landpakke, avslutning og eventuelle unntak." /><div className="mt-4 divide-y divide-[#E7EDF1] border-y border-[#E7EDF1]">{[['Startpunkt', 'Forhold avsluttet'], ['Normal frist', '5 år'], ['Forsterket tiltak', 'Vurder 10 år'], ['Legal hold', 'Ingen aktiv']].map(row => <div key={row[0]} className="flex justify-between py-3 text-[11px]"><span className="text-[#718096]">{row[0]}</span><b className="text-[#34465A]">{row[1]}</b></div>)}</div><button onClick={() => notify({
          tone: 'ok',
          text: 'Kontroll fullført: avslutningsgrunnlag og korrekt oppbevaringsregel er registrert før sletteløpet starter.'
        })} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Verifiser avslutningsløp</button></Panel><TestPanel entries={['Senere korrigering endrer ikke beslutningsbildet historisk.', 'Sletteloggen spilles før gjenåpnet tilgang.', 'Legal hold trenger grunnlag, eier og ny vurderingsdato.']} /></aside></div>;
}
export function Transactions({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.28fr_0.72fr]"><Panel><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Transaksjonsvarsler · G3" copy="Batchinntak, scenarioforklaring og avstemming før faglig oppfølging." /><Badge tone="amber">Ikke aktivert i G1</Badge></div><Table headers={['Varsel', 'Scenario', 'Beløp', 'Tidspunkt', 'Status']} rows={[['TXN-0094', 'Ny tredjepart ved utbetaling', 'NOK 850 000', '10:14', <Badge tone="amber">Til vurdering</Badge>], ['TXN-0088', 'Duplikatbetaling', 'SEK 62 000', '09:47', <Badge tone="blue">Avstemmes</Badge>], ['TXN-0081', 'Sen reversering', 'DKK 120 000', 'I går', <Badge tone="green">Forklart</Badge>]]} /><div className="border-t border-[#E2E8ED] px-5 py-4 text-[11px] text-[#617188]">Kildebeløp, valuta, retning og reversering bevares. En varsling er ikke en bekreftet stans eller frys.</div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Aktivering og avstemming" copy="G3 krever egen datatilkobling, avtalt formål og testdata før produksjon." /><div className="mt-4 space-y-2">{[['Batchinntak', '202 mottatt'], ['Unike kilde-ID-er', 'Kontrollert'], ['Avstemming per valuta', 'Påkrevd'], ['Ekstern handling', 'Bekreftes utenfor AML']].map(row => <div key={row[0]} className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">{row[0]}</span><b className="text-[#34465A]">{row[1]}</b></div>)}</div><button onClick={() => notify({
          tone: 'ok',
          text: 'G3-test fullført: duplikat og reversering er avstemt separat; scenarioet peker til medgåtte poster.'
        })} className="mt-4 w-full border border-[#B9D5CE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#176B5B]">Kjør scenarioprøve</button></Panel><TestPanel entries={['Batchinntak betyr ikke avstemming eller beslutning.', 'Duplikat, reversering og valuta holdes separat.', 'Ekstern stans/frys bekreftes utenfor plattformen.']} /></aside></div>;
}
export function Investigation({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]"><Panel className="overflow-hidden"><div className="border-b border-[#E4C2BF] bg-[#FFF7F6] px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><SmallTitle title="Skjermet undersøkelsesrom" copy="Ikke en del av ordinær søk, portal, partner-API, webhook eller support." /><Badge tone="red">Separat tilgangsgruppe</Badge></div></div><div className="p-5"><div className="grid gap-4 md:grid-cols-3">{[['Triage', 'Mottatt 10:34', 'amber'], ['Hypotese', 'Under faglig vurdering', 'blue'], ['Rapporteringsfrist', 'Ingen automatikk', 'neutral']].map(row => <div key={row[0]} className="border border-[#E3E9EE] p-4"><Label>{row[0]}</Label><div className="mt-2 text-[12px] font-semibold text-[#34465A]">{row[1]}</div><div className="mt-3"><Badge tone={row[2] as Tone}>Kontrollert</Badge></div></div>)}</div><div className="mt-5 border border-dashed border-[#D9C0BE] bg-[#FFFDFC] p-5 text-[12px] leading-6 text-[#765654]">Beskyttet visning: undersøkelsesdetaljer vises bare for den skjermede tilgangsgruppen. Tilgang avgjøres per sak, privilegium og access group.</div></div></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Tilgangstest" copy="Vanlig bruker, kunde, partner og support kan ikke utlede at denne saken eksisterer." /><button onClick={() => notify({
          tone: 'locked',
          text: 'Ingen avsløring: ordinært søk, partner-API, portal og support returnerer ikke status, metadata eller treff på skjermet undersøkelse.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser ingen avsløring</button></Panel><TestPanel entries={['Undersøkelse har eget livsløp og tilgangsregel.', 'Ugjennomsiktige referanser brukes mot vanlig sak.', 'Rapportutkast krever AML-ansvarlig og korrekt kanal.']} /></aside></div>;
}
export function Reporting({
  notify
}: {
  notify: (notice: Notice) => void;
}) {
  return <div className="grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]"><Panel className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><SmallTitle title="Rapportutkast og kvitteringsjournal" copy="Sanksjonsrapport og FIU-rapport er egne objekter med riktig landkanal og egen avstemming." /><Badge tone="red">AML-ansvarlig</Badge></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Land / kanal', 'Norge · FIU/Økokrim'], ['Rapporttype', 'Mistankeutkast'], ['Faglig eier', 'Marius A. Viken'], ['Status', 'Utkast - ikke sendt'], ['Obligatoriske felt', '4 av 5'], ['Kvittering', 'Ikke relevant før innsending']].map(row => <div key={row[0]} className="border border-[#DCE4EB] bg-[#FBFCFD] p-3"><Label>{row[0]}</Label><div className="mt-1 text-[12px] font-semibold text-[#314357]">{row[1]}</div></div>)}</div><div className="mt-5 border-l-2 border-[#C27A13] bg-[#FCF5E7] p-4 text-[11px] leading-5 text-[#72561D]">Innsending skjer manuelt via godkjent kanal. Ukjent resultat skal ikke utløse automatisk ny innsending; kvittering avstemmes mot korrekt mottaker.</div><button onClick={() => notify({
        tone: 'ok',
        text: 'Kontroll fullført: rapportutkast er validert mot obligatoriske felt, men ikke sendt. Kvittering kan først registreres etter korrekt kanalhandling.'
      })} className="mt-5 bg-[#176F61] px-4 py-2.5 text-[11px] font-bold text-white">Valider testutkast</button></Panel><aside className="space-y-5"><Panel className="p-5"><SmallTitle title="Rapporteringskontroll" copy="Kundeportal, partner-API og ordinær administrasjon får aldri rapportstatus." /><div className="mt-4 space-y-2">{[['Fakta vs. antakelse', 'Skilles'], ['Mottaker', 'Landkontrollert'], ['Innsending', 'Manuell / avtalt kanal'], ['Kvittering', 'Avstemmes']].map(row => <div key={row[0]} className="flex justify-between border-b border-[#E7EDF1] pb-2 text-[11px]"><span className="text-[#718096]">{row[0]}</span><b className="text-[#34465A]">{row[1]}</b></div>)}</div><button onClick={() => notify({
          tone: 'locked',
          text: 'Avvist: integrasjonsnøkkel eller saksbehandler kan ikke fatte eller sende en slutt-rapportbeslutning.'
        })} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser rollegrense</button></Panel><TestPanel entries={['Manglende obligatorisk felt stopper utkast.', 'Ukjent innsending blir avstemt, ikke sendt på nytt.', 'Hver korrektur er en ny versjon med separat kvittering.']} /></aside></div>;
}
export function RenderScreen({
  screen,
  notify,
  country,
  chooseCountry,
  go
}: {
  screen: ScreenId;
  notify: (notice: Notice) => void;
  country: Country;
  chooseCountry: (country: Country) => void;
  go: (screen: ScreenId) => void;
}) {
  if (screen === 'platform-overview') return <PlatformOverview notify={notify} go={go} />;
  if (screen === 'tenant-onboarding') return <TenantOnboarding country={country} chooseCountry={chooseCountry} notify={notify} />;
  if (screen === 'land-packs') return <LandPacks notify={notify} />;
  if (screen === 'partner-api') return <PartnerApi notify={notify} />;
  if (screen === 'operations') return <Operations notify={notify} />;
  if (screen === 'support-access') return <SupportAccess notify={notify} />;
  if (screen === 'tenant-overview') return <TenantOverview notify={notify} go={go} />;
  if (screen === 'members') return <Members notify={notify} />;
  if (screen === 'business-risk') return <BusinessRisk notify={notify} />;
  if (screen === 'local-policy') return <LocalPolicy notify={notify} />;
  if (screen === 'data-sources') return <DataSources notify={notify} />;
  if (screen === 'portal-setup') return <PortalSetup notify={notify} />;
  if (screen === 'tenant-audit') return <TenantAudit notify={notify} />;
  if (screen === 'queue') return <Queue notify={notify} go={go} />;
  if (screen === 'scope') return <Scope notify={notify} />;
  if (screen === 'case') return <Case notify={notify} go={go} />;
  if (screen === 'customer-portal') return <CustomerPortal notify={notify} />;
  if (screen === 'identity') return <Identity notify={notify} />;
  if (screen === 'ownership') return <Ownership notify={notify} />;
  if (screen === 'screening') return <Screening notify={notify} go={go} />;
  if (screen === 'risk') return <Risk notify={notify} go={go} />;
  if (screen === 'evidence') return <Evidence notify={notify} />;
  if (screen === 'decision') return <Decision notify={notify} />;
  if (screen === 'monitoring') return <Monitoring notify={notify} />;
  if (screen === 'transactions') return <Transactions notify={notify} />;
  if (screen === 'history') return <History notify={notify} />;
  if (screen === 'investigation') return <Investigation notify={notify} />;
  return <Reporting notify={notify} />;
}
export function AMLCommandCenter() {
  const [role, setRole] = useState<Role>('user');
  const [screen, setScreen] = useState<ScreenId>('queue');
  const [country, setCountry] = useState<Country>('NO');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showMap, setShowMap] = useState(false);
  const activeScreens = navigation[role].flatMap(group => group.items.map(item => item.id));
  const allScreens = (Object.keys(navigation) as Role[]).flatMap(item => navigation[item].flatMap(group => group.items.map(entry => entry.id)));
  const activeIndex = activeScreens.indexOf(screen);
  const screenNumber = allScreens.indexOf(screen) + 1;
  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setScreen(roleMeta[nextRole].defaultScreen);
    setNotice(null);
    setShowMap(false);
  }
  function go(nextScreen: ScreenId) {
    setScreen(nextScreen);
    setNotice(null);
    setShowMap(false);
  }
  function step(direction: number) {
    const nextIndex = (activeIndex + direction + activeScreens.length) % activeScreens.length;
    go(activeScreens[nextIndex]);
  }
  function jump(nextRole: Role, nextScreen: ScreenId) {
    setRole(nextRole);
    setScreen(nextScreen);
    setNotice(null);
    setShowMap(false);
  }
  return <div className="min-h-screen bg-[#F5F7F9] font-sans text-[#172536]"><Header role={role} onRole={changeRole} onMap={() => setShowMap(true)} /><div className="mx-auto max-w-[1800px] px-5 pt-5 lg:px-8"><NoticeBar notice={notice} dismiss={() => setNotice(null)} /></div><div className="mx-auto flex max-w-[1800px]">{showMap ? <ScreenMap go={jump} /> : <><Sidebar role={role} screen={screen} go={go} openMap={() => setShowMap(true)} /><Page id={screen} role={role} screenNumber={screenNumber} total={allScreens.length} back={() => step(-1)} next={() => step(1)}><RenderScreen screen={screen} notify={setNotice} country={country} chooseCountry={setCountry} go={go} /></Page></>}</div></div>;
}