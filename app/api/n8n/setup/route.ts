import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { upsertN8nWorkflow, buildWaSendWorkflow, buildWaReadWorkflow, buildInstagramWorkflow } from "@/lib/n8n";

// POST /api/n8n/setup — crée ou met à jour les 3 workflows Trigr dans n8n
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const results: Record<string, string | null> = {};

  results.wa_send = await upsertN8nWorkflow(buildWaSendWorkflow());
  results.wa_read = await upsertN8nWorkflow(buildWaReadWorkflow());
  results.instagram = await upsertN8nWorkflow(buildInstagramWorkflow());

  const ok = Object.values(results).every(v => v !== null);
  return NextResponse.json({ ok, workflows: results });
}
