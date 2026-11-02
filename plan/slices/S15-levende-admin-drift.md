---
id: S15
title: Levende virksomhetsoversikt, datakilder og driftsinnsikt
milestone: M3
status: active
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
- [ ] `plan/verify.sh --slice S15 -- npm run check` passerer på et rent tre

## Outcome
