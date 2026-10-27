import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// Statically cached: `next build` renders this to a fixed JSON file (docs/architecture.md,
// the site is a static export with no server), and components/search.tsx reads it with
// `useStaticSearch()` instead of fetching this route live.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source, {
  language: "english",
});
