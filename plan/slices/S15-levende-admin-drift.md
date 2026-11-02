---
id: S15
title: Levende virksomhetsoversikt, datakilder og driftsinnsikt
milestone: M3
status: review
requirements: [R-036, R-064, R-073]
depends_on: [S13]
blocked_by: ""
---
## Goal
Virksomhetsoversikt, Datakilder og rettigheter og Driftsinnsikt bruker levende data: restanser, kildestatus (påvirkes av kildeutfall), dekning og tid siden siste vellykkede oppslag, partnerhendelser og tekniske helsetall uten kundedata.

## Acceptance
- [ ] Kildeutfall i testmiljøet vises i alle tre skjermene
- [ ] Driftsinnsikt viser bare tekniske tall, ingen kundenavn (SEC-02)
- [ ] Datakilder viser rett til oppslag per kilde og formål (INT-04)
- [x] `plan/verify.sh --slice S15 -- npm run check` passerer på et rent tre

## Outcome
Virksomhetsoversikt, Datakilder og rettigheter og Driftsinnsikt bruker levende data via felles kildehelse (sourceHealth.ts). Tom eller delvis feed er aldri grønn, manglende telemetri flagges, og drift viser ingen kundedata. Bygget av bakgrunnsagent. Skjermbilde av Driftsinnsikt kontrollert. Står i review til teamet har klikket gjennom.
