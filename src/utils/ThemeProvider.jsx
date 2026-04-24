import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch } from "@/utils/api";

const ThemeContext = createContext({
  theme: "lavender",
  font: "cute",
  themeColors: {},
  fontFamily: "System",
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/user/settings");
        if (!res.ok) return { theme: "lavender", font: "cute" };
        return res.json();
      } catch (error) {
        console.error("Error loading settings:", error);
        return { theme: "lavender", font: "cute" };
      }
    },
    retry: false,
    staleTime: 0,
    enabled: !!isAuthenticated,
  });

  const theme = settings?.theme || "lavender";
  const font = settings?.font || "cute";

  const themeConfig = {
    lavender: {
      primary: "#a78bfa",
      bg1: "#faf5ff",
      bg2: "#f5f3ff",
      bg3: "#ede9fe",
      text: "#1F2937",
      textLight: "#6B7280",
    },
    ocean: {
      primary: "#60a5fa",
      bg1: "#f0f9ff",
      bg2: "#e0f2fe",
      bg3: "#dbeafe",
      text: "#1F2937",
      textLight: "#6B7280",
    },
    sage: {
      primary: "#84cc16",
      bg1: "#f7fee7",
      bg2: "#ecfccb",
      bg3: "#d9f99d",
      text: "#1F2937",
      textLight: "#6B7280",
    },
    rose: {
      primary: "#fb7185",
      bg1: "#fff1f2",
      bg2: "#ffe4e6",
      bg3: "#fecdd3",
      text: "#1F2937",
      textLight: "#6B7280",
    },
    citrus: {
      primary: "#fbbf24",
      bg1: "#fffbeb",
      bg2: "#fef3c7",
      bg3: "#fde68a",
      text: "#1F2937",
      textLight: "#6B7280",
    },
    mint: {
      primary: "#4ade80",
      bg1: "#f0fdf4",
      bg2: "#dcfce7",
      bg3: "#bbf7d0",
      text: "#1F2937",
      textLight: "#6B7280",
    },
  };

  const fontFamilies = {
    cute: "Fredoka",
    modern: "Inter",
    friendly: "Quicksand",
    rounded: "Lexend",
    minimal: "SpaceMono",
  };

  const themeColors = themeConfig[theme] || themeConfig.lavender;
  const fontFamily = fontFamilies[font] || "System";

  return (
    <ThemeContext.Provider value={{ theme, font, themeColors, fontFamily }}>
      {children}
    </ThemeContext.Provider>
  );
}
