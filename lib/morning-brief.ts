import { clerkClient } from "@clerk/nextjs/server";
import OpenAI from "openai";

const USE_GEMINI = !!process.env.GEMINI_API_KEY;

function getAI(): OpenAI {
  return USE_GEMINI
    ? new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" })
    : new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
}

async function gFetch(url: string, token: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

export async function generateMorningBrief(userId: string): Promise<string | null> {
  try {
    const clerk = await clerkClient();
    const [gData, user] = await Promise.all([
      clerk.users.getUserOauthAccessToken(userId, "google"),
      clerk.users.getUser(userId),
    ]);

    const googleToken = gData.data[0]?.token ?? null;
    const meta = user.privateMetadata as Record<string, unknown>;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const waToken = process.env.WHATSAPP_TOKEN;

    const sections: string[] = [];
    const date = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

    // — Google Calendar
    if (googleToken) {
      try {
        const now = new Date();
        const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);
        const cal = await gFetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&maxResults=8&orderBy=startTime&singleEvents=true`,
          googleToken
        );
        const events = (cal.items ?? []).map((e: Record<string, unknown>) => {
          const s = e.start as Record<string, string>;
          const time = s?.dateTime ? new Date(s.dateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "Journée";
          return `  • ${time} — ${e.summary ?? "Sans titre"}`;
        });
        sections.push(`📅 AGENDA (${events.length} événement${events.length > 1 ? "s" : ""}) :\n${events.length > 0 ? events.join("\n") : "  • Aucun événement aujourd'hui"}`);
      } catch { /* skip */ }

      // — Gmail unread
      try {
        const list = await gFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=5", googleToken);
        if (list.messages?.length) {
          const emails = await Promise.all(list.messages.slice(0, 5).map(async (m: { id: string }) => {
            const msg = await gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, googleToken);
            const hdr: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
            const from = hdr.find(h => h.name === "From")?.value?.replace(/<.*>/, "").trim() ?? "?";
            const subj = hdr.find(h => h.name === "Subject")?.value ?? "Sans objet";
            return `  • ${from}: ${subj.slice(0, 60)}`;
          }));
          sections.push(`✉️ EMAILS NON LUS (${list.resultSizeEstimate ?? "?"}+) — les 5 premiers :\n${emails.join("\n")}`);
        } else {
          sections.push("✉️ EMAILS : Boîte vide ✅");
        }
      } catch { /* skip */ }
    }

    // — WhatsApp unread count
    if (waToken && waPhoneId) {
      sections.push("💬 WhatsApp : messages disponibles dans l'assistant");
    }

    if (sections.length === 0) return null;

    // — AI summary
    const ai = getAI();
    const model = USE_GEMINI ? "gemini-2.0-flash" : "llama-3.3-70b-versatile";
    const rawData = sections.join("\n\n");

    const completion = await ai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Tu es un assistant IA personnel. Génère un brief du matin court et actionnable en français pour ${date}. Maximum 150 mots. Format : titre court + points clés. Commence par "☀️ Bonjour !".`
        },
        { role: "user", content: rawData }
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[morning-brief] Error:", err);
    return null;
  }
}
