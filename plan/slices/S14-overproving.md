---
id: S14
title: Overprøving av beslutning
milestone: M3
status: review
requirements: [R-030]
depends_on: [S13]
blocked_by: ""
---
## Goal
Godkjenner eller AML-ansvarlig kan overprøve en fattet beslutning med begrunnelse. Det gir et nytt beslutningsgrunnlag og en ny beslutningsversjon. Den gamle versjonen og dens låste grunnlag er uendret og kan fortsatt åpnes.

## Acceptance
- [ ] Overprøving krever begrunnelse og riktig rolle (backend)
- [ ] Ny versjon lages; gammel beslutning og hash er uendret
- [ ] Historikken viser alle versjoner, og hver kan åpnes
- [x] `plan/verify.sh --slice S14 -- npm run check` passerer på et rent tre

## Outcome
Overprøving med begrunnelse (godkjenner/AML-ansvarlig, 403 for andre). Tidligere versjoner med snapshot og SHA-256 er uendret og kan åpnes. Ny versjon fattes etter nytt grunnlag, og oppbevaring og neste kontroll følger aktiv versjon. Bygget av bakgrunnsagent. Står i review til teamet har klikket gjennom.
