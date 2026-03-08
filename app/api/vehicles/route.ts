import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { VehicleSearchParams } from "@/types";

const createVehicleSchema = z.object({
  title: z.string().min(5).max(200),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1990).max(2030),
  mileage: z.number().int().min(0),
  price_aed: z.number().positive(),
  description: z.string().optional(),
  condition: z.enum(["excellent", "good", "fair"]),
  color: z.string().optional(),
  fuel_type: z.enum(["petrol", "diesel", "hybrid", "electric"]).optional(),
  transmission: z.enum(["automatic", "manual"]).optional(),
  body_type: z.string().optional(),
  vin: z.string().optional(),
  export_ready: z.boolean().default(false),
  shipping_port: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supabase = createClient();

  const params: VehicleSearchParams = {
    q: searchParams.get("q") ?? undefined,
    make: searchParams.get("make") ?? undefined,
    condition: searchParams.get("condition") ?? undefined,
    transmission: searchParams.get("transmission") ?? undefined,
    bodyType: searchParams.get("bodyType") ?? undefined,
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    minYear: searchParams.get("minYear") ? Number(searchParams.get("minYear")) : undefined,
    page: Number(searchParams.get("page") ?? 1),
    limit: Math.min(Number(searchParams.get("limit") ?? 24), 100),
    sortBy: (searchParams.get("sortBy") as VehicleSearchParams["sortBy"]) ?? "created_desc",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("vehicles")
    .select("*, images:vehicle_images(*), inspection_report:inspection_reports(*), dealer:dealer_profiles(id, business_name, location, rating)", { count: "exact" })
    .eq("status", "active")
    .range((params.page! - 1) * params.limit!, params.page! * params.limit! - 1);

  if (params.q) query = query.textSearch("search_vector", params.q, { type: "websearch" });
  if (params.make) query = query.eq("make", params.make);
  if (params.condition) query = query.eq("condition", params.condition);
  if (params.transmission) query = query.eq("transmission", params.transmission);
  if (params.bodyType) query = query.eq("body_type", params.bodyType);
  if (params.minPrice) query = query.gte("price_aed", params.minPrice);
  if (params.maxPrice) query = query.lte("price_aed", params.maxPrice);
  if (params.minYear) query = query.gte("year", params.minYear);

  switch (params.sortBy) {
    case "price_asc": query = query.order("price_aed", { ascending: true }); break;
    case "price_desc": query = query.order("price_aed", { ascending: false }); break;
    case "year_desc": query = query.order("year", { ascending: false }); break;
    case "mileage_asc": query = query.order("mileage", { ascending: true }); break;
    default: query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page: params.page, limit: params.limit, totalPages: Math.ceil((count ?? 0) / params.limit!) });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawDealer } = await supabase
    .from("dealer_profiles")
    .select("id, verification_status")
    .eq("user_id", user.id)
    .single();

  const dealerProfile = rawDealer as { id: string; verification_status: string } | null;
  if (!dealerProfile) {
    return NextResponse.json({ error: "Dealer profile not found" }, { status: 403 });
  }
  if (dealerProfile.verification_status === "unverified") {
    return NextResponse.json({ error: "Complete dealer verification before creating listings", code: "unverified" }, { status: 403 });
  }
  if (dealerProfile.verification_status === "kyc_pending") {
    return NextResponse.json({ error: "Verification is still in progress", code: "kyc_pending" }, { status: 403 });
  }
  if (dealerProfile.verification_status !== "verified") {
    return NextResponse.json({ error: "Only verified dealers can create listings" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vehicle, error } = await (supabase as any)
    .from("vehicles")
    .insert({ ...parsed.data, dealer_id: dealerProfile.id, status: "pending_review" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: vehicle }, { status: 201 });
}
