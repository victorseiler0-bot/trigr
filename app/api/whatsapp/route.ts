import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { storeWaMessage, sendMetaWaMessage, markWaRead } from "@/lib/whatsapp-meta";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const GROQ_KEY     = process.env.GROQ_API_KEY!;

// ── Webhook verification (Meta GET) ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge"), { status: 200 });
  }
  return NextResponse.json({ ok: true }); // réponse neutre pour accès direct
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
    const reply = await generateResponse(text, from);
    await sendMetaWaMessage(from, reply);
    await storeWaMessage({ id: `sent_${Date.now()}`, from: "me", fromName: "Trigr", text: reply, timestamp: Math.floor(Date.now() / 1000), incoming: false });
  }

  return NextResponse.json({ status: "ok" });
}

async function generateResponse(message: string, _from: string): Promise<string> {
  const now = new Date();
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: `Tu es Trigr, assistant IA via WhatsApp. Réponds en français, très concis. Date: ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` },
        { role: "user", content: message },
      ],
      max_tokens: 300, temperature: 0.7,
    }),
  });
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "Désolé, réessaie.";
}
