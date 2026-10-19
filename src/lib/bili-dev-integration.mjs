import { loadEnv } from 'vite';

/** Astro dev doesn't run Workers; serve the same handler through Vite middleware. */
export default function biliDevIntegration() {
	return {
		name: 'bili-dev-api',
		hooks: {
			'astro:server:setup': ({ server }) => {
				const env = { ...loadEnv('development', server.config.root, ''), ...process.env };
				server.middlewares.use(async (req, res, next) => {
					if (req.url?.split('?')[0] !== '/api/bili') return next();
					try {
						const { handleBili } = await server.ssrLoadModule('/src/lib/bili-handler.ts');
						const response = await handleBili(new Request(new URL(req.url, 'http://localhost'), { method: req.method }), {
							BILI_COOKIE: env.BILI_COOKIE,
							BILI_ALLOWED_UIDS: env.BILI_ALLOWED_UIDS || '1933142349',
						});
						res.statusCode = response.status;
						response.headers.forEach((value, name) => res.setHeader(name, value));
						res.end(await response.text());
					} catch {
						res.statusCode = 503; res.setHeader('Content-Type', 'application/json');
						res.end(JSON.stringify({ success: false, error: 'BILI_UNAVAILABLE' }));
					}
				});
			},
		},
	};
}
