import { NextRequest, NextResponse } from "next/server";

// Twilio webhook — SMS entrant → forward vers n8n Zen router
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get("From") as string;
  const body = formData.get("Body") as string;

  const n8nBase = process.env.N8N_WEBHOOK_URL || process.env.N8N_TRIGR_SMS_WEBHOOK;
  const n8nWebhook = n8nBase ? `${n8nBase}/webhook/trigr-sms` : null;
  if (n8nWebhook && from && body) {
    fetch(n8nWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, message: body, channel: "sms" }),
    }).catch(() => {});
  }

  // TwiML vide — n8n rappelle /api/twilio/send pour répondre
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { "Content-Type": "text/xml" } }
  );
}
