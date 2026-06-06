import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { generateMorningBrief } from "@/lib/morning-brief";

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

      // Send via WhatsApp if configured
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
            text: { body: brief },
          }),
        });
        results.push({ userId, status: "sent via WhatsApp" });
      } else {
        // Store brief in Clerk metadata for dashboard display
        await clerk.users.updateUserMetadata(userId, {
          privateMetadata: { lastBrief: brief, lastBriefDate: new Date().toISOString() },
        });
        results.push({ userId, status: "stored in metadata" });
      }
    } catch (err) {
      results.push({ userId, status: `error: ${(err as Error).message}` });
    }
  }

  return NextResponse.json({ results });
}
