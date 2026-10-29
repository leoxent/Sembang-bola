import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/session: who's signed in, for the admin shortcuts on cached public pages. Never cached.
export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    { admin: session ? { name: session.name } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
