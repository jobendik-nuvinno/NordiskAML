# Nordisk AML – fungerende prototype

Klikkbar, fungerende prototype av **Nordisk AML Automation Platform**, en plattform mot hvitvasking og
terrorfinansiering for nordiske rapporteringspliktige. Grunnlaget er kravspesifikasjonen
(`Nordisk_AML_kravspesifikasjon_v1.docx`), kravregisteret (`AML_kravregister.xlsx`) og partnerkontrakten
(`AML_partner_API.yaml`). Det visuelle uttrykket er hentet fra MagicPath-designet *AML Command Center*.

> Alle foretak, personer, lister og registersvar er fiktive testdata. Ingen data forlater nettleseren.

## Kom i gang

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typesjekk + alle tester
npm run build      # produksjonsbygg i dist/
```

Rolle, funksjon og testmiljøkontroller (kildeutfall, tilbakestilling) ligger i brukermenyen øverst til høyre.
Hver side har en egen URL, for eksempel `#/arbeidsflate/godkjenner/decision/SAK-1002`.
Demomanus: [docs/DEMO.md](docs/DEMO.md).

## Hva prototypen viser

- **Kundekontroll fra organisasjonsnummer:** oppdragsavgrensning, registeroppslag, eiergraf med økonomisk andel, uavklarte ledd og sirkler, kundeportal med beviskjede.
- **Screening:** PEP og sanksjoner med feltvis samsvar, tidsavgrenset avklaring av falske treff og hastekanal for sanksjoner.
- **Beslutning:** sperrer vurderes før poengsum. Bare et menneske beslutter, grunnlaget låses med SHA-256, beslutninger kan overprøves med nye versjoner, og oppbevaring og neste kontroll beregnes.
- **Taushet:** skjermet undersøkelse i eget lager. Saken, portalen, partner-API-et og loggen avslører ingenting.
- **Styring:** versjonerte landpakker med to godkjennere, roller og arbeidsdeling, tidsavgrenset supporttilgang, automatiseringsmåling og ledelsesrapport.
- **Integrasjon:** simulert partner-API etter OpenAPI-kontrakten, med idempotens, Problem-JSON og HMAC-signerte webhooks.

Bevisst utenfor: innsending til FIU (en myndighetskvittering skal aldri simuleres), ekte registre og eID,
og transaksjonspakken (G3). Disse skjermene vises som designskisse.

## Arkitektur

| Mappe | Innhold |
|---|---|
| `src/domain/` | Typer etter datamodellen i §09/§10 og rene regelfunksjoner (eierskap, sperrer, risiko, oppbevaring, måling) |
| `src/api/` | Simulert backend: `fakeServer` (saker), `restrictedServer` (skjermet sone), `policyServer`, `membersServer`, `partnerApi`. Forsinkelse, rollekontroll i backend, revisjonslogg og localStorage |
| `src/app/` | Skall, ruting og levende skjermer i MagicPath-designet |
| `src/design/` | MagicPath-kilden ordrett (*AML Command Center*) og temaet |
| `plan/` | Sporbar plan: krav (R-001–R-084), skiver, beslutninger og testbevis |

Teknologi: Vite, React 19, TypeScript, Tailwind CSS v4 og Vitest. Spesifikasjonens målarkitektur
(.NET 10, Azure) er erstattet av en simulert backend i nettleseren (se `plan/DECISIONS.md`, D-001). Typene
følger datamodellen, slik at UI-et kan kobles mot et ekte API.

## Sporbarhet

`plan/requirements.json` inneholder alle 84 krav fra kravregisteret, merket som dekket (`must`/`should`) eller
utsatt. Hver skive i `plan/slices/` viser hvilke krav den dekker, og `plan/evidence/` inneholder testkjøringer
tatt opp av `plan/verify.sh` på et rent Git-tre.
