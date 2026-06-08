import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Trello API Key + Token integration
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const pm = user.privateMetadata as Record<string, unknown>;
  const connected = !!(pm.trelloApiKey as string | undefined) && !!(pm.trelloToken as string | undefined);

  return NextResponse.json({ connected });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json() as { action?: string; apiKey?: string; token?: string };
  const clerk = await clerkClient();

  if (body.action === "disconnect") {
    await clerk.users.updateUserMetadata(userId, {
      privateMetadata: { trelloApiKey: null, trelloToken: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "test") {
    const user = await clerk.users.getUser(userId);
    const pm = user.privateMetadata as Record<string, unknown>;
    const apiKey = pm.trelloApiKey as string | undefined;
    const token  = pm.trelloToken  as string | undefined;
    if (!apiKey || !token) return NextResponse.json({ error: "Credentials non configurés" }, { status: 400 });

    try {
      const r = await fetch(`https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${token}&fields=name,id`);
      if (!r.ok) return NextResponse.json({ ok: false, error: `Trello API ${r.status}` });
      const boards = await r.json() as Array<{ id: string; name: string }>;
      return NextResponse.json({ ok: true, boards: boards.map(b => ({ id: b.id, name: b.name })) });
    } catch {
      return NextResponse.json({ ok: false, error: "Impossible de joindre Trello" });
    }
  }

  if (!body.apiKey || !body.token) return NextResponse.json({ error: "API Key et Token requis" }, { status: 400 });

  // Verify credentials
  try {
    const r = await fetch(`https://api.trello.com/1/members/me?key=${body.apiKey}&token=${body.token}`);
    if (!r.ok) return NextResponse.json({ error: "Credentials invalides — vérifie la clé API et le token Trello" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Impossible de joindre Trello" }, { status: 502 });
  }

  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: { trelloApiKey: body.apiKey, trelloToken: body.token },
  });

  return NextResponse.json({ ok: true });
}
