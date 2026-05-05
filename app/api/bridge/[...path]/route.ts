import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { get as edgeGet } from "@vercel/edge-config";

// URL du bridge : Edge Config en priorité (mise à jour sans redéploiement), puis env var statique
async function getBridgeUrl(): Promise<string> {
  try {
    const url = await edgeGet<string>("bridge_url");
    if (url) return url;
  } catch {}
  return process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (params.path.some(seg => seg.includes("..") || seg.startsWith("/"))) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  const bridge = await getBridgeUrl();
  const path = params.path.join("/");
  const url = new URL(req.url);
  const query = url.search;
  const target = `${bridge}/${path}${query}`;

  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      init.body = await req.text();
      init.headers = { "Content-Type": "application/json" };
    }
  }

  try {
    const r = await fetch(target, { ...init, signal: AbortSignal.timeout(15000) });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: "Bridge inaccessible" }, { status: 503 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
