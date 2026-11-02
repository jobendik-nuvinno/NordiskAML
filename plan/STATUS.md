---
updated: 2026-11-02T10:26:00Z
next:
  - "Klikk gjennom demo-manuset i PROJECT.md på http://localhost:5180 (npm run dev). Flytt skiver fra review til done når de er bekreftet."
  - "Test kjerneflyten med bare tastatur (UX-02)"
waiting_on:
  - "Manuell gjennomklikking i nettleser av teamet (S01–S07 står i review)"
blockers: []
---
Alle sju skivene er bygget. Hele suiten (`plan/verify.sh -- npm run check`: typesjekk + 30 tester, inkludert
en røyktest som rendrer hele hovedløpet) passerer på et rent tre. Ingen skive er satt til done, fordi
UI-et ikke er klikket gjennom i en nettleser.

S07 ble bygget av en bakgrunnsagent i en egen worktree og flettet inn i main.

Demo-tips: «Tilbakestill demo» øverst laster seed-dataene på nytt. Gammel localStorage fra en tidligere
versjon kan mangle Havbris-saken, så trykk Tilbakestill ved første åpning. Partner-API-tilstanden
(idempotensnøkler, webhook-logg) ligger bare i minnet og tømmes ved omlasting.

Bevisste utelatelser: FIU-rapportering og skjermet undersøkelse (D-003). 65 krav er deferred.
