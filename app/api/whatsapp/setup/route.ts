import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Abonne automatiquement le WABA au webhook Meta
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://trigr-eight.vercel.app";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!token || !phoneId) {
    return NextResponse.json({ error: "WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquant dans Vercel" }, { status: 400 });
  }

  try {
    // 1. Récupérer le WABA ID depuis le phone number ID
    const phoneRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}?fields=whatsapp_business_account&access_token=${token}`
    );
    const phoneData = await phoneRes.json();
    if (phoneData.error) throw new Error(phoneData.error.message);

    const wabaId = phoneData.whatsapp_business_account?.id;
    if (!wabaId) throw new Error("WABA ID introuvable. Vérifie que le WHATSAPP_TOKEN a la permission whatsapp_business_management.");

    // 2. Abonner le WABA à l'app
    const subRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    const subData = await subRes.json();
    if (subData.error) throw new Error(subData.error.message);

    return NextResponse.json({
      ok: true,
      wabaId,
      webhookUrl: `${baseUrl}/api/whatsapp`,
      verifyToken,
      message: "WABA abonné. Configure maintenant le webhook dans Meta Developer Console : Apps > WhatsApp > Configuration > Modifier le webhook. URL : " + `${baseUrl}/api/whatsapp`,
    });
  } catch (err) {
    return NextResponse.json({
      error: (err as Error).message,
      webhookUrl: `${baseUrl}/api/whatsapp`,
      verifyToken,
    }, { status: 500 });
  }
}
