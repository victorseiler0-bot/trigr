import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { triggerN8nWebhook } from "@/lib/n8n";

// Workflow slug → n8n webhook path
const WEBHOOKS: Record<string, string> = {
  wa_read: "trigr-wa-read",
  wa_send: "trigr-wa-send",
  ig: "trigr-ig",
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { workflow, payload = {} } = await req.json() as { workflow: string; payload?: Record<string, unknown> };
  if (!workflow) return NextResponse.json({ error: "workflow required" }, { status: 400 });

  const path = WEBHOOKS[workflow];
  if (!path) return NextResponse.json({ error: `workflow inconnu: ${workflow}` }, { status: 400 });

  // Inject user credentials from Clerk metadata
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const pm = user.privateMetadata as Record<string, unknown>;

  const enriched: Record<string, unknown> = { ...payload, userId };

  if (workflow.startsWith("wa")) {
    enriched.waToken = process.env.WHATSAPP_TOKEN;
    enriched.phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    // Fallback Whapi si Meta pas configuré
    if (!enriched.waToken) enriched.token = (pm.whapiToken as string | undefined) ?? process.env.WHAPI_TOKEN;
  }
  if (workflow === "ig") {
    const igMeta = pm.igMeta as { token: string; pageId: string } | undefined;
    if (!igMeta?.token) {
      return NextResponse.json({ error: "Instagram non configuré. Connecte ton compte dans Intégrations." }, { status: 400 });
    }
    enriched.token = igMeta.token;
    enriched.pageId = igMeta.pageId;
  }

  const result = await triggerN8nWebhook(path, enriched);
  return NextResponse.json(result ?? { error: "n8n non accessible" });
}
