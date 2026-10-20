// Node.js 24+. No npm dependencies required. Run from a scheduler every 10 min.
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { biliOptions } from '../src/lib/bili-data.ts';
import { getBiliFeed } from '../src/lib/bili-service.ts';
import { uploadBiliR2 } from './bili-r2.mjs';

const directory = resolve(process.env.BILI_SNAPSHOT_DIR || '.bili-snapshots');
const uids = [...new Set((process.env.BILI_ALLOWED_UIDS || '1933142349').split(',').map(value => value.trim()).filter(Boolean))];
if (!uids.length || uids.length > 20) throw new Error('BILI_ALLOWED_UIDS must contain 1–20 UIDs');
const options = uids.map(uid => biliOptions(uid, 20, 'all'));
await mkdir(directory, { recursive: true });
for (const option of options) {
	const target = join(directory, `${option.uid}.json`);
	const temporary = join(directory, `.${option.uid}-${randomUUID()}.tmp`);
	let localSaved = false;
	try {
		const feed = await getBiliFeed(option, process.env.BILI_COOKIE || '');
		if (feed.stale) throw new Error('upstream unavailable; keeping previous file');
		// A fresh process has no in-memory snapshot: preserve the on-disk one too.
		if (!feed.items.length) {
			let old;
			try { old = JSON.parse(await readFile(target, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
			if (old?.items?.length) throw new Error('empty result; keeping previous nonempty file');
		}
		await writeFile(temporary, `${JSON.stringify(feed)}\n`, { flag: 'wx' });
		await rename(temporary, target);
		localSaved = true;
		console.log(`[BiliSync] UID ${option.uid}: saved ${feed.items.length} dynamics.`);
		await uploadBiliR2(option.uid, `${JSON.stringify(feed)}\n`);
	} catch (error) {
		// Detailed upstream diagnostics are emitted by the shared service, never print credentials.
		const code = /^R2_[A-Z_0-9]+$/.test(error?.message || '') ? ` (${error.message})` : '';
		console.error(`[BiliSync] UID ${option.uid}: ${localSaved ? 'upload failed; new local snapshot retained' : 'sync failed; previous snapshot was not replaced'}.${code}`);
		process.exitCode = 1;
	} finally { await unlink(temporary).catch(() => {}); }
}
