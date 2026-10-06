// src/app/apis/features/route.ts
//
// Accessible at: GET http://localhost:3000/apis/features

import connectToDatabase from "@/lib/mongooes";
import Features from "@/modal/Features";
import { NextRequest, NextResponse } from "next/server";

// ─── Feature Item Type ──────────────────────────────────────
export interface FeatureItem {
  id: string;
  icon: string;      // flaticon class name
  title: string;
  text: string;
  imageUrl: string;   // URL to the feature image
  order: number;     // for sorting
}

export interface FeaturesApiResponse {
  data: FeatureItem[];
  total: number;
}

export interface FeaturesApiError {
  error: string;
}


// ─── GET /apis/features ─────────────────────────────────────
export async function GET(req: NextRequest) {
  try {

    await connectToDatabase();

    const sp = req.nextUrl.searchParams;

    // Optional: support filtering by specific feature IDs
    const ids = sp.get("ids")?.split(",").map(s => s.trim()).filter(Boolean) ?? [];

    // Optional: support limit
    const limit = Math.max(1, Math.min(10, parseInt(sp.get("limit") ?? "10", 10)));

    // ── Filter ────────────────────────────────────────────────

    const query: any = {};
    if (ids.length > 0) {
      query._id = { $in: ids }; // if you want to filter by MongoDB _id
      // Or if you want to filter by a custom `id` field, use: query.id = { $in: ids };
    }
    const features = await Features.find(query)
      .sort({ order: 1 })
      .limit(limit)
      .lean();


    return NextResponse.json(
      { data: features, total: features.length } satisfies FeaturesApiResponse,
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
        },
      }
    );

  } catch (err) {
    console.error("[GET /apis/features]", err);
    return NextResponse.json(
      { error: "Internal server error" } satisfies FeaturesApiError,
      { status: 500 }
    );
  }
}