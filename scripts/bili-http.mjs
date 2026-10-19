// Node.js 20+. Serves only public UID.json files; never reads Cookie or env files.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const directory = resolve(process.env.BILI_SNAPSHOT_DIR || '/var/lib/qust-bili');
const port = Number(process.env.BILI_HTTP_PORT || 20003);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid BILI_HTTP_PORT');
const server = createServer(async (request, response) => {
	response.setHeader('X-Content-Type-Options', 'nosniff');
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
	}
	const match = /^\/bili\/([1-9]\d{0,19})\.json$/.exec((request.url || '').split('?')[0]);
	if (!match) { response.writeHead(404); response.end(); return; }
	try {
		const content = await readFile(join(directory, `${match[1]}.json`));
		if (content.length > 1000000) throw new Error('Snapshot too large');
		response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': content.length, 'Cache-Control': 'public, max-age=60' });
		response.end(request.method === 'HEAD' ? undefined : content);
	} catch { response.writeHead(404); response.end(); }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, '0.0.0.0', () => console.log(`[BiliHTTP] Public snapshots listening on port ${port}.`));
