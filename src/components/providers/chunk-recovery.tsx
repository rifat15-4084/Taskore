"use client";

import { useEffect } from "react";

const RELOAD_STAMP_KEY = "taskora:chunk-reload";

function isRecoverable(message: string): boolean {
  return /ChunkLoadError|Failed to load chunk|Loading chunk|dynamically imported module|Importing a module script failed|Router action dispatched before initialization/i.test(
    message
  );
}

/**
 * Recovers from lazily-loaded chunk failures (ChunkLoadError).
 * After a dev-server restart or a new deployment, an open tab may still
 * reference old chunk hashes — a single automatic reload picks up the new
 * chunks. A sessionStorage stamp prevents reload loops.
 */
export function ChunkRecovery() {
  useEffect(() => {
    const recover = (message: string) => {
      if (!message || !isRecoverable(message)) return;
      try {
        const last = Number(sessionStorage.getItem(RELOAD_STAMP_KEY) ?? 0);
        if (Date.now() - last < 10_000) return; // don't loop
        sessionStorage.setItem(RELOAD_STAMP_KEY, String(Date.now()));
      } catch {
        // sessionStorage unavailable — fall through and reload once
      }
      window.location.reload();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: unknown } | null | undefined;
      const message =
        typeof reason?.message === "string"
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      recover(message);
    };

    const onError = (event: ErrorEvent) => recover(event.message ?? "");

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
