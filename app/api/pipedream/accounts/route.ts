import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { getPipedreamClient } from "@/lib/pipedream";

type PdMeta = Record<string, string>; // { appSlug: accountId }

async function getPdMeta(userId: string): Promise<PdMeta> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return ((user.privateMetadata as Record<string, unknown>).pipedream as PdMeta) ?? {};
}

// GET — lit les comptes connectés depuis Clerk (instantané, pas d'appel Pipedream)
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const connected = await getPdMeta(user.id);
  return NextResponse.json({ connected });
}

// POST — sauvegarde un accountId après connexion OAuth réussie
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appSlug, accountId } = await req.json() as { appSlug?: string; accountId?: string };
  if (!appSlug || !accountId) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const client = await clerkClient();
  const existing = await getPdMeta(user.id);
  await client.users.updateUserMetadata(user.id, {
    privateMetadata: { pipedream: { ...existing, [appSlug]: accountId } },
  });
  return NextResponse.json({ ok: true });
}

// DELETE — déconnecte : supprime de Clerk + Pipedream
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appSlug, accountId } = await req.json() as { appSlug?: string; accountId?: string };
  if (!appSlug) return NextResponse.json({ error: "missing appSlug" }, { status: 400 });

  // Supprime de Pipedream si on a l'accountId
  if (accountId) {
    try {
      const pd = getPipedreamClient();
      await pd.accounts.delete(accountId);
    } catch { /* ignore si déjà supprimé */ }
  }

  // Retire de Clerk
  const client = await clerkClient();
  const existing = await getPdMeta(user.id);
  const updated = { ...existing };
  delete updated[appSlug];
  await client.users.updateUserMetadata(user.id, {
    privateMetadata: { pipedream: updated },
  });
  return NextResponse.json({ ok: true });
}
