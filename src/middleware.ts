import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "taskora_token";

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function verify(token: string) {
  const key = getSecretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as { userId: string; role: "admin" | "member" };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verify(token) : null;

  if (pathname.startsWith("/login")) {
    if (user) {
      if (user.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/app/board", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/app/board", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
