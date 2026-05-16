# Visitor Chat + Google Chat (HKM)

Dette er en 2-veis chatbro mellom nettsiden og Google Chat.

## Hva som er implementert

- Besokende far en chat-widget pa nettsiden (`script.js`).
- Chatten lagres i Firestore under `visitorChats/{chatId}/messages`.
- Nye besoksmeldinger pushes til Google Chat via webhook (`onVisitorChatMessageCreated`).
- Teamet kan svare fra Google Chat via kommando:
  - `reply <chatId> <svartekst>`
- Svaret skrives tilbake til Firestore via `googleChatBridge` og vises i visitor-chatten.

## Secrets / miljøvariabler

Sett disse i Firebase Functions:

1. `GOOGLE_CHAT_WEBHOOK_URL`
2. `GOOGLE_CHAT_BRIDGE_TOKEN`

Eksempel:

```bash
firebase functions:secrets:set GOOGLE_CHAT_WEBHOOK_URL
firebase functions:secrets:set GOOGLE_CHAT_BRIDGE_TOKEN
```

## Deploy

```bash
firebase deploy --only functions,firestore:rules
```

## Google Chat-oppsett

1. Opprett en incoming webhook i riktig Google Chat-space.
2. Legg webhook-URL som `GOOGLE_CHAT_WEBHOOK_URL`.
3. Opprett en Google Chat app med HTTP endpoint:
   - `https://<din-funksjons-url>/googleChatBridge?token=<GOOGLE_CHAT_BRIDGE_TOKEN>`
4. Gi boten tilgang i samme space.

## Bruk i praksis

1. Besokende sender melding i widget.
2. Teamet ser melding i Google Chat med `chatId`.
3. Teamet svarer med:
   - `reply <chatId> Hei! Takk for meldingen, vi hjelper deg gjerne.`
4. Besokende ser svaret direkte i chat-widgeten.
