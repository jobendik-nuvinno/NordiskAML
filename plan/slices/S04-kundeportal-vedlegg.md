---
id: S04
title: Kundeportal – lever etterspurt vedlegg
milestone: M1
status: planned
requirements: [R-012, R-050]
depends_on: [S03]
blocked_by: ""
---
## Goal
I rollen Kunde ser brukeren bare hva som skal leveres, forklart i nøytral tekst. Kunden kan lagre et utkast
og levere et (lokalt valgt eller simulert) dokument. Leveransen registreres som bevis med SHA-256, oppdaterer
eierskapet og løfter sperren i saksbehandlerens visning.

Tidsramme: 0:50–1:00.

## Acceptance
- [ ] Portalen viser kun den åpne forespørselen, uten intern score, treff, sperregrunn eller saksstatus (KYC-06)
- [ ] Et påbegynt svar kan lagres som utkast og gjenopptas etter at siden er lastet på nytt (KYC-06)
- [ ] Leveransen lagrer et bevisinnslag med filnavn, SHA-256 (Web Crypto), mottakstid, kilde og versjon (PRV-02)
- [ ] Etter leveransen blir det uavklarte leddet «Dokumentert», og sperren forsvinner hos saksbehandler
- [ ] `plan/verify.sh --slice S04 -- npm run check` passerer på et rent tre

## Notes
- Filen leses bare lokalt for å beregne hashen, og ingenting sendes. Uten fil brukes knappen «Send eksempeldokument».

## Outcome
