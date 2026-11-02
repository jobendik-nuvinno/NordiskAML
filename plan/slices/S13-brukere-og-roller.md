---
id: S13
title: Brukere, roller og SSO – levende medlemsliste
milestone: M3
status: review
requirements: [R-056, R-060]
depends_on: [S11]
blocked_by: ""
---
## Goal
Bedriftsadministrator ser virksomhetens brukere med rolle, SSO/MFA-status og siste innlogging, kan invitere,
endre rolle og deaktivere. Deaktivering trekker tilgangen tilbake umiddelbart. Rollekombinasjoner som bryter
arbeidsdeling avvises, og administratoren kan ikke gi seg selv saksroller. Supporttilgang er tidsavgrenset.

## Acceptance
- [ ] Invitasjon, rolleendring og deaktivering logges med aktør og tidspunkt (SEC-02, SEC-06)
- [ ] Deaktivert bruker mister tilgang. Siste AML-ansvarlig kan ikke deaktiveres eller miste rollen
- [ ] Administrator kan ikke tildele seg selv saksbehandler-, godkjenner- eller AML-ansvarlig-rolle
- [ ] Tidsavgrenset supporttilgang må ha begrunnelse og utløper (SEC-02)
- [x] `plan/verify.sh --slice S13 -- npm run check` passerer på et rent tre

## Outcome
Brukere, roller og SSO er levende (membersServer.ts): inviter, endre rolle, deaktiver/reaktiver med logg. Administrator kan ikke gi seg selv saksroller (403), siste AML-ansvarlig er beskyttet (409), revisor kan ikke ha saksrolle (422), og supporttilgang er tidsavgrenset (maks 8 t) med begrunnelse. Bygget av bakgrunnsagent. Skjermbilde kontrollert med headless Chrome. Står i review til teamet har klikket gjennom.
