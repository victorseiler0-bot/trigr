import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Vérifie la connexion Google en tentant de récupérer le token OAuth
// (plus fiable que vérifier user.externalAccounts côté client)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ connected: false });

  try {
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_google");
    const token = tokens.data[0]?.token ?? null;
    return NextResponse.json({ connected: !!token, hasToken: !!token });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
