---
id: S06
title: Screening – navnelikhet og sanksjonsalarm (stretch)
milestone: M2
status: review
requirements: [R-020, R-022, R-023]
depends_on: [S05]
blocked_by: ""
---
## Goal
Screeningresultater vises med feltvis samsvar. Et navnelikt treff kan avklares som falskt treff med
begrunnelse og utløpsdato. Et potensielt sanksjonstreff i en egen seed-sak gir en hasteoppgave øverst i køen
og en sperre som ikke kan overstyres.

Tidsramme: 1:15–1:22, men bare hvis M1 er ferdig og verifisert.

## Acceptance
- [ ] Treffvisningen viser samsvar og avvik per felt (navn, fødselsdato, land) og matchmetode (SCR-02)
- [ ] Et sanksjonstreff oppretter en hasteoppgave og sperrer klarsignal. Fristen påvirkes ikke av sorteringen i vanlig kø (SCR-04)
- [ ] Avklaring av et falskt treff krever begrunnelse og utløpsdato. Et nytt identitetsfelt åpner treffet igjen (SCR-05)
- [x] `plan/verify.sh --slice S06 -- npm run check` passerer på et rent tre

## Notes

## Outcome
Seed-saken Havbris Eksempel AS har et navnelikt PEP-treff (fødselsår mangler) og et potensielt sanksjonstreff, som gir hasteoppgave og sperre. Falskt treff krever begrunnelse og utløpsdato, og en ny fødselsdato åpner treffet igjen. Et bekreftet sanksjonstreff blokkerer beslutning. Testet i fakeServer.test.ts. Bevis: plan/evidence/20261102T102503Z-49a150d-S06.json. Ikke manuelt klikket gjennom ennå, og står derfor i review.
