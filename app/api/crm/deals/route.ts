import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type DealStage = "prospection" | "propose" | "negociation" | "gagne" | "perdu";

export type Deal = {
  id: string;
  title: string;
  contactName?: string;
  amount?: number;
  stage: DealStage;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

async function getDeals(userId: string): Promise<Deal[]> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return ((user.privateMetadata as Record<string, unknown>).deals as Deal[]) ?? [];
}

async function setDeals(userId: string, deals: Deal[]) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
  await client.users.updateUserMetadata(userId, { privateMetadata: { ...meta, deals } });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ deals: await getDeals(userId) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { action?: string; id?: string; deal?: Partial<Deal>; stage?: DealStage };
  const deals = await getDeals(userId);

  if (body.action === "delete" && body.id) {
    await setDeals(userId, deals.filter(d => d.id !== body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "move" && body.id && body.stage) {
    const updated = deals.map(d => d.id === body.id ? { ...d, stage: body.stage!, updatedAt: new Date().toISOString() } : d);
    await setDeals(userId, updated);
    return NextResponse.json({ deals: updated });
  }

  if (body.action === "update" && body.id && body.deal) {
    const updated = deals.map(d => d.id === body.id ? { ...d, ...body.deal, updatedAt: new Date().toISOString() } : d);
    await setDeals(userId, updated);
    return NextResponse.json({ deals: updated });
  }

  // Create
  if (!body.deal?.title) return NextResponse.json({ error: "missing title" }, { status: 400 });
  const deal: Deal = {
    id: `deal_${Date.now()}`,
    title: body.deal.title,
    contactName: body.deal.contactName,
    amount: body.deal.amount,
    stage: body.deal.stage ?? "prospection",
    notes: body.deal.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDeals(userId, [...deals, deal]);
  return NextResponse.json({ deal });
}
