---
id: S09
title: Innsikt – automatiseringsmåling og ledelsesrapport
milestone: M3
status: review
requirements: [R-081, R-083]
depends_on: [S05]
blocked_by: ""
---
## Goal
En innsiktsside viser hvor stor andel av kontrollgrunnlagene som ble ferdigstilt maskinelt uten manuell
innhenting. Tallet vises med teller, nevner, frafall og utelatelser, og kan gjenskapes fra revisjonsloggen.
Ledelsesrapporten viser restanser, risikofordeling og kildekvalitet. Kommersiell administrator ser bare antall.

## Acceptance
- [ ] Andelen maskinelt ferdige grunnlag beregnes fra revisjonsloggen, med teller og nevner. Nevneren omfatter alle påbegynte saker, også avbrutte og ventende (UX-03)
- [ ] Menneskelige sluttgodkjenninger telles aldri som helautomatiske beslutninger (UX-03)
- [ ] Ledelsesrapporten viser restanser per status, risikofordeling og kildeutfall. En kommersiell visning viser bare antall kontroller, ikke kunder, treff eller rapportstatus (UX-05)
- [x] `plan/verify.sh --slice S09 -- npm run check` passerer på et rent tre

## Outcome
Innsiktsside med automatiseringsandel (teller/nevner, utelatelser, begrunnelse per sak fra loggen; automatiserte beslutninger alltid 0) og ledelsesrapport. Ny rolle Kundeadministrator ser bare antall kontroller. Bygget av bakgrunnsagent. Bevis: plan/evidence/20261102T103236Z-38926f6-S09.json. Ikke manuelt klikket gjennom ennå, og står derfor i review.
