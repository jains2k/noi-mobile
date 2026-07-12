import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { parseAuthPayload } from "./authSecurity";

// Provide a fallback value if the env var is not set
export const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID || "noi-app"}-jwt`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: async (auth) => {
    const validatedAuth = auth == null ? null : parseAuthPayload(auth);
    if (auth != null && !validatedAuth) {
      console.error("Refused to store invalid authentication state");
      return false;
    }
    try {
      if (validatedAuth) {
        await SecureStore.setItemAsync(authKey, JSON.stringify(validatedAuth));
      } else {
        await SecureStore.deleteItemAsync(authKey);
      }
      set({ auth: validatedAuth });
      return true;
    } catch (error) {
      console.error("Unable to persist authentication state");
      return false;
    }
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: "signup",
  open: (options) => set({ isOpen: true, mode: options?.mode || "signup" }),
  close: () => set({ isOpen: false }),
}));
