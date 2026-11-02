---
id: S03
title: Eierskapsgrunnlag, kontrolltolkning og sperrer
milestone: M1
status: planned
requirements: [R-014, R-015, R-016, R-026]
depends_on: [S02]
blocked_by: ""
---
## Goal
Saksvisningen viser eierkjeden med andel per ledd og beregnet økonomisk andel per person. Uavklarte ledd
(utenlandsk ledd uten eiere, sirkel) oppdages og blir sperrer som stopper klarsignal uansett hvor lav
risikoscoren er. Saksbehandleren kan etterspørre det manglende vedlegget.

Tidsramme: 0:35–0:50.

## Acceptance
- [ ] Eierkjeden vises som innrykket liste med andel og kilde per forbindelse. Samme person gjennom to stier vises én gang med begge stier (UBO-02)
- [ ] 60 % × 60 % vises som 36 % økonomisk andel, med regelen som gjelder («NO-legal 1.0 demo: > 25 %») (UBO-03)
- [ ] Et utenlandsk ledd uten oppgitte eiere markeres «Uavklart» og etterspør dokumentasjon. Det blir ikke «ingen eier». A → B → A avsluttes som uavklart og henger ikke (UBO-04)
- [ ] Sperrer evalueres før poengsummen: lav score sammen med uavklart eier gir ikke «Klar for vurdering» (RSK-02)
- [ ] Knappen «Etterspør vedlegg» oppretter en kundeforespørsel og en hendelse i revisjonsloggen
- [ ] Enhetstester for økonomisk andel, sirkeldeteksjon og sperrerekkefølge
- [ ] `plan/verify.sh --slice S03 -- npm run check` passerer på et rent tre

## Notes
- Seed: Fjordlys Eksempel AS ← 60 % Nordkapp Holding Eksempel AS ← 60 % Kari Eksempel (36 %) og 40 % Ola Eksempel (24 %).
  De resterende 40 % eies av Baltic Invest Eksempel OÜ, der eiere mangler, og det leddet er uavklart.
- Grafen tegnes som en liste i stedet for SVG. Det sparer tid og gir et tekstalternativ (UX-02).

## Outcome
