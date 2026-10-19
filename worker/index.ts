import { handleBili, type BiliEnv } from '../src/lib/bili-handler.ts';

interface Env extends BiliEnv { ASSETS: { fetch(request: Request): Promise<Response> } }
interface Context { waitUntil(task: Promise<unknown>): void }

export default {
	async fetch(request: Request, env: Env, ctx: Context) {
		if (new URL(request.url).pathname === '/api/bili') {
			return handleBili(request, env, {
				cache: (caches as CacheStorage & { default: Cache }).default,
				waitUntil: task => ctx.waitUntil(task),
			});
		}
		return env.ASSETS.fetch(request);
	},
};
