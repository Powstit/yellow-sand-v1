/**
 * POST /api/saved-vehicles
 * Toggle: saves a vehicle if not saved, removes it if already saved.
 * Returns { saved: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const schema = z.object({
  vehicle_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle_id" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: existing } = await db
    .from("saved_vehicles")
    .select("id")
    .eq("user_id", user.id)
    .eq("vehicle_id", parsed.data.vehicle_id)
    .single();

  if (existing) {
    await db.from("saved_vehicles").delete().eq("id", existing.id);
    return NextResponse.json({ saved: false });
  }

  await db.from("saved_vehicles").insert({ user_id: user.id, vehicle_id: parsed.data.vehicle_id });
  return NextResponse.json({ saved: true });
}
