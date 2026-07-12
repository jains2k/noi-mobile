/** Security contract tests for authentication URL and payload validation. */
import {
  getHttpsOrigin,
  isAllowedAuthNavigation,
  isTokenCallback,
  mapProxyUrlToBase,
  parseAuthPayload,
  parseStoredAuth,
  parseTrustedAuthMessage,
} from "../authSecurity";

const BASE = "https://noi.example";
const PROXY = "https://proxy.example";

describe("authentication URL security", () => {
  test("normalizes only valid HTTPS origins", () => {
    expect(getHttpsOrigin(`${BASE}/account/signin`)).toBe(BASE);
    expect(getHttpsOrigin("http://noi.example")).toBeNull();
    expect(getHttpsOrigin("not a url")).toBeNull();
  });

  test("allows configured origins only on account and auth paths", () => {
    expect(isAllowedAuthNavigation(`${BASE}/account/signin`, [BASE, PROXY])).toBe(true);
    expect(isAllowedAuthNavigation(`${PROXY}/api/auth/callback`, [BASE, PROXY])).toBe(true);
    expect(isAllowedAuthNavigation("https://evil.example/account/signin", [BASE, PROXY])).toBe(false);
    expect(isAllowedAuthNavigation("https://noi.example.evil.example/account/signin", [BASE])).toBe(false);
    expect(isAllowedAuthNavigation("https://noi.example@evil.example/account/signin", [BASE])).toBe(false);
    expect(isAllowedAuthNavigation(`${BASE}/untrusted`, [BASE, PROXY])).toBe(false);
    expect(isAllowedAuthNavigation("http://noi.example/account/signin", [BASE, PROXY])).toBe(false);
    expect(isAllowedAuthNavigation(`${BASE}/account/%2fapi/auth/token`, [BASE])).toBe(false);
  });

  test("matches only the exact token callback origin and path", () => {
    expect(isTokenCallback(`${BASE}/api/auth/token?code=one`, BASE)).toBe(true);
    expect(isTokenCallback(`${BASE}/api/auth/token/extra`, BASE)).toBe(false);
    expect(isTokenCallback("https://evil.example/api/auth/token", BASE)).toBe(false);
  });

  test("maps a proxy by parsed origin without replacing path content", () => {
    expect(mapProxyUrlToBase(`${PROXY}/account/signin?next=${encodeURIComponent(PROXY)}`, PROXY, BASE))
      .toBe(`${BASE}/account/signin?next=${encodeURIComponent(PROXY)}`);
    expect(mapProxyUrlToBase(`${BASE}/api/auth/token`, PROXY, BASE))
      .toBe(`${BASE}/api/auth/token`);
  });
});

describe("authentication payload security", () => {
  const valid = { jwt: "a-valid-token-value", user: { id: "user-1", email: "a@example.com" } };

  test("accepts a minimally valid token response", () => {
    expect(parseAuthPayload(valid)).toEqual(valid);
  });

  test.each([
    null,
    {},
    { jwt: "short", user: { id: "user-1" } },
    { jwt: "a-valid-token-value", user: null },
    { jwt: "a-valid-token-value", user: { id: "" } },
  ])("rejects malformed payload %#", (payload) => {
    expect(parseAuthPayload(payload)).toBeNull();
  });

  test("loads only valid persisted authentication JSON", () => {
    expect(parseStoredAuth(JSON.stringify(valid))).toEqual(valid);
    expect(parseStoredAuth("{" )).toBeNull();
    expect(parseStoredAuth(JSON.stringify({ jwt: "short", user: { id: "user-1" } }))).toBeNull();
    expect(parseStoredAuth(null)).toBeNull();
  });

  test("accepts messages only from the configured iframe window and origin", () => {
    const iframeWindow = {};
    const event = { origin: PROXY, source: iframeWindow, data: { type: "AUTH_SUCCESS", ...valid } };
    expect(parseTrustedAuthMessage(event, PROXY, iframeWindow)).toEqual(valid);
    expect(parseTrustedAuthMessage({ ...event, source: {} }, PROXY, iframeWindow)).toBeNull();
    expect(parseTrustedAuthMessage({ ...event, origin: "https://evil.example" }, PROXY, iframeWindow))
      .toBeNull();
    expect(parseTrustedAuthMessage({ ...event, data: { type: "AUTH_ERROR", ...valid } }, PROXY, iframeWindow))
      .toBeNull();
  });
});
