import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getDashboardPathForRole,
  getRoleForRoutePrefix,
} from "@/lib/auth/getDashboardPathForRole";
import type { UserRole } from "@/types/database";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname === "/login" || pathname === "/forgot-password";
  const requiredRole = getRoleForRoutePrefix(pathname);

  async function getActiveProfile() {
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      return null;
    }

    return profile;
  }

  if (requiredRole) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const profile = await getActiveProfile();

    if (!profile) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "account_not_setup");
      return NextResponse.redirect(loginUrl);
    }

    if (profile.role !== requiredRole) {
      return NextResponse.redirect(
        new URL(
          getDashboardPathForRole(profile.role as UserRole),
          request.url
        )
      );
    }
  }

  if (isAuthPage && user) {
    const profile = await getActiveProfile();

    if (profile) {
      return NextResponse.redirect(
        new URL(
          getDashboardPathForRole(profile.role as UserRole),
          request.url
        )
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/login",
    "/forgot-password",
    "/admin/:path*",
    "/student/:path*",
    "/educator/:path*",
    "/external/:path*",
  ],
};
