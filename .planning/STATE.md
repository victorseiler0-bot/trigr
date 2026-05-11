# État actuel — Trigr

## Phase en cours : MVP Intégrations
Date : 2026-05-11

## Fait ✅
- Landing + hero animé + pricing + marketplace (12 templates)
- Auth Clerk (Google OAuth + Microsoft OAuth)
- Assistant IA avec tools : Gmail, Calendar, Outlook, Teams, WhatsApp, Apple, Notion, Slack, HubSpot, GitHub
- Rate limiting par plan (Clerk metadata)
- Stripe checkout + abonnements
- Pipedream Connect : OAuth 20+ apps
- n8n : 7 workflows (WA Business, Digest, Rapport Hebdo, Triage Emails, Assistant IA)
- Nouveaux workflows n8n : WA Send (Meta), WA Read, Instagram DMs
- API n8n trigger : /api/n8n/trigger (proxy Clerk → n8n webhook)
- Settings : IMAP entreprise + Instagram Direct (token Meta)
- GSD installé : 66 commandes /gsd-*

## En cours 🔄
- Instagram Business : compte à créer + lier à Page Facebook + token Meta
- Whapi channel mort → migré vers Meta API directe
- IMAP Vercel : TCP bloqué → solution n8n local ou Railway

## À faire ⏳
- Railway : déployer n8n + app (railway login requis)
- Pipedream Connect : tester les 20+ intégrations OAuth
- Graphiques dashboard : recharts sur /assistant
- Stripe Price IDs : créer dans Dashboard + env vars Vercel

## Credentials Vercel (production)
WHATSAPP_TOKEN ✅ | WHATSAPP_PHONE_NUMBER_ID ✅ | WHAPI_TOKEN ✅
GROQ_API_KEY ✅ | CLERK_SECRET_KEY ✅ | STRIPE_SECRET_KEY ✅
PIPEDREAM_API_KEY ✅ | PIPEDREAM_CLIENT_ID ✅ | PIPEDREAM_CLIENT_SECRET ✅
