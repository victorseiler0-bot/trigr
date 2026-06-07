import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type Reminder = {
  id: string;
  title: string;
  note?: string;
  dueAt: string; // ISO
  channel: "push" | "wa" | "dashboard";
  done: boolean;
  createdAt: string;
};

async function getReminders(userId: string): Promise<Reminder[]> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return ((user.privateMetadata as Record<string, unknown>).reminders as Reminder[]) ?? [];
}

async function setReminders(userId: string, reminders: Reminder[]) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { ...meta, reminders },
  });
}

export async function GET(req: NextRequest) {
  // Internal call from assistant (server-side)
  const internal = req.headers.get("x-trigr-internal");
  if (internal && internal === process.env.CRON_SECRET) {
    // Return all non-done reminders across all users — not applicable for GET per user
    // Fall through to normal auth
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reminders = await getReminders(userId);
  return NextResponse.json({ reminders: reminders.filter(r => !r.done).sort((a, b) => a.dueAt.localeCompare(b.dueAt)) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { action?: string; id?: string; title?: string; note?: string; dueAt?: string; channel?: string };

  const reminders = await getReminders(userId);

  if (body.action === "done" && body.id) {
    const updated = reminders.map(r => r.id === body.id ? { ...r, done: true } : r);
    await setReminders(userId, updated);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete" && body.id) {
    await setReminders(userId, reminders.filter(r => r.id !== body.id));
    return NextResponse.json({ ok: true });
  }

  if (!body.title || !body.dueAt) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const reminder: Reminder = {
    id: `rem_${Date.now()}`,
    title: body.title,
    note: body.note,
    dueAt: body.dueAt,
    channel: (body.channel as Reminder["channel"]) ?? "push",
    done: false,
    createdAt: new Date().toISOString(),
  };

  await setReminders(userId, [...reminders, reminder]);
  return NextResponse.json({ reminder });
}
