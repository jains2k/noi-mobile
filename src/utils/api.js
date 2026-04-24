import fetchToWeb from "@/__create/fetch";

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

    return response;
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}
