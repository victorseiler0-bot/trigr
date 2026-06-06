import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { storeWaMessage, sendMetaWaMessage, markWaRead, type WaMessage } from "@/lib/whatsapp-meta";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

// ── Webhook verification (Meta GET) ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge"), { status: 200 });
  }
  return NextResponse.json({ ok: true });
}

// ── Messages entrants (Meta POST) ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const sig      = req.headers.get("x-hub-signature-256") ?? "";
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const sigBuf   = Buffer.from(sig.padEnd(expected.length));
    const expBuf   = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ status: "ok" }); }

  const entries = body?.entry as Array<Record<string, unknown>> | undefined;
  const changes = entries?.[0]?.changes as Array<Record<string, unknown>> | undefined;
  const value   = changes?.[0] as Record<string, unknown> | undefined;
  const val     = value?.value as Record<string, unknown> | undefined;
  const message = (val?.messages as Array<Record<string, unknown>>)?.[0];
  if (!message) return NextResponse.json({ status: "ok" });

  const from      = message.from as string;
  const fromName  = ((val?.contacts as Array<Record<string, unknown>>)?.[0]?.profile as Record<string, string>)?.name ?? from;
  const msgId     = message.id as string;
  const text      = message.type === "text" ? (message.text as Record<string, string>)?.body : `[${message.type}]`;
  const timestamp = Number(message.timestamp ?? Math.floor(Date.now() / 1000));

  await storeWaMessage({ id: msgId, from, fromName, text: text ?? "", timestamp, incoming: true });
  await markWaRead(msgId).catch(() => {});

  if (message.type === "text" && text) {
    const reply = await generateSmartResponse(text, from, fromName);
    if (reply) {
      await sendMetaWaMessage(from, reply);
      await storeWaMessage({ id: `sent_${Date.now()}`, from: "me", fromName: "Trigr", text: reply, timestamp: Math.floor(Date.now() / 1000), incoming: false });
    }
  }

  return NextResponse.json({ status: "ok" });
}

type WaRule = {
  id: string;
  trigger: string;      // keyword/phrase (case-insensitive)
  triggerType: "contains" | "exact" | "starts";
  action: "reply_template" | "reply_ai" | "ignore";
  replyText?: string;   // pour reply_template
  enabled: boolean;
};

type UserProfile = {
  businessName?: string;
  profession?: string;
  city?: string;
  tone?: "formal" | "informal";
  context?: string;
};

async function getAdminContext(): Promise<{
  profile: UserProfile;
  waRules: WaRule[];
  allMessages: WaMessage[];
} | null> {
  const adminId = (process.env.ADMIN_CLERK_USER_IDS ?? "").split(",")[0].trim();
  if (!adminId) return null;

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(adminId);
    const pm = user.privateMetadata as Record<string, unknown>;
    return {
      profile: (pm.userProfile as UserProfile) ?? {},
      waRules: (pm.waRules as WaRule[]) ?? [],
      allMessages: (pm.waMessages as WaMessage[]) ?? [],
    };
  } catch { return null; }
}

function matchRule(text: string, rules: WaRule[]): WaRule | null {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const kw = rule.trigger.toLowerCase();
    let match = false;
    if (rule.triggerType === "contains") match = lower.includes(kw);
    else if (rule.triggerType === "exact")   match = lower === kw;
    else if (rule.triggerType === "starts")  match = lower.startsWith(kw);
    if (match) return rule;
  }
  return null;
}

async function generateSmartResponse(userMessage: string, from: string, fromName: string): Promise<string | null> {
  const ctx = await getAdminContext();

  // Check WA rules first
  if (ctx?.waRules?.length) {
    const matched = matchRule(userMessage, ctx.waRules);
    if (matched) {
      if (matched.action === "ignore") return null;
      if (matched.action === "reply_template" && matched.replyText) return matched.replyText;
      // reply_ai falls through to AI generation below
    }
  }

  // Build conversation history for this sender (last 8 messages)
  const history = ctx?.allMessages
    ? ctx.allMessages
        .filter(m => m.from === from || (!m.incoming && m.id.startsWith("sent_")))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-8)
    : [];

  // Build system prompt with business context
  const profile = ctx?.profile ?? {};
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const businessCtx = [
    profile.businessName && `Entreprise : ${profile.businessName}`,
    profile.profession && `Métier : ${profile.profession}`,
    profile.city && `Ville : ${profile.city}`,
    profile.context && `Contexte : ${profile.context}`,
  ].filter(Boolean).join(" | ");

  const tone = profile.tone === "informal" ? "tutoies" : "vouvoies";
  const systemPrompt = `Tu es l'assistant IA de ${profile.businessName || "l'entreprise"} via WhatsApp Business.
${businessCtx ? `Contexte : ${businessCtx}` : ""}
Heure : ${now}
Contact : ${fromName}

Règles :
- Réponds en français, concis (max 3 phrases sauf si demande détaillée)
- Tu ${tone} le contact
- Tu représentes l'entreprise, pas Trigr
- Si question sur prix/RDV/devis : réponds selon le contexte ou propose de rappeler
- Si question hors sujet : redirige poliment vers le cœur de métier`.trim();

  // Build messages array with history
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({
      role: m.incoming ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: userMessage },
  ];

  const providers = [
    process.env.GEMINI_API_KEY && {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: "gemini-2.0-flash",
    },
    process.env.GROQ_API_KEY && {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: "llama-3.1-8b-instant",
    },
  ].filter(Boolean) as { url: string; key: string; model: string }[];

  for (const p of providers) {
    try {
      const r = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({ model: p.model, messages, max_tokens: 300, temperature: 0.6 }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const data = await r.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
    } catch { continue; }
  }

  return "Merci pour votre message, nous vous répondrons rapidement.";
}
