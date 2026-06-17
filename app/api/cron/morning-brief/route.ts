import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { generateMorningBrief } from "@/lib/morning-brief";
import webpush from "web-push";

function initVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) webpush.setVapidDetails("mailto:victorseiler0@gmail.com", pub, priv);
}

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = (process.env.BRIEF_USER_IDS ?? process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);

  if (userIds.length === 0) {
    return NextResponse.json({ message: "No users configured (set BRIEF_USER_IDS or ADMIN_CLERK_USER_IDS)" });
  }

  const results: Array<{ userId: string; status: string }> = [];

  for (const userId of userIds) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const meta = user.privateMetadata as Record<string, unknown>;

      if (!meta.briefEnabled) {
        results.push({ userId, status: "skipped (not enabled)" });
        continue;
      }

      const brief = await generateMorningBrief(userId);
      if (!brief) {
        results.push({ userId, status: "no data" });
        continue;
      }

      // Send via Twilio SMS
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
      const smsTo = (meta.briefSmsNumber as string | undefined) ?? process.env.BRIEF_SMS_NUMBER;

      if (twilioSid && twilioToken && twilioFrom && smsTo) {
        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: smsTo, From: twilioFrom, Body: brief }).toString(),
          }
        );
        results.push({ userId, status: smsRes.ok ? "sent via SMS" : `sms error ${smsRes.status}` });
      } else {
        await clerk.users.updateUserMetadata(userId, {
          privateMetadata: { lastBrief: brief, lastBriefDate: new Date().toISOString() },
        });
        results.push({ userId, status: "stored in metadata (no SMS config)" });
      }

      // Push notification
      initVapid();
      const subs = (meta.pushSubscriptions as webpush.PushSubscription[]) ?? [];
      if (subs.length > 0) {
        const payload = JSON.stringify({
          title: "☀️ Ton Brief du Matin",
          body: brief.slice(0, 120) + "…",
          url: "/dashboard",
          tag: "morning-brief",
        });
        await Promise.allSettled(subs.map(sub => webpush.sendNotification(sub, payload)));
      }
    } catch (err) {
      results.push({ userId, status: `error: ${(err as Error).message}` });
    }
  }

  return NextResponse.json({ results });
}
