---
updated: 2026-11-02T10:50:00Z
next:
  - "Klikk gjennom demo-manuset i PROJECT.md på http://localhost:5180 (npm run dev). Flytt skiver fra review til done når de er bekreftet."
  - "Test kjerneflyten med bare tastatur (UX-02)"
waiting_on:
  - "Manuell gjennomklikking i nettleser av teamet (S01–S11 står i review)"
blockers: []
---
Alle elleve skivene er bygget. UI-et er byttet til Libans MagicPath-design (S11, D-006), og den gamle src/ui/ er fjernet. Hele suiten (`plan/verify.sh -- npm run check`: typesjekk + 56 tester, inkludert
en røyktest som rendrer hele hovedløpet) passerer på et rent tre. Ingen skive er satt til done, fordi
UI-et ikke er klikket gjennom i en nettleser.

S07 og S09 ble bygget av bakgrunnsagenter i egne worktrees og flettet inn i main.
Rolle og funksjon velges i brukermenyen øverst til høyre. Personer: Nora Berg (saksbehandler), Jonas Eide (godkjenner), Marius A. Viken (AML-ansvarlig), Erik Dahl (bedriftsadmin).
Lagringsnøkkelen er v2, så gamle nettleserdata ignoreres automatisk.

Demo-tips: «Tilbakestill testdata» i brukermenyen laster seed-dataene på nytt. Partner-API-tilstanden
(idempotensnøkler, webhook-logg) ligger bare i minnet og tømmes ved omlasting.

Bevisste utelatelser: FIU-rapportering og skjermet undersøkelse (D-003). 65 krav er deferred.
