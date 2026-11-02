# Demomanus – Nordisk AML

Varighet: 10–12 minutter for hele løpet, 5 minutter for kortversjonen (steg 1–6).
Rolle og funksjon byttes i **brukermenyen øverst til høyre**. Der ligger også **Testmiljø** med
«Simuler at registerkilden er nede» og «Tilbakestill testdata».

**Før du starter:** `npm run dev`, åpne http://localhost:5173 og velg **Tilbakestill testdata** i brukermenyen.
Alle foretak, personer og lister er fiktive testdata.

## Kortversjonen: fra organisasjonsnummer til etterprøvbar beslutning

| # | Hvor / som hvem | Gjør dette | Si dette | Krav |
|---|---|---|---|---|
| 1 | AML-arbeidsflate · Nora Berg (saksbehandler) | Vis **Arbeidskø**. Pek på HASTER-saken og kolonnen «Hvem må handle». Søk «Kyst» i søkefeltet. | Køen svarer på hva som mangler, hvem som må handle og når fristen er. Systemfeil skilles fra kundeforhold. | UX-01 |
| 2 | Ny kontroll | Org.nr **100 200 301**, Norge, Advokat, Selskapsoverdragelse → **Start kontroll**. Følg de fire trinnene. Finland og Island kan ikke velges. | Plattformen avgrenser, innhenter, kontrollerer og klargjør. Oppdraget lagres med hjemmel og ansvarlig. | GOV-02, UBO-01, UX-06 |
| 3 | Saksoversikt → Eierskap og kontroll | Vis treet: 60 % × 60 % = **36 %**. Baltic Invest er uavklart → **Be om dokumentasjon**. | Tomme registerdata betyr ikke «ingen eier». En lav score kan aldri oppheve en sperre. | UBO-02/03/04, RSK-02 |
| 4 | Brukermeny → **Kundeportal** (Kari Lund) | Vis den nøytrale forespørselen → **Send uten vedlegg** (eller velg en fil). | Kunden ser bare hva som trengs, aldri score, treff eller sperrer. Leveransen lagres med SHA-256. | KYC-06, PRV-02 |
| 5 | Tilbake til AML-arbeidsflaten → Risiko og tiltak | Sperren er løftet. Vis faktorer, bidrag og terskler. | Risikoprofilen er forklarbar og kan gjenskapes. Sperrer vurderes før poengsummen. | RSK-01 |
| 6 | Funksjon → **Jonas Eide** (godkjenner) → Beslutning | Velg utfall, skriv begrunnelse → **Fatt beslutning**. Vis versjon, oppbevaring (10 år) og neste kontroll. **Sakshistorikk** → **Oppdater registerdata** → åpne det låste grunnlaget. | Bare et menneske beslutter. Grunnlaget låses med hash og endres ikke når registeret endres senere. | RSK-04, PRV-02, PRV-03, MON-01 |

## Utvidelser (velg etter tid og publikum)

| # | Tema | Gjør dette | Krav |
|---|---|---|---|
| 7 | Overprøving | På den besluttede saken: **Overprøv beslutning** med begrunnelse → fatt ny beslutning. Versjon 1 kan fortsatt åpnes uendret. | RSK-06 |
| 8 | Screening | Åpne **Havbris Eksempel AS** → Screening. Navnelikhet med manglende fødselsår, og sanksjonstreff i hastekanal. Avklar som falskt treff med utløpsdato → **Registrer ny fødselsdato** åpner treffet igjen. | SCR-02/04/05 |
| 9 | Kildeutfall | Testmiljø → «Simuler at registerkilden er nede». Start en ny kontroll: «Venter på kilde», ikke grønt. Slå av igjen: saken fortsetter uten duplikat. Vis **Driftsinnsikt** under Plattformadministrasjon. | MON-03, MON-06 |
| 10 | Skjermet undersøkelse | Som Nora: **Meld intern bekymring** på en sak → kvitteringen sier bare «Mottatt». Bytt til **Marius A. Viken** → Skjermet undersøkelse. Saken, portalen og partner-API-et viser ingenting. | INV-01, INV-03, AT-07 |
| 11 | Løpende oppfølging | **Lyngheia Eksempel AS** har forfalt kontroll. Passert dato betyr forfalt, ikke fornyet. | MON-01 |
| 12 | Regelsett | Plattformadministrasjon → **Landpakker og policy**. Godkjenn SE v1.2 som Ingrid. Foreslå en ny versjon og prøv å godkjenne den selv → avvist. Bytt til Henrik Aas. Vis «Hvilken versjon gjaldt?». | GOV-03, GOV-04 |
| 13 | Partner-API | **Integrasjoner og partner-API**: send samme POST to ganger (samme ID), endre innhold med samme nøkkel (409), prøv FI (422). Vis signerte webhooks. | INT-02, INT-03 |
| 14 | Tilgang | Bedriftsadministrasjon → **Brukere, roller og SSO**: «Verifiser arbeidsdeling» (admin kan ikke gi seg selv saksroller). Gi tidsavgrenset supporttilgang. | SEC-02, SEC-06 |
| 15 | Innsikt | Som Marius → **Innsikt og automatisering**: teller/nevner, og hvorfor hver sak telles eller ikke. Som bedriftsadmin → **Revisjon og ledelsesrapport**: bare antall. | UX-03, UX-05 |

## Hvis du får spørsmål

- **Er dette ekte data?** Nei. Alle foretak, personer og lister er fiktive. Kilder er merket «(testdata)».
- **Hvorfor sendes ingenting til FIU?** Spesifikasjonen sier at en myndighetskvittering aldri skal simuleres. Rapporteringsskjermen viser arbeidsflyten, men selve innsendingen skjer via godkjent kanal.
- **Hvor er backend?** Prototypen har en simulert backend i nettleseren med forsinkelse, feilmodus, rollekontroll og revisjonslogg. Datamodellen følger spesifikasjonens §09/§10, slik at UI-et kan kobles til et ekte .NET-API.
- **Hva er dekket av kravene?** Se `plan/requirements.json` og `plan/slices/`. Hver skive viser hvilke krav den dekker og hvilken testkjøring som beviser det.
