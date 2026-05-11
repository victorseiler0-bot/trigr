import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// POST /api/instagram — sauvegarder le token Meta direct (page access token + page ID)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json() as { action?: string; token?: string; pageId?: string };

  const client = await clerkClient();

  if (body.action === "disconnect") {
    await client.users.updateUserMetadata(userId, { privateMetadata: { igMeta: null } });
    return NextResponse.json({ ok: true });
  }

  if (!body.token || !body.pageId) {
    return NextResponse.json({ error: "token et pageId requis" }, { status: 400 });
  }

  // Vérifier que le token est valide en appelant l'API Meta
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${body.pageId}?fields=name,instagram_business_account&access_token=${body.token}`);
    const data = await r.json() as Record<string, unknown>;
    if (data.error) return NextResponse.json({ error: `Token invalide : ${(data.error as Record<string, string>).message}` }, { status: 400 });

    await client.users.updateUserMetadata(userId, {
      privateMetadata: { igMeta: { token: body.token, pageId: body.pageId, pageName: data.name ?? "" } },
    });
    return NextResponse.json({ ok: true, pageName: data.name ?? "" });
  } catch {
    return NextResponse.json({ error: "Impossible de vérifier le token" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const ig = (user.privateMetadata as Record<string, unknown>).igMeta as { token: string; pageId: string; pageName?: string } | null;
  return NextResponse.json({ configured: !!ig, pageName: ig?.pageName ?? null });
}
