import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Tu es l'assistant IA personnel de l'utilisateur, intégré à sa boîte Gmail et son Google Calendar.
Tu réponds toujours en français, de manière concise et utile.
Tu as accès aux outils suivants pour interagir avec les données réelles de l'utilisateur :
- lire_emails : lire les emails Gmail
- envoyer_email : envoyer un email
- voir_agenda : voir l'agenda Google Calendar
- creer_evenement : créer un événement

Date et heure actuelles : ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
Quand tu utilises un outil, interprète les résultats et réponds naturellement à l'utilisateur.`;

// ── Gmail helpers ──────────────────────────────────────────────────────────────

async function gmailFetch(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  return r.json();
}

async function calendarFetch(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  return r.json();
}

function decodeBase64(s: string) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function encodeBase64url(s: string) {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Tool execution ─────────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, googleToken: string | null): Promise<string> {
  if (!googleToken) return JSON.stringify({ error: "Pas de token Google. L'utilisateur doit se connecter avec Google." });

  try {
    if (name === "lire_emails") {
      const q = (args.query as string) || "is:unread";
      const max = (args.maxResults as number) || 8;
      const list = await gmailFetch(`/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${max}`, googleToken);
      if (!list.messages?.length) return JSON.stringify({ emails: [], message: "Aucun email trouvé." });

      const emails = await Promise.all(
        list.messages.slice(0, Math.min(max, 5)).map(async (m: { id: string }) => {
          const msg = await gmailFetch(`/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, googleToken);
          const headers: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
          const get = (n: string) => headers.find((h) => h.name === n)?.value ?? "";
          return { id: m.id, from: get("From"), subject: get("Subject"), date: get("Date"), snippet: msg.snippet };
        })
      );
      return JSON.stringify({ emails, total: list.resultSizeEstimate });
    }

    if (name === "lire_email_detail") {
      const id = args.id as string;
      const msg = await gmailFetch(`/users/me/messages/${id}?format=full`, googleToken);
      const headers: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
      const get = (n: string) => headers.find((h) => h.name === n)?.value ?? "";

      let body = "";
      const parts = msg.payload?.parts ?? [msg.payload];
      for (const part of parts) {
        if (part?.mimeType === "text/plain" && part?.body?.data) {
          body = decodeBase64(part.body.data);
          break;
        }
      }
      return JSON.stringify({ from: get("From"), subject: get("Subject"), date: get("Date"), body: body.slice(0, 3000) });
    }

    if (name === "envoyer_email") {
      const { to, subject, body } = args as { to: string; subject: string; body: string };
      const raw = encodeBase64url(
        `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
      );
      const result = await gmailFetch("/users/me/messages/send", googleToken, {
        method: "POST",
        body: JSON.stringify({ raw }),
      });
      return result.id ? JSON.stringify({ success: true, messageId: result.id }) : JSON.stringify({ error: result });
    }

    if (name === "voir_agenda") {
      const now = new Date();
      const timeMin = (args.timeMin as string) || now.toISOString();
      const timeMax = (args.timeMax as string) || new Date(now.getTime() + 7 * 86400000).toISOString();
      const max = (args.maxResults as number) || 10;
      const data = await calendarFetch(
        `/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${max}&orderBy=startTime&singleEvents=true`,
        googleToken
      );
      const events = (data.items ?? []).map((e: Record<string, unknown>) => {
        const s = (e.start as Record<string, string>) ?? {};
        const en = (e.end as Record<string, string>) ?? {};
        return { summary: e.summary, start: s.dateTime ?? s.date, end: en.dateTime ?? en.date, location: e.location, description: e.description };
      });
      return JSON.stringify({ events, timezone: data.timeZone });
    }

    if (name === "creer_evenement") {
      const { summary, start, end, description } = args as { summary: string; start: string; end: string; description?: string };
      const event = {
        summary,
        description,
        start: { dateTime: start, timeZone: "Europe/Paris" },
        end: { dateTime: end, timeZone: "Europe/Paris" },
      };
      const result = await calendarFetch("/calendars/primary/events", googleToken, {
        method: "POST",
        body: JSON.stringify(event),
      });
      return result.id ? JSON.stringify({ success: true, eventId: result.id, link: result.htmlLink }) : JSON.stringify({ error: result });
    }

    return JSON.stringify({ error: `Outil inconnu : ${name}` });
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

// ── Tool definitions for Groq ──────────────────────────────────────────────────

const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "lire_emails",
      description: "Lire les emails récents ou non lus de la boîte Gmail.",
      parameters: {
        type: "object" as const,
        properties: {
          maxResults: { type: "number", description: "Nombre max d'emails à récupérer (défaut 8)" },
          query: { type: "string", description: "Filtre Gmail, ex: 'is:unread', 'from:boss@co.com'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "envoyer_email",
      description: "Envoyer un email via Gmail au nom de l'utilisateur.",
      parameters: {
        type: "object" as const,
        properties: {
          to: { type: "string", description: "Adresse email du destinataire" },
          subject: { type: "string", description: "Sujet de l'email" },
          body: { type: "string", description: "Corps de l'email en texte brut" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "voir_agenda",
      description: "Voir les événements Google Calendar de l'utilisateur.",
      parameters: {
        type: "object" as const,
        properties: {
          timeMin: { type: "string", description: "Date de début ISO 8601 (défaut: maintenant)" },
          timeMax: { type: "string", description: "Date de fin ISO 8601 (défaut: +7 jours)" },
          maxResults: { type: "number", description: "Nombre max d'événements (défaut 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "creer_evenement",
      description: "Créer un événement dans Google Calendar.",
      parameters: {
        type: "object" as const,
        properties: {
          summary: { type: "string", description: "Titre de l'événement" },
          start: { type: "string", description: "Date/heure de début ISO 8601" },
          end: { type: "string", description: "Date/heure de fin ISO 8601" },
          description: { type: "string", description: "Description optionnelle" },
        },
        required: ["summary", "start", "end"],
      },
    },
  },
];

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const message = String(body?.message ?? "").slice(0, 4000).trim();
    const history: Array<{ role: string; content: string }> = Array.isArray(body?.history) ? body.history.slice(-16) : [];

    if (!message) return NextResponse.json({ error: "Message vide." }, { status: 400 });

    // Récupère le token Google
    let googleToken: string | null = null;
    try {
      const client = await clerkClient();
      const { data } = await client.users.getUserOauthAccessToken(userId, "google");
      googleToken = data[0]?.token ?? null;
    } catch {
      // pas de token Google
    }

    // Construit les messages
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    // Boucle tool-calling (max 5 tours)
    for (let i = 0; i < 5; i++) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: googleToken ? TOOLS : undefined,
        tool_choice: googleToken ? "auto" : undefined,
        max_tokens: 1024,
        temperature: 0.3,
      });

      const choice = completion.choices[0];
      const msg = choice.message;

      if (!msg.tool_calls?.length || choice.finish_reason === "stop") {
        return NextResponse.json({ response: msg.content ?? "" });
      }

      // Exécute les tools en parallèle
      messages.push(msg as Groq.Chat.ChatCompletionMessageParam);
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments); } catch {}
          const result = await executeTool(tc.function.name, args, googleToken);
          return { tool_call_id: tc.id, role: "tool" as const, content: result };
        })
      );
      messages.push(...toolResults);
    }

    return NextResponse.json({ response: "Désolé, je n'ai pas pu terminer cette action." });
  } catch (err) {
    console.error("[assistant]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
