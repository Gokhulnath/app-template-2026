import { llms, loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { openapiPlugin } from "fumadocs-openapi/server";

// `dir` reaches outside this app on purpose: "Build myapp" pages are myapp/docs/*.md
// itself (symlinked at content/docs/build), never a copy -- see CLAUDE.md, "One source of
// truth". `includeProcessedMarkdown` is what lets docsLlms render each page's Markdown
// below.
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  // Badges the generated API reference pages in the sidebar.
  plugins: [openapiPlugin()],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});
