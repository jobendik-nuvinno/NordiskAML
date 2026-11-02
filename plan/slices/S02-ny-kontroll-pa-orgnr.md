---
id: S02
title: Ny kontroll på organisasjonsnummer med automatiske trinn
milestone: M1
status: planned
requirements: [R-002, R-013, R-033, R-084]
depends_on: [S01]
blocked_by: ""
---
## Goal
Saksbehandleren registrerer et oppdrag (org.nr, land, sektor, tjeneste). Plattformen kjører de automatiske
trinnene Avgrense → Innhente → Kontrollere → Klargjøre med synlig fremdrift. Et simulert registeroppslag
returnerer normaliserte selskapsdata med kilde og oppslagsdato. Ved kildeutfall går saken til ventestatus
i stedet for «klar».

Tidsramme: 0:20–0:35.

## Acceptance
- [ ] Omfangsvurderingen lagres med land, sektor, tjeneste, «omfattet ja/nei/uklart», hjemmel-tekst og ansvarlig. «Uklart» rutes til fagansvarlig (GOV-02)
- [ ] Registeroppslaget viser juridisk navn, org.nr, selskapsform, status, roller, kilde («Simulert register») og oppslagstidspunkt (UBO-01)
- [ ] Bryteren «Simuler kildeutfall (503)» gir saken status «Venter på kilde». Når kilden er tilbake, fortsetter saken uten at en ny kontroll opprettes (MON-03)
- [ ] Finland og Island kan ikke velges i landvelgeren («ikke godkjent landpakke») (UX-06)
- [ ] Den nye saken dukker opp i arbeidskøen
- [ ] `plan/verify.sh --slice S02 -- npm run check` passerer på et rent tre

## Notes
- Trinnene drives av timere i fakeServer, og UI-et abonnerer via en enkel event-emitter (useSyncExternalStore).
- Ukjent org.nr gir «Ikke funnet i simulert register», ikke en tom suksess.

## Outcome
