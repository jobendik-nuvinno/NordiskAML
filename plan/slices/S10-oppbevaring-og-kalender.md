---
id: S10
title: Oppbevaring, kontrollkalender og forsterkede tiltak
milestone: M3
status: planned
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
- [ ] `plan/verify.sh --slice S10 -- npm run check` passerer på et rent tre

## Outcome
