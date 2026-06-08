/**
 * Autozen AI Engine — IA Générative Custom
 * Architecture 2026 : fallback chain multi-modèle + mémoire sémantique + RAG
 *
 * Inspiré des meilleures pratiques : Claude (instructions), GPT-4 (few-shot),
 * Gemini (structured output), LangGraph (state), Vercel AI SDK (streaming)
 */

import OpenAI from "openai";

// ── Modèles disponibles (ordre de préférence) ─────────────────────────────────

export type ModelConfig = {
  provider: "gemini" | "groq" | "ollama";
  model: string;
  label: string;
  maxTokens: number;
  supportsTools: boolean;
};

export const MODEL_CHAIN: ModelConfig[] = [
  { provider: "gemini", model: "gemini-2.0-flash",      label: "Gemini 2.0 Flash",    maxTokens: 2048, supportsTools: true  },
  { provider: "gemini", model: "gemini-1.5-flash",      label: "Gemini 1.5 Flash",    maxTokens: 2048, supportsTools: true  },
  { provider: "groq",   model: "llama-3.3-70b-versatile", label: "Llama 3.3 70B",    maxTokens: 1024, supportsTools: true  },
  { provider: "groq",   model: "llama-3.1-8b-instant",  label: "Llama 3.1 8B",       maxTokens: 800,  supportsTools: true  },
  { provider: "ollama", model: "gemma2",                 label: "Gemma 2 (local)",    maxTokens: 1024, supportsTools: false },
];

function buildClient(provider: ModelConfig["provider"]): OpenAI {
  switch (provider) {
    case "gemini":
      return new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
    case "groq":
      return new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
    case "ollama":
      return new OpenAI({
        apiKey: "ollama",
        baseURL: process.env.OLLAMA_URL || "http://localhost:11434/v1",
      });
  }
}

function isAvailable(provider: ModelConfig["provider"]): boolean {
  switch (provider) {
    case "gemini": return !!process.env.GEMINI_API_KEY;
    case "groq":   return !!process.env.GROQ_API_KEY;
    case "ollama": return !!process.env.OLLAMA_URL;
  }
}

// ── Engine principal ──────────────────────────────────────────────────────────

export type AIEngineResult = {
  content: string;
  model: string;
  provider: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; id: string }>;
};

export async function callAI(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.ChatCompletionTool[],
  forceModel?: ModelConfig,
): Promise<AIEngineResult> {
  const chain = forceModel ? [forceModel] : MODEL_CHAIN.filter(m => isAvailable(m.provider));

  if (!chain.length) {
    throw new Error("Aucun modèle IA disponible. Configure GEMINI_API_KEY ou GROQ_API_KEY.");
  }

  let lastError: Error | null = null;

  for (const config of chain) {
    const client = buildClient(config.provider);
    const hasTools = tools && tools.length > 0 && config.supportsTools;

    try {
      const completion = await client.chat.completions.create({
        model:       config.model,
        messages,
        tools:       hasTools ? tools : undefined,
        tool_choice: hasTools ? "auto" : undefined,
        max_tokens:  config.maxTokens,
        temperature: 0.3,
      });

      const msg = completion.choices[0]?.message;
      if (!msg) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolCalls = msg.tool_calls?.map((tc: any) => ({
        name: tc.function?.name ?? "",
        args: (() => { try { return JSON.parse(tc.function?.arguments ?? "{}"); } catch { return {}; } })(),
        id: tc.id ?? "",
      }));

      return {
        content:  msg.content ?? "",
        model:    config.model,
        provider: config.provider,
        toolCalls: toolCalls?.length ? toolCalls : undefined,
      };
    } catch (err: unknown) {
      const e      = err as Record<string, unknown>;
      const status = e?.status as number | undefined;

      // Rate limit ou quota → essayer le modèle suivant
      if (status === 429 || status === 503 || (e?.code as string) === "rate_limit_exceeded") {
        lastError = err as Error;
        continue;
      }

      // Modèle non disponible (pas de clé) → suivant
      if (status === 401 || status === 403) {
        lastError = err as Error;
        continue;
      }

      // Autre erreur → propager
      throw err;
    }
  }

  throw lastError ?? new Error("Tous les modèles ont échoué.");
}

// ── Mémoire sémantique (stockée dans Clerk, simple mais efficace) ─────────────

export type MemoryEntry = {
  id: string;
  content: string;           // Ce qui a été dit/fait
  summary: string;           // Résumé court
  type: "fact" | "action" | "preference" | "contact";
  timestamp: number;
  relevance_keywords: string[];
};

// Recherche mémoire par mots-clés (sans embedding, léger et rapide)
export function searchMemory(entries: MemoryEntry[], query: string, limit = 5): MemoryEntry[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const words = q.split(/\s+/).filter(w => w.length > 3);

  return entries
    .map(entry => {
      const text = (entry.content + " " + entry.summary + " " + entry.relevance_keywords.join(" "))
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      const score = words.filter(w => text.includes(w)).length;
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

// Extraire les faits importants d'une conversation (résumé automatique)
export async function extractMemoryFacts(
  userMessage: string,
  assistantResponse: string,
): Promise<MemoryEntry[]> {
  const now = Date.now();
  const facts: MemoryEntry[] = [];

  // Détecter contacts mentionnés
  const contactMatch = userMessage.match(/(?:de|à|pour|avec)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g);
  if (contactMatch) {
    contactMatch.forEach(match => {
      const name = match.replace(/^(de|à|pour|avec)\s+/, "");
      if (name.length > 2) {
        facts.push({
          id:                 `mem_${now}_${Math.random().toString(36).slice(2)}`,
          content:            `Contact mentionné : ${name}`,
          summary:            `Contact : ${name}`,
          type:               "contact",
          timestamp:          now,
          relevance_keywords: [name.toLowerCase(), "contact"],
        });
      }
    });
  }

  // Détecter préférences
  const PREF_PATTERNS = [
    /j'aime (.+?)(?:\.|,|$)/i,
    /je préfère (.+?)(?:\.|,|$)/i,
    /toujours (.+?) pour (.+?)(?:\.|,|$)/i,
  ];
  for (const p of PREF_PATTERNS) {
    const m = userMessage.match(p);
    if (m) {
      facts.push({
        id:                 `mem_${now}_${Math.random().toString(36).slice(2)}`,
        content:            `Préférence : ${m[0]}`,
        summary:            m[0].slice(0, 80),
        type:               "preference",
        timestamp:          now,
        relevance_keywords: m[0].toLowerCase().split(/\s+/).filter(w => w.length > 3),
      });
    }
  }

  // Actions effectuées
  const ACTION_KEYWORDS = ["envoyé", "créé", "ajouté", "planifié", "supprimé", "modifié"];
  if (ACTION_KEYWORDS.some(k => assistantResponse.toLowerCase().includes(k))) {
    facts.push({
      id:                 `mem_${now}_action`,
      content:            `Action : ${assistantResponse.slice(0, 200)}`,
      summary:            assistantResponse.replace(/[*_#]/g, "").slice(0, 80),
      type:               "action",
      timestamp:          now,
      relevance_keywords: userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3),
    });
  }

  return facts;
}

// ── RAG — Documents utilisateur ───────────────────────────────────────────────

export type DocumentChunk = {
  id: string;
  source: string;   // "note_XXX", "email_XXX", "contact_XXX"
  title: string;
  content: string;
  keywords: string[];
  created_at: number;
};

// Indexer un document (chunks + keywords)
export function indexDocument(title: string, content: string, source: string): DocumentChunk[] {
  // Chunking sémantique : découper par paragraphes/sections
  const paragraphs = content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 50);

  return paragraphs.map((chunk, i) => {
    const keywords = extractKeywords(chunk);
    return {
      id:         `doc_${source}_${i}`,
      source,
      title,
      content:    chunk,
      keywords,
      created_at: Date.now(),
    };
  });
}

// Recherche dans les documents (keyword-based, pas d'embedding)
export function searchDocuments(chunks: DocumentChunk[], query: string, limit = 3): DocumentChunk[] {
  const q     = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const words = q.split(/\s+/).filter(w => w.length > 3);

  return chunks
    .map(chunk => {
      const text  = (chunk.title + " " + chunk.content + " " + chunk.keywords.join(" ")).toLowerCase();
      const score = words.filter(w => text.includes(w)).length;
      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk }) => chunk);
}

function extractKeywords(text: string): string[] {
  // Mots significatifs (sans stopwords FR)
  const STOPWORDS = new Set(["les", "des", "une", "est", "par", "sur", "dans", "pour", "que", "qui", "avec", "pas", "tout", "mais", "comme", "plus", "son", "ses", "leur", "leur"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9àâéèêëîïôùûüç\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)  // unique
    .slice(0, 20);
}

// ── Résumé de conversation (pour mémoire long-terme) ─────────────────────────

export async function summarizeConversation(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  if (messages.length < 4) return "";

  const conversationText = messages
    .slice(-10)
    .map(m => `${m.role === "user" ? "Utilisateur" : "Autozen"}: ${m.content}`)
    .join("\n");

  try {
    const result = await callAI([
      {
        role: "system",
        content: "Résume cette conversation en 3-5 points clés. Format : bullet points courts, en français. Inclure : ce qui a été demandé, ce qui a été fait, les infos importantes (noms, dates, montants).",
      },
      { role: "user", content: conversationText },
    ]);
    return result.content;
  } catch {
    return "";
  }
}
