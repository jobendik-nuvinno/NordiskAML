---
id: S01
title: Skjelett, simulert backend og arbeidskø
milestone: M1
status: review
requirements: [R-079, R-080]
depends_on: []
blocked_by: ""
---
## Goal
Appen starter med `npm run dev`. En rollebytter, den simulerte backenden (med seed-data, forsinkelse,
localStorage og «Tilbakestill demo») og en arbeidskø som prioriterer saker etter hastegrad, frist, eier og
årsak er på plass. Køen kan filtreres, og en sak kan åpnes.

Tidsramme: 0:05–0:20.

## Acceptance
- [ ] Arbeidskøen viser seed-sakene (Kystlinje, Sund, Eng og flere) sortert etter hastegrad/frist, med årsak, eier og neste handling (UX-01)
- [ ] Systemfeil («Venter på kilde») skilles visuelt og tekstlig fra kundeforhold (UX-01)
- [ ] Kjerneflyten kan gjennomføres med tastatur. Status vises med tekst, ikke bare farge, og skjemafelt har labels (UX-02)
- [ ] Rollebytte endrer hva som vises, og fakeServer avviser kall rollen ikke har lov til (403-lignende feil)
- [x] `plan/verify.sh --slice S01 -- npm run check` passerer på et rent tre

## Notes
- `npm run check` = `tsc -b && vitest run`. Testene dekker kø-sortering og rollesjekk i fakeServer.
- CSS-tokenene kopieres fra `AML_prototype.html` (--ink, --teal, --line, --pale, --bg).
- Seed-data er fiktive. Org.nr starter med 1, slik at de aldri kolliderer med ekte norske org.nr (8xx/9xx).

## Outcome
Arbeidskø, rollebytter og simulert backend levert. Rollesjekk og kø-sortering er enhetstestet; visningene rendres i røyktest. Bevis: plan/evidence/20261102T102317Z-5446c07-S01.json.
Ikke manuelt klikket gjennom i nettleser ennå, og tastatur/skjermleser er ikke testet. Står derfor i review.
