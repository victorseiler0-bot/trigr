import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveNotionMeta } from "@/lib/notion";

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID!;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET!;
const NOTION_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/notion/callback`
  : "http://localhost:3000/api/notion/callback";

const FAIL_URL = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?error=notion_failed`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state_notion")?.value;

  if (!code || !stateParam || !expectedState || stateParam !== expectedState) {
    return NextResponse.redirect(FAIL_URL);
  }

  const [userId] = expectedState.split(":");
  if (!userId) return NextResponse.redirect(FAIL_URL);

  try {
    const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64");
    const r = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: NOTION_REDIRECT_URI,
      }),
    });

    const data = await r.json() as {
      access_token?: string;
      workspace_name?: string;
      workspace_id?: string;
      error?: string;
    };

    if (!data.access_token) throw new Error(data.error ?? "Token exchange failed");

    await saveNotionMeta(userId, data.access_token, data.workspace_name ?? "", data.workspace_id ?? "");
    const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?notion=connected`);
    res.cookies.delete("oauth_state_notion");
    return res;
  } catch {
    return NextResponse.redirect(FAIL_URL);
  }
}
