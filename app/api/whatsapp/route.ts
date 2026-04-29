import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const GROQ_KEY = process.env.GROQ_API_KEY!;

// Webhook verification (Meta GET request)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Incoming messages (Meta POST)
export async function POST(req: NextRequest) {
  const body = await req.json();

  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message || message.type !== "text") {
    return NextResponse.json({ status: "ok" });
  }

  const from = message.from;
  const text = message.text.body;
  const msgId = message.id;

  // Mark as read
  await markRead(from, msgId).catch(() => {});

  // Send typing indicator
  await sendTyping(from).catch(() => {});

  // Generate AI response
  const response = await generateResponse(text, from);

  // Send response
  await sendMessage(from, response);

  return NextResponse.json({ status: "ok" });
}

async function generateResponse(message: string, userId: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

  const systemPrompt = `Tu es Trigr, l'assistant IA personnel pour freelancers et PMEs français. Tu réponds via WhatsApp.
Date: ${dateStr}, Heure: ${timeStr} (Paris).
Règles:
- Réponds en français, sois très concis (WhatsApp = messages courts)
- Utilise des emojis avec parcimonie
- Si l'utilisateur demande Gmail/Calendar, dis-lui de passer par l'app web: https://trigr-eight.vercel.app/assistant
- Maximum 3-4 phrases par message`;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "Désolé, je n'ai pas pu répondre. Réessaie.";
}

async function sendMessage(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

async function markRead(to: string, messageId: string) {
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

async function sendTyping(to: string) {
  // WhatsApp doesn't have a typing indicator API — placeholder for future use
  void to;
}
