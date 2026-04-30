import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Tu es l'assistant IA personnel de l'utilisateur.
Tu réponds toujours en français, de manière concise et utile.
Date et heure actuelles : ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}

Outils disponibles selon les connexions de l'utilisateur :
- Google connecté : lire_emails, envoyer_email, voir_agenda, creer_evenement (Gmail + Google Calendar)
- Microsoft connecté : lire_emails_outlook, envoyer_email_outlook, voir_agenda_outlook, lire_teams (Outlook + Teams)
- WhatsApp connecté : voir_chats_whatsapp, lire_messages_whatsapp, envoyer_whatsapp, voir_contacts_whatsapp
- Apple connecté : voir_calendrier_apple, creer_evenement_apple, voir_contacts_apple

Quand tu utilises un outil, interprète les résultats et réponds naturellement.
Si un outil échoue, explique à l'utilisateur qu'il doit connecter le service dans les Paramètres.`;

// ── WhatsApp bridge ────────────────────────────────────────────────────────────

const WA_BRIDGE = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";

async function waFetch(path: string) {
  try {
    const r = await fetch(`${WA_BRIDGE}/${path}`, { signal: AbortSignal.timeout(5000) });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
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
  } catch {
    return null;
  }
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
  bridgeData: BridgeData,
  clientActions: ClientAction[]
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
    // Récupère les derniers messages du premier chat
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

  // ─── Apple iCloud (données pré-récupérées par le client) ────────────────────
  if (name === "voir_calendrier_apple") {
    if (!bridgeData.apple?.configured) return JSON.stringify({ error: "Apple non configuré. Va dans Paramètres > Apple iCloud." });
    if (bridgeData.apple.calendar?.length !== undefined) return JSON.stringify({ events: bridgeData.apple.calendar });
    const data = await waFetch("apple/calendar");
    if (!data) return JSON.stringify({ error: "Impossible de récupérer le calendrier Apple." });
    return JSON.stringify({ events: data.events });
  }

  if (name === "creer_evenement_apple") {
    if (!bridgeData.apple?.configured) return JSON.stringify({ error: "Apple non configuré." });
    const { summary, start, end, location, description } = args as { summary: string; start: string; end: string; location?: string; description?: string };
    // Action exécutée côté client (le bridge est local)
    clientActions.push({ type: "create_apple_event", event: { summary, start, end, location, description } });
    return JSON.stringify({ success: true, message: "Événement créé dans Apple Calendar." });
  }

  if (name === "voir_contacts_apple") {
    if (!bridgeData.apple?.configured) return JSON.stringify({ error: "Apple non configuré." });
    if (bridgeData.apple.contacts?.length !== undefined) return JSON.stringify({ contacts: bridgeData.apple.contacts });
    const data = await waFetch("apple/contacts");
    if (!data) return JSON.stringify({ error: "Impossible de récupérer les contacts Apple." });
    return JSON.stringify({ contacts: data.contacts });
  }

  // ─── WhatsApp (données pré-récupérées par le client) ──────────────────────
  if (name === "voir_chats_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté. Va dans Paramètres > WhatsApp pour connecter ton compte." });
    if (bridgeData.wa.chats) return JSON.stringify({ chats: bridgeData.wa.chats });
    const data = await waFetch("chats");
    if (!data) return JSON.stringify({ error: "Impossible de récupérer les conversations." });
    return JSON.stringify({ chats: data.chats });
  }

  if (name === "lire_messages_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    const { jid, limit } = args as { jid?: string; limit?: number };
    if (!jid) {
      return JSON.stringify({ chats: (bridgeData.wa.chats ?? []).slice(0, 5), hint: "Précise un jid pour lire une conversation." });
    }
    // Cherche dans les messages pré-récupérés
    if (bridgeData.wa.messages?.[jid]) {
      const msgs = bridgeData.wa.messages[jid].slice(0, limit ?? 20);
      return JSON.stringify({ messages: msgs });
    }
    // Fallback vers bridge (fonctionne en développement local)
    const data = await waFetch(`messages/${encodeURIComponent(jid)}?limit=${limit ?? 20}`);
    if (!data) return JSON.stringify({ error: "Conversation introuvable ou bridge inaccessible." });
    return JSON.stringify({ messages: data.messages });
  }

  if (name === "envoyer_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    const { to, message } = args as { to: string; message: string };
    if (!to || !message) return JSON.stringify({ error: "Destinataire et message requis." });
    // Action exécutée côté client (le bridge est local)
    clientActions.push({ type: "send_whatsapp", to, message });
    return JSON.stringify({ success: true, message: "Message WhatsApp envoyé." });
  }

  if (name === "voir_contacts_whatsapp") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    if (bridgeData.wa.contacts) return JSON.stringify({ contacts: (bridgeData.wa.contacts as unknown[]).slice(0, 30) });
    const data = await waFetch("contacts");
    if (!data) return JSON.stringify({ error: "Impossible de récupérer les contacts." });
    return JSON.stringify({ contacts: data.contacts?.slice(0, 30) });
  }

  if (name === "messages_envoyes") {
    if (!bridgeData.wa?.connected) return JSON.stringify({ error: "WhatsApp non connecté." });
    const data = await waFetch("sent");
    if (!data) return JSON.stringify({ error: "Impossible de récupérer les messages envoyés." });
    return JSON.stringify({ messages: data.messages });
  }

  return JSON.stringify({ error: `Outil inconnu : ${name}` });
}

// ── Définitions des outils pour Groq ──────────────────────────────────────────

function buildTools(hasGoogle: boolean, hasMicrosoft: boolean, hasWhatsApp: boolean, hasApple: boolean): Groq.Chat.ChatCompletionTool[] {
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

    // Utilise les flags WA/Apple pré-vérifiés par le client (le bridge est local, inatteignable depuis Vercel)
    const hasWhatsApp = bridgeData.wa?.connected === true;
    const hasApple = bridgeData.apple?.configured === true;

    // Récupère les tokens OAuth Google + Microsoft
    let googleToken: string | null = null;
    let msToken: string | null = null;
    try {
      const client = await clerkClient();
      const [gData, mData] = await Promise.allSettled([
        client.users.getUserOauthAccessToken(userId, "google"),
        client.users.getUserOauthAccessToken(userId, "microsoft"),
      ]);
      if (gData.status === "fulfilled") googleToken = gData.value.data[0]?.token ?? null;
      if (mData.status === "fulfilled") msToken = mData.value.data[0]?.token ?? null;
    } catch { /* no tokens */ }

    const tools = buildTools(!!googleToken, !!msToken, hasWhatsApp, hasApple);

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
        return NextResponse.json({ response: msg.content ?? "", clientActions });
      }

      messages.push(msg as Groq.Chat.ChatCompletionMessageParam);
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments); } catch {}
          const result = await executeTool(tc.function.name, args, googleToken, msToken, bridgeData, clientActions);
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
