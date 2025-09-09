import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InsightsParams = {
  state?: string;
  commodity?: string;
  limit?: string;
};

const BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || undefined;
    const commodity = searchParams.get("commodity") || undefined;
    const limit = searchParams.get("limit") || "20";

    const apiKey = process.env.DATA_GOV_API_KEY || "579b464db66ec23bdd000001c6a28831794544cb43717163adcbfab6"; // test default

    const params = new URLSearchParams({
      "api-key": apiKey,
      format: "json",
      limit,
    });

    if (state) params.append("filters[state]", state);
    if (commodity) params.append("filters[commodity]", commodity);

    const url = `${BASE_URL}?${params.toString()}`;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `data.gov.in error: ${text}` }, { status: 500 });
    }
    const data = await resp.json();

    const records = (data?.records || []).map((r: any) => ({
      state: r.state,
      district: r.district,
      market: r.market,
      commodity: r.commodity,
      variety: r.variety,
      arrival_date: r.arrival_date,
      min_price: Number(r.min_price || 0),
      max_price: Number(r.max_price || 0),
      modal_price: Number(r.modal_price || 0),
    }));

    return NextResponse.json({ ok: true, count: records.length, records });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


