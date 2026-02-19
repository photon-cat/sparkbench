import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter (per-instance, resets on deploy)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function checkRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Periodically clean up expired entries (every 1000 requests)
let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter % 1000 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  maybeCleanup();

  // --- CSRF protection for mutating requests ---
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    // Skip CSRF check for auth callbacks (Better-Auth handles its own CSRF)
    if (!pathname.startsWith("/api/auth")) {
      const requestOrigin = request.headers.get("origin");
      // If Origin header is present, verify it matches our app
      if (requestOrigin && !requestOrigin.startsWith(origin)) {
        return NextResponse.json(
          { error: "CSRF check failed" },
          { status: 403 },
        );
      }
    }
  }

  // --- Rate limiting for expensive endpoints ---
  const ip = getRateLimitKey(request);

  // Build endpoint: 10 requests per minute per IP
  if (pathname.match(/^\/api\/projects\/[^/]+\/build$/) && request.method === "POST") {
    const { allowed, remaining } = checkRateLimit(`build:${ip}`, 60_000, 10);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many build requests. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  // Project creation: 20 per minute per IP
  if (pathname === "/api/projects" && request.method === "POST") {
    const { allowed } = checkRateLimit(`create:${ip}`, 60_000, 20);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  // Chat endpoint: 15 per minute per IP
  if (pathname === "/api/chat" && request.method === "POST") {
    const { allowed } = checkRateLimit(`chat:${ip}`, 60_000, 15);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many AI requests. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  // DeepPCB: 5 per minute per IP
  if (pathname === "/api/deeppcb" && request.method === "POST") {
    const { allowed } = checkRateLimit(`deeppcb:${ip}`, 60_000, 5);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many routing requests. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  // Project copy: 10 per minute per IP
  if (pathname === "/api/projects/copy" && request.method === "POST") {
    const { allowed } = checkRateLimit(`copy:${ip}`, 60_000, 10);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many copy requests. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
  ],
};
