# Vipps Donasjoner → gavehistorikk

Koblingen importerer **bekreftede innbetalinger**, både enkeltgaver og trekk fra faste donasjoner, fra Donasjoner 98843. Den starter eller endrer ingen betalinger. Eksisterende skolebetaling og faste betalingsavtaler fortsetter separat.

## Server

- Firebase-prosjekt: `his-kingdom-ministry`.
- Secret Manager: `VIPPS_DONATIONS_CLIENT_ID` og `VIPPS_DONATIONS_CLIENT_SECRET`. Verdiene skal aldri i kildekode, logger eller nettleser-JavaScript.
- `syncVippsDonations`: kjører hver time, med merchant-level autentisering mot Donations API. Importerer fra 1. oktober 2026 ved første kjøring. Dette er før godkjenningen oppgitt 30. oktober.
- `linkMyVippsDonations`: autentisert POST med Firebase ID-token. Tar ingen brukeridentitet fra request body.
- `schoolPaymentAccount`: den eksisterende private Community-gatewayen kobler også importerte gaver før gavehistorikken returneres.

## Identitet og personvern

Gaver matches mot telefonnummer i Firebase Authentication eller e-post som er bekreftet hos både Vipps og Firebase Authentication. Telefonnummer skrevet i et vanlig profilfelt er ikke tilstrekkelig. Ved motstridende identiteter kobles ingenting automatisk.

Kontaktdetaljer for matching lagres i serverkolleksjonen `vipps_donation_imports`, som dekkes av eksisterende default-deny-regler. Gavehistorikken inneholder ingen donor-e-post, slik at eldre e-postbaserte leseregler ikke gir tilgang til importerte gaver. Eierskap lagres som `userId`, og endres aldri automatisk til en annen bruker.

Gaver uten sikkert identitetstreff blir importert uten eier. De blir først synlige når verifisert identitet kan knyttes til en konto. Enkeltgaver uten verifisert Firebase-telefon kan derfor kreve identitetsavklaring. Ingen matching på navn.

## Formål

`externalReference=hkpc` gir `fund=hkpc`, og `hkm` gir `general`. Andre referanser går til `general` med mindre de er eksplisitt registrert i serverdokumentet `integration_state/vipps_donations.campaignFunds`. Referansen er sporing av kampanje, aldri bevis på brukeridentitet.

HKPCs eksisterende gaveoversikt viser bare gaver med `fund=hkpc`. Lenker/QR for skolen må derfor bruke `reference=hkpc`, eller en eksplisitt kampanjemapping. Dagens gaveknapper er ikke endret av denne leveransen.

## Import og drift

Hver transaksjon får en stabil dokument-ID basert på mottaker og transaksjonsreferanse. Overlappende rapporter og gjentatte kjøringer oppretter ikke nye gaver. Pagineringen bruker Vipps' originale tidsstempel, inklusive presisjon under millisekunder. Cursor flyttes bare når hele rapporten er behandlet. Rapporten avgrenses til `NO:98843` for å unngå dobbeltføring av eldre integrerte Vipps-betalinger.

Importen er betalingshistorikk. Den viser ikke sanntidsstatus for om en fast donasjonsavtale er stoppet eller pauset. Det krever en separat, signaturkontrollert webhook-integrasjon. Refusjoner/oppgjørsavstemming er ikke dekket av Donations-betalingsrapporten i denne leveransen.

## Publisering og kontroll

1. Kjør `node --test functions/vipps-donations.test.cjs functions/student-payment-account.test.cjs functions/vipps-recurring.test.cjs`.
2. Publiser bare `syncVippsDonations`, `linkMyVippsDonations` og `schoolPaymentAccount` til Firebase. Bruk prosjekt-ID eksplisitt.
3. Publiser frontendendringen i `minside/js/minside.js` gjennom nettstedets vanlige deployflyt.
4. Kjør scheduler-jobben manuelt første gang, eller vent på timeplanen. Kontroller kun antall og `integration_state/vipps_donations.lastSuccessAt`; ikke dump donorposter eller nøkler til logger.
5. Bekreft API-autentisering og faktisk `recipientHandle` med første serverkjøring. Avvik avvises i stedet for å importeres under feil mottaker.
6. Med en eksisterende bekreftet gave: kontroller riktig bruker, beløp, dato og HKPC-formål. Kjør importen igjen og kontroller at totalen ikke øker. Kontroller at en annen konto ikke ser gaven.

Ikke flytt gaveknappene eller avslutt gamle Vipps-avtaler før denne live-kontrollen er gjennomført. Ingen testbetaling skal utføres uten avtale med brukeren.

## Offisiell dokumentasjon

- https://developer.vippsmobilepay.com/docs/APIs/donations-api/quick-start/
- https://developer.vippsmobilepay.com/docs/APIs/donations-api/api-guide/
- https://developer.vippsmobilepay.com/docs/APIs/donations-api/donation-links-and-qr/
