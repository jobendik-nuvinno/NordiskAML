---
updated: 2026-11-02T10:33:00Z
next:
  - "Klikk gjennom demo-manuset i PROJECT.md på http://localhost:5180 (npm run dev). Flytt skiver fra review til done når de er bekreftet."
  - "Test kjerneflyten med bare tastatur (UX-02)"
waiting_on:
  - "Manuell gjennomklikking i nettleser av teamet (S01–S10 står i review)"
blockers: []
---
Alle ti skivene er bygget. Hele suiten (`plan/verify.sh -- npm run check`: typesjekk + 43 tester, inkludert
en røyktest som rendrer hele hovedløpet) passerer på et rent tre. Ingen skive er satt til done, fordi
UI-et ikke er klikket gjennom i en nettleser.

S07 og S09 ble bygget av bakgrunnsagenter i egne worktrees og flettet inn i main.
Nye roller: Hvitvaskingsansvarlig (skjermet arbeidsrom og innsikt) og Kundeadministrator (bare forbruk).
Lagringsnøkkelen er v2, så gamle nettleserdata ignoreres automatisk.

Demo-tips: «Tilbakestill demo» øverst laster seed-dataene på nytt. Partner-API-tilstanden
(idempotensnøkler, webhook-logg) ligger bare i minnet og tømmes ved omlasting.

Bevisste utelatelser: FIU-rapportering og skjermet undersøkelse (D-003). 65 krav er deferred.
