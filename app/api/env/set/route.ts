import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import fs from "fs";
import path from "path";

// Écrit une variable dans .env.local — uniquement en dev local
// En production Vercel : retourne ok: false avec instructions CLI
export async function POST(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { key, value } = await req.json();
  if (!key || !value) return NextResponse.json({ error: "key et value requis" }, { status: 400 });
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) return NextResponse.json({ error: "Nom de variable invalide" }, { status: 400 });

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({
      ok: false,
      message: `En production, ajoute la variable via Vercel CLI :\nvercel env add ${key} production`,
    });
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let content = "";
    try { content = fs.readFileSync(envPath, "utf-8"); } catch {}

    const regex = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `\n\n# Whapi.cloud\n${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, content);
    return NextResponse.json({ ok: true, message: "Sauvegardé dans .env.local. Redémarre le serveur pour appliquer." });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
