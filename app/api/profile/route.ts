import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type UserProfile = {
  businessName?: string;
  profession?: string;
  city?: string;
  tone?: "formal" | "informal";
  context?: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;
  return NextResponse.json({ profile: (meta.userProfile as UserProfile) ?? {} });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as UserProfile;
  const profile: UserProfile = {
    businessName: body.businessName?.slice(0, 100),
    profession: body.profession?.slice(0, 100),
    city: body.city?.slice(0, 60),
    tone: body.tone === "informal" ? "informal" : "formal",
    context: body.context?.slice(0, 500),
  };

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, { privateMetadata: { userProfile: profile } });
  return NextResponse.json({ ok: true, profile });
}
