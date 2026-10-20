// Runs outside the collection server when its network cannot reach R2.
import { pathToFileURL } from 'node:url';
import { biliOptions } from '../src/lib/bili-data.ts';
import { getBiliSnapshot } from '../src/lib/bili-snapshot.ts';
import { uploadBiliR2 } from './bili-r2.mjs';

export async function mirrorBiliSnapshots(env = process.env, fetcher = fetch) {
	if (!env.BILI_MIRROR_SOURCE || !env.R2_ENDPOINT || !env.R2_BUCKET || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
		throw new Error('MIRROR_CONFIG_INCOMPLETE');
	}
	const uids = [...new Set((env.BILI_ALLOWED_UIDS || '1933142349').split(',').map(uid => uid.trim()).filter(Boolean))];
	if (!uids.length || uids.length > 20) throw new Error('MIRROR_INVALID_UIDS');
	const options = uids.map(uid => biliOptions(uid, 20, 'all'));
	for (const option of options) {
		const feed = await getBiliSnapshot(option, env.BILI_MIRROR_SOURCE, fetcher);
		// Preserve the last good R2 object if collection stopped or yielded no items.
		if (feed.stale || !feed.items.length) throw new Error('MIRROR_SOURCE_STALE_OR_EMPTY');
		await uploadBiliR2(option.uid, `${JSON.stringify(feed)}\n`, env, fetcher);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try { await mirrorBiliSnapshots(); }
	catch (error) {
		const code = /^(?:MIRROR_|R2_|BILI_SNAPSHOT_)[A-Z_0-9]+$/.test(error?.message || '') ? error.message : 'MIRROR_FAILED';
		console.error(`[BiliMirror] ${code}; previous R2 object retained unless an earlier UID already succeeded.`);
		process.exitCode = 1;
	}
}
