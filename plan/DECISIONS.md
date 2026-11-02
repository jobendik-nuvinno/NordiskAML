# Decisions

## D-001 — Simulert backend i nettleseren i stedet for .NET/Azure
Date: 2026-11-02 · Status: accepted · Slices: S01–S07

Spesifikasjonen (§08) velger .NET 10 / Azure, men oppgaven er en prototype på 90 minutter uten backend.
Vi bygger derfor `fakeServer.ts` med async-API, forsinkelse, feilbrytere, rollesjekk og revisjonslogg. Typene
følger datamodellen i §09/§10, slik at UI-et senere kan peke mot et ekte API uten omskriving.

## D-002 — Vite + React + TypeScript, uten UI-bibliotek
Date: 2026-11-02 · Status: accepted · Slices: S01

Valget samsvarer med §08 Brukerflate (React / TypeScript). Uten UI-bibliotek slipper vi oppsettstid. Det
visuelle språket fra `AML_prototype.html` gjenbrukes direkte. Vitest tester de rene regelfunksjonene.

## D-003 — Kun fiktive data og ingen simulerte myndighetskvitteringer
Date: 2026-11-02 · Status: accepted · Slices: S01–S07

Alle parter er oppdiktede («Eksempel»-navn, org.nr som starter på 1). Ingen ekte registeroppslag skjer.
§11 sier at en myndighetskvittering aldri skal simuleres, så FIU-rapportering og det skjermede
undersøkelsesrommet (INV) er utenfor prototypen. Det er i tråd med §07: «ikke simulert i demoen».

## D-004 — Tilgangskontroll håndheves i fakeServer, ikke bare i UI
Date: 2026-11-02 · Status: accepted · Slices: S01, S05

§08: «skjult UI er ikke tilgangskontroll». Hvert kall til fakeServer tar med aktiv rolle og avvises hvis
rollen ikke har lov. Dermed blir RSK-04 (ingen beslutning fra integrasjon/saksbehandler) demonstrerbart.

## D-005 — Omfang: M1 er ufravikelig, M2 kommer bare hvis tiden tillater det
Date: 2026-11-02 · Status: accepted · Slices: S06, S07

Funksjonsfrys ved 1:15. Er M1 ikke verifisert da, droppes S06/S07, og de siste 15 minuttene brukes på
feilretting og demo-øving. 65 av 84 krav er eksplisitt `deferred` i `requirements.json`.

## D-006 — Libans MagicPath-design er presentasjonskilden
Date: 2026-11-02 · Status: accepted · Slices: S11

Liban vil ha designet i MagicPath-prosjektet 467704730311876608. Vi bruker «AML Command Center» som
grunnlag, ordrett: Tailwind v4, tema, skall og alle 28 skjermene. Designets tre roller beholdes. Kunde
legges til som fjerde rolle, fordi spesifikasjonen krever en adskilt kundeportal. Innen «Bruker» velges en
funksjon (saksbehandler, godkjenner eller AML-ansvarlig), fordi beslutning og skjermet sone krever ulike
roller. Skjermer uten logikk (plattformdrift, tenantadministrasjon, transaksjoner G3, FIU-rapportering)
vises som Libans statiske design, merket «Designskisse». FIU-kvitteringer simuleres fortsatt ikke (D-003).
