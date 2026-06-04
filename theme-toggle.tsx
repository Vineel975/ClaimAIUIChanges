"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * ThemeToggle — light/dark switch for the AI Summary view.
 *
 * Persists the choice in a cookie (`claimai-theme`) rather than localStorage,
 * because ClaimAI runs inside a cross-origin Spectra iframe where localStorage
 * can be partitioned/blocked. The layout's inline bootstrap script reads the
 * same cookie before paint to avoid a flash of the wrong theme.
 *
 * Presentation-only: toggles the `.dark` class on <html>. No app logic touched.
 */
const COOKIE = "claimai-theme";

function readThemeCookie(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const m = document.cookie.match(/(?:^|; )claimai-theme=([^;]+)/);
  return m && decodeURIComponent(m[1]) === "dark" ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  // 1-year cookie; SameSite=None;Secure so it survives inside the iframe.
  try {
    document.cookie = `${COOKIE}=${theme}; path=/; max-age=31536000; SameSite=None; Secure`;
  } catch {
    // Fallback if Secure/SameSite=None is rejected (e.g. plain http localhost).
    document.cookie = `${COOKIE}=${theme}; path=/; max-age=31536000`;
  }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readThemeCookie());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  // Avoid hydration mismatch — render a stable placeholder until mounted.
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border " +
        "bg-card text-muted-foreground transition-all duration-200 hover:text-foreground " +
        "hover:border-primary/40 hover:bg-accent focus-visible:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-ring/50 " +
        className
      }
    >
      <Sun className={`h-4 w-4 transition-all duration-200 ${isDark ? "scale-0 -rotate-90 absolute opacity-0" : "scale-100 rotate-0 opacity-100"}`} />
      <Moon className={`h-4 w-4 transition-all duration-200 ${isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 absolute opacity-0"}`} />
    </button>
  );
}
