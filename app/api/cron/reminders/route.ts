import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import webpush from "web-push";
import type { Reminder } from "@/app/api/reminders/route";

export const maxDuration = 60;

function initVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) webpush.setVapidDetails("mailto:victorseiler0@gmail.com", pub, priv);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({ limit: 100 });
  const now = new Date();
  let fired = 0;

  for (const user of users) {
    const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
    const reminders = (meta.reminders as Reminder[]) ?? [];
    const due = reminders.filter(r => !r.done && new Date(r.dueAt) <= now);
    if (!due.length) continue;

    initVapid();
    for (const r of due) {
      if (r.channel === "push") {
        const subs = (meta.pushSubscriptions as webpush.PushSubscription[]) ?? [];
        const payload = JSON.stringify({
          title: `⏰ Rappel : ${r.title}`,
          body: r.note ?? "",
          url: "/dashboard",
          tag: `reminder-${r.id}`,
        });
        await Promise.allSettled(subs.map(s => webpush.sendNotification(s, payload)));
      } else if (r.channel === "wa") {
        const waToken = process.env.WHATSAPP_TOKEN;
        const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const waNumber = meta.briefWaNumber as string | undefined;
        if (waToken && waPhoneId && waNumber) {
          await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: waNumber,
              type: "text",
              text: { body: `⏰ *Rappel Autozen*\n${r.title}${r.note ? `\n${r.note}` : ""}` },
            }),
          });
        }
      }
      fired++;
    }

    // Marquer les rappels envoyés comme done
    const updated = reminders.map(r =>
      due.find(d => d.id === r.id) ? { ...r, done: true } : r
    );
    await clerk.users.updateUserMetadata(user.id, {
      privateMetadata: { ...meta, reminders: updated },
    });
  }

  return NextResponse.json({ fired });
}
