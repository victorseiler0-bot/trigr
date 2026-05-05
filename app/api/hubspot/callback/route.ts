import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveHubSpotMeta } from "@/lib/hubspot";

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET!;
const HUBSPOT_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/hubspot/callback`
  : "http://localhost:3000/api/hubspot/callback";

const FAIL_URL = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?error=hubspot_failed`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state_hubspot")?.value;

  if (!code || !stateParam || !expectedState || stateParam !== expectedState) {
    return NextResponse.redirect(FAIL_URL);
  }

  const [userId] = expectedState.split(":");
  if (!userId) return NextResponse.redirect(FAIL_URL);

  try {
    const r = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: HUBSPOT_REDIRECT_URI,
        code,
      }),
    });

    const data = await r.json() as {
      access_token?: string;
      refresh_token?: string;
      hub_id?: number;
      error?: string;
    };

    if (!data.access_token) throw new Error(data.error ?? "Token exchange failed");

    await saveHubSpotMeta(userId, data.access_token, data.refresh_token ?? "", data.hub_id ?? 0);
    const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?hubspot=connected`);
    res.cookies.delete("oauth_state_hubspot");
    return res;
  } catch {
    return NextResponse.redirect(FAIL_URL);
  }
}
