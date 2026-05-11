import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { testImapConnection, type ImapConfig } from "@/lib/imap";

// POST /api/imap — tester et sauvegarder la config IMAP
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json() as Partial<ImapConfig> & { action?: string };

  if (body.action === "disconnect") {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, { privateMetadata: { imap: null } });
    return NextResponse.json({ ok: true });
  }

  const cfg: ImapConfig = {
    host: body.host ?? "",
    port: Number(body.port ?? 993),
    user: body.user ?? "",
    password: body.password ?? "",
    smtpHost: body.smtpHost ?? "",
    smtpPort: Number(body.smtpPort ?? 587),
  };

  if (!cfg.host || !cfg.user || !cfg.password) {
    return NextResponse.json({ error: "Serveur, identifiant et mot de passe requis." }, { status: 400 });
  }

  const test = await testImapConnection(cfg);
  if (!test.ok) {
    return NextResponse.json({ error: `Connexion échouée : ${test.error}` }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { privateMetadata: { imap: cfg } });
  return NextResponse.json({ ok: true, email: cfg.user });
}

// GET /api/imap — vérifier si configuré
export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const imap = (user.privateMetadata as Record<string, unknown>).imap as ImapConfig | null;
  return NextResponse.json({ configured: !!imap, email: imap?.user ?? null });
}
