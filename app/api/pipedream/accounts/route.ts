import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getPipedreamClient } from "@/lib/pipedream";

// GET — liste les comptes connectés du user
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const pd = getPipedreamClient();
    const page = await pd.accounts.list({ externalUserId: user.id });
    const items = page?.data ?? [];
    // Retourne slug → account_id pour chaque app connectée
    const connected: Record<string, string> = {};
    for (const acc of items) {
      const slug = (acc as { app?: { name_slug?: string } }).app?.name_slug ?? "";
      if (slug) connected[slug] = acc.id;
    }
    return NextResponse.json({ connected });
  } catch (err) {
    console.error("Pipedream accounts error:", err);
    return NextResponse.json({ connected: {} });
  }
}

// DELETE — déconnecte un compte par son account_id
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { accountId } = await req.json();
  if (!accountId) return NextResponse.json({ error: "missing accountId" }, { status: 400 });

  try {
    const pd = getPipedreamClient();
    await pd.accounts.delete(accountId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Pipedream delete error:", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 502 });
  }
}
