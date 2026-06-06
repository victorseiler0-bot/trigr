import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { integration } = await req.json() as { integration: string };
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;

  try {
    switch (integration) {
      case "google": {
        const googleAccount = user.externalAccounts.find(a => a.provider === "google");
        if (!googleAccount) return NextResponse.json({ ok: false, message: "Non connecté" });
        const tokens = await clerk.users.getUserOauthAccessToken(userId, "oauth_google");
        const token = tokens.data?.[0]?.token;
        if (!token) return NextResponse.json({ ok: false, message: "Token Google expiré — reconnectez-vous" });
        const r = await fetch("https://www.googleapis.com/gmail/v1/users/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return NextResponse.json({ ok: false, message: "Gmail inaccessible" });
        const d = await r.json() as { emailAddress: string; messagesTotal: number };
        return NextResponse.json({ ok: true, message: `${d.emailAddress} · ${d.messagesTotal?.toLocaleString("fr-FR")} emails` });
      }

      case "imap": {
        const cfg = meta.imapConfig as { user?: string; email?: string } | undefined;
        const email = cfg?.email ?? cfg?.user;
        if (!email) return NextResponse.json({ ok: false, message: "Non configuré" });
        return NextResponse.json({ ok: true, message: `${email} configuré` });
      }

      case "instagram": {
        const ig = meta.igMeta as { pageId?: string; token?: string; pageName?: string } | undefined;
        if (!ig?.token || !ig?.pageId) return NextResponse.json({ ok: false, message: "Non connecté" });
        const r = await fetch(
          `https://graph.facebook.com/v18.0/${ig.pageId}?fields=name,id&access_token=${ig.token}`
        );
        if (!r.ok) return NextResponse.json({ ok: false, message: "Token Meta expiré ou invalide" });
        const d = await r.json() as { name: string };
        return NextResponse.json({ ok: true, message: `Page "${d.name}" accessible` });
      }

      case "whatsapp": {
        const waToken = process.env.WHATSAPP_TOKEN ?? (meta.waToken as string);
        const phoneId = process.env.WA_PHONE_NUMBER_ID;
        if (!waToken) return NextResponse.json({ ok: false, message: "Token WA non configuré" });
        const r = await fetch(
          `https://graph.facebook.com/v18.0/${phoneId ?? "me"}?fields=display_phone_number,verified_name&access_token=${waToken}`
        );
        if (!r.ok) return NextResponse.json({ ok: false, message: "Token WA invalide" });
        const d = await r.json() as { display_phone_number?: string; verified_name?: string };
        const label = d.display_phone_number ?? d.verified_name ?? "connecté";
        return NextResponse.json({ ok: true, message: `${label} actif` });
      }

      case "notion": {
        const notion = meta.notionToken as string | undefined;
        if (!notion) return NextResponse.json({ ok: false, message: "Non connecté" });
        const r = await fetch("https://api.notion.com/v1/users/me", {
          headers: { Authorization: `Bearer ${notion}`, "Notion-Version": "2022-06-28" },
        });
        if (!r.ok) return NextResponse.json({ ok: false, message: "Token Notion invalide" });
        const d = await r.json() as { name?: string; bot?: { owner?: { user?: { name?: string } } } };
        const name = d.name ?? d.bot?.owner?.user?.name ?? "connecté";
        return NextResponse.json({ ok: true, message: `${name} accessible` });
      }

      case "slack": {
        const slackMeta = meta.slackMeta as { token?: string } | undefined;
        if (!slackMeta?.token) return NextResponse.json({ ok: false, message: "Non connecté" });
        const r = await fetch("https://slack.com/api/auth.test", {
          headers: { Authorization: `Bearer ${slackMeta.token}` },
        });
        const d = await r.json() as { ok: boolean; user?: string; team?: string; error?: string };
        if (!d.ok) return NextResponse.json({ ok: false, message: d.error ?? "Token Slack invalide" });
        return NextResponse.json({ ok: true, message: `${d.user} · ${d.team}` });
      }

      case "n8n": {
        const apiKey = process.env.N8N_API_KEY;
        const baseUrl = process.env.N8N_BASE_URL ?? "http://localhost:5678";
        if (!apiKey) return NextResponse.json({ ok: false, message: "Clé API n8n non configurée" });
        const r = await fetch(`${baseUrl}/api/v1/workflows?limit=1`, {
          headers: { "X-N8N-API-KEY": apiKey },
        });
        if (!r.ok) return NextResponse.json({ ok: false, message: "n8n inaccessible — pm2 tourne ?" });
        const d = await r.json() as { data: unknown[] };
        return NextResponse.json({ ok: true, message: `n8n accessible · ${d.data?.length ?? 0} workflow(s) chargé(s)` });
      }

      default:
        return NextResponse.json({ ok: false, message: "Intégration inconnue" });
    }
  } catch {
    return NextResponse.json({ ok: false, message: "Erreur réseau" });
  }
}
