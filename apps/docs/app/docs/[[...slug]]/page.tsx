import { source } from "@/lib/source";
import { openapi } from "@/lib/openapi";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import { OpenAPIPage } from "@/components/api-page";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // Links to other pages with relative file paths.
            a: createRelativeLink(source, page),
            // Generated reference pages under reference/api render this component,
            // passing their own `document`/`operations`/`webhooks` props (document is
            // the bare id from lib/openapi.ts; preloadOpenAPIPage resolves it to the
            // bundled schema, loaded once server-side -- see apps/docs/scripts/
            // generate-openapi.mts).
            OpenAPIPage: async (props: Record<string, unknown>) => {
              // The MDX-supplied props and preloadOpenAPIPage's own props are two
              // different halves of fumadocs-openapi's prop union that only unite here.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const preloaded = (await openapi.preloadOpenAPIPage(page)) as any;
              return <OpenAPIPage {...preloaded} {...props} />;
            },
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
