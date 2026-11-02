---
id: S12
title: Landpakker og policy – versjonering med to godkjennere
milestone: M3
status: active
requirements: [R-004, R-003]
depends_on: [S11]
blocked_by: ""
---
## Goal
Plattformadministrator ser versjonerte landpakker (NO, SE, DK) med virkedato, kilde og eier. En ny versjon
foreslås av én person og må godkjennes av en annen. Samme person kan ikke både foreslå og sluttgodkjenne.
Publisert versjon er låst, og man kan gå tilbake til en tidligere gyldig versjon. En tilbakedatert test bruker
versjonen som gjaldt på den datoen. Et forsøk på å slå av et påkrevd tiltak avvises og logges.

## Acceptance
- [ ] Foreslå → godkjenn → publiser, med to ulike personer. Samme person avvises av backend (GOV-04)
- [ ] «Hvilken versjon gjaldt den <dato>?» gir datidens versjon (GOV-04)
- [ ] Tilbakeføring lager en ny publisering som peker til den gamle versjonen, uten å slette historikk (GOV-04)
- [ ] Forsøk på å slå av et obligatorisk tiltak avvises og logges (GOV-03)
- [ ] `plan/verify.sh --slice S12 -- npm run check` passerer på et rent tre

## Outcome
