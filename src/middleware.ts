import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isAdminRole } from "@/lib/admin-authz";

// Routes that require an authenticated session
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/stats",
  "/transactions",
  "/membership",
  "/help",
];

const ADMIN_PREFIX = "/admin";
const ADMIN_PUBLIC_ROUTES = ["/admin/login"];

// Routes that should redirect to / when already signed in
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

function getSupabaseCookiePrefix() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return `sb-${projectRef}-`;
  } catch {
    return null;
  }
}

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  const prefix = getSupabaseCookiePrefix();
  if (!prefix) return;

  const cookiesToClear = request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith(prefix));

  cookiesToClear.forEach((cookie) => {
    response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
  });
}

function hasCompletedOnboarding(user: { user_metadata?: Record<string, unknown> } | null) {
  return user?.user_metadata?.onboarding_completed === true;
}

export async function middleware(request: NextRequest) {
  // Handle admin subdomain routing
  const host = request.headers.get('host') || '';
  if (host.startsWith('admin.')) {
    const pathname = request.nextUrl.pathname;
    // Rewrite requests from admin subdomain to /admin path
    const newUrl = new URL(pathname === '/' ? '/admin' : `/admin${pathname}`, request.url);
    return NextResponse.rewrite(newUrl);
  }

  // Skip auth check for the OAuth callback — it only exchanges the code
  if (request.nextUrl.pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  const { data, error } = await supabase.auth.getUser();
  user = data.user;

  if (error?.code === "refresh_token_not_found") {
    clearSupabaseCookies(request, response);
    user = null;
  }

  const { pathname } = request.nextUrl;
  const onboardingCompleted = hasCompletedOnboarding(user);
  let currentUserIsAdmin = false;

  if (pathname.startsWith("/onboarding")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (onboardingCompleted) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Password recovery flow must always be reachable once recovery session is created.
  if (pathname.startsWith("/reset-password")) {
    return response;
  }

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin area: require authentication and one of the admin roles.
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isAdminPublicRoute = ADMIN_PUBLIC_ROUTES.some((p) => pathname.startsWith(p));

  if (isAdminRoute && !isAdminPublicRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !isAdminRole(profile?.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    currentUserIsAdmin = true;
  }

  // Force incomplete users through onboarding before using the app
  if (user && !onboardingCompleted && !currentUserIsAdmin) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Redirect authenticated users away from auth routes
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(onboardingCompleted ? "/" : "/onboarding", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
