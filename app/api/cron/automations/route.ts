import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import OpenAI from "openai";

export const maxDuration = 300;

type Automation = {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  channel: "wa" | "dashboard";
  enabled: boolean;
  lastRun?: string;
};

const SCHEDULE_UTC_HOUR: Record<string, { hour: number; weekday?: number }> = {
  daily_7am:      { hour: 5 },
  daily_8am:      { hour: 6 },
  daily_9am:      { hour: 7 },
  daily_6pm:      { hour: 16 },
  weekly_monday:  { hour: 6, weekday: 1 },
  weekly_friday:  { hour: 16, weekday: 5 },
};

function isDue(schedule: string, lastRun?: string): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  const config = SCHEDULE_UTC_HOUR[schedule];
  if (!config) return false;
  if (config.hour !== utcHour) return false;
  if (config.weekday !== undefined && config.weekday !== utcDay) return false;
  // Don't re-run if already ran in the last 23 hours
  if (lastRun) {
    const diff = Date.now() - new Date(lastRun).getTime();
    if (diff < 23 * 60 * 60 * 1000) return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const USE_GEMINI = !!process.env.GEMINI_API_KEY;
  const ai = USE_GEMINI
    ? new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" })
    : new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  const model = USE_GEMINI ? "gemini-2.0-flash" : "llama-3.3-70b-versatile";

  const userIds = (process.env.AUTOMATION_USER_IDS ?? process.env.ADMIN_CLERK_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!userIds.length) return NextResponse.json({ processed: 0 });

  const clerk = await clerkClient();
  const results: { userId: string; automationId: string; ok: boolean }[] = [];

  for (const userId of userIds) {
    try {
      const user = await clerk.users.getUser(userId);
      const automations = (user.privateMetadata.automations as Automation[] | undefined) ?? [];
      const due = automations.filter(a => a.enabled && isDue(a.schedule, a.lastRun));

      for (const auto of due) {
        try {
          const completion = await ai.chat.completions.create({
            model,
            messages: [
              { role: "system", content: `Tu es Orbe, assistant IA. Date: ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}. Réponds en français, concis.` },
              { role: "user", content: auto.prompt },
            ],
            max_tokens: 500,
          });
          const result = completion.choices[0]?.message?.content ?? "Aucune réponse.";

          const updatedAutomations = automations.map(a =>
            a.id === auto.id ? { ...a, lastRun: new Date().toISOString() } : a
          );
          await clerk.users.updateUserMetadata(userId, {
            privateMetadata: {
              automations: updatedAutomations,
              [`autoResult_${auto.id}`]: result,
              [`autoResultDate_${auto.id}`]: new Date().toISOString(),
            },
          });

          // WhatsApp delivery if configured
          if (auto.channel === "wa") {
            const waNumber = (user.privateMetadata.briefWaNumber as string | undefined) ?? "";
            const waToken = (user.privateMetadata.whapiToken as string | undefined) ?? "";
            if (waNumber && waToken) {
              await fetch(`https://gate.whapi.cloud/messages/text`, {
                method: "POST",
                headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ to: `${waNumber}@c.us`, body: `🤖 *${auto.name}*\n\n${result}` }),
              });
            }
          }

          results.push({ userId, automationId: auto.id, ok: true });
        } catch {
          results.push({ userId, automationId: auto.id, ok: false });
        }
      }
    } catch { /* user not found */ }
  }

  return NextResponse.json({ processed: results.length, results });
}
