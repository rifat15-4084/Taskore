import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

const COOKIE_NAME = "taskora_token";

export interface TokenPayload {
  userId: string;
  email: string;
  role: "admin" | "member";
}

function getSecretKey() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signToken(payload: TokenPayload) {
  const secret = getSecretKey();
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(role: "admin" | "member") {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function getAuthCookieName() {
  return COOKIE_NAME;
}

export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
