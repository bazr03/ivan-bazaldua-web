import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Projects collection — each case study is a Markdown file in
 * src/content/proyectos/. Add a new file to publish a new project;
 * no code changes needed.
 */
const proyectos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/proyectos" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      sector: z.enum(["Minería", "Obra civil", "Agua subterránea"]),
      location: z.string(),
      method: z.string(),
      objective: z.string(),
      result: z.string(),
      image: image().optional(),
      order: z.number().default(0),
      draft: z.boolean().default(false),
    }),
});

export const collections = { proyectos };
