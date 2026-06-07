import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sub = await req.json();
  if (!sub?.endpoint) return NextResponse.json({ error: "invalid_sub" }, { status: 400 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;

  const subs = (meta.pushSubscriptions as unknown[]) ?? [];
  const exists = subs.some((s: unknown) => (s as { endpoint: string }).endpoint === sub.endpoint);
  if (!exists) subs.push(sub);

  await client.users.updateUserMetadata(userId, {
    privateMetadata: { ...meta, pushSubscriptions: subs },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
  const subs = ((meta.pushSubscriptions as unknown[]) ?? []).filter(
    (s: unknown) => (s as { endpoint: string }).endpoint !== endpoint
  );

  await client.users.updateUserMetadata(userId, {
    privateMetadata: { ...meta, pushSubscriptions: subs },
  });

  return NextResponse.json({ ok: true });
}
