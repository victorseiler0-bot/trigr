import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { n8n } from "@/lib/n8n";

// POST — active un workflow par son ID
export async function POST(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { workflowId } = await req.json();
  if (!workflowId) return NextResponse.json({ error: "workflowId requis" }, { status: 400 });
  if (!/^[a-zA-Z0-9_-]+$/.test(workflowId)) return NextResponse.json({ error: "workflowId invalide" }, { status: 400 });
  if (!process.env.N8N_API_KEY) return NextResponse.json({ error: "n8n non configuré" }, { status: 503 });

  const workflow = await n8n(`/workflows/${workflowId}`);
  if (!workflow) return NextResponse.json({ error: "Workflow introuvable" }, { status: 404 });

  if (workflow.active) return NextResponse.json({ ok: true, already: true, name: workflow.name });

  const result = await n8n(`/workflows/${workflowId}/activate`, "POST");
  if (!result) return NextResponse.json({ error: "Activation échouée" }, { status: 500 });

  return NextResponse.json({ ok: true, name: workflow.name });
}

// GET ?ids=id1,id2 — statuts des workflows
export async function GET(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const ids = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (!ids.length || !process.env.N8N_API_KEY) return NextResponse.json({ statuses: {} });

  const statuses: Record<string, boolean> = {};
  await Promise.all(ids.map(async (id) => {
    const w = await n8n(`/workflows/${id}`);
    if (w) statuses[id] = w.active ?? false;
  }));

  return NextResponse.json({ statuses });
}
