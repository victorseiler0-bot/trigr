import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHubSpotMeta, clearHubSpotMeta } from "@/lib/hubspot";

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!;
const HUBSPOT_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/hubspot/callback`
  : "http://localhost:3000/api/hubspot/callback";

const SCOPES = ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read", "crm.objects.deals.write"].join(" ");

export async function GET(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("action") === "authorize") {
    const nonce = crypto.randomUUID();
    const stateValue = `${userId}:${nonce}`;
    const params = new URLSearchParams({
      client_id: HUBSPOT_CLIENT_ID,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      scope: SCOPES,
      state: stateValue,
    });
    const res = NextResponse.redirect(`https://app.hubspot.com/oauth/authorize?${params}`);
    res.cookies.set("oauth_state_hubspot", stateValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  }

  const meta = await getHubSpotMeta(userId);
  if (!meta) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, portalId: meta.portalId });
}

export async function DELETE() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await clearHubSpotMeta(userId);
  return NextResponse.json({ configured: false });
}
