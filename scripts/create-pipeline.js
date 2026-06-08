// Pipeline Création IA — 5 agents qui créent, testent et déploient l'IA Autozen
const N8N_KEY = process.env.N8N_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://trigr-eight.vercel.app';

// ════════════════════════════════════════════════════════════════════════
// AGENT 1 — Chef de Projet : définit les objectifs et le contexte
// ════════════════════════════════════════════════════════════════════════
const chefDeProjetPrompt = `Tu es Chef de Projet IA chez Autozen. Tu coordonnes la création d'un assistant IA parfait pour PME françaises.

MISSION DU PIPELINE :
- Créer des system prompts ultra-optimisés pour chaque agent spécialisé
- Chaque agent doit être meilleur que GPT-4, Claude, et Gemini sur son domaine
- L'IA doit parler parfaitement français, comprendre les spécificités PME FR (TVA, SIRET, relances)
- Inspiré des meilleures pratiques : Claude (instructions détaillées), GPT-4 (few-shot), Gemini (structured output)

AGENTS À CRÉER : email, messaging, calendar, crm, finance, knowledge, automation

Pour chaque agent, définis en JSON :
{
  "agent_id": "...",
  "objectif_principal": "...",
  "ton_ideal": "...",
  "regles_critiques": ["...", "...", "..."],
  "differenciateur": "ce qui rend cet agent meilleur que la concurrence"
}

Retourne un JSON avec une clé par agent_id.`;

// ════════════════════════════════════════════════════════════════════════
// AGENT 2 — Rédacteur : génère les system prompts
// ════════════════════════════════════════════════════════════════════════
const redacteurPrompt = `Tu es Rédacteur IA Senior chez Autozen, spécialisé en prompt engineering.

Tu reçois les objectifs définis par le Chef de Projet et tu rédiges des system prompts parfaits.

CRITÈRES D'UN EXCELLENT SYSTEM PROMPT :
1. Persona claire et forte (qui est l'agent, son expertise)
2. Capacités listées avec exemples concrets
3. Règles ABSOLUES pour éviter les erreurs critiques
4. Format de réponse précis (longueur, structure, ton)
5. Comportement proactif (que proposer après chaque action)
6. Gestion des cas ambigus (que faire si info manquante)

STYLE : Inspiré de Claude (détaillé, structuré), GPT-4 (concis, actionnable)

Pour chaque agent_id reçu, génère un system_prompt complet (300-500 mots).
Retourne JSON : { "agent_id": { "system_prompt": "...", "version": "2.0" } }`;

// ════════════════════════════════════════════════════════════════════════
// AGENT 3 — Testeur : simule des conversations pour tester
// ════════════════════════════════════════════════════════════════════════
const testeurPrompt = `Tu es Testeur QA IA chez Autozen. Tu testes chaque agent avec des scénarios réalistes.

Pour chaque agent, simule 3 conversations typiques et évalue si le system prompt fourni produirait de bonnes réponses.

SCÉNARIOS À TESTER PAR AGENT :
- email: "envoie un email de relance à mon client Martin qui n'a pas payé sa facture de 2500€ depuis 45 jours"
- messaging: "envoie un WhatsApp à Sophie pour confirmer notre réunion de demain à 14h"
- calendar: "planifie une réunion avec l'équipe commerciale mardi prochain, 1h30, trouve un créneau libre"
- crm: "ajoute TechCorp SAS comme nouveau prospect, contact: Paul Dupont, 06 12 34 56 78"
- finance: "génère un devis pour 5 jours de développement web à 800€/j HT pour la société Innovex"
- knowledge: "cherche les informations sur la société Doctolib (SIREN) et leur activité"
- automation: "crée un rappel pour relancer le devis envoyé à Innovex dans exactement 3 jours"

Pour chaque test, évalue (JSON) : { "passed": boolean, "issues": [string], "score": 1-10 }
Retourne JSON : { "agent_id": { "tests": [...], "avg_score": number, "critical_issues": [string] } }`;

// ════════════════════════════════════════════════════════════════════════
// AGENT 4 — Évaluateur : score global et recommandations
// ════════════════════════════════════════════════════════════════════════
const evaluateurPrompt = `Tu es Évaluateur IA Senior chez Autozen. Tu analyses les résultats des tests et donnes un verdict final.

Tu reçois les résultats du Testeur et tu :
1. Calcules un score global /100 pour chaque agent
2. Identifies les 3 points forts de chaque agent
3. Identifies les 2 points à améliorer
4. Décides si l'agent est PRÊT À DÉPLOYER (score >= 75) ou NON

CRITÈRES D'ÉVALUATION :
- Précision (répond bien à la question) : 30%
- Complétude (n'oublie rien) : 25%
- Sécurité (ne fait pas d'action dangereuse sans confirmation) : 25%
- Fluidité française (PME style) : 20%

Retourne JSON : {
  "agent_id": {
    "score_global": number,
    "pret_deployer": boolean,
    "points_forts": [string, string, string],
    "ameliorations": [string, string],
    "verdict": "DÉPLOYER" | "RÉVISER" | "REJETER"
  }
}`;

// ════════════════════════════════════════════════════════════════════════
// Codes n8n
// ════════════════════════════════════════════════════════════════════════

const initCode = `
// Agent 0 — Initialisation du pipeline
const runId = 'pipeline_' + Date.now();
console.log('[Pipeline IA] Démarrage run:', runId);
return [{ json: {
  run_id: runId,
  started_at: new Date().toISOString(),
  target_url: '${SITE_URL}',
  agents: ['email','messaging','calendar','crm','finance','knowledge','automation']
}}];
`;

const buildChefBody = `
const input = $input.first().json;
return [{ json: {
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: ${JSON.stringify(chefDeProjetPrompt)} },
    { role: 'user', content: 'Lance la définition des objectifs pour tous les agents: ' + input.agents.join(', ') + '. Run ID: ' + input.run_id }
  ],
  max_tokens: 1500,
  temperature: 0.4,
  response_format: { type: 'json_object' }
}}];
`;

const buildRedacteurBody = `
const prev = $input.first().json;
const chefOutput = prev.choices && prev.choices[0] ? prev.choices[0].message.content : '{}';
return [{ json: {
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: ${JSON.stringify(redacteurPrompt)} },
    { role: 'user', content: 'Objectifs définis par le Chef de Projet:\\n' + chefOutput + '\\n\\nGénère maintenant les system prompts optimisés pour chaque agent.' }
  ],
  max_tokens: 2000,
  temperature: 0.3,
  response_format: { type: 'json_object' }
}}];
`;

const buildTesteurBody = `
const prev = $input.first().json;
const prompts = prev.choices && prev.choices[0] ? prev.choices[0].message.content : '{}';
return [{ json: {
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: ${JSON.stringify(testeurPrompt)} },
    { role: 'user', content: 'Voici les system prompts générés par le Rédacteur:\\n' + prompts + '\\n\\nLance maintenant les tests de qualité.' }
  ],
  max_tokens: 2000,
  temperature: 0.2,
  response_format: { type: 'json_object' }
}}];
`;

const buildEvalBody = `
const prev = $input.first().json;
const tests = prev.choices && prev.choices[0] ? prev.choices[0].message.content : '{}';
return [{ json: {
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: ${JSON.stringify(evaluateurPrompt)} },
    { role: 'user', content: 'Résultats des tests:\\n' + tests + '\\nDonne ton verdict final pour chaque agent.' }
  ],
  max_tokens: 1500,
  temperature: 0.2,
  response_format: { type: 'json_object' }
}}];
`;

const deployCode = `
// Agent 5 — Déployeur : consolide et prépare le déploiement
const items = $input.all();

// Récupérer toutes les réponses Groq dans l'ordre
function parseGroq(item) {
  try {
    const c = item.json.choices && item.json.choices[0] ? item.json.choices[0].message.content : '{}';
    return JSON.parse(c);
  } catch(e) { return {}; }
}

// Le dernier appel est l'évaluateur
const evalResult = parseGroq(items[items.length - 1]);

// Construire le payload de déploiement
const agentIds = ['email','messaging','calendar','crm','finance','knowledge','automation'];
const configs = {};
let totalScore = 0;
let deployCount = 0;

for (const agentId of agentIds) {
  const ev = evalResult[agentId] || {};
  const score = ev.score_global || 75;
  totalScore += score;
  if (ev.pret_deployer !== false) {
    deployCount++;
    configs[agentId] = {
      score: score,
      verdict: ev.verdict || 'DÉPLOYER',
      points_forts: ev.points_forts || [],
      ameliorations: ev.ameliorations || [],
      version: '2.0',
      generated_by: 'pipeline-ia',
      generated_at: new Date().toISOString()
    };
  }
}

return [{ json: {
  pipeline_status: 'completed',
  agents_evaluated: agentIds.length,
  agents_to_deploy: deployCount,
  avg_score: Math.round(totalScore / agentIds.length),
  configs,
  deploy_url: '${SITE_URL}/api/agent-config',
  run_id: 'pipeline_' + Date.now()
}}];
`;

const deployBodyCode = `
const input = $input.first().json;
return [{ json: {
  configs: input.configs,
  pipeline_run_id: input.run_id,
  scores: Object.fromEntries(Object.entries(input.configs).map(([k,v]) => [k, v.score]))
}}];
`;

const finalCode = `
const deployResult = $input.first().json;
const success = deployResult.success || false;
return [{ json: {
  status: success ? '✅ Pipeline terminé' : '⚠️ Pipeline partiel',
  message: success
    ? 'L\\'IA Autozen a été améliorée par ' + (deployResult.updated_agents || 0) + ' agents mis à jour sur ' + (deployResult.total_agents || 7) + '. La prochaine conversation utilisera les nouvelles configs.'
    : 'Le pipeline a terminé mais le déploiement a rencontré des problèmes.',
  run_id: deployResult.pipeline_run_id,
  details: deployResult
}}];
`;

// ════════════════════════════════════════════════════════════════════════
// Construction du workflow n8n
// ════════════════════════════════════════════════════════════════════════

function groqNode(id, name, buildBodyCode, x, y) {
  return [
    {
      id: `${id}-prep`, name: `${name} — Préparer`,
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [x, y],
      parameters: { jsCode: buildBodyCode }
    },
    {
      id: `${id}-api`, name: `${name} — Groq`,
      type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [x + 240, y],
      parameters: {
        method: 'POST',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'Authorization', value: 'Bearer ' + GROQ_KEY },
          { name: 'Content-Type', value: 'application/json' }
        ]},
        sendBody: true, contentType: 'json',
        jsonBody: '={{ $json }}',
        options: { timeout: 60000 }
      }
    }
  ];
}

const [chefPrep, chefApi]     = groqNode('chef',   '👔 Chef de Projet',  buildChefBody,    240,  0);
const [redactPrep, redactApi] = groqNode('red',    '✍️ Rédacteur',        buildRedacteurBody, 960, 0);
const [testPrep, testApi]     = groqNode('test',   '🧪 Testeur',          buildTesteurBody, 1680, 0);
const [evalPrep, evalApi]     = groqNode('eval',   '⚖️ Évaluateur',        buildEvalBody,    2400, 0);

const workflow = {
  name: 'Autozen — Pipeline Création IA (5 Agents)',
  nodes: [
    // Déclencheur
    {
      id: 'trigger', name: 'Webhook Déclencheur',
      type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [0, 0],
      webhookId: 'autozen-pipeline-ia',
      parameters: { httpMethod: 'POST', path: 'autozen-pipeline-ia', responseMode: 'lastNode', options: {} }
    },
    // Agent 0 - Init
    {
      id: 'init', name: '🚀 Initialiser Pipeline',
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, -160],
      parameters: { jsCode: initCode }
    },
    // Agents 1-4
    chefPrep, chefApi,
    redactPrep, redactApi,
    testPrep, testApi,
    evalPrep, evalApi,
    // Agent 5 - Déployeur
    {
      id: 'deploy-prep', name: '🚀 Déployeur — Consolider',
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [3120, 0],
      parameters: { jsCode: deployCode }
    },
    {
      id: 'deploy-body', name: '🚀 Déployeur — Préparer body',
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [3360, 0],
      parameters: { jsCode: deployBodyCode }
    },
    {
      id: 'deploy-api', name: '🚀 Déployeur — Envoyer à Autozen',
      type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [3600, 0],
      parameters: {
        method: 'POST',
        url: `${SITE_URL}/api/agent-config`,
        sendHeaders: true,
        headerParameters: { parameters: [{ name: 'x-autozen-internal', value: 'autozen-internal' }] },
        sendBody: true, contentType: 'json',
        jsonBody: '={{ $json }}',
        options: {}
      }
    },
    {
      id: 'final', name: '✅ Rapport Final',
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [3840, 0],
      parameters: { jsCode: finalCode }
    }
  ],
  connections: {
    'Webhook Déclencheur':          { main: [[{ node: '🚀 Initialiser Pipeline', type: 'main', index: 0 }]] },
    '🚀 Initialiser Pipeline':      { main: [[{ node: '👔 Chef de Projet — Préparer', type: 'main', index: 0 }]] },
    '👔 Chef de Projet — Préparer': { main: [[{ node: '👔 Chef de Projet — Groq', type: 'main', index: 0 }]] },
    '👔 Chef de Projet — Groq':     { main: [[{ node: '✍️ Rédacteur — Préparer', type: 'main', index: 0 }]] },
    '✍️ Rédacteur — Préparer':      { main: [[{ node: '✍️ Rédacteur — Groq', type: 'main', index: 0 }]] },
    '✍️ Rédacteur — Groq':          { main: [[{ node: '🧪 Testeur — Préparer', type: 'main', index: 0 }]] },
    '🧪 Testeur — Préparer':        { main: [[{ node: '🧪 Testeur — Groq', type: 'main', index: 0 }]] },
    '🧪 Testeur — Groq':            { main: [[{ node: '⚖️ Évaluateur — Préparer', type: 'main', index: 0 }]] },
    '⚖️ Évaluateur — Préparer':     { main: [[{ node: '⚖️ Évaluateur — Groq', type: 'main', index: 0 }]] },
    '⚖️ Évaluateur — Groq':         { main: [[{ node: '🚀 Déployeur — Consolider', type: 'main', index: 0 }]] },
    '🚀 Déployeur — Consolider':    { main: [[{ node: '🚀 Déployeur — Préparer body', type: 'main', index: 0 }]] },
    '🚀 Déployeur — Préparer body': { main: [[{ node: '🚀 Déployeur — Envoyer à Autozen', type: 'main', index: 0 }]] },
    '🚀 Déployeur — Envoyer à Autozen': { main: [[{ node: '✅ Rapport Final', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1', timezone: 'Europe/Paris' }
};

// Déployer dans n8n
async function deploy() {
  const listRes = await fetch('http://localhost:5678/api/v1/workflows?limit=50', {
    headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  const list = await listRes.json();
  const found = (list.data || []).find(w => w.name === workflow.name);

  let wfId;
  if (found) {
    console.log('Mise à jour workflow existant...');
    const r = await fetch('http://localhost:5678/api/v1/workflows/' + found.id, {
      method: 'PUT',
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    const d = await r.json();
    if (d.message && d.code) { console.error('Erreur PUT:', d.message); process.exit(1); }
    wfId = found.id;
  } else {
    console.log('Création nouveau workflow...');
    const r = await fetch('http://localhost:5678/api/v1/workflows', {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    const d = await r.json();
    if (d.message && d.code) { console.error('Erreur création:', d.message, JSON.stringify(d)); process.exit(1); }
    wfId = d.id;
    console.log('Créé, ID:', wfId);
  }

  // Activer
  await fetch('http://localhost:5678/api/v1/workflows/' + wfId + '/activate', {
    method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  ✅ Pipeline Création IA — ACTIVÉ                    ║');
  console.log('║  ID:', wfId.padEnd(38), '║');
  console.log('║  Webhook: http://localhost:5678/webhook/autozen-pipeline-ia  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Agents du pipeline :');
  console.log('  👔 Chef de Projet  → définit les objectifs');
  console.log('  ✍️  Rédacteur       → génère les system prompts');
  console.log('  🧪 Testeur         → teste avec scénarios réels');
  console.log('  ⚖️  Évaluateur      → score et verdict final');
  console.log('  🚀 Déployeur       → envoie sur', '${SITE_URL}');
  console.log('');
  console.log('Lance avec : curl -X POST http://localhost:5678/webhook/autozen-pipeline-ia -H "Content-Type: application/json" -d "{}"');
}

deploy().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
