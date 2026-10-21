import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.cookies.get("fynovo_session")?.value) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/income/:path*", "/expenses/:path*", "/reports/:path*", "/settings/:path*"] };
