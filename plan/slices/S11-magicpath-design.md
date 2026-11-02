---
id: S11
title: Libans MagicPath-design (AML Command Center) med levende data
milestone: M3
status: review
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
- [x] `plan/verify.sh --slice S11 -- npm run check` passerer på et rent tre

## Notes
- Designkilden ligger ordrett i `src/design/AMLCommandCenter.tsx`. Tema: `src/design/theme.css`, hentet med `magicpath-ai code context`.
- Rollemapping: Platform → partner (API-konsoll), Bedriftsadmin → admin, Bruker + funksjon → saksbehandler/godkjenner/hvitvaskingsansvarlig, Kunde → kunde.

## Outcome
Appen kjører i Libans AML Command Center-design (Tailwind v4, designkilden ordrett i src/design/). 17 skjermer er levende, og resten er Libans statiske design. Rollebytte, funksjon og testmiljøkontroller ligger i brukermenyen øverst til høyre. Prototypeinnslag er fjernet: skjermteller, skjermkart, forrige/neste og «Test»-etiketter. Aktørene er personer, ikke «Demo». Søk og toppnavigasjon fungerer. Tre skjermgrupper ble bygget parallelt av bakgrunnsagenter. Bevis: plan/evidence/20261102T104956Z-2ce2708-S11.json. Ikke visuelt kontrollert i nettleser av meg, og står derfor i review.
