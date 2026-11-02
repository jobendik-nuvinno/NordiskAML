---
updated: 2026-11-02T11:30:00Z
next:
  - "Oppstart (0:00–0:05): git init, Vite React-TS-skjelett, npm install, commit plan"
  - "S01 skjelett, simulert backend og arbeidskø"
waiting_on:
  - "Teamets godkjenning av plan og omfang (M1 obligatorisk, S06/S07 stretch)"
  - "Antall personer i teamet: avgjør om S03 og S04 bygges parallelt etter S02"
blockers: []
---
Planen er laget, men ingen kode er skrevet ennå. Mappen er ikke et Git-repo. `plan/verify.sh` krever Git,
så første steg er `git init` og en commit `plan: initial plan from specification`.

Kildefiler: `Nordisk_AML_kravspesifikasjon_v1.docx`/`.pdf` (samme innhold), `AML_kravregister.xlsx`
(84 krav, 14 testløp), `AML_partner_API.yaml` (OpenAPI 3.1, 4 operasjoner og 1 webhook) og
`AML_prototype.html` (statisk skisse med fire visninger, som vi bygger videre på visuelt).

Verifikasjonskommando for alle skiver: `npm run check` (= `tsc -b && vitest run`).
Funksjonsfrys ved 1:15. Deretter følger en kjøring av hele suiten (`plan/verify.sh -- npm run check`) og demo-øving.
