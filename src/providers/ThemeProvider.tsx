"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextThemesProvider>;

/**
 * Wraps `next-themes` ThemeProvider with sensible defaults for this app.
 * - defaultTheme: "system"  — honours OS preference on first visit
 * - attribute: "class"       — Tailwind's dark-mode strategy (class-based)
 * - disableTransitionOnChange: false — keeps our CSS transition active
 * - storageKey: "fras-theme" — unique localStorage key to avoid collisions
 */
export function ThemeProvider({ children, ...props }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="fras-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
