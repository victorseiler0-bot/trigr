import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { generateMorningBrief } from "@/lib/morning-brief";

export const maxDuration = 60;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brief = await generateMorningBrief(userId);
  if (!brief) return NextResponse.json({ error: "Impossible de générer le brief (connectez Gmail pour commencer)" }, { status: 422 });

  // Store in metadata
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: { lastBrief: brief, lastBriefDate: new Date().toISOString() },
  });

  return NextResponse.json({ brief });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enabled, waNumber } = await req.json() as { enabled?: boolean; waNumber?: string };
  const clerk = await clerkClient();

  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: {
      ...(enabled !== undefined && { briefEnabled: enabled }),
      ...(waNumber !== undefined && { briefWaNumber: waNumber }),
    },
  });

  return NextResponse.json({ ok: true });
}
