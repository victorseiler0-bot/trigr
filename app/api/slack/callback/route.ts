import { NextRequest, NextResponse } from "next/server";
import { saveSlackMeta } from "@/lib/slack";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
const SLACK_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/slack/callback`
  : "http://localhost:3000/api/slack/callback";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?error=slack_failed`);
  }

  try {
    const params = new URLSearchParams({
      code,
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      redirect_uri: SLACK_REDIRECT_URI,
    });

    const r = await fetch(`https://slack.com/api/oauth.v2.access?${params}`);
    const data = await r.json() as {
      ok: boolean;
      access_token?: string;
      team?: { name: string };
      authed_user?: { id: string };
      error?: string;
    };

    if (!data.ok || !data.access_token) throw new Error(data.error ?? "Token exchange failed");

    await saveSlackMeta(userId, data.access_token, data.team?.name ?? "", data.authed_user?.id ?? "");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?slack=connected`);
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?error=slack_failed`);
  }
}
