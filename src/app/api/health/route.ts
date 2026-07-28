import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HealthStatus = {
  status: "ok" | "unavailable";
  checks: {
    application: "ok";
    supabase?: "ok" | "unavailable";
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkDependencies = searchParams.get("check") === "dependencies";
  const checks: HealthStatus["checks"] = { application: "ok" };

  if (!checkDependencies) {
    return NextResponse.json<HealthStatus>(
      { status: "ok", checks },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    checks.supabase = "unavailable";
    return NextResponse.json<HealthStatus>(
      { status: "unavailable", checks },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const response = await fetch(new URL("/auth/v1/health", supabaseUrl), {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    checks.supabase = response.ok ? "ok" : "unavailable";
  } catch {
    checks.supabase = "unavailable";
  }

  const status = checks.supabase === "ok" ? "ok" : "unavailable";

  return NextResponse.json<HealthStatus>(
    { status, checks },
    {
      status: status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
