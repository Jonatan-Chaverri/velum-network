export const ACCESS_TOKEN_COOKIE = "velum_access_token";
export const REFRESH_TOKEN_COOKIE = "velum_refresh_token";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function setSessionCookies(accessToken: string, refreshToken: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(refreshToken)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearSessionCookies() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

export function getAccessTokenCookie() {
  return getCookieValue(ACCESS_TOKEN_COOKIE);
}
