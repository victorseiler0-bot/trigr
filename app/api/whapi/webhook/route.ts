import { NextRequest, NextResponse } from "next/server";
import { storeWaMessage } from "@/lib/whatsapp-meta";

// Webhook Whapi.cloud → reçoit les messages entrants WhatsApp
// URL à configurer dans le dashboard Whapi :
//   Settings → Webhooks → https://trigr-eight.vercel.app/api/whapi/webhook

export async function POST(req: NextRequest) {
  const expectedToken = process.env.WHAPI_WEBHOOK_TOKEN;
  if (!expectedToken || req.headers.get("x-whapi-token") !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body?.event?.type ?? body?.type ?? "unknown";

    if (event === "messages" || event === "message") {
      const messages: Array<Record<string, unknown>> = body.messages ?? [body];

      for (const m of messages) {
        if (m.from_me) continue;

        const phone    = String((m.from as string)?.split("@")[0] ?? "");
        const fromName = String(m.from_name ?? m.notify ?? phone);
        const text     = String(
          (m.text as Record<string, string>)?.body ??
          m.body ??
          m.caption ??
          (m.type ? `[${m.type}]` : "[message]")
        );
        const msgId    = String(m.id ?? `wa_${Date.now()}`);
        const ts       = Number(m.timestamp ?? Math.floor(Date.now() / 1000));

        // Persisté dans Clerk (durable, survit aux redémarrages Vercel)
        await storeWaMessage({
          id:       msgId,
          from:     phone,
          fromName,
          text,
          timestamp: ts,
          incoming: true,
          read:     false,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "webhook actif", storage: "clerk" });
}
