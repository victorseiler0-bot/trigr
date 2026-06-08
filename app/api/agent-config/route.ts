import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const ADMIN_KEY = process.env.CRON_SECRET || "autozen-internal";

// GET — lire les configs d'agents (publique si auth, interne si clé admin)
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-autozen-internal");
  if (adminKey !== ADMIN_KEY) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const clerk = await clerkClient();
    // Stocké dans les metadata de l'app (premier admin user) ou fallback sur defaults
    const globalMeta = await clerk.users.getUserList({ limit: 1 });
    const user = globalMeta.data[0];
    if (!user) return NextResponse.json({ configs: {}, source: "default" });

    const meta = user.privateMetadata as Record<string, unknown>;
    const configs = meta.agentConfigs as Record<string, unknown> ?? {};

    return NextResponse.json({
      configs,
      source: Object.keys(configs).length > 0 ? "custom" : "default",
      last_updated: meta.agentConfigsUpdatedAt ?? null,
    });
  } catch {
    return NextResponse.json({ configs: {}, source: "default" });
  }
}

// POST — sauvegarder les configs générées par le pipeline IA
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-autozen-internal");
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: "Clé admin requise" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { configs, pipeline_run_id, scores } = body as {
      configs: Record<string, { system_prompt: string; score: number; version: string }>;
      pipeline_run_id?: string;
      scores?: Record<string, number>;
    };

    if (!configs || typeof configs !== "object") {
      return NextResponse.json({ error: "configs requis" }, { status: 400 });
    }

    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({ limit: 1 });
    const user = users.data[0];
    if (!user) return NextResponse.json({ error: "Aucun utilisateur" }, { status: 404 });

    const meta = user.privateMetadata as Record<string, unknown>;
    const existing = (meta.agentConfigs as Record<string, unknown>) ?? {};

    // Merge : ne remplacer que si le nouveau score est meilleur
    const merged: Record<string, unknown> = { ...existing };
    let updated = 0;
    for (const [agentId, config] of Object.entries(configs)) {
      const existingConfig = existing[agentId] as { score?: number } | undefined;
      if (!existingConfig || (config.score ?? 0) >= (existingConfig.score ?? 0)) {
        merged[agentId] = { ...config, updated_at: new Date().toISOString() };
        updated++;
      }
    }

    await clerk.users.updateUserMetadata(user.id, {
      privateMetadata: {
        ...meta,
        agentConfigs: merged,
        agentConfigsUpdatedAt: new Date().toISOString(),
        lastPipelineRunId: pipeline_run_id,
        lastPipelineScores: scores,
      },
    });

    return NextResponse.json({
      success: true,
      updated_agents: updated,
      total_agents: Object.keys(merged).length,
      pipeline_run_id,
    });
  } catch (err) {
    console.error("[agent-config POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
