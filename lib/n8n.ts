const N8N_URL = process.env.N8N_URL || "http://localhost:5678";
const N8N_KEY = process.env.N8N_API_KEY;

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
