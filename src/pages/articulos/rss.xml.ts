import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site } from "../../data/site.ts";

export async function GET(context) {
  const posts = await getCollection("articulos", ({ data }) => !data.draft);

  // Sort by pubDate descending
  posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: "Artículos — Iván Bazaldúa",
    description:
      "Artículos sobre métodos geofísicos, exploración del subsuelo y geotecnia. Desde la práctica profesional.",
    site: context.site,
    items: posts.map((post) => {
      const slug = post.data.slug ?? post.id;
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/articulos/${slug}`,
        categories: post.data.tags ?? [],
      };
    }),
    customData: `<language>es-MX</language>`,
  });
}
