---
contract: claudevision/1
name: Nordisk AML – fungerende prototype
milestones:
  - id: M1
    title: Første demonstrasjon (fra org.nr til etterprøvbar beslutning)
    goal: En saksbehandler starter en kontroll på organisasjonsnummer, ser eierskapsgrunnlaget, etterspør ett manglende vedlegg som kunden leverer i portalen, og en faglig godkjenner fatter en begrunnet beslutning hvis eksakte grunnlag kan åpnes igjen fra historikken.
  - id: M2
    title: Utvidelser hvis tiden strekker til
    goal: Navnelikhet/sanksjonstreff kan avklares, og partner-API-kontrakten kan prøves med idempotens og nøytral status.
---
Klikkbar, fungerende prototype av Nordisk AML Automation Platform, bygget på 90 minutter.
Historien følger spesifikasjonens «Første demonstrasjon» (§16) og designprøven i UX-kapittelet (§06 14/14):
registrer nytt oppdrag, avklar et åpent spørsmål og forklar en beslutning. Alle data er fiktive. Det finnes
ingen ekte backend. En simulert backend i nettleseren gir forsinkelse, feilmodus, rollekontroll og
revisjonslogg, slik at flyten oppfører seg som mot et ekte API.

**Arkitektur (prototype).** Vite + React + TypeScript, uten UI-bibliotek. Fargetokenene er gjenbrukt fra
`AML_prototype.html`.
- `src/domain/`: typer etter datamodellen i §09/§10 (Case, Party, OwnershipEdge, CheckRun, ScreeningHit,
  RiskAssessment, Decision, Evidence, AuditEvent, PolicyVersion) og rene regelfunksjoner (økonomisk andel,
  sirkeldeteksjon, sperrer før poengsum, risikobidrag). Regelfunksjonene enhetstestes med Vitest.
- `src/api/fakeServer.ts`: in-memory-lager speilet til `localStorage`, med forsinkelse på 300–800 ms,
  feilbrytere (for eksempel register-503), rollesjekk på serversiden og revisjonslogg med korrelasjons-ID.
  Knappen «Tilbakestill demo» laster seed-data på nytt.
- `src/api/partnerApi.ts` (M2) speiler `AML_partner_API.yaml`: createCheck/getCheck, Idempotency-Key og Problem-JSON.
- `src/ui/`: rollebytter (Saksbehandler · Faglig godkjenner · Kunde · Partner), Arbeidskø, Ny kontroll,
  Saksvisning (Kontroller · Eierskap · Risiko · Beslutning · Historikk) og Kundeportal.

**Demo-manus (M1).** (1) Saksbehandler åpner arbeidskøen. (2) Ny kontroll: org.nr 100 200 301
«Fjordlys Eksempel AS», NO, advokat, selskapsoverdragelse. Automatiske trinn går Avgrense → Innhente →
Kontrollere → Klargjøre. (3) Eierskap: 60 % × 60 % = 36 % for én person. Et utenlandsk ledd er uavklart og
sperrer klarsignal. (4) Saksbehandler etterspør eierdokumentasjon. (5) Rollen byttes til Kunde, som leverer et
simulert vedlegg med SHA-256 i beviskjeden. (6) Tilbake i saken er sperren løftet, og risikoprofilen viser bidrag.
(7) Faglig godkjenner fatter beslutningen med begrunnelse. (8) Historikken åpner det eksakte, låste
beslutningsgrunnlaget.
