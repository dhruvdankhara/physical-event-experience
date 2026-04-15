"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { useEffect, useState } from "react";
import { store } from "@/store/store";

export function Providers({ children }: { children: React.ReactNode }) {
  // Ensures the query client is only created once per user session
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    void (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return;
      }

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
      } catch {
        // Ignore cleanup failures in development.
      }

      if (!("caches" in window)) {
        return;
      }

      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch {
        // Ignore cleanup failures in development.
      }
    })();
  }, []);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ReduxProvider>
  );
}
