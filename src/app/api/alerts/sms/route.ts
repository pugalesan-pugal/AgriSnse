import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SmsBody = {
  to: string;
  body: string;
};

export async function POST(req: NextRequest) {
  try {
    const { to, body }: SmsBody = await req.json();
    if (!to || !body) {
      return NextResponse.json({ error: "to and body are required" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    if (!accountSid || !authToken || !messagingServiceSid) {
      return NextResponse.json({ error: "Twilio credentials not configured" }, { status: 500 });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const form = new URLSearchParams();
    form.set("To", to);
    form.set("MessagingServiceSid", messagingServiceSid);
    form.set("Body", body);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data?.message || "Twilio error" }, { status: resp.status });
    }

    return NextResponse.json({ ok: true, sid: data.sid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


