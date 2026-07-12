import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';
import { useAuthStore } from '@/utils/auth/store';
import { resolveFirstPartyApiUrl } from '@/utils/apiSecurity';
import { parseStoredAuth } from '@/utils/auth/authSecurity';

const originalFetch = fetch;
const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID || 'noi-app'}-jwt`;

const getURLFromArgs = (...args: Parameters<typeof fetch>) => {
  const [urlArg] = args;
  let url: string | null;
  if (typeof urlArg === 'string') {
    url = urlArg;
  } else if (typeof urlArg === 'object' && urlArg !== null) {
    url = urlArg.url;
  } else {
    url = null;
  }
  return url;
};

const isFileURL = (url: string) => {
  return url.startsWith('file://') || url.startsWith('data:');
};

type Params = Parameters<typeof expoFetch>;
const fetchToWeb = async function fetchWithHeaders(...args: Params) {
  const baseURL = process.env.EXPO_PUBLIC_BASE_URL;
  const [input, init] = args;
  const url = getURLFromArgs(input, init);
  if (!url) {
    return expoFetch(input, init);
  }

  if (isFileURL(url)) {
    return originalFetch(input, init);
  }

  const firstPartyURL = resolveFirstPartyApiUrl(url, baseURL);
  // Never attach credentials unless parsed URL origins match exactly.
  if (!firstPartyURL) {
    return expoFetch(input, init);
  }

  if (typeof input !== 'string') {
    return expoFetch(input, init);
  }

  const initHeaders = init?.headers ?? {};
  const finalHeaders = new Headers(initHeaders);

  const auth = await SecureStore.getItemAsync(authKey).then(parseStoredAuth).catch(() => null);

  if (auth) {
    finalHeaders.set('authorization', `Bearer ${auth.jwt}`);
  }

  const response = await expoFetch(firstPartyURL, {
    ...init,
    headers: finalHeaders,
  });

  // If we sent a token and the server rejected it (401), the stored token is
  // stale/invalid. Clear it so the app routes back to sign-in instead of
  // silently showing a broken, empty authenticated UI. (Login itself happens
  // in the AuthWebView, not through this interceptor, so this won't disrupt it.)
  if (auth && response.status === 401) {
    useAuthStore.getState().setAuth(null);
  }

  return response;
};

export default fetchToWeb;
