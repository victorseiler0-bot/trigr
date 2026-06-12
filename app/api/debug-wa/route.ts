import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Endpoint de diagnostic WhatsApp — vérifie que tout est bien connecté
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const clerk = await clerkClient();

    // 1. Messages stockés pour l'utilisateur connecté
    const user      = await clerk.users.getUser(userId);
    const pm        = user.privateMetadata as Record<string, unknown>;
    type WaMsg = { id: string; from: string; fromName: string; text: string; timestamp: number; incoming: boolean; read?: boolean };
    const myMessages = (pm.waMessages as WaMsg[]) ?? [];

    // 2. Messages stockés pour l'admin (ADMIN_CLERK_USER_IDS)
    const adminId    = (process.env.ADMIN_CLERK_USER_IDS ?? "").split(",")[0].trim();
    let adminMessages: WaMsg[] = [];
    let isSameUser   = false;

    if (adminId && adminId !== userId) {
      try {
        const adminUser  = await clerk.users.getUser(adminId);
        const adminPm    = adminUser.privateMetadata as Record<string, unknown>;
        adminMessages    = (adminPm.waMessages as WaMsg[]) ?? [];
      } catch { /* admin user not found */ }
    } else {
      isSameUser    = true;
      adminMessages = myMessages;
    }

    // 3. État env vars
    const envStatus = {
      WHATSAPP_TOKEN:         !!process.env.WHATSAPP_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_VERIFY_TOKEN:  !!process.env.WHATSAPP_VERIFY_TOKEN,
      WHAPI_TOKEN:            !!process.env.WHAPI_TOKEN,
      ADMIN_CLERK_USER_IDS:   !!adminId,
      GROQ_API_KEY:           !!process.env.GROQ_API_KEY,
      GEMINI_API_KEY:         !!process.env.GEMINI_API_KEY,
    };

    // 4. Pipedream WA
    const pdAccounts = (pm.pipedream as Record<string, string>) ?? {};

    return NextResponse.json({
      userId,
      adminId:          adminId || "NON DÉFINI — messages WA ne seront pas stockés !",
      isSameUser,
      myMessagesCount:    myMessages.length,
      adminMessagesCount: adminMessages.length,
      lastMessage: adminMessages[0] ? {
        from:     adminMessages[0].fromName,
        text:     adminMessages[0].text.slice(0, 50),
        incoming: adminMessages[0].incoming,
        at:       new Date(adminMessages[0].timestamp * 1000).toLocaleString("fr-FR"),
      } : null,
      pipedreamWA:   !!pdAccounts.whatsapp_business,
      pipedreamApps: Object.keys(pdAccounts),
      env:           envStatus,
      fix_needed: !adminId
        ? "⚠️ ADMIN_CLERK_USER_IDS non défini → les messages Meta WA ne sont pas stockés"
        : !isSameUser
        ? "⚠️ Ton userId ne correspond pas à ADMIN_CLERK_USER_IDS → messages dans le mauvais compte"
        : "✅ Configuration correcte",
    });
  } catch (err) {
    console.error("[debug-wa]", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
