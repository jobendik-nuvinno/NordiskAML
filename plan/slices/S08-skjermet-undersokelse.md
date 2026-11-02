---
id: S08
title: Skjermet undersøkelse og ingen avsløring
milestone: M3
status: active
requirements: [R-043, R-045, R-037]
depends_on: [S05]
blocked_by: ""
---
## Goal
En ny rolle, Hvitvaskingsansvarlig, har et eget skjermet arbeidsrom. Hvem som helst internt kan melde en
intern bekymring eller manuell observasjon (TXN-01) på en sak, uten kontonummer eller ferdig KYC. Etter
innsending ser melderen bare «Mottatt». Undersøkelsen har eier, prioritet, faktisk funn, hypotese,
tidslinje, kilder og frist, og avslutning krever en selvstendig konklusjon.

## Acceptance
- [ ] Undersøkelser lagres i et eget skjermet lager, ikke på saken. Bare Hvitvaskingsansvarlig kan lese eller endre dem (INV-03)
- [ ] Saksvisningen, saksloggen, arbeidskøen, kundeportalen og partner-API-et røper verken at en undersøkelse finnes eller hvilken status den har (AT-07, negativ test)
- [ ] Undersøkelsen har eier, prioritet, funn, hypotese, tidslinje og frist. Den kan samle flere signaler, og avslutning krever konklusjon (INV-01)
- [ ] En manuell observasjon kan registreres uten kontonummer og uten ferdig KYC-profil (TXN-01)
- [ ] `plan/verify.sh --slice S08 -- npm run check` passerer på et rent tre

## Notes
- FIU-rapport og forsendelse er fortsatt utenfor (D-003). Avslutningen registrerer bare beslutningen om rapport, med navngitt ansvarlig.

## Outcome
