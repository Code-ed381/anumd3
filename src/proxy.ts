import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const isOwnerRoute = path.startsWith("/owner");
  const isLogin = path === "/owner/login";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (isOwnerRoute && !isLogin) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isOwnerRoute && !isLogin && !user) {
    const redirect = NextResponse.redirect(
      new URL("/owner/login", request.url),
    );
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirect.cookies.set(cookie),
    );
    return redirect;
  }

  if (isLogin && user) {
    const redirect = NextResponse.redirect(
      new URL("/owner/dashboard", request.url),
    );
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirect.cookies.set(cookie),
    );
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/owner/:path*"],
};
