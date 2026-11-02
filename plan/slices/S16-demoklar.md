---
id: S16
title: Demoklar: rikere testdata, fokus, README og demomanus
milestone: M3
status: review
requirements: [R-080]
depends_on: [S13]
blocked_by: ""
---
## Goal
Testmiljøet har saker i alle tilstander (også besluttede med planlagt og forfalt kontroll). Tastaturfokus er tydelig. README og demomanus gjør prototypen lett å presentere og forstå.

## Acceptance
- [ ] Arbeidskø, oppfølging og historikk har innhold uten forarbeid
- [ ] Synlig fokusmarkering på alle interaktive elementer
- [ ] README.md og docs/DEMO.md finnes
- [x] `plan/verify.sh --slice S16 -- npm run check` passerer på et rent tre

## Outcome
Testmiljøet har sju saker i alle tilstander, med konsistent historikk via klokkeforskyvning under seeding (Lyngheia forfalt, Bryggen planlagt, Norrsken venter på kunde). Synlig tastaturfokus, README.md og docs/DEMO.md er på plass. Skjermbilder av oppfølging kontrollert. Står i review til teamet har klikket gjennom.
