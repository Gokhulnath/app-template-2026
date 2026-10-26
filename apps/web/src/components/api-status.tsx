"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type Health = { status: "ok" | "degraded"; db: "ok" | "unavailable" };

async function fetchStatus(): Promise<string> {
  try {
    const res = await apiFetch("/health");
    // 503 still carries a Health body: the API is up but its database isn't.
    if (res.ok || res.status === 503) {
      const body = (await res.json()) as Health;
      return body.status === "ok" ? "ok" : `degraded (database ${body.db})`;
    }
    return `error (HTTP ${res.status})`;
  } catch {
    return "unreachable";
  }
}

export function ApiStatus() {
  const [status, setStatus] = useState("checking…");

  useEffect(() => {
    fetchStatus().then(setStatus);
  }, []);

  function recheck() {
    setStatus("checking…");
    fetchStatus().then(setStatus);
  }

  return (
    <span className="inline-flex items-center gap-3">
      <code data-testid="api-status">{status}</code>
      <button
        type="button"
        onClick={recheck}
        className="rounded-full border border-black/10 px-3 py-0.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        Check again
      </button>
    </span>
  );
}
