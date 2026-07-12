/** Pure URL policy used before attaching credentials to API requests. */

/** Returns a safe absolute first-party URL, or null when credentials must not be sent. */
export function resolveFirstPartyApiUrl(urlValue, configuredBaseUrl) {
  try {
    const base = new URL(configuredBaseUrl);
    if (base.protocol !== "https:") return null;

    if (typeof urlValue !== "string" || !urlValue) return null;
    if (urlValue.startsWith("/") && !urlValue.startsWith("//")) {
      return new URL(urlValue, base).toString();
    }

    const candidate = new URL(urlValue);
    return candidate.protocol === "https:" && candidate.origin === base.origin
      ? candidate.toString()
      : null;
  } catch {
    return null;
  }
}
