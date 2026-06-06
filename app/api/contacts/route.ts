import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type Contact = { id: string; name: string; phone?: string; email?: string; notes?: string };

async function getContacts(userId: string): Promise<Contact[]> {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;
  return (meta.userContacts as Contact[]) ?? [];
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ contacts: await getContacts(userId) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { action?: string; contact?: Partial<Contact>; id?: string };
  const clerk = await clerkClient();
  const contacts = await getContacts(userId);

  if (body.action === "delete" && body.id) {
    const updated = contacts.filter(c => c.id !== body.id);
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { userContacts: updated } });
    return NextResponse.json({ ok: true });
  }

  if (body.contact) {
    const { name, phone, email, notes } = body.contact;
    if (!name) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });

    const existing = contacts.find(c => c.id === body.contact?.id);
    let updated: Contact[];
    if (existing && body.contact.id) {
      updated = contacts.map(c => c.id === body.contact!.id ? { ...c, name, phone, email, notes } as Contact : c);
    } else {
      const newContact: Contact = { id: Date.now().toString(), name, phone, email, notes };
      updated = [...contacts, newContact];
    }
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { userContacts: updated } });
    return NextResponse.json({ ok: true, contacts: updated });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
