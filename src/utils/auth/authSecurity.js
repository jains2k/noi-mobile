/** Pure validation helpers for the browser and native authentication bridges. */

const AUTH_PATH_PREFIXES = ["/account/", "/api/auth/"];

function hasSafeAuthPath(url) {
  if (/%2f|%5c/i.test(url.pathname)) return false;
  const segments = url.pathname.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return false;
  return AUTH_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

/** Returns a normalized HTTPS origin, or null for invalid/insecure configuration. */
export function getHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/** Restricts WebView top-level navigation to configured auth hosts and paths. */
export function isAllowedAuthNavigation(urlValue, allowedBaseUrls) {
  try {
    const url = new URL(urlValue);
    const origins = allowedBaseUrls.map(getHttpsOrigin).filter(Boolean);
    return origins.includes(url.origin) && hasSafeAuthPath(url);
  } catch {
    return false;
  }
}

/** Identifies only the exact token callback on the configured application host. */
export function isTokenCallback(urlValue, baseUrl) {
  try {
    const url = new URL(urlValue);
    return url.origin === getHttpsOrigin(baseUrl) && url.pathname === "/api/auth/token";
  } catch {
    return false;
  }
}

/** Replaces only a configured proxy origin while preserving path/query/hash. */
export function mapProxyUrlToBase(urlValue, proxyUrl, baseUrl) {
  const url = new URL(urlValue);
  const proxyOrigin = getHttpsOrigin(proxyUrl);
  const baseOrigin = getHttpsOrigin(baseUrl);
  if (!baseOrigin) throw new Error("Invalid authentication base URL");
  if (url.origin === proxyOrigin) return `${baseOrigin}${url.pathname}${url.search}${url.hash}`;
  return url.toString();
}

/** Rejects malformed or partial token responses before they reach SecureStore. */
export function parseAuthPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.jwt !== "string" || value.jwt.trim().length < 16) return null;
  if (!value.user || typeof value.user !== "object" || Array.isArray(value.user)) return null;
  if (typeof value.user.id !== "string" || !value.user.id.trim()) return null;
  return { jwt: value.jwt, user: value.user };
}

/** Parses persisted auth defensively so corrupt storage never becomes app state. */
export function parseStoredAuth(rawValue) {
  if (typeof rawValue !== "string" || !rawValue) return null;
  try {
    return parseAuthPayload(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

/** Accepts an auth success message only from the expected iframe and HTTPS origin. */
export function parseTrustedAuthMessage(event, proxyUrl, expectedSource) {
  const expectedOrigin = getHttpsOrigin(proxyUrl);
  if (!expectedOrigin || event?.origin !== expectedOrigin || event?.source !== expectedSource) {
    return null;
  }
  if (event.data?.type !== "AUTH_SUCCESS") return null;
  return parseAuthPayload(event.data);
}
