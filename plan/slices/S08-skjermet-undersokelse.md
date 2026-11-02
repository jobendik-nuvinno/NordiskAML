---
id: S08
title: Skjermet undersøkelse og ingen avsløring
milestone: M3
status: review
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
- [x] `plan/verify.sh --slice S08 -- npm run check` passerer på et rent tre

## Notes
- FIU-rapport og forsendelse er fortsatt utenfor (D-003). Avslutningen registrerer bare beslutningen om rapport, med navngitt ansvarlig.

## Outcome
Skjermet tjeneste (restrictedServer.ts) med eget lager, egen lagringsnøkkel og tilgangsgruppe. Andre roller får 404, som for en ressurs som ikke finnes. Melding fra sak eller fritt (TXN-01) gir bare «Mottatt». AT-07-testen sjekker at saker, logg, portal, partner-API og webhooks er byte-identiske før og etter melding. Bevis: plan/evidence/20261102T103235Z-38926f6-S08.json. Ikke manuelt klikket gjennom ennå, og står derfor i review.
