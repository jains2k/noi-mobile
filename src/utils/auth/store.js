import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

// Provide a fallback value if the env var is not set
export const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID || "noi-app"}-jwt`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    try {
      if (auth) {
        SecureStore.setItemAsync(authKey, JSON.stringify(auth));
      } else {
        SecureStore.deleteItemAsync(authKey);
      }
      set({ auth });
    } catch (error) {
      console.error("Error saving auth:", error);
      set({ auth });
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
