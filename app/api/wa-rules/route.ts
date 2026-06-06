import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type WaRule = {
  id: string;
  trigger: string;
  triggerType: "contains" | "exact" | "starts";
  action: "reply_template" | "reply_ai" | "ignore";
  replyText?: string;
  enabled: boolean;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const rules = (user.privateMetadata.waRules as WaRule[] | undefined) ?? [];
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json() as { action?: string; rule?: WaRule; id?: string };
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  let rules = (user.privateMetadata.waRules as WaRule[] | undefined) ?? [];

  if (body.action === "delete" && body.id) {
    rules = rules.filter(r => r.id !== body.id);
  } else if (body.action === "toggle" && body.id) {
    rules = rules.map(r => r.id === body.id ? { ...r, enabled: !r.enabled } : r);
  } else if (body.rule) {
    if (rules.length >= 20 && !rules.find(r => r.id === body.rule!.id)) {
      return NextResponse.json({ error: "Maximum 20 règles" }, { status: 400 });
    }
    const idx = rules.findIndex(r => r.id === body.rule!.id);
    if (idx >= 0) rules[idx] = body.rule;
    else rules.push(body.rule);
  }

  await clerk.users.updateUserMetadata(userId, { privateMetadata: { waRules: rules } });
  return NextResponse.json({ rules });
}
