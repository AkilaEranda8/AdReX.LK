"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { appBranding } from "@/lib/company";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={appBranding.themeStorageKey}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
