import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { whapiChannel, getUserWhapiMeta, setUserWhapiMeta, clearUserWhapiMeta } from "@/lib/whapi";

// Whapi : Trigr gère tous les channels — l'utilisateur scanne juste un QR
// WHAPI_MANAGER_KEY = Manager API Key (Whapi dashboard → Settings → Manager API)

const WHAPI_MGR = "https://manager.whapi.cloud";

async function createChannel(name: string): Promise<{ token: string; id: string } | null> {
  const managerKey = process.env.WHAPI_MANAGER_KEY;
  if (!managerKey) return null;
  try {
    const r = await fetch(`${WHAPI_MGR}/api/v1/channels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${managerKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, mode: "whatsapp" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.token ? { token: d.token, id: d.id ?? d.name } : null;
  } catch { return null; }
}

async function deleteChannel(channelId: string) {
  const managerKey = process.env.WHAPI_MANAGER_KEY;
  if (!managerKey || !channelId) return;
  try {
    await fetch(`${WHAPI_MGR}/api/v1/channels/${channelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managerKey}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {}
}

// GET — statut de connexion WA de l'utilisateur
export async function GET(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let { token, channelId } = await getUserWhapiMeta(userId);

  // Pas de token → créer un channel automatiquement
  if (!token) {
    const managerConfigured = !!process.env.WHAPI_MANAGER_KEY;
    if (!managerConfigured) {
      return NextResponse.json({ configured: false, error: "WHAPI_MANAGER_KEY manquant" });
    }
    const channel = await createChannel(`trigr-user-${userId.slice(-8)}`);
    if (!channel) return NextResponse.json({ configured: false, error: "Impossible de créer le channel Whapi" });
    token = channel.token;
    channelId = channel.id;
    await setUserWhapiMeta(userId, token, channelId);
  }

  // Vérifier le statut
  // Réponse Whapi : { user: { id: "336...", name: "..." }, status: { code: 4, text: "AUTH" } }
  // user.id présent + saved = session active et connectée à WhatsApp
  const health = await whapiChannel(token, "health");
  if (!health) return NextResponse.json({ configured: true, connected: false, error: "Whapi inaccessible" });

  const isConnected = !!(health.user?.id && health.user?.saved);
  if (isConnected) {
    const phone = String(health.user.id ?? "");
    return NextResponse.json({
      configured: true,
      connected: true,
      phone: phone ? `+${phone}` : null,
      name: health.user.name && health.user.name !== "~" ? health.user.name : null,
    });
  }

  // Non connecté → QR
  const qrData = await whapiChannel(token, "link?type=image");
  return NextResponse.json({
    configured: true,
    connected: false,
    qr: qrData?.qr_code ?? null,
    qrString: qrData?.link ?? null,
  });
}

// DELETE — déconnecter et supprimer le channel de l'utilisateur
export async function DELETE(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { token, channelId } = await getUserWhapiMeta(userId);
  if (token && channelId) {
    await whapiChannel(token, "logout", "POST");
    if (channelId !== "env") await deleteChannel(channelId);
  }
  await clearUserWhapiMeta(userId);
  return NextResponse.json({ ok: true });
}

// POST — valider et sauvegarder un token manuel (admin/dev)
export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { token } = await req.json();
  if (!token?.trim()) return NextResponse.json({ error: "Token requis" }, { status: 400 });

  const health = await whapiChannel(token.trim(), "health");
  if (!health) return NextResponse.json({ error: "Token invalide ou Whapi inaccessible" }, { status: 401 });

  await setUserWhapiMeta(userId, token.trim(), "manual");
  return NextResponse.json({ ok: true });
}
