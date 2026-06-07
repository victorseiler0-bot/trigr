import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

type Note = { id: string; titre: string; contenu: string; tags?: string[]; createdAt: string };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const notes = ((user.privateMetadata as Record<string, unknown>).notes as Note[]) ?? [];
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { action?: string; id?: string; titre?: string; contenu?: string; tags?: string[] };
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
  const notes = (meta.notes as Note[]) ?? [];

  if (body.action === "delete" && body.id) {
    await client.users.updateUserMetadata(userId, { privateMetadata: { ...meta, notes: notes.filter(n => n.id !== body.id) } });
    return NextResponse.json({ ok: true });
  }

  if (!body.titre || !body.contenu) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const note: Note = { id: `note_${Date.now()}`, titre: body.titre, contenu: body.contenu, tags: body.tags, createdAt: new Date().toISOString() };
  await client.users.updateUserMetadata(userId, { privateMetadata: { ...meta, notes: [note, ...notes].slice(0, 100) } });
  return NextResponse.json({ note });
}
