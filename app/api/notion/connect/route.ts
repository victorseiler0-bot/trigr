import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNotionMeta, clearNotionMeta } from "@/lib/notion";

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID!;
const NOTION_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/notion/callback`
  : "http://localhost:3000/api/notion/callback";

// GET — vérifier si Notion est configuré OU initier l'OAuth
export async function GET(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("action") === "authorize") {
    const nonce = crypto.randomUUID();
    const stateValue = `${userId}:${nonce}`;
    const params = new URLSearchParams({
      client_id: NOTION_CLIENT_ID,
      redirect_uri: NOTION_REDIRECT_URI,
      response_type: "code",
      owner: "user",
      state: stateValue,
    });
    const res = NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`);
    res.cookies.set("oauth_state_notion", stateValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  }

  const meta = await getNotionMeta(userId);
  if (!meta) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, workspace: meta.workspaceName });
}

// DELETE — déconnecter Notion
export async function DELETE() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await clearNotionMeta(userId);
  return NextResponse.json({ configured: false });
}
