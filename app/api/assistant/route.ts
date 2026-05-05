import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { whapiChannel, getUserWhapiMeta } from "@/lib/whapi";
import { getAppleMeta, getAppleCalendar, getAppleContacts, createAppleEvent } from "@/lib/apple";
import { checkAndIncrementAction } from "@/lib/ratelimit";
import { getNotionMeta, searchNotionPages, getNotionPage, createNotionPage } from "@/lib/notion";
import { getSlackMeta, getSlackChannels, getSlackMessages, sendSlackMessage } from "@/lib/slack";
import { getHubSpotMeta, searchHubSpotContacts, getHubSpotDeals, createHubSpotContact, createHubSpotDeal } from "@/lib/hubspot";

export const maxDuration = 60; // secondes — nécessaire pour les chaînes d'outils Groq + Whapi

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Tu es l'assistant IA personnel de l'utilisateur. Tu réponds toujours en français, de manière concise et utile.
Date et heure actuelles : ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}

Outils disponibles selon les connexions de l'utilisateur :
- Google connecté : lire_emails, envoyer_email, voir_agenda, creer_evenement (Gmail + Google Calendar)
- Microsoft connecté : lire_emails_outlook, envoyer_email_outlook, voir_agenda_outlook, lire_teams (Outlook + Teams)
- WhatsApp connecté : voir_chats_whatsapp, lire_messages_whatsapp, envoyer_whatsapp, voir_contacts_whatsapp, messages_envoyes
- Apple connecté : voir_calendrier_apple, creer_evenement_apple, voir_contacts_apple
- Notion connecté : chercher_notion, lire_page_notion, creer_page_notion
- Slack connecté : voir_canaux_slack, lire_messages_slack, envoyer_slack
- HubSpot connecté : chercher_contacts_hubspot, voir_deals_hubspot, creer_contact_hubspot, creer_deal_hubspot

RÈGLES IMPORTANTES :
1. WhatsApp : utilise TOUJOURS voir_chats_whatsapp en premier pour obtenir les IDs de conversation avant de lire les messages. Les IDs ressemblent à "336XXXXXXXX@s.whatsapp.net" pour les contacts ou "XXXXXXXXX@g.us" pour les groupes.
2. Pour envoyer un WA : utilise le numéro sans + ni espaces (ex: "336XXXXXXXX").
3. Propose proactivement des actions utiles — si l'utilisateur parle d'une personne, propose de lui envoyer un message WA. Si il parle d'un sujet urgent, propose de vérifier ses emails.
4. Après avoir utilisé un outil, résume les résultats clairement et propose une action suivante pertinente.
5. Si un outil échoue, explique brièvement et propose une alternative.`;

const WA_BRIDGE = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";

const whapiGet  = (path: string, token: string | null) => whapiChannel(token!, path);
const whapiPost = (path: string, body: unknown, token: string | null) => whapiChannel(token!, path, "POST", body);

// Helpers bridge local Baileys (fallback)
async function waFetch(path: string) {
  try {
    const r = await fetch(`${WA_BRIDGE}/${path}`, { signal: AbortSignal.timeout(5000) });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function waPost(path: string, body: unknown) {
  try {
    const r = await fetch(`${WA_BRIDGE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

// ── Helpers fetch ─────────────────────────────────────────────────────────────

async function gFetch(url: string, token: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  return r.json();
}

function decodeBase64(s: string) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function encodeBase64url(s: string) {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Types bridgeData ──────────────────────────────────────────────────────────

type BridgeData = {
  wa?: { connected: boolean; chats?: unknown[]; contacts?: unknown[]; messages?: Record<string, unknown[]> };
  apple?: { configured: boolean; calendar?: unknown[]; contacts?: unknown[] };
};

type ClientAction =
  | { type: "send_whatsapp"; to: string; message: string }
  | { type: "create_apple_event"; event: Record<string, unknown> };

// ── Exécution des outils ───────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  googleToken: string | null,
  msToken: string | null,
  whapiToken: string | null,
  bridgeData: BridgeData,
  clientActions: ClientAction[],
  appleCredentials: { email: string; appPassword: string } | null,
  notionToken: string | null,
  slackToken: string | null,
  hubspotToken: string | null
): Promise<string> {

  // ─── Google Gmail + Calendar ─────────────────────────────────────────────────
  if (name === "lire_emails") {
    if (!googleToken) return JSON.stringify({ error: "Connectez-vous avec Google pour accéder à Gmail." });
    const q = (args.query as string) || "is:unread";
    const max = (args.maxResults as number) || 8;
    const list = await gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${max}`, googleToken);
    if (!list.messages?.length) return JSON.stringify({ emails: [], message: "Aucun email trouvé." });
    const emails = await Promise.all(list.messages.slice(0, 5).map(async (m: { id: string }) => {
      const msg = await gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, googleToken);
      const hdr: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
      const h = (n: string) => hdr.find((x) => x.name === n)?.value ?? "";
      return { id: m.id, from: h("From"), subject: h("Subject"), date: h("Date"), snippet: msg.snippet };
    }));
    return JSON.stringify({ emails, total: list.resultSizeEstimate });
  }

  if (name === "envoyer_email") {
    if (!googleToken) return JSON.stringify({ error: "Connectez-vous avec Google pour envoyer via Gmail." });
    const { to, subject, body } = args as { to: string; subject: string; body: string };
    const raw = encodeBase64url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`);
    const r = await gFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", googleToken, { method: "POST", body: JSON.stringify({ raw }) });
    return r.id ? JSON.stringify({ success: true }) : JSON.stringify({ error: r });
  }

  if (name === "voir_agenda") {
    if (!googleToken) return JSON.stringify({ error: "Connectez-vous avec Google pour accéder à Google Calendar." });
    const now = new Date();
    const tMin = (args.timeMin as string) || now.toISOString();
    const tMax = (args.timeMax as string) || new Date(now.getTime() + 7 * 86400000).toISOString();
    const data = await gFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}&maxResults=${(args.maxResults as number) || 10}&orderBy=startTime&singleEvents=true`, googleToken);
    const events = (data.items ?? []).map((e: Record<string, unknown>) => {
      const s = (e.start as Record<string, string>) ?? {};
      const en = (e.end as Record<string, string>) ?? {};
      return { summary: e.summary, start: s.dateTime ?? s.date, end: en.dateTime ?? en.date, location: e.location };
    });
    return JSON.stringify({ events });
  }

  if (name === "creer_evenement") {
    if (!googleToken) return JSON.stringify({ error: "Connectez-vous avec Google pour créer des événements." });
    const { summary, start, end, description } = args as { summary: string; start: string; end: string; description?: string };
    const r = await gFetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", googleToken, {
      method: "POST",
      body: JSON.stringify({ summary, description, start: { dateTime: start, timeZone: "Europe/Paris" }, end: { dateTime: end, timeZone: "Europe/Paris" } }),
    });
    return r.id ? JSON.stringify({ success: true, link: r.htmlLink }) : JSON.stringify({ error: r });
  }

  // ─── Microsoft Outlook + Teams ────────────────────────────────────────────────
  if (name === "lire_emails_outlook") {
    if (!msToken) return JSON.stringify({ error: "Connectez votre compte Microsoft pour accéder à Outlook." });
    const max = (args.maxResults as number) || 8;
    const filter = (args.filter as string) || "isRead eq false";
    const data = await gFetch(`https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=${max}&$select=subject,from,receivedDateTime,bodyPreview,isRead`, msToken);
    const emails = (data.value ?? []).map((m: Record<string, unknown>) => ({
      id: m.id,
      subject: m.subject,
      from: (m.from as Record<string, Record<string, string>>)?.emailAddress?.address,
      date: m.receivedDateTime,
      preview: m.bodyPreview,
      read: m.isRead,
    }));
    return JSON.stringify({ emails, total: data["@odata.count"] });
  }

  if (name === "envoyer_email_outlook") {
    if (!msToken) return JSON.stringify({ error: "Connectez votre compte Microsoft pour envoyer via Outlook." });
    const { to, subject, body } = args as { to: string; subject: string; body: string };
    const message = {
      message: {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    };
    const r = await gFetch("https://graph.microsoft.com/v1.0/me/sendMail", msToken, {
      method: "POST",
      body: JSON.stringify(message),
    });
    return r?.error ? JSON.stringify({ error: r.error }) : JSON.stringify({ success: true });
  }

  if (name === "voir_agenda_outlook") {
    if (!msToken) return JSON.stringify({ error: "Connectez votre compte Microsoft pour accéder à Outlook Calendar." });
    const now = new Date();
    const start = (args.startDateTime as string) || now.toISOString();
    const end = (args.endDateTime as string) || new Date(now.getTime() + 7 * 86400000).toISOString();
    const data = await gFetch(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=${(args.maxResults as number) || 10}&$select=subject,start,end,location,organizer`, msToken);
    const events = (data.value ?? []).map((e: Record<string, unknown>) => ({
      subject: e.subject,
      start: (e.start as Record<string, string>)?.dateTime,
      end: (e.end as Record<string, string>)?.dateTime,
      location: (e.location as Record<string, string>)?.displayName,
      organizer: (e.organizer as Record<string, Record<string, string>>)?.emailAddress?.name,
    }));
    return JSON.stringify({ events });
  }

  if (name === "lire_teams") {
    if (!msToken) return JSON.stringify({ error: "Connectez votre compte Microsoft pour accéder à Teams." });
    const chats = await gFetch("https://graph.microsoft.com/v1.0/me/chats?$top=5&$expand=members", msToken);
    const chatList = (chats.value ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      topic: c.topic,
      type: c.chatType,
    }));
    if (chatList[0]?.id) {
      const msgs = await gFetch(`https://graph.microsoft.com/v1.0/me/chats/${chatList[0].id}/messages?$top=5`, msToken);
      const messages = (msgs.value ?? []).map((m: Record<string, unknown>) => ({
        from: (m.from as Record<string, Record<string, string>>)?.user?.displayName,
        content: (m.body as Record<string, string>)?.content?.replace(/<[^>]+>/g, "").trim(),
        date: m.createdDateTime,
      }));
      return JSON.stringify({ chats: chatList, recentMessages: messages });
    }
    return JSON.stringify({ chats: chatList });
  }

  // ─── Apple iCloud (CalDAV direct — tsdav) ───────────────────────────────────
  if (name === "voir_calendrier_apple") {
    if (!appleCredentials) return JSON.stringify({ error: "Apple non configuré. Va dans Paramètres > Apple iCloud." });
    const events = await getAppleCalendar(appleCredentials.email, appleCredentials.appPassword);
    return JSON.stringify({ events });
  }

  if (name === "creer_evenement_apple") {
    if (!appleCredentials) return JSON.stringify({ error: "Apple non configuré." });
    const { summary, start, end, location, description } = args as { summary: string; start: string; end: string; location?: string; description?: string };
    const ok = await createAppleEvent(appleCredentials.email, appleCredentials.appPassword, { summary, start, end, location, description });
    return ok ? JSON.stringify({ success: true }) : JSON.stringify({ error: "Impossible de créer l'événement." });
  }

  if (name === "voir_contacts_apple") {
    if (!appleCredentials) return JSON.stringify({ error: "Apple non configuré." });
    const contacts = await getAppleContacts(appleCredentials.email, appleCredentials.appPassword);
    return JSON.stringify({ contacts });
  }

  // ─── WhatsApp — Whapi.cloud (cloud) ou Baileys local (fallback) ────────────
  if (name === "voir_chats_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté. Va dans Paramètres > WhatsApp." });
    if (whapiToken) {
      const data = await whapiGet("chats?count=25", whapiToken);
      if (!data) return JSON.stringify({ error: "Impossible de récupérer les conversations Whapi." });
      const chats = (data.chats ?? []).map((c: Record<string, unknown>) => {
        const lm = c.last_message as Record<string, unknown> | undefined;
        const phone = String(c.id ?? "").split("@")[0];
        return {
          id: c.id,
          name: (c.name as string) || (lm?.from_name as string) || phone,
          phone,
          unread: c.unread_count ?? 0,
          lastMessage: (lm?.text as Record<string, string>)?.body || (lm?.type as string) || "",
        };
      });
      return JSON.stringify({ chats });
    }
    if (bridgeData.wa.chats) return JSON.stringify({ chats: bridgeData.wa.chats });
    const data = await waFetch("chats");
    return data ? JSON.stringify({ chats: data.chats }) : JSON.stringify({ error: "Impossible de récupérer les conversations." });
  }

  if (name === "lire_messages_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    const { jid, limit } = args as { jid?: string; limit?: number };
    if (whapiToken) {
      if (!jid) return JSON.stringify({ hint: "Précise un chat_id pour lire une conversation." });
      const data = await whapiGet(`messages/list/${encodeURIComponent(jid)}?count=${limit ?? 20}`, whapiToken);
      if (!data) return JSON.stringify({ error: "Conversation introuvable." });
      const msgs = (data.messages ?? []).map((m: Record<string, unknown>) => ({
        id: m.id,
        from: (m.from_name as string) || String((m.from as string)?.split("@")[0] ?? ""),
        text: (m.text as Record<string, string>)?.body ?? "",
        timestamp: m.timestamp,
        fromMe: m.from_me,
      }));
      return JSON.stringify({ messages: msgs });
    }
    if (!jid) return JSON.stringify({ chats: (bridgeData.wa.chats ?? []).slice(0, 5), hint: "Précise un jid." });
    if (bridgeData.wa.messages?.[jid]) return JSON.stringify({ messages: (bridgeData.wa.messages[jid] as unknown[]).slice(0, limit ?? 20) });
    const data = await waFetch(`messages/${encodeURIComponent(jid)}?limit=${limit ?? 20}`);
    return data ? JSON.stringify({ messages: data.messages }) : JSON.stringify({ error: "Conversation introuvable." });
  }

  if (name === "envoyer_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    const { to, message } = args as { to: string; message: string };
    if (!to || !message) return JSON.stringify({ error: "Destinataire et message requis." });
    if (whapiToken) {
      const phone = to.replace(/\D/g, "");
      const r = await whapiPost("messages/text", { to: phone, body: message }, whapiToken);
      return r?.sent ? JSON.stringify({ success: true }) : JSON.stringify({ error: r?.error ?? "Erreur envoi" });
    }
    clientActions.push({ type: "send_whatsapp", to, message });
    return JSON.stringify({ success: true, message: "Message WhatsApp envoyé." });
  }

  if (name === "voir_contacts_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    if (whapiToken) {
      const data = await whapiGet("contacts?count=100", whapiToken);
      if (!data) return JSON.stringify({ error: "Impossible de récupérer les contacts." });
      const contacts = (data.contacts ?? []).map((c: Record<string, unknown>) => ({
        id: c.id,
        name: (c.name as string) || (c.pushname as string) || String(c.id ?? ""),
        phone: String(c.id ?? ""),
      }));
      return JSON.stringify({ contacts: contacts.slice(0, 50) });
    }
    if (bridgeData.wa.contacts) return JSON.stringify({ contacts: (bridgeData.wa.contacts as unknown[]).slice(0, 30) });
    const data = await waFetch("contacts");
    return data ? JSON.stringify({ contacts: data.contacts?.slice(0, 30) }) : JSON.stringify({ error: "Impossible de récupérer les contacts." });
  }

  if (name === "messages_envoyes") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    if (whapiToken) {
      const chatsData = await whapiGet("chats?count=10", whapiToken);
      const chats = (chatsData?.chats ?? []).slice(0, 5) as Record<string, unknown>[];
      const results = await Promise.all(
        chats.map(c => whapiGet(`messages/list/${encodeURIComponent(c.id as string)}?count=10`, whapiToken))
      );
      const sent = results.flatMap((r, i) => {
        const chat = chats[i];
        const chatName = (chat?.name as string) || String((chat?.id as string)?.split("@")[0] ?? "");
        return (r?.messages ?? [])
          .filter((m: Record<string, unknown>) => m.from_me)
          .map((m: Record<string, unknown>) => ({
            to: chatName,
            text: (m.text as Record<string, string>)?.body ?? "",
            timestamp: m.timestamp,
          }));
      });
      return JSON.stringify({ messages: sent.slice(0, 20) });
    }
    const data = await waFetch("sent");
    return data ? JSON.stringify({ messages: data.messages }) : JSON.stringify({ error: "Impossible de récupérer les messages envoyés." });
  }

  // ─── Slack ───────────────────────────────────────────────────────────────────
  if (name === "voir_canaux_slack") {
    if (!slackToken) return JSON.stringify({ error: "Slack non connecté. Va dans Paramètres > Slack." });
    const channels = await getSlackChannels(slackToken);
    return JSON.stringify({ channels });
  }

  if (name === "lire_messages_slack") {
    if (!slackToken) return JSON.stringify({ error: "Slack non connecté." });
    const { channelId, limit } = args as { channelId: string; limit?: number };
    if (!channelId) return JSON.stringify({ error: "channelId requis." });
    const messages = await getSlackMessages(slackToken, channelId, limit ?? 10);
    return JSON.stringify({ messages });
  }

  if (name === "envoyer_slack") {
    if (!slackToken) return JSON.stringify({ error: "Slack non connecté." });
    const { channel, text } = args as { channel: string; text: string };
    const ok = await sendSlackMessage(slackToken, channel, text);
    return ok ? JSON.stringify({ success: true }) : JSON.stringify({ error: "Impossible d'envoyer le message." });
  }

  // ─── HubSpot CRM ─────────────────────────────────────────────────────────────
  if (name === "chercher_contacts_hubspot") {
    if (!hubspotToken) return JSON.stringify({ error: "HubSpot non connecté. Va dans Paramètres > HubSpot." });
    const contacts = await searchHubSpotContacts(hubspotToken, (args.query as string) ?? "", (args.limit as number) ?? 10);
    return JSON.stringify({ contacts });
  }

  if (name === "voir_deals_hubspot") {
    if (!hubspotToken) return JSON.stringify({ error: "HubSpot non connecté." });
    const deals = await getHubSpotDeals(hubspotToken, (args.limit as number) ?? 10);
    return JSON.stringify({ deals });
  }

  if (name === "creer_contact_hubspot") {
    if (!hubspotToken) return JSON.stringify({ error: "HubSpot non connecté." });
    const { email, firstName, lastName, phone, company } = args as { email: string; firstName?: string; lastName?: string; phone?: string; company?: string };
    const result = await createHubSpotContact(hubspotToken, { email, firstName, lastName, phone, company });
    return JSON.stringify(result);
  }

  if (name === "creer_deal_hubspot") {
    if (!hubspotToken) return JSON.stringify({ error: "HubSpot non connecté." });
    const { name: dealName, amount, stage } = args as { name: string; amount?: string; stage?: string };
    const result = await createHubSpotDeal(hubspotToken, { name: dealName, amount, stage });
    return JSON.stringify(result);
  }

  // ─── Notion ──────────────────────────────────────────────────────────────────
  if (name === "chercher_notion") {
    if (!notionToken) return JSON.stringify({ error: "Notion non connecté. Va dans Paramètres > Notion." });
    const pages = await searchNotionPages(notionToken, (args.query as string) ?? "", (args.limit as number) ?? 10);
    return JSON.stringify({ pages });
  }

  if (name === "lire_page_notion") {
    if (!notionToken) return JSON.stringify({ error: "Notion non connecté." });
    const pageId = args.pageId as string;
    if (!pageId) return JSON.stringify({ error: "pageId requis." });
    const page = await getNotionPage(notionToken, pageId);
    return JSON.stringify(page);
  }

  if (name === "creer_page_notion") {
    if (!notionToken) return JSON.stringify({ error: "Notion non connecté." });
    const { parentId, title, content } = args as { parentId: string; title: string; content: string };
    const result = await createNotionPage(notionToken, parentId, title, content ?? "");
    return JSON.stringify(result);
  }

  return JSON.stringify({ error: `Outil inconnu : ${name}` });
}

// ── Définitions des outils pour Groq ──────────────────────────────────────────

function buildTools(hasGoogle: boolean, hasMicrosoft: boolean, hasWhatsApp: boolean, hasApple: boolean, hasNotion: boolean, hasSlack: boolean, hasHubSpot: boolean): Groq.Chat.ChatCompletionTool[] {
  const tools: Groq.Chat.ChatCompletionTool[] = [];

  if (hasGoogle) {
    tools.push(
      { type: "function", function: { name: "lire_emails", description: "Lire emails Gmail (non lus ou filtrés).", parameters: { type: "object" as const, properties: { maxResults: { type: "number" }, query: { type: "string" } } } } },
      { type: "function", function: { name: "envoyer_email", description: "Envoyer un email via Gmail.", parameters: { type: "object" as const, properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } } },
      { type: "function", function: { name: "voir_agenda", description: "Voir Google Calendar.", parameters: { type: "object" as const, properties: { timeMin: { type: "string" }, timeMax: { type: "string" }, maxResults: { type: "number" } } } } },
      { type: "function", function: { name: "creer_evenement", description: "Créer un événement Google Calendar.", parameters: { type: "object" as const, properties: { summary: { type: "string" }, start: { type: "string" }, end: { type: "string" }, description: { type: "string" } }, required: ["summary", "start", "end"] } } }
    );
  }

  if (hasMicrosoft) {
    tools.push(
      { type: "function", function: { name: "lire_emails_outlook", description: "Lire emails Outlook/Office 365.", parameters: { type: "object" as const, properties: { maxResults: { type: "number" }, filter: { type: "string", description: "Filtre OData ex: 'isRead eq false'" } } } } },
      { type: "function", function: { name: "envoyer_email_outlook", description: "Envoyer un email via Outlook.", parameters: { type: "object" as const, properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } } },
      { type: "function", function: { name: "voir_agenda_outlook", description: "Voir le calendrier Outlook.", parameters: { type: "object" as const, properties: { startDateTime: { type: "string" }, endDateTime: { type: "string" }, maxResults: { type: "number" } } } } },
      { type: "function", function: { name: "lire_teams", description: "Lire les conversations Microsoft Teams récentes.", parameters: { type: "object" as const, properties: {} } } }
    );
  }

  if (hasWhatsApp) {
    tools.push(
      { type: "function", function: { name: "voir_chats_whatsapp", description: "Lister les conversations WhatsApp récentes.", parameters: { type: "object" as const, properties: {} } } },
      { type: "function", function: { name: "lire_messages_whatsapp", description: "Lire les messages d'une conversation WhatsApp par jid.", parameters: { type: "object" as const, properties: { jid: { type: "string", description: "ex: 33612345678@s.whatsapp.net" }, limit: { type: "number" } } } } },
      { type: "function", function: { name: "envoyer_whatsapp", description: "Envoyer un message WhatsApp.", parameters: { type: "object" as const, properties: { to: { type: "string", description: "Numéro ou jid" }, message: { type: "string" } }, required: ["to", "message"] } } },
      { type: "function", function: { name: "voir_contacts_whatsapp", description: "Lister les contacts WhatsApp.", parameters: { type: "object" as const, properties: {} } } },
      { type: "function", function: { name: "messages_envoyes", description: "Voir les derniers messages envoyés par l'utilisateur sur WhatsApp (toutes conversations).", parameters: { type: "object" as const, properties: {} } } }
    );
  }

  if (hasApple) {
    tools.push(
      { type: "function", function: { name: "voir_calendrier_apple", description: "Voir les événements Apple Calendar des 14 prochains jours.", parameters: { type: "object" as const, properties: {} } } },
      { type: "function", function: { name: "creer_evenement_apple", description: "Créer un événement dans Apple Calendar.", parameters: { type: "object" as const, properties: { summary: { type: "string" }, start: { type: "string", description: "ISO 8601 ex: 2026-04-30T10:00:00" }, end: { type: "string" }, location: { type: "string" }, description: { type: "string" } }, required: ["summary", "start", "end"] } } },
      { type: "function", function: { name: "voir_contacts_apple", description: "Lister les contacts Apple (iCloud Contacts).", parameters: { type: "object" as const, properties: {} } } }
    );
  }

  if (hasHubSpot) {
    tools.push(
      { type: "function", function: { name: "chercher_contacts_hubspot", description: "Chercher des contacts dans HubSpot CRM.", parameters: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } } },
      { type: "function", function: { name: "voir_deals_hubspot", description: "Voir les deals/opportunités HubSpot.", parameters: { type: "object" as const, properties: { limit: { type: "number" } } } } },
      { type: "function", function: { name: "creer_contact_hubspot", description: "Créer un contact dans HubSpot.", parameters: { type: "object" as const, properties: { email: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, phone: { type: "string" }, company: { type: "string" } }, required: ["email"] } } },
      { type: "function", function: { name: "creer_deal_hubspot", description: "Créer un deal dans HubSpot.", parameters: { type: "object" as const, properties: { name: { type: "string" }, amount: { type: "string" }, stage: { type: "string" } }, required: ["name"] } } }
    );
  }

  if (hasSlack) {
    tools.push(
      { type: "function", function: { name: "voir_canaux_slack", description: "Lister les canaux Slack disponibles.", parameters: { type: "object" as const, properties: {} } } },
      { type: "function", function: { name: "lire_messages_slack", description: "Lire les messages d'un canal Slack.", parameters: { type: "object" as const, properties: { channelId: { type: "string" }, limit: { type: "number" } }, required: ["channelId"] } } },
      { type: "function", function: { name: "envoyer_slack", description: "Envoyer un message dans un canal Slack.", parameters: { type: "object" as const, properties: { channel: { type: "string", description: "ID ou nom du canal" }, text: { type: "string" } }, required: ["channel", "text"] } } }
    );
  }

  if (hasNotion) {
    tools.push(
      { type: "function", function: { name: "chercher_notion", description: "Chercher des pages dans Notion.", parameters: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } } },
      { type: "function", function: { name: "lire_page_notion", description: "Lire le contenu d'une page Notion par son ID.", parameters: { type: "object" as const, properties: { pageId: { type: "string" } }, required: ["pageId"] } } },
      { type: "function", function: { name: "creer_page_notion", description: "Créer une nouvelle page Notion.", parameters: { type: "object" as const, properties: { parentId: { type: "string", description: "ID de la page parent" }, title: { type: "string" }, content: { type: "string" } }, required: ["parentId", "title"] } } }
    );
  }

  return tools;
}

// ── Handler principal ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const body = await req.json();
    const message = String(body?.message ?? "").slice(0, 4000).trim();
    const history: Array<{ role: string; content: string }> = Array.isArray(body?.history) ? body.history.slice(-16) : [];
    const bridgeData: BridgeData = body?.bridgeData ?? {};
    if (!message) return NextResponse.json({ error: "Message vide." }, { status: 400 });

    const { allowed, remaining } = await checkAndIncrementAction(userId);
    if (!allowed) return NextResponse.json({
      error: "Limite journalière atteinte. Passez au plan Pro pour continuer.",
      upgrade: true,
    }, { status: 429 });

    // Récupère tous les tokens en parallèle
    let googleToken: string | null = null;
    let msToken: string | null = null;
    let whapiToken: string | null = process.env.WHAPI_TOKEN || null;
    let appleCredentials: { email: string; appPassword: string } | null = null;
    let notionToken: string | null = null;
    let slackToken: string | null = null;
    let hubspotToken: string | null = null;
    try {
      const client = await clerkClient();
      const [gData, mData] = await Promise.allSettled([
        client.users.getUserOauthAccessToken(userId, "google"),
        client.users.getUserOauthAccessToken(userId, "microsoft"),
      ]);
      if (gData.status === "fulfilled") googleToken = gData.value.data[0]?.token ?? null;
      if (mData.status === "fulfilled") msToken = mData.value.data[0]?.token ?? null;
      if (!whapiToken) whapiToken = (await getUserWhapiMeta(userId)).token;
      // Apple + Notion : credentials dans Clerk privateMetadata
      const u = await client.users.getUser(userId);
      const pm = u.privateMetadata as Record<string, unknown>;
      if (pm.appleEmail && pm.appleAppPassword) {
        appleCredentials = { email: pm.appleEmail as string, appPassword: pm.appleAppPassword as string };
      }
      if (pm.notionToken) notionToken = pm.notionToken as string;
      if (pm.slackToken) slackToken = pm.slackToken as string;
      if (pm.hubspotToken) hubspotToken = pm.hubspotToken as string;
    } catch { /* no tokens */ }

    const hasApple = !!appleCredentials;
    const hasNotion = !!notionToken;
    const hasSlack = !!slackToken;
    const hasHubSpot = !!hubspotToken;
    const hasWhatsApp = !!whapiToken || bridgeData.wa?.connected === true;
    const tools = buildTools(!!googleToken, !!msToken, hasWhatsApp, hasApple, hasNotion, hasSlack, hasHubSpot);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    const clientActions: ClientAction[] = [];

    // Boucle tool-calling (max 5 tours)
    for (let i = 0; i < 5; i++) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        max_tokens: 1024,
        temperature: 0.3,
      });

      const choice = completion.choices[0];
      const msg = choice.message;

      if (!msg.tool_calls?.length || choice.finish_reason === "stop") {
        return NextResponse.json({ response: msg.content ?? "", clientActions, remaining });
      }

      messages.push(msg as Groq.Chat.ChatCompletionMessageParam);
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments); } catch {}
          const result = await executeTool(tc.function.name, args, googleToken, msToken, whapiToken, bridgeData, clientActions, appleCredentials, notionToken, slackToken, hubspotToken);
          return { tool_call_id: tc.id, role: "tool" as const, content: result };
        })
      );
      messages.push(...toolResults);
    }

    return NextResponse.json({ response: "Désolé, je n'ai pas pu terminer cette action.", clientActions });
  } catch (err) {
    console.error("[assistant]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
