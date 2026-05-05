import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveSlackMeta } from "@/lib/slack";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
const SLACK_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/slack/callback`
  : "http://localhost:3000/api/slack/callback";

const FAIL_URL = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?error=slack_failed`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state_slack")?.value;

  if (!code || !stateParam || !expectedState || stateParam !== expectedState) {
    return NextResponse.redirect(FAIL_URL);
  }

  const [userId] = expectedState.split(":");
  if (!userId) return NextResponse.redirect(FAIL_URL);

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
    const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?slack=connected`);
    res.cookies.delete("oauth_state_slack");
    return res;
  } catch {
    return NextResponse.redirect(FAIL_URL);
  }
}
