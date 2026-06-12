import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// Meta Facebook — User Data Deletion Callback
// Appelé par Meta quand un utilisateur révoque les permissions de l'app Facebook

function parseSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSig, payload] = signedRequest.split(".");
  const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expected = createHmac("sha256", appSecret).update(payload).digest();
  if (!sig.equals(expected)) return null;
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET;
  const formData = await req.formData().catch(() => null);
  const signedRequest = formData?.get("signed_request") as string | null;

  if (appSecret && signedRequest) {
    const data = parseSignedRequest(signedRequest, appSecret);
    if (data?.user_id) {
      // En production : supprimer les données de l'utilisateur Meta (data.user_id)
      // Ici : on confirme la réception — les données WhatsApp sont stockées dans Clerk
      // et peuvent être supprimées via la route /api/account/delete
      console.log("[DataDeletion] Demande suppression Meta userId:", data.user_id);
    }
  }

  const confirmationCode = `del_${Date.now()}`;
  return NextResponse.json({
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://trigr-eight.vercel.app"}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}

export async function GET() {
  return NextResponse.redirect(
    new URL("/data-deletion", process.env.NEXT_PUBLIC_APP_URL ?? "https://trigr-eight.vercel.app")
  );
}
