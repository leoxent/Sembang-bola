import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HINT_COOKIE, SESSION_COOKIE, SESSION_DAYS, verifySession } from "@/lib/auth/jwt";

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = req.nextUrl.pathname === "/admin/login";

  let res: NextResponse;
  if (!session && !onLogin) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    res = NextResponse.redirect(url);
  } else if (session && onLogin) {
    res = NextResponse.redirect(new URL("/admin", req.url));
  } else {
    res = NextResponse.next();
  }

  // Keep the admin-shortcut hint in step with the session (also covers sessions from before the hint existed).
  if (session) {
    res.cookies.set(ADMIN_HINT_COOKIE, "1", { path: "/", sameSite: "lax", maxAge: SESSION_DAYS * 86_400 });
  } else if (req.cookies.has(ADMIN_HINT_COOKIE)) {
    res.cookies.delete(ADMIN_HINT_COOKIE);
  }
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
