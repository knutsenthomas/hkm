# Planning Center Integration

Denne integrasjonen henter arrangementer fra Planning Center via Firebase Functions, slik at hemmeligheter aldri ligger i frontend-koden.

## Støttede oppsett

- En menighet / én konto: bruk `Personal Access Token`
- Flere menigheter / tredjepartsløsning: bruk `OAuth`

Per nå er backend-koden satt opp for server-side legitimasjon via miljøvariabler. Den enkleste veien er derfor `Personal Access Token`.

## Miljøvariabler

Sett disse i Functions-miljøet ditt:

```bash
PLANNING_CENTER_CLIENT_ID=...
PLANNING_CENTER_SECRET=...
```

Valgfritt, dersom du bruker OAuth og allerede håndterer tokenfornyelse utenfor denne koden:

```bash
PLANNING_CENTER_ACCESS_TOKEN=...
```

Hvis `PLANNING_CENTER_ACCESS_TOKEN` er satt, brukes den. Ellers brukes `PLANNING_CENTER_CLIENT_ID` + `PLANNING_CENTER_SECRET` som HTTP Basic Auth.

## Nye endepunkter

Backend eksponerer nå:

- `getPlanningCenterStatus`
- `getPlanningCenterEvents`
- `getPlanningCenterPeople`

Eksempler:

```text
GET /getPlanningCenterStatus
GET /getPlanningCenterEvents?timeMin=2026-04-01T00:00:00.000Z&timeMax=2026-05-01T00:00:00.000Z
GET /getPlanningCenterEvents?eventInstanceId=pco_123456
GET /getPlanningCenterPeople
GET /getPlanningCenterPeople?personId=pco_person_123456
```

## Admin-oppsett

I adminpanelet under Integrasjoner kan du nå:

- aktivere Planning Center
- gi kilden et visningsnavn
- velge om nettsiden skal bruke `Google Calendar`, `Planning Center` eller `Kombiner begge`
- aktivere `Planning Center People` for CRM / Kontakter

Når `Planning Center People` er aktivert, hentes personer fra People API og vises i CRM-visningen sammen med nettstedskontakter. Treff på e-post eller `pcoPersonId` blir slått sammen til ett kontaktkort.

Manuelle overstyringer i `collection_events` fungerer fortsatt og legges oppå den eksterne kilden.

## Viktige begrensninger

- Planning Center er satt opp som read-only i denne versjonen
- To-veis synkronisering finnes fortsatt bare for Google Calendar
- Hvis både Google Calendar og Planning Center inneholder de samme arrangementene og du velger `Kombiner begge`, kan du få duplikater
- Hvis du bruker OAuth, må tokenet ha `people`-scope for People-endepunktet og `calendar`-scope for kalenderendepunktet
