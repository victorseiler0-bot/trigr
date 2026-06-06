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

type WaMessage = { id: string; from: string; fromName: string; text: string; timestamp: number; incoming: boolean; read: boolean };
type UserProfile = { businessName?: string; profession?: string; city?: string; tone?: "formal" | "informal"; context?: string };

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
    const profile = (meta.userProfile as UserProfile) ?? {};
    const firstName = user.firstName ?? "";

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
          const time = s?.dateTime ? new Date(s.dateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "Toute la journée";
          const location = e.location ? ` (${String(e.location).slice(0, 40)})` : "";
          return `  • ${time} — ${e.summary ?? "Sans titre"}${location}`;
        });
        sections.push(`📅 AGENDA DU JOUR (${events.length} événement${events.length > 1 ? "s" : ""}) :\n${events.length > 0 ? events.join("\n") : "  • Aucun événement aujourd'hui"}`);
      } catch { /* skip */ }

      // — Gmail unread
      try {
        const list = await gFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=8", googleToken);
        const total = list.resultSizeEstimate ?? 0;
        if (list.messages?.length) {
          const emails = await Promise.all(list.messages.slice(0, 5).map(async (m: { id: string }) => {
            const msg = await gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, googleToken);
            const hdr: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
            const from = hdr.find(h => h.name === "From")?.value?.replace(/<.*>/, "").replace(/"/g, "").trim() ?? "?";
            const subj = hdr.find(h => h.name === "Subject")?.value ?? "Sans objet";
            return `  • ${from.slice(0, 30)}: ${subj.slice(0, 60)}`;
          }));
          sections.push(`✉️ EMAILS NON LUS (${total > 5 ? total + " au total" : total}) :\n${emails.join("\n")}`);
        } else {
          sections.push("✉️ EMAILS : Boîte vide ✅");
        }
      } catch { /* skip */ }
    }

    // — WhatsApp unread from stored messages
    const waMessages = (meta.waMessages as WaMessage[]) ?? [];
    const waUnread = waMessages.filter(m => m.incoming && !m.read);
    if (waUnread.length > 0) {
      const bySender = new Map<string, number>();
      for (const m of waUnread) {
        bySender.set(m.fromName ?? m.from, (bySender.get(m.fromName ?? m.from) ?? 0) + 1);
      }
      const senders = Array.from(bySender.entries()).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(", ");
      sections.push(`💬 WHATSAPP : ${waUnread.length} message${waUnread.length > 1 ? "s" : ""} non lu${waUnread.length > 1 ? "s" : ""} de : ${senders}`);
    } else if (waToken && waPhoneId) {
      sections.push("💬 WHATSAPP : Aucun nouveau message");
    }

    // — Automations run today
    type Automation = { id: string; name: string };
    const automations = (meta.automations as Automation[]) ?? [];
    const todayResults = automations
      .filter(a => {
        const resultDate = meta[`autoResultDate_${a.id}`] as string | undefined;
        return resultDate && resultDate.startsWith(new Date().toISOString().slice(0, 10));
      })
      .map(a => `  • ${a.name}`);
    if (todayResults.length > 0) {
      sections.push(`⚡ AUTOMATISATIONS executées aujourd'hui :\n${todayResults.join("\n")}`);
    }

    if (sections.length === 0) return null;

    // — AI summary
    const ai = getAI();
    const model = USE_GEMINI ? "gemini-2.0-flash" : "llama-3.3-70b-versatile";
    const rawData = sections.join("\n\n");
    const profileHint = profile.profession ? ` Métier de l'utilisateur : ${profile.profession}.` : "";
    const nameHint = firstName ? ` Prénom : ${firstName}.` : "";

    const completion = await ai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Tu es un assistant IA personnel francophone.${nameHint}${profileHint} Génère un brief du matin synthétique et actionnable pour ${date}. Maximum 180 mots.
Format :
- Commence par "☀️ Bonjour${firstName ? ` ${firstName}` : ""} !"
- 2-3 bullet points ACTIONS URGENTES si nécessaire
- Résume les points importants de façon concise
- Termine par une phrase de motivation courte (≤ 10 mots)
Sois direct, professionnel et positif.`
        },
        { role: "user", content: rawData }
      ],
      max_tokens: 400,
      temperature: 0.4,
    });

    return completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[morning-brief] Error:", err);
    return null;
  }
}
