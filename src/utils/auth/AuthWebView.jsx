import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuthStore } from './store';
import {
  getHttpsOrigin,
  isAllowedAuthNavigation,
  isTokenCallback,
  mapProxyUrlToBase,
  parseAuthPayload,
  parseTrustedAuthMessage,
} from './authSecurity';

const callbackUrl = '/api/auth/token';
const callbackQueryString = `callbackUrl=${callbackUrl}`;

/**
 * This renders a WebView for authentication and handles both web and native platforms.
 */
export const AuthWebView = ({ mode, proxyURL, baseURL }) => {
  const [currentURI, setURI] = useState(`${baseURL}/account/${mode}?${callbackQueryString}`);
  const { auth, setAuth, isReady } = useAuthStore();
  const isAuthenticated = isReady ? !!auth : null;
  const iframeRef = useRef(null);
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (isAuthenticated) {
      router.back();
    }
  }, [isAuthenticated]);
  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    setURI(`${baseURL}/account/${mode}?${callbackQueryString}`);
  }, [mode, baseURL, isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }
    const handleMessage = (event) => {
      if (event.data?.type === 'AUTH_SUCCESS') {
        const authPayload = parseTrustedAuthMessage(
          event,
          proxyURL,
          iframeRef.current?.contentWindow,
        );
        if (authPayload) setAuth(authPayload);
      } else if (
        event.data?.type === 'AUTH_ERROR'
        && event.origin === getHttpsOrigin(proxyURL)
        && event.source === iframeRef.current?.contentWindow
      ) {
        console.error('Authentication failed');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [proxyURL, setAuth]);

  if (Platform.OS === 'web') {
    const handleIframeError = () => {
      console.error('Failed to load auth iframe');
    };

    return (
      <iframe
        ref={iframeRef}
        title="Authentication"
        src={`${proxyURL}/account/${mode}?callbackUrl=/api/auth/expo-web-success`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        onError={handleIframeError}
      />
    );
  }
  return (
    <WebView
      sharedCookiesEnabled
      source={{
        uri: currentURI,
      }}
      headers={{
        'x-createxyz-project-group-id': process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
        host: process.env.EXPO_PUBLIC_HOST,
        'x-forwarded-host': process.env.EXPO_PUBLIC_HOST,
        'x-createxyz-host': process.env.EXPO_PUBLIC_HOST,
      }}
      onShouldStartLoadWithRequest={(request) => {
        if (isTokenCallback(request.url, baseURL)) {
          fetch(request.url)
            .then(async (response) => {
              if (!response.ok) throw new Error(`Token exchange failed (${response.status})`);
              const authPayload = parseAuthPayload(await response.json());
              if (!authPayload) throw new Error('Invalid token response');
              setAuth(authPayload);
            })
            .catch(() => console.error('Authentication token exchange failed'));
          return false;
        }
        if (request.url === currentURI) return true;

        if (!isAllowedAuthNavigation(request.url, [baseURL, proxyURL])) return false;

        const newURL = mapProxyUrlToBase(request.url, proxyURL, baseURL);
        if (isTokenCallback(newURL, baseURL)) {
          setURI(newURL);
          return false;
        }
        const nextURL = new URL(newURL);
        nextURL.searchParams.set('callbackUrl', callbackUrl);
        setURI(nextURL.toString());
        return false;
      }}
      style={{ flex: 1 }}
    />
  );
};
