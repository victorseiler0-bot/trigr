import { NextRequest, NextResponse } from "next/server";
import { storeWaMessage } from "@/lib/whatsapp-meta";

// Webhook de compatibilité (anciennement Whapi).
// Le bridge local (port 3001) pousse directement vers n8n via localhost.
// Cette route reste active pour compatibilité / forwarding cloud → n8n si N8N_WEBHOOK_URL est défini.

export async function POST(req: NextRequest) {
  const expectedToken = process.env.WHAPI_WEBHOOK_TOKEN;
  if (!expectedToken || req.headers.get("x-whapi-token") !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    // Supporte le format bridge { phone, message } et l'ancien format Whapi { messages: [...] }
    const isBridgeFormat = typeof body.phone === "string" && typeof body.message === "string";

    if (isBridgeFormat) {
      await storeWaMessage({
        id:       `bridge_${Date.now()}`,
        from:     body.phone,
        fromName: body.phone,
        text:     body.message,
        timestamp: body.timestamp ?? Math.floor(Date.now() / 1000),
        incoming: true,
        read:     false,
      }).catch(() => {});
    } else {
      const event = body?.event?.type ?? body?.type ?? "unknown";
      if (event === "messages" || event === "message") {
        const messages: Array<Record<string, unknown>> = body.messages ?? [body];
        for (const m of messages) {
          if (m.from_me) continue;
          const phone    = String((m.from as string)?.split("@")[0] ?? "");
          const fromName = String(m.from_name ?? m.notify ?? phone);
          const text     = String(
            (m.text as Record<string, string>)?.body ??
            m.body ?? m.caption ??
            (m.type ? `[${m.type}]` : "[message]")
          );
          await storeWaMessage({
            id: String(m.id ?? `wa_${Date.now()}`),
            from: phone, fromName, text,
            timestamp: Number(m.timestamp ?? Math.floor(Date.now() / 1000)),
            incoming: true, read: false,
          }).catch(() => {});
        }
      }
    }

    // Forward vers n8n cloud si configuré (bridge local pousse directement en dev)
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nUrl) {
      fetch(`${n8nUrl}/webhook/trigr-wa-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "webhook actif", provider: "bridge", storage: "clerk" });
}
