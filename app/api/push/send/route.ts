import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import webpush from "web-push";

function initVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    webpush.setVapidDetails("mailto:victorseiler0@gmail.com", pub, priv);
  }
}

export async function POST(req: NextRequest) {
  initVapid();
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { title, body, url, tag } = await req.json();

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
  const subs = (meta.pushSubscriptions as webpush.PushSubscription[]) ?? [];

  if (!subs.length) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({ title: title ?? "Autozen", body: body ?? "", url: url ?? "/dashboard", tag });

  const results = await Promise.allSettled(
    subs.map(sub => webpush.sendNotification(sub, payload))
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: subs.length });
}
