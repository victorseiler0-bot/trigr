import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAppleMeta, saveAppleMeta, clearAppleMeta, testAppleConnection } from "@/lib/apple";

// GET — vérifier si Apple est configuré
export async function GET() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const meta = await getAppleMeta(userId);
  if (!meta) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, email: meta.email });
}

// POST — sauvegarder + tester les credentials Apple
export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { email, appPassword } = await req.json() as { email?: string; appPassword?: string };
  if (!email || !appPassword) return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });

  const ok = await testAppleConnection(email.trim(), appPassword.trim());
  if (!ok) return NextResponse.json({ error: "Identifiants invalides ou CalDAV inaccessible." }, { status: 400 });

  await saveAppleMeta(userId, email.trim(), appPassword.trim());
  return NextResponse.json({ configured: true, email: email.trim() });
}

// DELETE — supprimer les credentials Apple
export async function DELETE() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  await clearAppleMeta(userId);
  return NextResponse.json({ configured: false });
}
