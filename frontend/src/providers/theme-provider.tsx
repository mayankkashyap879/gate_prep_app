// frontend/src/providers/theme-provider.tsx
"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Define the Attribute type
type Attribute = 'class' | 'data-theme' | 'data-mode';

// Define the ThemeProviderProps interface locally
interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: Attribute | Attribute[];
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
  themes?: string[];
  forcedTheme?: string;
}

export function ThemeProvider({ 
  children, 
  ...props 
}: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}