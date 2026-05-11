const N8N_URL = process.env.N8N_URL || "http://localhost:5678";
const N8N_KEY = process.env.N8N_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNDE5NDQwZi01NmYxLTQ3YjUtODU5Zi1mZGI5MjQwZDM1NTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYzdiNmIwOTctOTA1NS00OGQ5LWJhZTktYTE5ZDQ1YWE0YmY0IiwiaWF0IjoxNzc3MzIxMDAyfQ.I4iU0LARlXJVezzrWRbYx4hHoXtxgxEaJCkLxkX2_QY";

export async function n8n(path: string, method = "GET", body?: unknown) {
  if (!N8N_KEY) return null;
  try {
    const r = await fetch(`${N8N_URL}/api/v1${path}`, {
      method,
      headers: { "X-N8N-API-KEY": N8N_KEY, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

// Trigger a webhook-based n8n workflow
export async function triggerN8nWebhook(path: string, payload: Record<string, unknown>) {
  try {
    const r = await fetch(`${N8N_URL}/webhook/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return { error: `n8n error ${r.status}` };
    return r.json();
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// Create or update a credential in n8n
export async function upsertN8nCredential(
  name: string,
  type: string,
  data: Record<string, unknown>
): Promise<string | null> {
  // Search for existing credential by name
  const existing = await n8n(`/credentials?name=${encodeURIComponent(name)}`);
  const found = (existing?.data ?? []).find((c: { name: string }) => c.name === name);
  if (found) {
    // Update existing
    await n8n(`/credentials/${found.id}`, "PATCH", { data });
    return found.id as string;
  }
  // Create new
  const created = await n8n("/credentials", "POST", { name, type, data });
  return created?.id ?? null;
}

// Upsert a workflow by name
export async function upsertN8nWorkflow(workflowDef: {
  name: string;
  nodes: unknown[];
  connections: unknown;
  settings?: unknown;
}): Promise<string | null> {
  const existing = await n8n(`/workflows?name=${encodeURIComponent(workflowDef.name)}&limit=5`);
  const found = (existing?.data ?? []).find((w: { name: string }) => w.name === workflowDef.name);

  if (found) {
    await n8n(`/workflows/${found.id}`, "PUT", {
      name: workflowDef.name,
      nodes: workflowDef.nodes,
      connections: workflowDef.connections,
      settings: workflowDef.settings ?? { executionOrder: "v1", timezone: "Europe/Paris" },
    });
    // Activate it
    await n8n(`/workflows/${found.id}/activate`, "POST");
    return found.id as string;
  }

  const created = await n8n("/workflows", "POST", {
    name: workflowDef.name,
    nodes: workflowDef.nodes,
    connections: workflowDef.connections,
    settings: workflowDef.settings ?? { executionOrder: "v1", timezone: "Europe/Paris" },
    active: true,
  });
  return created?.id ?? null;
}

// Build WhatsApp Send workflow (via Whapi)
export function buildWaSendWorkflow() {
  return {
    name: "Trigr — WA Send (Whapi)",
    nodes: [
      {
        id: "ws-1", name: "Webhook", type: "n8n-nodes-base.webhook",
        typeVersion: 2.1, position: [0, 0],
        webhookId: "trigr-wa-send",
        parameters: { httpMethod: "POST", path: "trigr-wa-send", responseMode: "lastNode", options: {} },
      },
      {
        id: "ws-2", name: "Envoyer via Whapi", type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.4, position: [220, 0],
        parameters: {
          method: "POST",
          url: "https://gate.whapi.cloud/messages/text",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "Authorization", value: "=Bearer {{ $json.token }}" }] },
          sendBody: true, contentType: "json",
          jsonBody: `={{ JSON.stringify({ to: $json.to, body: $json.message }) }}`,
          options: {},
        },
      },
      {
        id: "ws-3", name: "Répondre", type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.5, position: [440, 0],
        parameters: { respondWith: "allIncomingItems", options: {} },
      },
    ],
    connections: {
      "Webhook": { main: [[{ node: "Envoyer via Whapi", type: "main", index: 0 }]] },
      "Envoyer via Whapi": { main: [[{ node: "Répondre", type: "main", index: 0 }]] },
    },
  };
}

// Build WhatsApp Read workflow (via Whapi)
export function buildWaReadWorkflow() {
  return {
    name: "Trigr — WA Read (Whapi)",
    nodes: [
      {
        id: "wr-1", name: "Webhook", type: "n8n-nodes-base.webhook",
        typeVersion: 2.1, position: [0, 0],
        webhookId: "trigr-wa-read",
        parameters: { httpMethod: "POST", path: "trigr-wa-read", responseMode: "lastNode", options: {} },
      },
      {
        id: "wr-2", name: "Lire Chats Whapi", type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.4, position: [220, 0],
        parameters: {
          method: "GET",
          url: "https://gate.whapi.cloud/chats",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "Authorization", value: "=Bearer {{ $json.token }}" }] },
          sendQuery: true,
          queryParameters: { parameters: [{ name: "count", value: "={{ $json.limit ?? 10 }}" }] },
          options: {},
        },
      },
      {
        id: "wr-3", name: "Répondre", type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.5, position: [440, 0],
        parameters: { respondWith: "allIncomingItems", options: {} },
      },
    ],
    connections: {
      "Webhook": { main: [[{ node: "Lire Chats Whapi", type: "main", index: 0 }]] },
      "Lire Chats Whapi": { main: [[{ node: "Répondre", type: "main", index: 0 }]] },
    },
  };
}

// Build Instagram DM workflow (Meta Graph API)
export function buildInstagramWorkflow() {
  return {
    name: "Trigr — Instagram DMs",
    nodes: [
      {
        id: "ig-1", name: "Webhook", type: "n8n-nodes-base.webhook",
        typeVersion: 2.1, position: [0, 0],
        webhookId: "trigr-ig",
        parameters: { httpMethod: "POST", path: "trigr-ig", responseMode: "lastNode", options: {} },
      },
      {
        id: "ig-2", name: "Router action", type: "n8n-nodes-base.switch",
        typeVersion: 3.2, position: [220, 0],
        parameters: {
          mode: "rules",
          rules: {
            values: [
              { conditions: { options: { caseSensitive: false, leftValue: "", typeValidation: "loose", version: 2 }, conditions: [{ id: "r1", leftValue: "={{ $json.action }}", rightValue: "read", operator: { type: "string", operation: "equals" } }], combinator: "and" }, renameOutput: true, outputKey: "read" },
              { conditions: { options: { caseSensitive: false, leftValue: "", typeValidation: "loose", version: 2 }, conditions: [{ id: "r2", leftValue: "={{ $json.action }}", rightValue: "send", operator: { type: "string", operation: "equals" } }], combinator: "and" }, renameOutput: true, outputKey: "send" },
            ],
          },
        },
      },
      {
        id: "ig-3", name: "Lire Conversations", type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.4, position: [440, -80],
        parameters: {
          method: "GET",
          url: "=https://graph.facebook.com/v21.0/{{ $json.pageId }}/conversations",
          sendHeaders: false,
          sendQuery: true,
          queryParameters: { parameters: [{ name: "platform", value: "instagram" }, { name: "fields", value: "participants,messages{message,from,created_time}" }, { name: "access_token", value: "={{ $json.token }}" }] },
          options: {},
        },
      },
      {
        id: "ig-4", name: "Envoyer Message", type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.4, position: [440, 80],
        parameters: {
          method: "POST",
          url: "=https://graph.facebook.com/v21.0/{{ $json.pageId }}/messages",
          sendHeaders: false,
          sendQuery: true,
          sendBody: true, contentType: "json",
          jsonBody: `={{ JSON.stringify({ recipient: { id: $json.recipientId }, message: { text: $json.message }, access_token: $json.token }) }}`,
          options: {},
        },
      },
      {
        id: "ig-5", name: "Répondre", type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.5, position: [660, 0],
        parameters: { respondWith: "allIncomingItems", options: {} },
      },
    ],
    connections: {
      "Webhook": { main: [[{ node: "Router action", type: "main", index: 0 }]] },
      "Router action": { main: [[{ node: "Lire Conversations", type: "main", index: 0 }], [{ node: "Envoyer Message", type: "main", index: 0 }]] },
      "Lire Conversations": { main: [[{ node: "Répondre", type: "main", index: 0 }]] },
      "Envoyer Message": { main: [[{ node: "Répondre", type: "main", index: 0 }]] },
    },
  };
}
