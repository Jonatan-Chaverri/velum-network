import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.json(
      { error: "Missing refresh token" },
      { status: 401 },
    );
    clearSessionCookies(response);
    return response;
  }

  try {
    const backendResponse = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: decodeURIComponent(refreshToken),
      }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      error?: string;
      tokens?: {
        accessToken: string;
        refreshToken: string;
      };
    };

    if (!backendResponse.ok || !data.tokens) {
      const response = NextResponse.json(
        { error: data.error || "Could not refresh session" },
        { status: 401 },
      );
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, data.tokens.accessToken, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, data.tokens.refreshToken, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return response;
  } catch {
    const response = NextResponse.json(
      { error: "Could not refresh session" },
      { status: 401 },
    );
    clearSessionCookies(response);
    return response;
  }
}
