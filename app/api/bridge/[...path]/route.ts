import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const BRIDGE = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";

async function proxy(req: NextRequest, params: { path: string[] }) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const path = params.path.join("/");
  const url = new URL(req.url);
  const query = url.search;
  const target = `${BRIDGE}/${path}${query}`;

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
