import { NextRequest, NextResponse } from "next/server";

// Cache mémoire des messages entrants (max 200 — suffisant pour dev/local)
// En multi-instance production : migrer vers Vercel KV ou Upstash
const messageCache: Array<{
  id: string;
  from: string;
  from_name: string;
  chat_id: string;
  text: string;
  timestamp: number;
  received_at: number;
}> = [];
const MAX_CACHE = 200;

// Webhook Whapi.cloud → reçoit les messages entrants
// URL à configurer dans le dashboard Whapi : Settings → Webhooks → https://trigr-eight.vercel.app/api/whapi/webhook

export async function POST(req: NextRequest) {
  const expectedToken = process.env.WHAPI_WEBHOOK_TOKEN;
  if (expectedToken && req.headers.get("x-whapi-token") !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body?.event?.type ?? body?.type ?? "unknown";

    if (event === "messages" || event === "message") {
      const messages: Array<Record<string, unknown>> = body.messages ?? [body];
      for (const m of messages) {
        if (m.from_me) continue; // ignore les messages envoyés par nous
        const entry = {
          id: String(m.id ?? ""),
          from: String((m.from as string)?.split("@")[0] ?? ""),
          from_name: String(m.from_name ?? m.notify ?? ""),
          chat_id: String(m.chat_id ?? m.from ?? ""),
          text: String((m.text as Record<string, string>)?.body ?? m.body ?? ""),
          timestamp: Number(m.timestamp ?? Date.now() / 1000),
          received_at: Date.now(),
        };
        // évite les doublons
        if (!messageCache.find(x => x.id === entry.id)) {
          messageCache.unshift(entry);
        }
      }
      // garde seulement les MAX_CACHE derniers
      if (messageCache.length > MAX_CACHE) messageCache.splice(MAX_CACHE);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET() {
  // Handshake Whapi + consultation du cache par l'assistant si besoin
  return NextResponse.json({ status: "webhook actif", cached: messageCache.length });
}

// Expose le cache pour l'assistant (lecture depuis /api/whapi/messages)
export { messageCache };
