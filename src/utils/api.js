import fetchToWeb from "@/__create/fetch";
import { trackEvent } from "@/utils/analytics";
import { apiFeatureEvent } from "@/utils/analyticsEvents";

/**
 * Authenticated fetch helper — uses fetchToWeb interceptor which adds Bearer token from SecureStore
 */
export async function apiFetch(endpoint, options = {}) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetchToWeb(endpoint, {
      ...options,
      headers,
    });

    if (response.ok) {
      const event = apiFeatureEvent(endpoint, options);
      if (event) trackEvent("feature_used", event);
    }

    return response;
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}
