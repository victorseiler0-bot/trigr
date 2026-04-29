import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const N8N_WEBHOOK =
  process.env.N8N_ASSISTANT_WEBHOOK ||
  "http://localhost:5678/webhook/assistant-api";

export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const message = String(body?.message ?? "").slice(0, 4000).trim();
    const history = Array.isArray(body?.history) ? body.history.slice(-20) : [];

    if (!message) {
      return NextResponse.json({ error: "Message vide." }, { status: 400 });
    }

    // Récupère le token Google OAuth (Gmail + Calendar) stocké par Clerk
    let googleToken: string | null = null;
    try {
      const client = await clerkClient();
      const { data } = await client.users.getUserOauthAccessToken(userId, "google");
      googleToken = data[0]?.token ?? null;
    } catch {
      // Pas de token Google — l'utilisateur n'a pas connecté Google
    }

    const r = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, userId, googleToken }),
    });

    if (!r.ok) {
      return NextResponse.json(
        { error: `Assistant indisponible (${r.status}).` },
        { status: 502 }
      );
    }

    const data = await r.json();
    return NextResponse.json({ response: String(data?.response ?? "") });
  } catch (err) {
    console.error("[assistant]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
