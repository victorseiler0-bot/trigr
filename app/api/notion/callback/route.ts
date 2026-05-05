import { NextRequest, NextResponse } from "next/server";
import { saveNotionMeta } from "@/lib/notion";

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID!;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET!;
const NOTION_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/notion/callback`
  : "http://localhost:3000/api/notion/callback";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?error=notion_failed`);
  }

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
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?notion=connected`);
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/settings?error=notion_failed`);
  }
}
