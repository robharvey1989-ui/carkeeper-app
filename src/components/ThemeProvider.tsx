import { PropsWithChildren, useEffect } from "react";
import { useThemePrefs } from "@/hooks/useThemePrefs";

export default function ThemeProvider({ children }: PropsWithChildren) {
  const { prefs } = useThemePrefs();

  useEffect(() => {
    try {
      const root = document.documentElement;
      root.style.setProperty("--brand", prefs.primary_color ?? "#2a7fff");
      const radius =
        prefs.rounding === "md" ? "0.75rem" :
        prefs.rounding === "2xl" ? "1.25rem" : "1rem";
      root.style.setProperty("--radius", radius);

      document.body.style.setProperty("--density", prefs.density ?? "comfortable");
      document.body.style.fontFamily = `${prefs.font_family ?? "Inter"}, ui-sans-serif, system-ui, sans-serif`;

      if (prefs.card_style === "glass") document.body.classList.add("glass");
      else document.body.classList.remove("glass");
    } catch (e) {
      console.error("[ThemeProvider] failed", e);
    }
  }, [prefs]);

  return <>{children}</>;
}
