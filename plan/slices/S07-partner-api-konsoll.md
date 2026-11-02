---
id: S07
title: Partner-API-konsoll mot simulert kontrakt (stretch)
milestone: M2
status: review
requirements: [R-062, R-063]
depends_on: [S02]
blocked_by: ""
---
## Goal
I rollen Partner kan man sende `POST /v1/checks` og `GET /v1/checks/{id}` mot en simulert implementasjon av
`AML_partner_API.yaml`. Konsollen viser idempotens, Problem-JSON og nøytral status, og en webhook-logg viser
signerte `check.status_updated`-hendelser.

Tidsramme: 1:15–1:22, som alternativ til S06.

## Acceptance
- [ ] Samme Idempotency-Key med samme innhold gir samme ID (202). Samme nøkkel med annet innhold gir 409 Problem (INT-02, AT-10)
- [ ] Ugyldig land/sektor (for eksempel FI) gir 422 Problem med correlationId. Nøkkel under 16 tegn gir 400
- [ ] GET returnerer bare `id`, `externalReference`, `status` (nøytral enum) og `updatedAt`, aldri sperrer eller score
- [ ] Webhook-loggen viser PublicEvent med `X-AML-Signature` = HMAC-SHA256 (Web Crypto) over «tid.body». Duplikat-eventId ignoreres (INT-03)
- [x] `plan/verify.sh --slice S07 -- npm run check` passerer på et rent tre

## Notes
- Saken som opprettes via API-et, havner i arbeidskøen som en vanlig kontroll. Det viser at partneren bruker samme kjerne.

## Outcome
Partner-API (idempotens, 409/422/400/404, nøytral GET, signerte webhooks med duplikatvern) levert av bakgrunnsagent og koblet inn i appen. Bevis: plan/evidence/20261102T102320Z-5446c07-S07.json.
Ikke manuelt klikket gjennom i nettleser ennå, og tastatur/skjermleser er ikke testet. Står derfor i review.
