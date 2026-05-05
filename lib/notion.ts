import { clerkClient } from "@clerk/nextjs/server";

type NotionMeta = { accessToken: string; workspaceName: string; workspaceId: string };

// ── Clerk metadata ────────────────────────────────────────────────────────────

export async function getNotionMeta(userId: string): Promise<NotionMeta | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;
  if (!meta.notionToken) return null;
  return {
    accessToken: meta.notionToken as string,
    workspaceName: (meta.notionWorkspace as string) ?? "",
    workspaceId: (meta.notionWorkspaceId as string) ?? "",
  };
}

export async function saveNotionMeta(userId: string, accessToken: string, workspaceName: string, workspaceId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { notionToken: accessToken, notionWorkspace: workspaceName, notionWorkspaceId: workspaceId },
  });
}

export async function clearNotionMeta(userId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { notionToken: null, notionWorkspace: null, notionWorkspaceId: null },
  });
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function notionFetch(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return r.json();
}

export async function searchNotionPages(token: string, query: string, limit = 10) {
  const data = await notionFetch("/search", token, {
    method: "POST",
    body: JSON.stringify({ query, filter: { value: "page", property: "object" }, page_size: limit }),
  });
  return (data.results ?? []).map((p: Record<string, unknown>) => {
    const props = (p.properties as Record<string, unknown>) ?? {};
    const titleProp = Object.values(props).find((v: unknown) => (v as Record<string, unknown>)?.type === "title") as Record<string, unknown> | undefined;
    const title = (titleProp?.title as Array<{ plain_text: string }>)?.[0]?.plain_text ?? "(Sans titre)";
    return { id: p.id, title, url: p.url, lastEdited: p.last_edited_time };
  });
}

export async function getNotionPage(token: string, pageId: string) {
  const [page, blocks] = await Promise.all([
    notionFetch(`/pages/${pageId}`, token),
    notionFetch(`/blocks/${pageId}/children`, token),
  ]);
  const props = (page.properties as Record<string, unknown>) ?? {};
  const titleProp = Object.values(props).find((v: unknown) => (v as Record<string, unknown>)?.type === "title") as Record<string, unknown> | undefined;
  const title = (titleProp?.title as Array<{ plain_text: string }>)?.[0]?.plain_text ?? "(Sans titre)";
  const content = (blocks.results ?? []).slice(0, 20).map((b: Record<string, unknown>) => {
    const type = b.type as string;
    const block = b[type] as Record<string, unknown>;
    const texts = (block?.rich_text as Array<{ plain_text: string }>) ?? [];
    return texts.map(t => t.plain_text).join("") || `[${type}]`;
  }).join("\n");
  return { title, content, url: page.url };
}

export async function createNotionPage(token: string, parentId: string, title: string, content: string) {
  const data = await notionFetch("/pages", token, {
    method: "POST",
    body: JSON.stringify({
      parent: { page_id: parentId },
      properties: { title: { title: [{ text: { content: title } }] } },
      children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content } }] } }],
    }),
  });
  return data.id ? { success: true, id: data.id, url: data.url } : { success: false };
}
