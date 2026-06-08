import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

type WaMessage = { incoming: boolean; read: boolean };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ waUnread: 0, emailUnread: 0 });

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.privateMetadata as Record<string, unknown>;

    const waMessages = (meta.waMessages as WaMessage[]) ?? [];
    const waUnread = waMessages.filter(m => m.incoming && !m.read).length;

    // Email count from stored brief or 0
    const emailUnread = (meta.emailUnreadCount as number) ?? 0;

    return NextResponse.json({ waUnread, emailUnread });
  } catch {
    return NextResponse.json({ waUnread: 0, emailUnread: 0 });
  }
}
