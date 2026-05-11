# Trigr — Projet

## Vision
Assistant IA personnel + marketplace de workflows n8n pour indépendants et PME francophones.
Positionnement : "Lindy en français, RGPD-friendly, 5x moins cher".

## Stack
- **Frontend** : Next.js 16 (Turbopack), Tailwind CSS, dark violet/cyan
- **Auth** : Clerk (Google OAuth + Microsoft OAuth)
- **AI** : Groq llama-3.3-70b-versatile (fallback llama-3.1-8b-instant)
- **Workflows** : n8n local (pm2), API key configurée
- **Intégrations** : Pipedream Connect (OAuth 20+ apps)
- **Paiement** : Stripe (Solo 9€/Pro 19€/Équipe 49€)
- **Deploy** : Vercel (prod) + Railway (en cours)

## URLs
- Prod : https://trigr-eight.vercel.app
- GitHub : https://github.com/victorseiler0-bot/trigr
- n8n local : http://localhost:5678

## Intégrations actives
- Google (Gmail + Calendar) — Clerk OAuth natif
- WhatsApp Business — Meta Graph API (WHATSAPP_TOKEN + PHONE_NUMBER_ID)
- Outlook/Teams — Pipedream OAuth
- Notion — OAuth natif
- Slack, HubSpot, GitHub, Airtable — Pipedream OAuth
- Instagram Business — n8n workflow (token Meta à configurer)
- Email IMAP entreprise — lib/imap.ts (fonctionne en local, pas sur Vercel)
