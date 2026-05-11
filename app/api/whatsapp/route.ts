import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { clerkClient } from "@clerk/nextjs/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const PHONE_ID    = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WA_TOKEN    = process.env.WHATSAPP_TOKEN!;
const GROQ_KEY    = process.env.GROQ_API_KEY!;
const ADMIN_ID    = (process.env.ADMIN_CLERK_USER_IDS ?? "").split(",")[0].trim();

export type WaMessage = {
  id: string; from: string; fromName: string;
  text: string; timestamp: number; incoming: boolean;
};

// ── Stocke un message dans Clerk metadata du owner ───────────────────────────
async function storeMessage(msg: WaMessage) {
  if (!ADMIN_ID) return;
  try {
    const client = await clerkClient();
    const user   = await client.users.getUser(ADMIN_ID);
    const pm     = user.privateMetadata as Record<string, unknown>;
    const prev   = (pm.waMessages as WaMessage[]) ?? [];
    const updated = [msg, ...prev.filter(m => m.id !== msg.id)].slice(0, 150);
    await client.users.updateUserMetadata(ADMIN_ID, {
      privateMetadata: { waMessages: updated },
    });
  } catch { /* non bloquant */ }
}

// ── Webhook verification (Meta GET) ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge"), { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const body    = JSON.parse(rawBody);
  const value   = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  if (!message) return NextResponse.json({ status: "ok" });

  const from     = message.from as string;
  const fromName = (value?.contacts?.[0]?.profile?.name as string) ?? from;
  const msgId    = message.id as string;
  const text     = message.type === "text" ? (message.text?.body as string) : `[${message.type}]`;
  const timestamp = Number(message.timestamp ?? Math.floor(Date.now() / 1000));

  // Stocker le message entrant
  await storeMessage({ id: msgId, from, fromName, text, timestamp, incoming: true });

  // Marquer comme lu
  await markRead(msgId).catch(() => {});

  // Générer et envoyer une réponse IA
  if (message.type === "text") {
    const reply = await generateResponse(text, from);
    await sendMessage(from, reply);
    // Stocker le message envoyé
    await storeMessage({ id: `sent_${Date.now()}`, from: "me", fromName: "Trigr", text: reply, timestamp: Math.floor(Date.now() / 1000), incoming: false });
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
        { role: "system", content: `Tu es Trigr, assistant IA via WhatsApp. Réponds en français, très concis (3-4 phrases max). Date: ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` },
        { role: "user", content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "Désolé, réessaie.";
}

export async function sendWaMessage(to: string, text: string): Promise<boolean> {
  const r = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: text } }),
  });
  const data = await r.json();
  return !!data?.messages?.[0]?.id;
}

async function sendMessage(to: string, text: string) {
  await sendWaMessage(to, text);
}

async function markRead(messageId: string) {
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
  });
}
