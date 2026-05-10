import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

const N8N_URL = process.env.N8N_URL ?? "http://localhost:5678";
const N8N_API_KEY = process.env.N8N_API_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNDE5NDQwZi01NmYxLTQ3YjUtODU5Zi1mZGI5MjQwZDM1NTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYzdiNmIwOTctOTA1NS00OGQ5LWJhZTktYTE5ZDQ1YWE0YmY0IiwiaWF0IjoxNzc3MzIxMDAyfQ.I4iU0LARlXJVezzrWRbYx4hHoXtxgxEaJCkLxkX2_QY";

const headers = () => ({
  "X-N8N-API-KEY": N8N_API_KEY,
  "Content-Type": "application/json",
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await fetch(`${N8N_URL}/api/v1/workflows?limit=50`, {
      headers: headers(),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ error: "n8n error", status: r.status }, { status: 502 });
    const data = await r.json();
    const workflows = (data.data ?? []).map((w: { id: string; name: string; active: boolean }) => ({
      id: w.id,
      name: w.name,
      active: w.active,
    }));
    return NextResponse.json({ workflows });
  } catch {
    return NextResponse.json({ error: "n8n not reachable" }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, active } = await req.json();
  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const method = active ? "POST" : "POST";
    const endpoint = active
      ? `${N8N_URL}/api/v1/workflows/${id}/activate`
      : `${N8N_URL}/api/v1/workflows/${id}/deactivate`;

    const r = await fetch(endpoint, {
      method,
      headers: headers(),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ error: "n8n error" }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "n8n not reachable" }, { status: 503 });
  }
}
