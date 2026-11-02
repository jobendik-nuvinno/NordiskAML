---
id: S10
title: Oppbevaring, kontrollkalender og forsterkede tiltak
milestone: M3
status: review
requirements: [R-051, R-031, R-027]
depends_on: [S05]
blocked_by: ""
---
## Goal
Hver beslutning får en beregnet oppbevaringsfrist med hjemmel: NO-pakken gir 5 år, eller 10 år ved
forsterkede tiltak. Neste kontrolldato beregnes fra risiko, og en passert dato vises som forfalt. Ved
forsterkede tiltak må hvert obligatoriske tiltak besvares enkeltvis før beslutning.

## Acceptance
- [ ] To norske saker, en med ordinære og en med forsterkede tiltak, får ulike oppbevaringsfrister med hjemmel (PRV-03)
- [ ] Neste kontroll beregnes fra risiko. Passert dato gir status «Forfalt», ikke «Fornyet» (MON-01)
- [ ] Ubesvart obligatorisk tiltak kan ikke kvitteres ut med en samlet kommentar (RSK-03)
- [x] `plan/verify.sh --slice S10 -- npm run check` passerer på et rent tre

## Outcome
Oppbevaringsfrist med hjemmel (NO 5/10 år, SE/DK 5 år), neste kontroll fra risiko med forfalt-status og enkeltvis besvarte obligatoriske tiltak ved bekreftet PEP. Bevis: plan/evidence/20261102T103237Z-38926f6-S10.json. Ikke manuelt klikket gjennom ennå, og står derfor i review.
