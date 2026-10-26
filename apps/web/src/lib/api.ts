// The one place the web app learns where the API is. NEXT_PUBLIC_* values are inlined at
// build time, so each environment (and each desktop build) gets its own build.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, init);
}
