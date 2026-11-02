---
id: S11
title: Libans MagicPath-design (AML Command Center) med levende data
milestone: M3
status: active
requirements: [R-079, R-080]
depends_on: [S10]
blocked_by: ""
---
## Goal
Appen ser ut som Libans MagicPath-prosjekt «Nordisk AML — Enterprise Compliance Workspace» (komponent AML
Command Center, revisjon 467717659161681920). Skall, rollekort, sidemeny og skjermer følger designet 1:1.
Skjermer vi har logikk for, drives av den simulerte backenden. Resten vises som Libans statiske design,
merket «Designskisse».

## Acceptance
- [ ] Skall, rollebytte og navigasjon er identisk med designet, utvidet med Kunde, funksjon og aktiv sak
- [ ] Brukerskjermene (S01–S15) som har logikk, viser levende data og handlinger fra fakeServer
- [ ] Plattform-API og ledelsesrapport bruker levende partner-API og innsikt
- [ ] Alle eksisterende tester er fortsatt grønne
- [ ] `plan/verify.sh --slice S11 -- npm run check` passerer på et rent tre

## Notes
- Designkilden ligger ordrett i `src/design/AMLCommandCenter.tsx`. Tema: `src/design/theme.css`, hentet med `magicpath-ai code context`.
- Rollemapping: Platform → partner (API-konsoll), Bedriftsadmin → admin, Bruker + funksjon → saksbehandler/godkjenner/hvitvaskingsansvarlig, Kunde → kunde.

## Outcome
