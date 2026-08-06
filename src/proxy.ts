import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, ADMIN_PATH_HEADER } from "@/lib/constants";
import { safeNextPath } from "@/lib/nextPath";

/**
 * Cheap cookie-presence redirect for /admin. UX only — the real auth boundary
 * is requireAdmin() inside every admin page, server action and API route
 * (session validity is checked against the DB there).
 *
 * Also stamps the requested admin path onto the request so requireAdmin() can
 * build a `?next=` return path. Server components cannot read the current URL,
 * and this is the one place that already sees it on every admin request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const target = safeNextPath(pathname + search);
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const login = new URL("/admin/login", request.url);
    if (target) login.searchParams.set("next", target);
    return NextResponse.redirect(login);
  }

  // Header is set on the *request*, so it is readable via headers() on the
  // server and never reaches the browser.
  const headers = new Headers(request.headers);
  if (target) headers.set(ADMIN_PATH_HEADER, target);
  else headers.delete(ADMIN_PATH_HEADER);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*"],
};
