import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Airtable Personal Access Token integration
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const pm = user.privateMetadata as Record<string, unknown>;
  const connected = !!(pm.airtableToken as string | undefined);
  const baseId = (pm.airtableBaseId as string | undefined) ?? "";

  return NextResponse.json({ connected, baseId });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json() as { action?: string; token?: string; baseId?: string };
  const clerk = await clerkClient();

  if (body.action === "disconnect") {
    await clerk.users.updateUserMetadata(userId, {
      privateMetadata: { airtableToken: null, airtableBaseId: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "test") {
    const user = await clerk.users.getUser(userId);
    const token = (user.privateMetadata as Record<string, unknown>).airtableToken as string | undefined;
    if (!token) return NextResponse.json({ error: "Token non configuré" }, { status: 400 });

    try {
      const r = await fetch("https://api.airtable.com/v0/meta/bases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return NextResponse.json({ ok: false, error: `Airtable API ${r.status}` });
      const data = await r.json() as { bases?: Array<{ id: string; name: string }> };
      return NextResponse.json({ ok: true, bases: data.bases?.map(b => ({ id: b.id, name: b.name })) ?? [] });
    } catch {
      return NextResponse.json({ ok: false, error: "Impossible de joindre Airtable" });
    }
  }

  // Save token + optional baseId
  if (!body.token) return NextResponse.json({ error: "Token requis" }, { status: 400 });

  // Verify token works before saving
  try {
    const r = await fetch("https://api.airtable.com/v0/meta/bases", {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    if (!r.ok) return NextResponse.json({ error: "Token invalide — vérifie tes permissions Airtable" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Impossible de joindre Airtable" }, { status: 502 });
  }

  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: {
      airtableToken: body.token,
      airtableBaseId: body.baseId ?? "",
    },
  });

  return NextResponse.json({ ok: true });
}
