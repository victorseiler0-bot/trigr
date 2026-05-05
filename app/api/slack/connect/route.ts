import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSlackMeta, clearSlackMeta } from "@/lib/slack";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/slack/callback`
  : "http://localhost:3000/api/slack/callback";

const SLACK_SCOPES = ["channels:read", "channels:history", "im:read", "im:history", "chat:write", "users:read"].join(",");

export async function GET(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("action") === "authorize") {
    const nonce = crypto.randomUUID();
    const stateValue = `${userId}:${nonce}`;
    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      redirect_uri: SLACK_REDIRECT_URI,
      scope: SLACK_SCOPES,
      state: stateValue,
    });
    const res = NextResponse.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
    res.cookies.set("oauth_state_slack", stateValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  }

  const meta = await getSlackMeta(userId);
  if (!meta) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, team: meta.teamName });
}

export async function DELETE() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await clearSlackMeta(userId);
  return NextResponse.json({ configured: false });
}
