---
id: S05
title: Forklarbar risiko, menneskelig beslutning og låst beslutningsgrunnlag
milestone: M1
status: review
requirements: [R-025, R-026, R-028, R-050]
depends_on: [S04]
blocked_by: ""
---
## Goal
Saken viser en forklarbar risikoprofil. En faglig godkjenner fatter en begrunnet beslutning. Beslutningen
låser et øyeblikksbilde av hele grunnlaget med hash, og dette grunnlaget kan åpnes igjen fra historikken
uendret, også etter at saken senere endres.

Tidsramme: 1:00–1:15.

## Acceptance
- [ ] Risikoprofilen viser faktorer (kunde, produkt, kanal, land, forventet bruk) med kilde, bidrag, terskel og regelversjon. Samme input gir samme resultat (RSK-01)
- [ ] Beslutningsknappen er deaktivert, og fakeServer avviser beslutningen, så lenge en sperre er åpen (RSK-02)
- [ ] Bare rollen Faglig godkjenner kan beslutte. Saksbehandler og Partner får avslag fra fakeServer. Begrunnelse er påkrevd, og avvik fra anbefalingen krever begrunnelse (RSK-04)
- [ ] Beslutningen lagrer et dypt kopiert øyeblikksbilde av grunnlaget med SHA-256 og en peker til vurderingsversjonen (PRV-02)
- [ ] Historikken viser hendelser med tid, aktør og korrelasjons-ID. Klikk på «Beslutning fattet» åpner det låste grunnlaget skrivebeskyttet, og en senere endring i saken endrer det ikke
- [x] `plan/verify.sh --slice S05 -- npm run check` passerer på et rent tre

## Notes
- Teksten skiller tydelig mellom «Klar for vurdering» (maskinelt ferdig grunnlag) og «Beslutning fattet» (UX-04-hensynet).

## Outcome
Risikoprofil, beslutning (bare godkjenner, med påkrevd begrunnelse) og låst grunnlag som ikke endres av senere registerendring levert. Testet i fakeServer.test.ts og smoke.test.tsx. Bevis: plan/evidence/20261102T102320Z-5446c07-S05.json.
Ikke manuelt klikket gjennom i nettleser ennå, og tastatur/skjermleser er ikke testet. Står derfor i review.
