import { defineCollection, z } from 'astro:content';
import { secretLoader } from './lib/secret-loader.mjs';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	secret: defineCollection({
		loader: secretLoader(),
		schema: z.object({ title: z.string().optional() }),
	}),
};
