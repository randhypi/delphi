import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  // Dev bypass — auth hanya aktif di production
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const session = await auth();
  const { pathname } = req.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/api/auth") ||
    pathname === "/login";

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
