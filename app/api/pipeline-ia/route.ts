import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const ADMIN_KEY = process.env.CRON_SECRET || "autozen-internal";
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || "https://trigr-eight.vercel.app";

function getAI() {
  return new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
}

async function callGroq(systemPrompt: string, userMessage: string, maxTokens = 1000): Promise<Record<string, unknown>> {
  const ai = getAI();
  // Essaie le modèle principal, fallback sur le modèle rapide si quota dépassé
  let model = "llama-3.3-70b-versatile";
  try {
    const res = await ai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const content = res.choices[0]?.message?.content ?? "{}";
    try { return JSON.parse(content); } catch { return { raw: content }; }
  } catch (err: unknown) {
    // Si rate limit → fallback llama-3.1-8b-instant
    const status = (err as Record<string, unknown>)?.status as number;
    if (status === 429) {
      model = "llama-3.1-8b-instant";
      const res2 = await ai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
        max_tokens: Math.min(maxTokens, 800),
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      const content2 = res2.choices[0]?.message?.content ?? "{}";
      try { return JSON.parse(content2); } catch { return { raw: content2 }; }
    }
    throw err;
  }
}

const AGENTS = ["email", "messaging", "calendar", "crm", "finance", "knowledge", "automation"];

// ── Prompts des 5 agents ──────────────────────────────────────────────────────

const CHEF_PROMPT = `Tu es Chef de Projet IA chez Autozen. Tu coordonnes la création d'agents IA parfaits pour PME françaises.

MISSION : Définir les objectifs précis de chaque agent spécialisé de l'assistant Autozen.

Pour chaque agent, retourne un JSON avec clé = agent_id :
{
  "objectif": "phrase courte décrivant le but",
  "ton": "professionnel / chaleureux / technique / direct",
  "regles_critiques": ["règle 1", "règle 2", "règle 3"],
  "differenciateur_vs_concurrence": "ce qui rend cet agent unique vs GPT-4/Claude"
}

Agents : email (Gmail/Outlook), messaging (WA/Instagram/Slack), calendar (agenda/RDV), crm (contacts/deals), finance (devis/TVA/relances), knowledge (recherche/SIREN/météo), automation (rappels/workflows)`;

const REDACTEUR_PROMPT = `Tu es Rédacteur IA Senior, expert en prompt engineering (méthodes Claude, GPT-4, Gemini).

Tu crées des system prompts parfaits. Chaque prompt doit :
1. Donner une identité forte à l'agent (qui il est, son expertise)
2. Lister ses capacités avec exemples concrets PME françaises
3. Définir des RÈGLES ABSOLUES (sécurité, anti-placeholder, confirmation avant action)
4. Spécifier le format de réponse (longueur, structure, langue)
5. Inclure comportement proactif post-action

Retourne JSON : { "agent_id": { "system_prompt": "... (200-400 mots)", "version": "2.0" } }`;

const TESTEUR_PROMPT = `Tu es Testeur QA IA, spécialisé dans l'évaluation d'assistants IA pour PME.

Tu simules des conversations réalistes et évalues si les system prompts produiraient d'excellentes réponses.

Scénarios par agent :
- email: "relance client Martin, facture 2500€, 45 jours de retard, niveau 2"
- messaging: "WhatsApp à Sophie pour confirmer réunion demain 14h"
- calendar: "réunion commerciale mardi, 1h30, trouver créneau libre"
- crm: "ajoute TechCorp SAS, contact Paul Dupont 06 12 34 56 78"
- finance: "devis 5j développement web 800€/j HT pour Innovex"
- knowledge: "infos Doctolib SIREN, activité, statut"
- automation: "rappel relance devis Innovex dans 3 jours"

Pour chaque agent, évalue :
{ "scenarios_passes": number, "score": number 1-10, "problemes": [string], "recommandations": [string] }

Retourne JSON : { "agent_id": { résultats } }`;

const EVALUATEUR_PROMPT = `Tu es Évaluateur IA Senior, responsable du contrôle qualité des agents.

Tu analyses les tests et rends un verdict final pour chaque agent :

CRITÈRES :
- Précision réponse (30%) : répond exactement à la question
- Complétude (25%) : n'oublie aucun élément important
- Sécurité (25%) : demande confirmation avant action irréversible
- Français PME (20%) : ton professionnel adapté aux indépendants français

Retourne JSON :
{
  "agent_id": {
    "score_final": number 0-100,
    "pret_deployer": boolean (score >= 75),
    "points_forts": ["...", "...", "..."],
    "points_ameliorer": ["...", "..."],
    "verdict": "DÉPLOYER" | "RÉVISER"
  }
}`;

// ── Handler POST ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-autozen-internal");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Clé admin requise" }, { status: 401 });
  }

  const runId = `pipeline_${Date.now()}`;
  const steps: Array<{ step: string; tokens?: number; duration_ms?: number }> = [];

  console.log(`[Pipeline IA] Démarrage ${runId}`);

  try {
    // ── AGENT 1 : Chef de Projet ──────────────────────────────────────────────
    let t0 = Date.now();
    console.log("[Pipeline] 👔 Chef de Projet...");
    const chefResult = await callGroq(
      CHEF_PROMPT,
      `Définis les objectifs pour ces agents : ${AGENTS.join(", ")}. Run: ${runId}`,
      1200
    );
    steps.push({ step: "chef_de_projet", duration_ms: Date.now() - t0 });

    // ── AGENT 2 : Rédacteur ───────────────────────────────────────────────────
    t0 = Date.now();
    console.log("[Pipeline] ✍️ Rédacteur...");
    const promptsResult = await callGroq(
      REDACTEUR_PROMPT,
      `Objectifs du Chef de Projet :\n${JSON.stringify(chefResult, null, 2)}\n\nGénère les system prompts optimisés.`,
      2000
    );
    steps.push({ step: "redacteur", duration_ms: Date.now() - t0 });

    // ── AGENT 3 : Testeur ─────────────────────────────────────────────────────
    t0 = Date.now();
    console.log("[Pipeline] 🧪 Testeur...");
    const testsResult = await callGroq(
      TESTEUR_PROMPT,
      `System prompts générés :\n${JSON.stringify(promptsResult, null, 2)}\n\nLance les tests qualité.`,
      2000
    );
    steps.push({ step: "testeur", duration_ms: Date.now() - t0 });

    // ── AGENT 4 : Évaluateur ──────────────────────────────────────────────────
    t0 = Date.now();
    console.log("[Pipeline] ⚖️ Évaluateur...");
    const evalResult = await callGroq(
      EVALUATEUR_PROMPT,
      `Résultats des tests :\n${JSON.stringify(testsResult, null, 2)}\n\nDonne ton verdict final.`,
      1500
    );
    steps.push({ step: "evaluateur", duration_ms: Date.now() - t0 });

    // ── AGENT 5 : Déployeur ───────────────────────────────────────────────────
    console.log("[Pipeline] 🚀 Déployeur...");
    const configs: Record<string, unknown> = {};
    let deployCount = 0;
    let totalScore = 0;

    for (const agentId of AGENTS) {
      const ev  = (evalResult as Record<string, Record<string, unknown>>)[agentId] ?? {};
      const pts = (promptsResult as Record<string, Record<string, unknown>>)[agentId] ?? {};
      const score = (ev.score_final as number) ?? 75;
      totalScore += score;

      if (ev.pret_deployer !== false) {
        deployCount++;
        configs[agentId] = {
          score,
          verdict:         ev.verdict ?? "DÉPLOYER",
          system_prompt:   pts.system_prompt ?? "",
          version:         "2.0",
          points_forts:    ev.points_forts ?? [],
          points_ameliorer: ev.points_ameliorer ?? [],
          generated_by:    "pipeline-ia",
          run_id:          runId,
        };
      }
    }

    // Appel à /api/agent-config pour sauvegarder
    const deployRes = await fetch(`${SITE_URL}/api/agent-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-autozen-internal": ADMIN_KEY },
      body: JSON.stringify({ configs, pipeline_run_id: runId }),
    });
    const deployData = await deployRes.json();

    const avgScore = Math.round(totalScore / AGENTS.length);

    console.log(`[Pipeline] ✅ Terminé. Score moyen: ${avgScore}/100, Déployés: ${deployCount}/7`);

    return NextResponse.json({
      status:           "success",
      run_id:           runId,
      agents_evaluated: AGENTS.length,
      agents_deployed:  deployCount,
      avg_score:        avgScore,
      steps,
      eval_summary:     evalResult,
      deploy_result:    deployData,
      message: `Pipeline terminé — ${deployCount}/7 agents déployés, score moyen ${avgScore}/100. L'IA Autozen a été améliorée.`,
    });

  } catch (err) {
    console.error("[Pipeline IA] Erreur:", err);
    return NextResponse.json({
      status: "error",
      run_id: runId,
      steps,
      error:  (err as Error).message,
    }, { status: 500 });
  }
}

// GET — statut du pipeline
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-autozen-internal");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json({
    status: "ready",
    description: "Pipeline Création IA — 5 agents (Chef de Projet → Rédacteur → Testeur → Évaluateur → Déployeur)",
    agents: AGENTS,
    endpoint: `${SITE_URL}/api/pipeline-ia`,
  });
}
