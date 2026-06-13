import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { whapiChannel, getUserWhapiMeta } from "@/lib/whapi";
import { sendMetaWaMessage, storeWaMessage, markWaMessagesRead, countUnread, type WaMessage } from "@/lib/whatsapp-meta";
import { getAppleMeta, getAppleCalendar, getAppleContacts, createAppleEvent } from "@/lib/apple";
import { checkAndIncrementAction } from "@/lib/ratelimit";
import { getNotionMeta, searchNotionPages, getNotionPage, createNotionPage } from "@/lib/notion";
import { getSlackMeta, getSlackChannels, getSlackMessages, sendSlackMessage } from "@/lib/slack";
import { getHubSpotMeta, searchHubSpotContacts, getHubSpotDeals, createHubSpotContact, createHubSpotDeal } from "@/lib/hubspot";
import { getPipedreamClient } from "@/lib/pipedream";
import { readImapEmails, sendImapEmail, type ImapConfig } from "@/lib/imap";
import { triggerN8nWebhook } from "@/lib/n8n";
import { classifyIntent, getAgentSystemPrompt, filterTools } from "@/lib/agents";

export const maxDuration = 60;

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
const FALLBACK_MODEL = "google/gemma-4-31b-it:free";

let _ai: OpenAI | null = null;
function getAI(): OpenAI {
  if (!_ai) {
    _ai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      baseURL: "https://openrouter.ai/api/v1",
    });
  }
  return _ai;
}

// Pipedream proxy — HttpResponsePromise.then() unwraps { data } automatiquement → res = data directement
async function pdGet(
  externalUserId: string, accountId: string, url: string,
  headers?: Record<string, string>, params?: Record<string, string>
): Promise<unknown> {
  try {
    const pd = getPipedreamClient();
    return await pd.proxy.get({ url, externalUserId, accountId, headers, params });
  } catch (err: unknown) {
    return { error: (err as Record<string, unknown>)?.message ?? "Erreur proxy Pipedream" };
  }
}

async function pdPost(
  externalUserId: string, accountId: string, url: string,
  body: Record<string, unknown>, headers?: Record<string, string>
): Promise<unknown> {
  try {
    const pd = getPipedreamClient();
    return await pd.proxy.post({ url, externalUserId, accountId, body, headers });
  } catch (err: unknown) {
    return { error: (err as Record<string, unknown>)?.message ?? "Erreur proxy Pipedream" };
  }
}

type SavedContact = { id: string; name: string; phone?: string; email?: string; notes?: string };
type UserProfile = { businessName?: string; profession?: string; city?: string; tone?: "formal" | "informal"; context?: string };

function buildSystemPrompt(compact = false, contacts: SavedContact[] = [], profile: UserProfile = {}, intent = "general") {
  const date = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  if (compact) {
    return `Tu es Orbe, assistant IA. Réponds en français, concis. Date: ${date}. Jamais de placeholder. Demande si info manquante.`;
  }
  return getAgentSystemPrompt(intent as import("@/lib/agents").AgentIntent, date, contacts, profile);
}

const WA_BRIDGE = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";

// En mode compact : garde seulement les outils les plus utiles (max ~1500 tokens)
function compactTools(tools: OpenAI.Chat.ChatCompletionTool[]): OpenAI.Chat.ChatCompletionTool[] | undefined {
  const KEEP = ["envoyer_whatsapp", "envoyer_instagram", "envoyer_email", "envoyer_email_outlook", "voir_chats_whatsapp", "lire_messages_whatsapp", "envoyer_slack"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = tools.filter(t => KEEP.includes((t as any).function?.name));
  return filtered.length > 0 ? filtered : undefined;
}

// Abonne automatiquement le WABA au webhook Meta (fait une seule fois par compte)
async function autoSubscribeWaba(
  token: string, phoneId: string, userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clerk: any
) {
  try {
    const res  = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=whatsapp_business_account&access_token=${token}`);
    const data = await res.json() as Record<string, unknown>;
    const wabaId = (data.whatsapp_business_account as Record<string, string> | undefined)?.id;
    if (!wabaId) return;
    await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    // Flag pour ne plus refaire
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { wabaSubscribed: true } });
  } catch { /* non bloquant */ }
}

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
  hubspotToken: string | null,
  pdAccountIds: Record<string, string>,
  userId: string,
  waStoredMessages: WaMessage[],
  waMetaToken: string | undefined,
  waPhoneId: string | undefined,
  imapConfig: ImapConfig | null,
  igMeta: { token: string; pageId: string } | null
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
    // Validation anti-placeholder
    const PLACEHOLDERS = ["example.com", "votre_email", "[email]", "[e-mail]", "test@test", "foo@bar", "placeholder"];
    if (!to || !to.includes("@") || PLACEHOLDERS.some(p => to.toLowerCase().includes(p))) {
      return `⚠️ Adresse email invalide ou placeholder détecté : "${to}". Peux-tu me donner la vraie adresse email du destinataire ?`;
    }
    const raw = encodeBase64url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`);
    const r = await gFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", googleToken, { method: "POST", body: JSON.stringify({ raw }) });
    return r.id ? JSON.stringify({ success: true, message: `Email envoyé à ${to}` }) : JSON.stringify({ error: r });
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
    const msAccountId = pdAccountIds.microsoft_outlook;
    if (!msToken && !msAccountId) return JSON.stringify({ error: "Connectez votre compte Microsoft pour accéder à Outlook." });
    const max = (args.maxResults as number) || 8;
    const filter = (args.filter as string) || "isRead eq false";
    const url = `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=${max}&$select=subject,from,receivedDateTime,bodyPreview,isRead`;
    const data = msToken ? await gFetch(url, msToken) : await pdGet(userId, msAccountId, url);
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
    const msAccountId = pdAccountIds.microsoft_outlook;
    if (!msToken && !msAccountId) return JSON.stringify({ error: "Connectez votre compte Microsoft pour envoyer via Outlook." });
    const { to, subject, body } = args as { to: string; subject: string; body: string };
    const payload = { message: { subject, body: { contentType: "Text", content: body }, toRecipients: [{ emailAddress: { address: to } }] } };
    const r = msToken
      ? await gFetch("https://graph.microsoft.com/v1.0/me/sendMail", msToken, { method: "POST", body: JSON.stringify(payload) })
      : await pdPost(userId, msAccountId, "https://graph.microsoft.com/v1.0/me/sendMail", payload);
    return (r as Record<string, unknown>)?.error ? JSON.stringify({ error: (r as Record<string, unknown>).error }) : JSON.stringify({ success: true });
  }

  if (name === "voir_agenda_outlook") {
    const msAccountId = pdAccountIds.microsoft_outlook;
    if (!msToken && !msAccountId) return JSON.stringify({ error: "Connectez votre compte Microsoft pour accéder à Outlook Calendar." });
    const now = new Date();
    const start = (args.startDateTime as string) || now.toISOString();
    const end = (args.endDateTime as string) || new Date(now.getTime() + 7 * 86400000).toISOString();
    const calUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=${(args.maxResults as number) || 10}&$select=subject,start,end,location,organizer`;
    const data = msToken ? await gFetch(calUrl, msToken) : await pdGet(userId, msAccountId, calUrl);
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
    const msAccountId = pdAccountIds.microsoft_outlook;
    if (!msToken && !msAccountId) return JSON.stringify({ error: "Connectez votre compte Microsoft pour accéder à Teams." });
    const chats = msToken
      ? await gFetch("https://graph.microsoft.com/v1.0/me/chats?$top=5&$expand=members", msToken)
      : await pdGet(userId, msAccountId, "https://graph.microsoft.com/v1.0/me/chats?$top=5&$expand=members");
    const chatList = (chats.value ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      topic: c.topic,
      type: c.chatType,
    }));
    if (chatList[0]?.id) {
      const msUrl2 = `https://graph.microsoft.com/v1.0/me/chats/${chatList[0].id}/messages?$top=5`;
      const msgs = msToken ? await gFetch(msUrl2, msToken) : await pdGet(userId, pdAccountIds.microsoft_outlook!, msUrl2);
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

  // ─── WhatsApp — Meta API directe (WHATSAPP_TOKEN) + messages stockés via webhook ──
  const hasWa = !!whapiToken || !!waMetaToken || !!pdAccountIds.whatsapp_business || bridgeData.wa?.connected === true;

  if (name === "voir_chats_whatsapp") {
    if (!hasWa) return JSON.stringify({ error: "WhatsApp non connecté." });
    // Priorité 1 : messages reçus via webhook (stockés dans Clerk)
    if (waStoredMessages.length > 0) {
      const unreadCount = countUnread(waStoredMessages);
      const bySender = new Map<string, WaMessage[]>();
      for (const m of waStoredMessages) {
        const key = m.incoming ? m.from : "me";
        if (!bySender.has(key)) bySender.set(key, []);
        bySender.get(key)!.push(m);
      }
      const chats = Array.from(bySender.entries()).map(([phone, msgs]) => ({
        id: phone,
        name: msgs.find(m => m.fromName !== phone)?.fromName ?? phone,
        phone,
        lastMessage: msgs[0]?.text ?? "",
        unread: msgs.filter(m => m.incoming && !m.read).length,
        lastTimestamp: msgs[0]?.timestamp,
      })).sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
      return JSON.stringify({ chats, totalUnread: unreadCount });
    }
    // Priorité 2 : Whapi si token valide
    if (whapiToken) {
      const data = await whapiGet("chats?count=25", whapiToken);
      if (data?.chats?.length) {
        const chats = (data.chats ?? []).map((c: Record<string, unknown>) => {
          const lm = c.last_message as Record<string, unknown> | undefined;
          const phone = String(c.id ?? "").split("@")[0];
          return { id: c.id, name: (c.name as string) || (lm?.from_name as string) || phone, phone, unread: c.unread_count ?? 0, lastMessage: (lm?.text as Record<string, string>)?.body || "" };
        });
        return JSON.stringify({ chats });
      }
    }
    return JSON.stringify({
      info: "Aucun message reçu pour l'instant. Le webhook Meta est en cours de configuration. Pour envoyer un message, utilise l'outil envoyer_whatsapp.",
      connected: !!waMetaToken,
    });
  }

  if (name === "lire_messages_whatsapp") {
    if (!hasWa) return JSON.stringify({ error: "WhatsApp non connecté." });
    const { jid, limit } = args as { jid?: string; limit?: number };
    // Lire depuis les messages stockés + marquer comme lus
    if (waStoredMessages.length > 0) {
      const msgs = jid
        ? waStoredMessages.filter(m => m.from === jid || (!m.incoming && jid === "me")).slice(0, limit ?? 20)
        : waStoredMessages.slice(0, limit ?? 20);
      // Marquer comme lus en arrière-plan
      markWaMessagesRead(userId, jid).catch(() => {});
      return JSON.stringify({ messages: msgs.map(m => ({ id: m.id, from: m.fromName, text: m.text, timestamp: m.timestamp, fromMe: !m.incoming, read: m.read })) });
    }
    if (whapiToken && jid) {
      const data = await whapiGet(`messages/list/${encodeURIComponent(jid)}?count=${limit ?? 20}`, whapiToken);
      if (data) {
        const msgs = (data.messages ?? []).map((m: Record<string, unknown>) => ({ id: m.id, from: (m.from_name as string) || String((m.from as string)?.split("@")[0] ?? ""), text: (m.text as Record<string, string>)?.body ?? "", timestamp: m.timestamp, fromMe: m.from_me }));
        return JSON.stringify({ messages: msgs });
      }
    }
    return JSON.stringify({ info: "Aucun message reçu pour l'instant. Les messages entrants arrivent automatiquement dès que le webhook est configuré." });
  }

  if (name === "envoyer_whatsapp") {
    if (!hasWa) return JSON.stringify({ error: "WhatsApp non connecté." });
    const { to, message } = args as { to: string; message: string };
    if (!to || !message) return `⚠️ Il me manque des informations. ${!to ? "À quel numéro ou contact dois-je envoyer ce message WhatsApp ?" : "Quel message dois-je envoyer ?"}`;
    const PHONE_PLACEHOLDERS = ["0600000000", "33600000000", "numéro", "phone", "000000", "123456"];
    if (PHONE_PLACEHOLDERS.some(p => to.includes(p)) || to.replace(/\D/g, "").length < 8) {
      return `⚠️ Numéro invalide ou placeholder détecté : "${to}". Peux-tu me donner le vrai numéro WhatsApp du destinataire ?`;
    }
    const phone = to.replace(/\D/g, "");
    // Priorité 1 : Meta API directe
    if (waMetaToken && waPhoneId) {
      const ok = await sendMetaWaMessage(phone, message);
      if (ok) {
        // Stocker le message envoyé
        await storeWaMessage({ id: `sent_${Date.now()}`, from: phone, fromName: phone, text: message, timestamp: Math.floor(Date.now() / 1000), incoming: false, read: true }).catch(() => {});
        return JSON.stringify({ success: true, via: "Meta API", to: phone });
      }
      return JSON.stringify({ error: `Échec envoi Meta API. Vérifie que WHATSAPP_TOKEN est valide et que le numéro ${phone} a déjà envoyé un message à ton compte Business (opt-in requis par Meta).` });
    }
    // Priorité 2 : Whapi (si disponible)
    if (whapiToken) {
      const r = await whapiPost("messages/text", { to: phone, body: message }, whapiToken);
      return r?.sent ? JSON.stringify({ success: true, via: "Whapi" }) : JSON.stringify({ error: r?.error ?? "Canal Whapi introuvable — recréer le canal sur whapi.cloud." });
    }
    return JSON.stringify({ error: "Aucun moyen d'envoi WhatsApp disponible. WHATSAPP_TOKEN manquant dans Vercel." });
  }

  if (name === "voir_contacts_whatsapp") {
    if (!hasWa) return JSON.stringify({ error: "WhatsApp non connecté." });
    if (waStoredMessages.length > 0) {
      const contacts = [...new Map(waStoredMessages.filter(m => m.incoming).map(m => [m.from, { id: m.from, name: m.fromName, phone: m.from }])).values()];
      return JSON.stringify({ contacts });
    }
    if (whapiToken) {
      const data = await whapiGet("contacts?count=100", whapiToken);
      if (data) {
        const contacts = (data.contacts ?? []).map((c: Record<string, unknown>) => ({ id: c.id, name: (c.name as string) || String(c.id ?? ""), phone: String(c.id ?? "") }));
        return JSON.stringify({ contacts: contacts.slice(0, 50) });
      }
    }
    return JSON.stringify({ info: "Contacts disponibles dès que des messages sont reçus sur WhatsApp Business." });
  }

  if (name === "messages_envoyes") {
    if (!hasWa) return JSON.stringify({ error: "WhatsApp non connecté." });
    if (waStoredMessages.length > 0) {
      const sent = waStoredMessages.filter(m => !m.incoming).slice(0, 20);
      return JSON.stringify({ messages: sent.map(m => ({ to: m.from, text: m.text, timestamp: m.timestamp })) });
    }
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

  // ─── GitHub (via Pipedream proxy) ────────────────────────────────────────────
  if (name === "voir_repos_github") {
    if (!pdAccountIds.github) return JSON.stringify({ error: "GitHub non connecté. Va dans Intégrations." });
    const ghHeaders = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const repos = await pdGet(userId, pdAccountIds.github, "https://api.github.com/user/repos", ghHeaders, { sort: "updated", per_page: "20" }) as Array<Record<string, unknown>>;
    if (!Array.isArray(repos)) return JSON.stringify({ error: (repos as Record<string, unknown>)?.message ?? "Erreur GitHub" });
    return JSON.stringify({ repos: repos.map(r => ({ name: r.full_name, private: r.private, description: r.description, stars: r.stargazers_count, open_issues: r.open_issues_count, url: r.html_url })) });
  }

  if (name === "lire_issues_github") {
    if (!pdAccountIds.github) return JSON.stringify({ error: "GitHub non connecté." });
    const { repo, state, limit } = args as { repo?: string; state?: string; limit?: number };
    const ghHeaders = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const ghUrl = repo
      ? `https://api.github.com/repos/${repo}/issues`
      : "https://api.github.com/issues";
    const ghParams: Record<string, string> = { state: state ?? "open", per_page: String(limit ?? 20) };
    if (!repo) ghParams.filter = "assigned";
    const issues = await pdGet(userId, pdAccountIds.github, ghUrl, ghHeaders, ghParams) as Array<Record<string, unknown>>;
    if (!Array.isArray(issues)) return JSON.stringify({ error: (issues as Record<string, unknown>)?.message ?? "Erreur GitHub" });
    return JSON.stringify({ issues: issues.map(i => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, labels: (i.labels as Array<Record<string, string>>)?.map(l => l.name), assignee: (i.assignee as Record<string, string>)?.login, created_at: i.created_at })) });
  }

  if (name === "creer_issue_github") {
    if (!pdAccountIds.github) return JSON.stringify({ error: "GitHub non connecté." });
    const { repo, title, body, labels } = args as { repo: string; title: string; body?: string; labels?: string[] };
    if (!repo || !title) return JSON.stringify({ error: "repo et title requis." });
    const ghHeaders = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };
    const issue = await pdPost(userId, pdAccountIds.github, `https://api.github.com/repos/${repo}/issues`, { title, body: body ?? "", labels: labels ?? [] }, ghHeaders) as Record<string, unknown>;
    return issue?.number ? JSON.stringify({ success: true, number: issue.number, url: issue.html_url }) : JSON.stringify({ error: issue?.message ?? "Erreur création" });
  }

  if (name === "voir_prs_github") {
    if (!pdAccountIds.github) return JSON.stringify({ error: "GitHub non connecté." });
    const { repo, state, limit } = args as { repo: string; state?: string; limit?: number };
    if (!repo) return JSON.stringify({ error: "repo requis (ex: owner/repo)." });
    const ghHeaders = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const prs = await pdGet(userId, pdAccountIds.github, `https://api.github.com/repos/${repo}/pulls`, ghHeaders, { state: state ?? "open", per_page: String(limit ?? 20) }) as Array<Record<string, unknown>>;
    if (!Array.isArray(prs)) return JSON.stringify({ error: (prs as Record<string, unknown>)?.message ?? "Erreur GitHub" });
    return JSON.stringify({ prs: prs.map(p => ({ number: p.number, title: p.title, state: p.state, url: p.html_url, author: (p.user as Record<string, string>)?.login, draft: p.draft, created_at: p.created_at })) });
  }

  // ─── Email IMAP (comptes entreprise/école) ───────────────────────────────────
  if (name === "lire_emails_imap") {
    if (!imapConfig) return JSON.stringify({ error: "Email IMAP non configuré. Va dans Paramètres > Email IMAP." });
    const { limit, unreadOnly } = args as { limit?: number; unreadOnly?: boolean };
    const emails = await readImapEmails(imapConfig, { limit: limit ?? 10, unreadOnly: unreadOnly ?? false });
    return JSON.stringify({ emails, account: imapConfig.user });
  }

  if (name === "envoyer_email_imap") {
    if (!imapConfig) return JSON.stringify({ error: "Email IMAP non configuré." });
    const { to, subject, body } = args as { to: string; subject: string; body: string };
    if (!to || !subject || !body) return JSON.stringify({ error: "to, subject et body requis." });
    const ok = await sendImapEmail(imapConfig, to, subject, body);
    return ok ? JSON.stringify({ success: true, from: imapConfig.user }) : JSON.stringify({ error: "Envoi échoué. Vérifiez les identifiants SMTP." });
  }

  // ─── Instagram DMs (Pipedream OAuth OU n8n + token direct) ─────────────────
  if (name === "voir_conversations_instagram") {
    if (!pdAccountIds.instagram_business && !igMeta) return JSON.stringify({ error: "Instagram non connecté. Va dans Intégrations pour connecter ton compte Instagram Business." });
    if (pdAccountIds.instagram_business) {
      const convs = await pdGet(userId, pdAccountIds.instagram_business,
        "https://graph.facebook.com/v21.0/me/conversations?platform=instagram&fields=id,participants,updated_time,messages{message,from,created_time}&limit=10"
      ) as Record<string, unknown>;
      if ((convs as Record<string, unknown>)?.error) return JSON.stringify({ error: (convs as Record<string, Record<string, string>>).error?.message ?? "Erreur Instagram" });
      const threads = ((convs as Record<string, unknown>).data as Array<Record<string, unknown>> ?? []).map(t => {
        const participants = ((t.participants as Record<string, unknown>)?.data as Array<Record<string, string>> ?? []).filter(p => p.username !== "me").map(p => p.name ?? p.username);
        const lastMsg = ((t.messages as Record<string, unknown>)?.data as Array<Record<string, unknown>> ?? [])[0];
        return { id: t.id, with: participants.join(", "), lastMessage: lastMsg?.message ?? "", updatedAt: t.updated_time };
      });
      return JSON.stringify({ conversations: threads });
    }
    // Fallback n8n + token direct Meta
    const result = await triggerN8nWebhook("Orbe-ig", { action: "read", token: igMeta!.token, pageId: igMeta!.pageId });
    return JSON.stringify(result);
  }

  if (name === "lire_messages_instagram") {
    if (!pdAccountIds.instagram_business) return JSON.stringify({ error: "Instagram non connecté." });
    const { conversationId, limit } = args as { conversationId: string; limit?: number };
    if (!conversationId) return JSON.stringify({ error: "conversationId requis." });
    const data = await pdGet(userId, pdAccountIds.instagram_business,
      `https://graph.facebook.com/v21.0/${conversationId}/messages?fields=message,from,created_time&limit=${limit ?? 20}`
    ) as Record<string, unknown>;
    const msgs = ((data as Record<string, unknown>).data as Array<Record<string, unknown>> ?? []).map(m => ({
      from: (m.from as Record<string, string>)?.name ?? "inconnu",
      message: m.message,
      at: m.created_time,
    }));
    return JSON.stringify({ messages: msgs });
  }

  if (name === "envoyer_instagram") {
    if (!pdAccountIds.instagram_business && !igMeta) return JSON.stringify({ error: "Instagram non connecté." });
    const { recipientId, message: text } = args as { recipientId: string; message: string };
    if (!recipientId || !text) return JSON.stringify({ error: "recipientId et message requis." });
    if (pdAccountIds.instagram_business) {
      const r = await pdPost(userId, pdAccountIds.instagram_business,
        "https://graph.facebook.com/v21.0/me/messages",
        { recipient: { id: recipientId }, message: { text }, messaging_type: "RESPONSE" }
      ) as Record<string, unknown>;
      return r?.message_id ? JSON.stringify({ success: true }) : JSON.stringify({ error: r?.error ?? "Erreur envoi" });
    }
    // Fallback n8n
    const result = await triggerN8nWebhook("Orbe-ig", { action: "send", token: igMeta!.token, pageId: igMeta!.pageId, recipientId, message: text });
    return JSON.stringify(result);
  }

  // ─── Recherche contact par nom ────────────────────────────────────────────────
  if (name === "rechercher_contact_par_nom") {
    try {
      const { prenom } = args as { prenom: string };
      if (!prenom) return "Quel prénom ou nom dois-je chercher ?";
      const q = prenom.toLowerCase().trim();
      const results: { nom: string; email?: string; telephone?: string; source: string }[] = [];

      // 1. Contacts Orbe (CRM local) — toujours disponible
      try {
        const clerkInst = await clerkClient();
        const u = await clerkInst.users.getUser(userId);
        const crmContacts = ((u.privateMetadata as Record<string, unknown>).userContacts as SavedContact[]) ?? [];
        for (const c of crmContacts) {
          if (c.name.toLowerCase().includes(q)) {
            results.push({ nom: c.name, email: c.email, telephone: c.phone, source: "CRM Orbe" });
          }
        }
      } catch { /* ignore */ }

      // 2. Google Contacts (People API) — nécessite contacts.readonly scope
      if (googleToken) {
        try {
          const gcResp = await fetch(
            `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(prenom)}&readMask=names,emailAddresses,phoneNumbers&pageSize=10`,
            { headers: { Authorization: `Bearer ${googleToken}` } }
          );
          if (gcResp.ok) {
            const gcData = await gcResp.json() as { results?: { person?: { names?: { displayName: string }[]; emailAddresses?: { value: string }[]; phoneNumbers?: { value: string }[] } }[] };
            for (const item of gcData.results ?? []) {
              const p = item.person;
              if (!p) continue;
              const nom = p.names?.[0]?.displayName ?? "";
              const email = p.emailAddresses?.[0]?.value;
              const telephone = p.phoneNumbers?.[0]?.value;
              if (nom.toLowerCase().includes(q) && !results.find(ex => ex.email === email && email)) {
                results.push({ nom, email, telephone, source: "Google Contacts" });
              }
            }
          }
        } catch { /* scope absent ou erreur réseau */ }
      }

      // 3. Gmail — chercher dans les échanges récents
      if (googleToken && results.length < 5) {
        try {
          const gmResp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(prenom)}&maxResults=5`,
            { headers: { Authorization: `Bearer ${googleToken}` } }
          );
          if (gmResp.ok) {
            const gmData = await gmResp.json() as { messages?: { id: string }[] };
            for (const m of (gmData.messages ?? []).slice(0, 3)) {
              try {
                const msgResp = await fetch(
                  `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To`,
                  { headers: { Authorization: `Bearer ${googleToken}` } }
                );
                if (!msgResp.ok) continue;
                const msgData = await msgResp.json() as { payload?: { headers?: { name: string; value: string }[] } };
                for (const h of msgData.payload?.headers ?? []) {
                  if (h.name !== "From" && h.name !== "To") continue;
                  const hVal = h.value ?? "";
                  const match = hVal.match(/([^<]+)<([^>]+)>/);
                  if (match && match[1] && match[2]) {
                    const nom = match[1].trim().replace(/"/g, "");
                    const email = match[2].trim();
                    if (nom.toLowerCase().includes(q) && email.includes("@") && !results.find(ex => ex.email === email)) {
                      results.push({ nom, email, source: "Gmail récent" });
                    }
                  }
                }
              } catch { /* ignorer ce message */ }
            }
          }
        } catch { /* ignore */ }
      }

      if (!results.length) {
        return `Aucun contact trouvé pour "${prenom}". Peux-tu me donner l'adresse email ou le numéro directement ?`;
      }

      if (results.length === 1) {
        const c = results[0];
        return `J'ai trouvé **${c.nom}**${c.email ? ` (${c.email})` : ""}${c.telephone ? ` — 📱 ${c.telephone}` : ""} dans ${c.source}. C'est bien ce contact ?`;
      }

      const list = results.slice(0, 5).map((c, i) => `${i + 1}. **${c.nom}** — ${c.email ?? "pas d'email"}${c.telephone ? ` / ${c.telephone}` : ""} *(${c.source})*`).join("\n");
      return `J'ai trouvé **${results.length} contacts** pour "${prenom}" :\n\n${list}\n\nLequel veux-tu utiliser ? (réponds par le numéro)`;
    } catch {
      return `Aucun contact trouvé pour "${(args as { prenom?: string }).prenom ?? "ce prénom"}". Peux-tu me donner l'email directement ?`;
    }
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────────
  if (name === "voir_mes_contacts") {
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const contacts = ((u.privateMetadata as Record<string, unknown>).userContacts as SavedContact[]) ?? [];
    return JSON.stringify({ contacts: contacts.length > 0 ? contacts : [], message: contacts.length === 0 ? "Aucun contact enregistré. Utilisez ajouter_contact pour en créer." : undefined });
  }

  if (name === "ajouter_contact") {
    const { name: cName, phone, email, notes } = args as { name: string; phone?: string; email?: string; notes?: string };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const existing = ((u.privateMetadata as Record<string, unknown>).userContacts as SavedContact[]) ?? [];
    const idx = existing.findIndex(c => c.name.toLowerCase() === cName.toLowerCase());
    let updated: SavedContact[];
    if (idx >= 0) {
      updated = existing.map((c, i) => i === idx ? { ...c, phone: phone ?? c.phone, email: email ?? c.email, notes: notes ?? c.notes } : c);
    } else {
      updated = [...existing, { id: Date.now().toString(), name: cName, phone, email, notes }];
    }
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { userContacts: updated } });
    return JSON.stringify({ success: true, message: idx >= 0 ? `Contact ${cName} mis à jour.` : `Contact ${cName} ajouté.` });
  }

  if (name === "supprimer_contact") {
    const { name: cName } = args as { name: string };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const existing = ((u.privateMetadata as Record<string, unknown>).userContacts as SavedContact[]) ?? [];
    const updated = existing.filter(c => c.name.toLowerCase() !== cName.toLowerCase());
    if (updated.length === existing.length) return JSON.stringify({ error: `Contact "${cName}" non trouvé.` });
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { userContacts: updated } });
    return JSON.stringify({ success: true, message: `Contact ${cName} supprimé.` });
  }

  if (name === "recherche_web") {
    const { query } = args as { query: string };
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
      const r = await fetch(ddgUrl, { headers: { "User-Agent": "Orbe/1.0" } });
      const data = await r.json() as Record<string, unknown>;
      const results: string[] = [];
      if (data.AbstractText) results.push(`**Résumé :** ${data.AbstractText}`);
      if (data.AbstractSource) results.push(`Source : ${data.AbstractSource}`);
      if (Array.isArray(data.RelatedTopics)) {
        const topics = (data.RelatedTopics as Array<Record<string, unknown>>)
          .filter(t => t.Text)
          .slice(0, 5)
          .map(t => `- ${t.Text}`);
        if (topics.length) results.push("**Résultats associés :**\n" + topics.join("\n"));
      }
      if (data.Answer) results.push(`**Réponse directe :** ${data.Answer}`);
      // Fallback: Wikipedia FR when DuckDuckGo returns nothing
      if (results.length === 0) {
        try {
          const wikiUrl = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
          const wr = await fetch(wikiUrl, { headers: { "User-Agent": "Orbe/1.0" } });
          if (wr.ok) {
            const wd = await wr.json() as { extract?: string; title?: string; content_urls?: { desktop?: { page?: string } } };
            if (wd.extract) {
              results.push(`**${wd.title ?? query}** (Wikipedia)\n${wd.extract.slice(0, 600)}${wd.extract.length > 600 ? "..." : ""}`);
              if (wd.content_urls?.desktop?.page) results.push(`Source : ${wd.content_urls.desktop.page}`);
            }
          }
        } catch { /* ignore wiki fallback error */ }
      }
      return results.length > 0
        ? results.join("\n\n")
        : `Aucun résultat pour "${query}". Essaie une formulation différente.`;
    } catch {
      return `Erreur lors de la recherche web.`;
    }
  }

  if (name === "rechercher_entreprise") {
    const { query } = args as { query: string };
    try {
      const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&page=1&per_page=3`;
      const r = await fetch(url, { headers: { "User-Agent": "Orbe/1.0", Accept: "application/json" } });
      if (!r.ok) return JSON.stringify({ error: "API entreprise indisponible." });
      const data = await r.json() as Record<string, unknown>;
      const results = (data.results as Array<Record<string, unknown>>) ?? [];
      if (!results.length) return JSON.stringify({ message: `Aucune entreprise trouvée pour "${query}".` });
      const companies = results.map(c => {
        const siege = c.siege as Record<string, unknown> ?? {};
        return {
          nom: c.nom_complet ?? c.nom_raison_sociale,
          siren: c.siren,
          siret_siege: siege.siret,
          forme_juridique: c.categorie_juridique_libelle ?? c.nature_juridique,
          activite: c.activite_principale_libelle,
          code_naf: c.activite_principale,
          adresse: siege.adresse ?? [siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune].filter(Boolean).join(" "),
          creation: c.date_creation,
          salaries: c.tranche_effectif_salarie,
          statut: c.etat_administratif === "A" ? "Actif" : "Fermé",
        };
      });
      return JSON.stringify({ companies, total: data.total_results });
    } catch {
      return JSON.stringify({ error: "Erreur lors de la recherche d'entreprise." });
    }
  }

  if (name === "meteo") {
    const { ville } = args as { ville: string };
    try {
      const loc = encodeURIComponent(ville || "Paris");
      const r = await fetch(`https://wttr.in/${loc}?format=j1`, { headers: { "User-Agent": "Orbe/1.0", Accept: "application/json" } });
      if (!r.ok) return `Météo indisponible pour "${ville}".`;
      const data = await r.json() as Record<string, unknown>;
      const current = (data.current_condition as Record<string, unknown>[])?.[0];
      if (!current) return `Pas de données météo pour "${ville}".`;
      const desc = (current.weatherDesc as { value: string }[])?.[0]?.value ?? "";
      const temp = current.temp_C;
      const feels = current.FeelsLikeC;
      const humidity = current.humidity;
      const wind = current.windspeedKmph;
      const weather = (data.weather as Record<string, unknown>[])?.[0];
      const maxTemp = weather?.maxtempC;
      const minTemp = weather?.mintempC;
      return `🌤️ **Météo à ${ville}**
Température : ${temp}°C (ressenti ${feels}°C)
Conditions : ${desc}
Humidité : ${humidity}% | Vent : ${wind} km/h
Min / Max du jour : ${minTemp}°C / ${maxTemp}°C`;
    } catch {
      return `Erreur lors de la récupération de la météo.`;
    }
  }

  if (name === "creer_rappel") {
    const { titre, note, dansJours, canal } = args as { titre: string; note?: string; dansJours: number; canal?: string };
    const dueAt = new Date(Date.now() + dansJours * 86400_000).toISOString();
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-Orbe-internal": process.env.CRON_SECRET ?? "" },
        body: JSON.stringify({ title: titre, note, dueAt, channel: canal ?? "push" }),
      });
      if (!r.ok) throw new Error(await r.text());
      return `✅ Rappel créé : **${titre}** dans ${dansJours} jour${dansJours > 1 ? "s" : ""} (${new Date(dueAt).toLocaleDateString("fr-FR")}).`;
    } catch {
      return `Erreur lors de la création du rappel.`;
    }
  }

  if (name === "voir_rappels") {
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/reminders`, {
        headers: { "x-Orbe-internal": process.env.CRON_SECRET ?? "" },
      });
      const d = await r.json() as { reminders: { title: string; dueAt: string; note?: string }[] };
      if (!d.reminders?.length) return "Aucun rappel en attente.";
      return `📋 **Rappels en attente :**\n${d.reminders.map(r => `- **${r.title}** — ${new Date(r.dueAt).toLocaleDateString("fr-FR")}${r.note ? ` (${r.note})` : ""}`).join("\n")}`;
    } catch {
      return "Erreur lors de la récupération des rappels.";
    }
  }

  // ── Recherche emails ──
  if (name === "rechercher_dans_mes_emails") {
    const { query, maxResults } = args as { query: string; maxResults?: number };
    const googleToken = await clerkClient().then(c => c.users.getUserOauthAccessToken(userId, "google")).then(d => d.data[0]?.token ?? null);
    if (!googleToken) return "Gmail non connecté.";
    try {
      const max = maxResults ?? 5;
      const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${max}`, { headers: { Authorization: `Bearer ${googleToken}` } });
      const data = await list.json() as { messages?: { id: string }[]; resultSizeEstimate?: number };
      if (!data.messages?.length) return `Aucun email trouvé pour "${query}".`;
      const emails = await Promise.all(data.messages.slice(0, max).map(async (m) => {
        const msg = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${googleToken}` } });
        const d = await msg.json() as { payload?: { headers?: { name: string; value: string }[] }; snippet?: string };
        const hdr = d.payload?.headers ?? [];
        const from = hdr.find(h => h.name === "From")?.value?.replace(/<.*>/, "").trim() ?? "?";
        const subj = hdr.find(h => h.name === "Subject")?.value ?? "Sans objet";
        const date = hdr.find(h => h.name === "Date")?.value ?? "";
        return `- **${subj}** (de ${from.slice(0, 30)}, ${new Date(date).toLocaleDateString("fr-FR")})\n  ${(d.snippet ?? "").slice(0, 100)}…`;
      }));
      return `🔍 **${data.resultSizeEstimate ?? emails.length} email(s) pour "${query}" :**\n${emails.join("\n\n")}`;
    } catch { return "Erreur lors de la recherche dans les emails."; }
  }

  // ── CRM Orbe (Clerk direct) ──
  if (name === "voir_contacts_crm") {
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const contacts = ((u.privateMetadata as Record<string, unknown>).userContacts as SavedContact[]) ?? [];
    if (!contacts.length) return "Aucun contact dans le CRM. Utilise creer_contact_crm pour en ajouter.";
    return `📋 **Contacts CRM (${contacts.length}) :**\n${contacts.slice(0, 25).map(c => `- **${c.name}**${c.phone ? ` — WA: ${c.phone}` : ""}${c.email ? ` — ${c.email}` : ""}${c.notes ? ` (${c.notes})` : ""}`).join("\n")}`;
  }

  if (name === "creer_contact_crm") {
    const { nom, email, telephone, entreprise, notes } = args as { nom: string; email?: string; telephone?: string; entreprise?: string; notes?: string };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const existing = ((u.privateMetadata as Record<string, unknown>).userContacts as SavedContact[]) ?? [];
    const contact: SavedContact = { id: Date.now().toString(), name: nom + (entreprise ? ` (${entreprise})` : ""), phone: telephone, email, notes };
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { userContacts: [...existing, contact] } });
    return `✅ Contact **${nom}** ajouté au CRM${entreprise ? ` (${entreprise})` : ""}.`;
  }

  if (name === "voir_pipeline_crm") {
    type Deal = { id: string; title: string; stage: string; amount?: number; contactName?: string };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const deals = ((u.privateMetadata as Record<string, unknown>).deals as Deal[]) ?? [];
    if (!deals.length) return "Aucun deal dans le pipeline. Utilise creer_deal_crm pour commencer.";
    const stages: Record<string, string> = { prospection: "Prospection", propose: "Devis envoyé", negociation: "Négociation", gagne: "Gagné ✓", perdu: "Perdu" };
    const total = deals.filter(d => d.stage === "gagne").reduce((s, d) => s + (d.amount ?? 0), 0);
    return `💼 **Pipeline (${deals.length} deals — ${total.toLocaleString("fr-FR")} € signés) :**\n${deals.map(d => `- **${d.title}**${d.contactName ? ` (${d.contactName})` : ""}${d.amount ? ` — ${d.amount.toLocaleString("fr-FR")} €` : ""} → ${stages[d.stage] ?? d.stage}`).join("\n")}`;
  }

  if (name === "creer_deal_crm") {
    type Deal = { id: string; title: string; stage: string; amount?: number; contactName?: string; createdAt: string; updatedAt: string };
    const { titre, contactName, amount, stage, notes } = args as { titre: string; contactName?: string; amount?: number; stage?: string; notes?: string };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const existing = ((u.privateMetadata as Record<string, unknown>).deals as Deal[]) ?? [];
    const deal: Deal = { id: `deal_${Date.now()}`, title: titre, contactName, amount, stage: stage ?? "prospection", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (notes) (deal as Deal & { notes?: string }).notes = notes;
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { deals: [...existing, deal] } });
    return `✅ Deal **${titre}** créé dans le pipeline${amount ? ` (${amount.toLocaleString("fr-FR")} €)` : ""}. Étape : ${stage ?? "Prospection"}.`;
  }

  // ── Sauvegarder une note ──
  if (name === "sauvegarder_note") {
    const { titre, contenu, tags } = args as { titre: string; contenu: string; tags?: string[] };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const meta = (u.privateMetadata ?? {}) as Record<string, unknown>;
    type Note = { id: string; titre: string; contenu: string; tags?: string[]; createdAt: string };
    const notes = (meta.notes as Note[]) ?? [];
    const note: Note = { id: `note_${Date.now()}`, titre, contenu, tags, createdAt: new Date().toISOString() };
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { ...meta, notes: [note, ...notes].slice(0, 50) } });
    return `📝 Note **${titre}** sauvegardée${tags?.length ? ` [${tags.join(", ")}]` : ""}.`;
  }

  if (name === "voir_mes_notes") {
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const meta = (u.privateMetadata ?? {}) as Record<string, unknown>;
    type Note = { id: string; titre: string; contenu: string; tags?: string[]; createdAt: string };
    const notes = (meta.notes as Note[]) ?? [];
    if (!notes.length) return "Aucune note sauvegardée.";
    return `📝 **Mes notes (${notes.length}) :**\n${notes.slice(0, 10).map(n => `- **${n.titre}**${n.tags?.length ? ` [${n.tags.join(", ")}]` : ""} — ${new Date(n.createdAt).toLocaleDateString("fr-FR")}`).join("\n")}`;
  }

  // ── Préparer une réunion ──
  if (name === "preparer_reunion") {
    const { sujet, participants, dureeMinutes, context } = args as {
      sujet: string;
      participants?: string[];
      dureeMinutes?: number;
      context?: string;
    };
    const ai = getAI();
    const model = PRIMARY_MODEL;
    const prompt = `Tu prépares un brief de réunion professionnelle.
Sujet : ${sujet}
${participants?.length ? `Participants : ${participants.join(", ")}` : ""}
${dureeMinutes ? `Durée prévue : ${dureeMinutes} min` : ""}
${context ? `Contexte : ${context}` : ""}

Génère un brief de réunion complet en français incluant :
1. **Objectif principal** (1 phrase)
2. **Ordre du jour** (3-5 points avec durée estimée)
3. **Questions clés à aborder**
4. **Documents/infos à préparer avant la réunion**
5. **Prochaines étapes attendues**

Sois concis et actionnable. Maximum 200 mots.`;
    try {
      const res = await ai.chat.completions.create({
        model, messages: [{ role: "user", content: prompt }],
        max_tokens: 500, temperature: 0.4,
      });
      return `📋 **Brief — ${sujet}**\n\n${res.choices[0]?.message?.content ?? ""}`;
    } catch { return "Erreur lors de la génération du brief."; }
  }

  // ── Disponibilités agenda ──
  if (name === "trouver_disponibilite") {
    const { dureeMinutes, dansJours } = args as { dureeMinutes?: number; dansJours?: number };
    const duree = dureeMinutes ?? 60;
    const horizon = dansJours ?? 5;
    const token = await clerkClient().then(c => c.users.getUserOauthAccessToken(userId, "google")).then(d => d.data[0]?.token ?? null);
    if (!token) return "Google Calendar non connecté. Va dans /settings pour connecter ton compte.";
    try {
      const slots: string[] = [];
      for (let day = 0; day < horizon; day++) {
        const d = new Date(); d.setDate(d.getDate() + day + 1);
        d.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${d.toISOString()}&timeMax=${end.toISOString()}&maxResults=20&orderBy=startTime&singleEvents=true`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await r.json() as { items?: { start?: { dateTime?: string }; end?: { dateTime?: string } }[] };
        const busy = (data.items ?? []).map(e => ({ start: new Date(e.start?.dateTime ?? ""), end: new Date(e.end?.dateTime ?? "") })).filter(e => e.start.getTime() > 0);
        const dayStr = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
        const freeSlots: string[] = [];
        const workStart = new Date(d); workStart.setHours(9, 0, 0, 0);
        const workEnd = new Date(d); workEnd.setHours(18, 0, 0, 0);
        let cursor = workStart;
        for (const evt of [...busy].sort((a, b) => a.start.getTime() - b.start.getTime())) {
          if (cursor.getTime() + duree * 60_000 <= evt.start.getTime()) {
            freeSlots.push(`${cursor.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}–${new Date(cursor.getTime() + duree * 60_000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
          }
          cursor = evt.end.getTime() > cursor.getTime() ? evt.end : cursor;
        }
        if (cursor.getTime() + duree * 60_000 <= workEnd.getTime()) {
          freeSlots.push(`${cursor.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}–${new Date(cursor.getTime() + duree * 60_000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
        }
        if (freeSlots.length) slots.push(`**${dayStr}** : ${freeSlots.slice(0, 3).join(", ")}`);
      }
      if (!slots.length) return `Aucun créneau libre de ${duree} minutes dans les ${horizon} prochains jours.`;
      return `📅 **Créneaux disponibles (${duree} min) :**\n${slots.join("\n")}`;
    } catch { return "Erreur lors de la vérification de l'agenda."; }
  }

  // ── Tâches du jour ──
  if (name === "voir_taches_du_jour") {
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const meta = (u.privateMetadata ?? {}) as Record<string, unknown>;
    type Reminder = { id: string; title: string; dueAt: string; note?: string; done?: boolean };
    const reminders = ((meta.reminders as Reminder[]) ?? []).filter(r => !r.done && new Date(r.dueAt) <= new Date(Date.now() + 86400_000));
    const overdue = reminders.filter(r => new Date(r.dueAt) < new Date()).length;
    let out = `📋 **Tâches du jour :**\n`;
    if (!reminders.length) out += "Aucune tâche en attente — bonne journée ! 🎉\n";
    else out += reminders.map(r => {
      const isLate = new Date(r.dueAt) < new Date();
      return `- ${isLate ? "🔴" : "⏳"} **${r.title}**${r.note ? ` — ${r.note}` : ""} (${new Date(r.dueAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })})`;
    }).join("\n");
    if (overdue > 0) out += `\n\n⚠️ ${overdue} tâche${overdue > 1 ? "s" : ""} en retard.`;
    return out;
  }

  // ── Envoyer devis par email ──
  if (name === "envoyer_devis_par_email") {
    const { devis, emailDest, nomDest } = args as { devis: string; emailDest: string; nomDest?: string };
    // Validation anti-placeholder
    const PLACEHOLDERS = ["example.com", "votre_email", "[email]", "test@test", "placeholder", "foo@bar"];
    if (!emailDest || !emailDest.includes("@") || PLACEHOLDERS.some(p => emailDest.toLowerCase().includes(p))) {
      return `⚠️ Adresse email manquante ou invalide : "${emailDest}". À quelle adresse email dois-je envoyer ce devis ?`;
    }
    const googleToken = await clerkClient().then(c => c.users.getUserOauthAccessToken(userId, "google")).then(d => d.data[0]?.token ?? null);
    if (!googleToken) return "Gmail non connecté. Va dans /settings pour connecter ton compte Google.";
    try {
      const subject = `Devis Orbe — ${new Date().toLocaleDateString("fr-FR")}`;
      const body = `Bonjour${nomDest ? ` ${nomDest}` : ""},\n\nVeuillez trouver ci-joint notre devis.\n\n${devis}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement`;
      const email = [`To: ${emailDest}`, `Subject: ${subject}`, `Content-Type: text/plain; charset=utf-8`, ``, body].join("\n");
      const encoded = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, "-").replace(/\//g, "_");
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: encoded }),
      });
      if (!r.ok) return "Erreur lors de l'envoi du devis par email.";
      return `✅ Devis envoyé par email à **${emailDest}**.`;
    } catch { return "Erreur lors de l'envoi du devis."; }
  }

  // ── Finance ──
  if (name === "calculer_tva") {
    const { montant, type, taux } = args as { montant: number; type: "ht" | "ttc"; taux?: number };
    const tvaTaux = taux ?? 20;
    let ht: number, tva: number, ttc: number;
    if (type === "ht") { ht = montant; tva = ht * tvaTaux / 100; ttc = ht + tva; }
    else { ttc = montant; ht = ttc / (1 + tvaTaux / 100); tva = ttc - ht; }
    return `💶 **Calcul TVA ${tvaTaux}%**\n- HT : **${ht.toFixed(2)} €**\n- TVA ${tvaTaux}% : **${tva.toFixed(2)} €**\n- TTC : **${ttc.toFixed(2)} €**`;
  }

  if (name === "generer_devis") {
    const { client, prestation, lignes, conditions, validite, numero } = args as {
      client: { nom: string; adresse?: string; siret?: string };
      prestation: string;
      lignes: { description: string; quantite: number; prixUnitaireHT: number }[];
      conditions?: string;
      validite?: number;
      numero?: string;
    };
    const date = new Date().toLocaleDateString("fr-FR");
    const num = numero ?? `DEV-${Date.now().toString().slice(-6)}`;
    const sousTotal = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT, 0);
    const tva = sousTotal * 0.20;
    const totalTTC = sousTotal + tva;
    const devis = `# DEVIS ${num}
**Date :** ${date}
**Validité :** ${validite ?? 30} jours

---

## Client
**${client.nom}**${client.adresse ? `\n${client.adresse}` : ""}${client.siret ? `\nSIRET : ${client.siret}` : ""}

---

## Prestation : ${prestation}

| Description | Qté | Prix unit. HT | Total HT |
|-------------|-----|--------------|----------|
${lignes.map(l => `| ${l.description} | ${l.quantite} | ${l.prixUnitaireHT.toFixed(2)} € | ${(l.quantite * l.prixUnitaireHT).toFixed(2)} € |`).join("\n")}

---

**Sous-total HT : ${sousTotal.toFixed(2)} €**
**TVA 20% : ${tva.toFixed(2)} €**
**TOTAL TTC : ${totalTTC.toFixed(2)} €**

---

**Conditions de paiement :** ${conditions ?? "30 jours à réception de facture"}
**Pour accepter :** retourner ce devis signé avec la mention "Bon pour accord"

*Ce devis est valable ${validite ?? 30} jours à compter du ${date}.*`;
    return devis;
  }

  return JSON.stringify({ error: `Outil inconnu : ${name}` });
}

// ── Définitions des outils ────────────────────────────────────────────────────

function buildTools(hasGoogle: boolean, hasMicrosoft: boolean, hasWhatsApp: boolean, hasInstagram: boolean, hasApple: boolean, hasNotion: boolean, hasSlack: boolean, hasHubSpot: boolean, hasGitHub: boolean, hasImap: boolean): OpenAI.Chat.ChatCompletionTool[] {
  const tools: OpenAI.Chat.ChatCompletionTool[] = [];

  if (hasGoogle) {
    tools.push(
      { type: "function", function: { name: "lire_emails", description: "Lire emails Gmail (non lus ou filtrés).", parameters: { type: "object" as const, properties: { maxResults: { type: "number" }, query: { type: "string" } } } } },
      { type: "function", function: { name: "rechercher_dans_mes_emails", description: "Rechercher des emails par mot-clé, expéditeur, sujet ou date. Plus puissant que lire_emails pour trouver un email spécifique.", parameters: { type: "object" as const, properties: { query: { type: "string", description: "Requête Gmail (ex: 'from:client@exemple.com devis', 'facture impayée', 'subject:réunion')" }, maxResults: { type: "number" } }, required: ["query"] } } },
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

  if (hasInstagram) {
    tools.push(
      { type: "function", function: { name: "voir_conversations_instagram", description: "Lister les conversations Instagram Direct récentes.", parameters: { type: "object" as const, properties: {} } } },
      { type: "function", function: { name: "lire_messages_instagram", description: "Lire les messages d'une conversation Instagram.", parameters: { type: "object" as const, properties: { conversationId: { type: "string" }, limit: { type: "number" } }, required: ["conversationId"] } } },
      { type: "function", function: { name: "envoyer_instagram", description: "Envoyer un message Instagram Direct.", parameters: { type: "object" as const, properties: { recipientId: { type: "string", description: "Instagram user ID du destinataire" }, message: { type: "string" } }, required: ["recipientId", "message"] } } }
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

  if (hasGitHub) {
    tools.push(
      { type: "function", function: { name: "voir_repos_github", description: "Lister les repos GitHub de l'utilisateur (triés par dernière mise à jour).", parameters: { type: "object" as const, properties: {} } } },
      { type: "function", function: { name: "lire_issues_github", description: "Lister les issues GitHub. Sans repo = toutes les issues assignées à l'utilisateur.", parameters: { type: "object" as const, properties: { repo: { type: "string", description: "owner/repo, ex: victorseiler0-bot/Orbe" }, state: { type: "string", enum: ["open", "closed", "all"] }, limit: { type: "number" } } } } },
      { type: "function", function: { name: "creer_issue_github", description: "Créer une issue dans un repo GitHub.", parameters: { type: "object" as const, properties: { repo: { type: "string", description: "owner/repo" }, title: { type: "string" }, body: { type: "string" }, labels: { type: "array", items: { type: "string" } } }, required: ["repo", "title"] } } },
      { type: "function", function: { name: "voir_prs_github", description: "Lister les pull requests d'un repo GitHub.", parameters: { type: "object" as const, properties: { repo: { type: "string", description: "owner/repo" }, state: { type: "string", enum: ["open", "closed", "all"] }, limit: { type: "number" } }, required: ["repo"] } } }
    );
  }

  if (hasImap) {
    tools.push(
      { type: "function", function: { name: "lire_emails_imap", description: "Lire les emails d'un compte IMAP (entreprise, ESME, etc.).", parameters: { type: "object" as const, properties: { limit: { type: "number" }, unreadOnly: { type: "boolean" } } } } },
      { type: "function", function: { name: "envoyer_email_imap", description: "Envoyer un email depuis le compte IMAP configuré.", parameters: { type: "object" as const, properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } } }
    );
  }

  // Contacts — always available
  tools.push(
    { type: "function", function: { name: "voir_mes_contacts", description: "Voir les contacts enregistrés par l'utilisateur (numéros WhatsApp, emails, notes).", parameters: { type: "object" as const, properties: {} } } },
    { type: "function", function: { name: "ajouter_contact", description: "Ajouter ou mettre à jour un contact (nom, téléphone WhatsApp, email, notes).", parameters: { type: "object" as const, properties: { name: { type: "string" }, phone: { type: "string", description: "Numéro WhatsApp sans + ni espaces" }, email: { type: "string" }, notes: { type: "string" } }, required: ["name"] } } },
    { type: "function", function: { name: "supprimer_contact", description: "Supprimer un contact enregistré par son nom.", parameters: { type: "object" as const, properties: { name: { type: "string" } }, required: ["name"] } } }
  );

  // Web search — always available
  tools.push(
    { type: "function", function: { name: "recherche_web", description: "Rechercher des informations sur internet (actualités, infos entreprises, météo, cours bourse, etc.).", parameters: { type: "object" as const, properties: { query: { type: "string", description: "Requête de recherche en français ou anglais" } }, required: ["query"] } } }
  );

  // French company lookup — always available
  tools.push(
    { type: "function", function: { name: "rechercher_entreprise", description: "Rechercher des informations sur une entreprise française (SIREN, SIRET, adresse, activité, statut) via la base officielle de l'INSEE/gouvernement.", parameters: { type: "object" as const, properties: { query: { type: "string", description: "Nom de l'entreprise, SIREN (9 chiffres) ou SIRET (14 chiffres)" } }, required: ["query"] } } }
  );

  // Météo — always available
  tools.push(
    { type: "function", function: { name: "meteo", description: "Obtenir la météo actuelle pour une ville française ou mondiale.", parameters: { type: "object" as const, properties: { ville: { type: "string", description: "Nom de la ville (ex: Paris, Lyon, Marseille)" } }, required: ["ville"] } } }
  );

  // Recherche contact par nom — always available
  tools.push(
    { type: "function", function: { name: "rechercher_contact_par_nom", description: "Chercher un contact par prénom ou nom dans le CRM Orbe, Google Contacts et les échanges Gmail récents. UTILISER OBLIGATOIREMENT quand l'utilisateur mentionne un prénom sans email ni numéro.", parameters: { type: "object" as const, properties: { prenom: { type: "string", description: "Le prénom ou nom à rechercher" } }, required: ["prenom"] } } }
  );

  // Notes — always available
  tools.push(
    { type: "function", function: { name: "sauvegarder_note", description: "Sauvegarder une note, une idée, un résumé ou un document dans Orbe.", parameters: { type: "object" as const, properties: { titre: { type: "string" }, contenu: { type: "string" }, tags: { type: "array", items: { type: "string" }, description: "Ex: ['client', 'réunion', 'devis']" } }, required: ["titre", "contenu"] } } },
    { type: "function", function: { name: "voir_mes_notes", description: "Voir les notes sauvegardées.", parameters: { type: "object" as const, properties: {} } } }
  );

  // Tâches + productivité — always available
  tools.push(
    { type: "function", function: { name: "voir_taches_du_jour", description: "Voir toutes les tâches et rappels en attente pour aujourd'hui et demain. Utilise en début de conversation ou quand l'utilisateur demande 'qu'est-ce que j'ai à faire'.", parameters: { type: "object" as const, properties: {} } } },
    { type: "function", function: { name: "preparer_reunion", description: "Générer un brief de réunion complet avec ordre du jour, questions clés et prochaines étapes.", parameters: { type: "object" as const, properties: { sujet: { type: "string" }, participants: { type: "array", items: { type: "string" } }, dureeMinutes: { type: "number" }, context: { type: "string" } }, required: ["sujet"] } } },
    { type: "function", function: { name: "trouver_disponibilite", description: "Trouver des créneaux libres dans l'agenda Google Calendar pour planifier une réunion ou un RDV.", parameters: { type: "object" as const, properties: { dureeMinutes: { type: "number", description: "Durée en minutes (défaut: 60)" }, dansJours: { type: "number", description: "Horizon de recherche en jours (défaut: 5)" } } } } }
  );

  // CRM Orbe — always available
  tools.push(
    { type: "function", function: { name: "voir_contacts_crm", description: "Voir les contacts dans le CRM Orbe (nom, email, téléphone, entreprise, statut).", parameters: { type: "object" as const, properties: {} } } },
    { type: "function", function: { name: "creer_contact_crm", description: "Ajouter un nouveau contact dans le CRM Orbe.", parameters: { type: "object" as const, properties: { nom: { type: "string" }, email: { type: "string" }, telephone: { type: "string", description: "Numéro sans + ni espaces" }, entreprise: { type: "string" }, statut: { type: "string", enum: ["prospect", "client", "partenaire", "inactif"] }, notes: { type: "string" } }, required: ["nom"] } } },
    { type: "function", function: { name: "voir_pipeline_crm", description: "Voir tous les deals du pipeline commercial (prospection, devis, négociation, gagné, perdu).", parameters: { type: "object" as const, properties: {} } } },
    { type: "function", function: { name: "creer_deal_crm", description: "Créer un deal dans le pipeline commercial.", parameters: { type: "object" as const, properties: { titre: { type: "string" }, contactName: { type: "string" }, amount: { type: "number", description: "Montant en euros" }, stage: { type: "string", enum: ["prospection", "propose", "negociation", "gagne", "perdu"] }, notes: { type: "string" } }, required: ["titre"] } } }
  );

  // Envoyer devis — available si Google connecté
  if (hasGoogle) {
    tools.push(
      { type: "function", function: { name: "envoyer_devis_par_email", description: "Envoyer un devis généré par email via Gmail. Utilise après generer_devis si l'utilisateur veut l'envoyer.", parameters: { type: "object" as const, properties: { devis: { type: "string", description: "Contenu du devis (copier depuis generer_devis)" }, emailDest: { type: "string", description: "Email du destinataire" }, nomDest: { type: "string" } }, required: ["devis", "emailDest"] } } }
    );
  }

  // Finance FR — always available
  tools.push(
    { type: "function", function: { name: "calculer_tva", description: "Calculer HT/TVA/TTC automatiquement. Utilise ce tool dès que l'utilisateur mentionne un montant et des impôts/taxes.", parameters: { type: "object" as const, properties: { montant: { type: "number" }, type: { type: "string", enum: ["ht", "ttc"], description: "Le montant fourni est HT ou TTC ?" }, taux: { type: "number", description: "Taux TVA en % (défaut: 20)" } }, required: ["montant", "type"] } } },
    { type: "function", function: { name: "generer_devis", description: "Générer un devis professionnel complet au format légal français avec TVA. Propose automatiquement de créer un rappel de suivi.", parameters: { type: "object" as const, properties: { client: { type: "object", properties: { nom: { type: "string" }, adresse: { type: "string" }, siret: { type: "string" } }, required: ["nom"] }, prestation: { type: "string" }, lignes: { type: "array", items: { type: "object", properties: { description: { type: "string" }, quantite: { type: "number" }, prixUnitaireHT: { type: "number" } }, required: ["description", "quantite", "prixUnitaireHT"] } }, conditions: { type: "string" }, validite: { type: "number", description: "Validité en jours (défaut: 30)" }, numero: { type: "string" } }, required: ["client", "prestation", "lignes"] } } }
  );

  // Rappels — always available
  tools.push(
    { type: "function", function: { name: "creer_rappel", description: "Créer un rappel pour l'utilisateur (relance client, suivi devis, paiement, rendez-vous, etc.). Propose automatiquement un rappel après avoir rédigé un devis ou une relance.", parameters: { type: "object" as const, properties: { titre: { type: "string", description: "Titre court du rappel, ex: 'Relance devis Martin'" }, note: { type: "string", description: "Détails optionnels" }, dansJours: { type: "number", description: "Dans combien de jours (ex: 3 pour dans 3 jours)" }, canal: { type: "string", enum: ["push", "wa", "dashboard"], description: "Canal de notification (push = notification navigateur)" } }, required: ["titre", "dansJours"] } } },
    { type: "function", function: { name: "voir_rappels", description: "Voir les rappels en attente de l'utilisateur.", parameters: { type: "object" as const, properties: {} } } }
  );

  return tools;
}

// ── Handler principal ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const body = await req.json();
    const message = String(body?.message ?? "").slice(0, 4000).trim();
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body?.history)
      ? body.history.slice(-16).filter((m: unknown) => {
          const msg = m as Record<string, unknown>;
          return (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string";
        })
      : [];
    const bridgeData: BridgeData = body?.bridgeData ?? {};
    if (!message) return NextResponse.json({ error: "Message vide." }, { status: 400 });

    const { allowed, remaining } = await checkAndIncrementAction(userId);
    if (!allowed) return NextResponse.json({
      error: "Limite journalière atteinte. Passez au plan Pro pour continuer.",
      upgrade: true,
    }, { status: 429 });

    // Récupère tous les tokens avant de démarrer le stream
    let googleToken: string | null = null;
    let msToken: string | null = null;
    let whapiToken: string | null = process.env.WHAPI_TOKEN || null;
    let appleCredentials: { email: string; appPassword: string } | null = null;
    let notionToken: string | null = null;
    let slackToken: string | null = null;
    let hubspotToken: string | null = null;
    let pdAccountIds: Record<string, string> = {};
    let waStoredMessages: WaMessage[] = [];
    let imapConfig: ImapConfig | null = null;
    let igMeta: { token: string; pageId: string } | null = null;
    let userContacts: SavedContact[] = [];
    let userProfile: UserProfile = {};
    const waMetaToken = process.env.WHATSAPP_TOKEN;
    const waPhoneId   = process.env.WHATSAPP_PHONE_NUMBER_ID;
    try {
      const client = await clerkClient();
      const [gData, mData] = await Promise.allSettled([
        client.users.getUserOauthAccessToken(userId, "google"),
        client.users.getUserOauthAccessToken(userId, "microsoft"),
      ]);
      if (gData.status === "fulfilled") googleToken = gData.value.data[0]?.token ?? null;
      if (mData.status === "fulfilled") msToken = mData.value.data[0]?.token ?? null;
      if (!whapiToken) whapiToken = (await getUserWhapiMeta(userId)).token;
      const u = await client.users.getUser(userId);
      const pm = u.privateMetadata as Record<string, unknown>;
      if (pm.appleEmail && pm.appleAppPassword) {
        appleCredentials = { email: pm.appleEmail as string, appPassword: pm.appleAppPassword as string };
      }
      if (pm.notionToken) notionToken = pm.notionToken as string;
      if (pm.slackToken) slackToken = pm.slackToken as string;
      if (pm.hubspotToken) hubspotToken = pm.hubspotToken as string;
      pdAccountIds = (pm.pipedream as Record<string, string>) ?? {};
      waStoredMessages = (pm.waMessages as WaMessage[]) ?? [];
      if (pm.imap) imapConfig = pm.imap as ImapConfig;
      if (pm.igMeta) igMeta = pm.igMeta as { token: string; pageId: string };
      userContacts = (pm.userContacts as SavedContact[]) ?? [];
      userProfile = (pm.userProfile as UserProfile) ?? {};

      if (waMetaToken && waPhoneId && !pm.wabaSubscribed) {
        autoSubscribeWaba(waMetaToken, waPhoneId, userId, client).catch(() => {});
      }
    } catch { /* no tokens */ }

    const hasApple = !!appleCredentials;
    const hasNotion = !!notionToken;
    const hasSlack = !!slackToken;
    const hasHubSpot = !!hubspotToken;
    const hasGitHub = !!pdAccountIds.github;
    const hasMicrosoft = !!msToken || !!pdAccountIds.microsoft_outlook;
    const hasWhatsApp = !!whapiToken || !!waMetaToken || !!pdAccountIds.whatsapp_business || bridgeData.wa?.connected === true;
    const hasInstagram = !!pdAccountIds.instagram_business || !!igMeta?.token;
    const hasImap = !!imapConfig;
    const allTools = buildTools(!!googleToken, hasMicrosoft, hasWhatsApp, hasInstagram, hasApple, hasNotion, hasSlack, hasHubSpot, hasGitHub, hasImap);

    const intent = classifyIntent(message, history);
    const agentTools = filterTools(allTools, intent);

    // Stream SSE avec events outils en temps réel
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };

        const clientActions: ClientAction[] = [];
        let currentModel = PRIMARY_MODEL;
        let compact = false;

        const buildMessages = (): OpenAI.Chat.ChatCompletionMessageParam[] => [
          { role: "system", content: buildSystemPrompt(compact, userContacts, userProfile, intent) },
          ...history.slice(compact ? -2 : -16).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: message },
        ];

        let messages = buildMessages();

        try {
          for (let i = 0; i < 5; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let completion: any;
            const activeTools = compact ? compactTools(agentTools) : (agentTools.length > 0 ? agentTools : undefined);

            for (let attempt = 0; attempt < 4; attempt++) {
              try {
                completion = await getAI().chat.completions.create({
                  model: currentModel,
                  messages,
                  tools: activeTools,
                  tool_choice: activeTools && activeTools.length > 0 ? "auto" : undefined,
                  max_tokens: 1024,
                  temperature: 0.3,
                });
                break;
              } catch (err: unknown) {
                const e = err as Record<string, unknown>;
                const status = e?.status as number | undefined;
                if (status === 413 && !compact) {
                  compact = true;
                  messages = buildMessages();
                  continue;
                }
                if ((status !== 429 && status !== 413) || attempt >= 3) throw err;
                const h = e?.headers;
                const retryAfterRaw: string | null =
                  h && typeof (h as { get?: unknown }).get === "function"
                    ? (h as { get: (k: string) => string | null }).get("retry-after")
                    : ((h as Record<string, string>)?.["retry-after"] ?? null);
                const retryAfterSec = parseFloat(retryAfterRaw ?? "0");
                const isTPD = retryAfterSec > 15 || (e?.code as string) === "rate_limit_exceeded";
                if (isTPD && currentModel !== FALLBACK_MODEL) {
                  currentModel = FALLBACK_MODEL;
                  continue;
                }
                await new Promise(r => setTimeout(r, Math.min(retryAfterSec * 1000 || 3000, 6000)));
              }
            }

            if (!completion) break;
            const choice = completion.choices[0];
            const msg = choice.message;

            if (!msg.tool_calls?.length || choice.finish_reason === "stop") {
              const text = msg.content ?? "";
              const CHUNK = 6;
              for (let j = 0; j < text.length; j += CHUNK) {
                send({ c: text.slice(j, j + CHUNK) });
              }
              send({ done: true, clientActions, remaining });
              controller.close();
              return;
            }

            messages.push(msg as OpenAI.Chat.ChatCompletionMessageParam);

            // Signaler les outils appelés au client
            for (const tc of msg.tool_calls) {
              send({ tool: tc.function?.name ?? "" });
            }

            const toolResults = await Promise.all(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              msg.tool_calls.map(async (tc: any) => {
                let args: Record<string, unknown> = {};
                try { const p = JSON.parse(tc.function?.arguments ?? "{}"); if (p && typeof p === "object" && !Array.isArray(p)) args = p; } catch {}
                const name: string = tc.function?.name ?? "";
                const result = await executeTool(name, args, googleToken, msToken, whapiToken, bridgeData, clientActions, appleCredentials, notionToken, slackToken, hubspotToken, pdAccountIds, userId, waStoredMessages, waMetaToken, waPhoneId, imapConfig, igMeta);
                send({ tool_done: name });
                return { tool_call_id: tc.id, role: "tool" as const, content: result };
              })
            );
            messages.push(...toolResults);
          }

          send({ c: "Désolé, je n'ai pas pu terminer cette action." });
          send({ done: true, clientActions, remaining: 0 });
          controller.close();
        } catch (err) {
          console.error("[assistant]", err);
          const errMsg = (err as Record<string, unknown>)?.message as string | undefined;
          const friendly = errMsg?.includes("rate_limit") || errMsg?.includes("429")
            ? "Je suis temporairement surchargé. Réessaie dans quelques secondes."
            : "Une erreur inattendue s'est produite. Réessaie.";
          send({ c: friendly });
          send({ done: true, clientActions: [], remaining: 0 });
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[assistant outer]", err);
    return NextResponse.json({ response: "Une erreur inattendue s'est produite. Réessaie." }, { status: 200 });
  }
}
