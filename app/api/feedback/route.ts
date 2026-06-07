import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: true }); // silently ignore

  const { messageIndex, rating, content } = await req.json() as {
    messageIndex: number;
    rating: "up" | "down";
    content?: string;
  };

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
    const feedback = (meta.aiFeedback as unknown[]) ?? [];

    feedback.push({
      ts: new Date().toISOString(),
      rating,
      messageIndex,
      content: content?.slice(0, 200),
    });

    await clerk.users.updateUserMetadata(userId, {
      privateMetadata: { ...meta, aiFeedback: feedback.slice(-50) },
    });
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true });
}
