import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const BRIDGE = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";

async function callBridge(method: string, path: string, body?: unknown) {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  if (init.body) init.headers = { "Content-Type": "application/json" };
  const res = await fetch(`${BRIDGE}/${path}`, init);
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const action = sp.get("action") ?? "status";

  try {
    let path = action;
    if (action === "messages") {
      const jid = sp.get("jid") ?? "";
      const limit = sp.get("limit") ?? "20";
      path = `messages/${encodeURIComponent(jid)}?limit=${limit}`;
    }
    const { status, data } = await callBridge("GET", path);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { error: "Bridge inaccessible — lance le bridge WhatsApp en local" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { status, data } = await callBridge("POST", "send", body);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: "Bridge inaccessible" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { status, data } = await callBridge("POST", "logout");
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: "Bridge inaccessible" }, { status: 503 });
  }
}
