import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getPipedreamClient } from "@/lib/pipedream";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const pd = getPipedreamClient();
    const res = await pd.tokens.create({
      externalUserId: user.id,
      expiresIn: 3600, // 1 heure
      allowedOrigins: [
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://trigr-eight.vercel.app",
        "http://localhost:3000",
      ],
    });
    return NextResponse.json({ token: res.token, expiresAt: res.expiresAt });
  } catch (err) {
    console.error("Pipedream token error:", err);
    return NextResponse.json({ error: "pipedream_error" }, { status: 502 });
  }
}
