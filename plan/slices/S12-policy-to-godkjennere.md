---
id: S12
title: Landpakker og policy – versjonering med to godkjennere
milestone: M3
status: review
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
- [x] `plan/verify.sh --slice S12 -- npm run check` passerer på et rent tre

## Outcome
Landpakker og policy er levende (policyServer.ts): versjonshistorikk, toperson-regel håndhevet i backend (samme person gir 409, og forsøket logges), oppslag på hvilken versjon som gjaldt en dato, tilbakeføring som ny versjon med samme godkjenningsløp, og 422 med logg ved forsøk på å slå av påkrevd tiltak. Plattformperson byttes i brukermenyen (Ingrid Solheim / Henrik Aas). Bygget av bakgrunnsagent. Skjermbilde kontrollert med headless Chrome. Står i review til teamet har klikket gjennom.
