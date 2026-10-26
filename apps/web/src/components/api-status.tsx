"use client";

import { useEffect, useState } from "react";

import { Button, Stack } from "@myapp/ui";

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
    <Stack
      as="span"
      direction="row"
      align="center"
      gap={3}
      className="inline-flex"
    >
      <code data-testid="api-status" role="status">
        {status}
      </code>
      <Button type="button" variant="secondary" size="sm" onClick={recheck}>
        Check again
      </Button>
    </Stack>
  );
}
