import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMisode } from '../../scripts/build-misode.mjs';

const appRoot = fileURLToPath(new URL('../../public/misode/', import.meta.url));

/** Build the independent Preact app before Astro copies public assets. */
export default function misodeIntegration() {
  return {
    name: 'qust:misode',
    hooks: {
      'astro:config:setup': () => buildMisode(),
      'astro:server:setup': ({ server }) => {
        // Astro dev serves public files by exact name, without directory indexes.
        // Production asset hosting already resolves these generated index files.
        server.middlewares.use(async (req, res, next) => {
          if (!['GET', 'HEAD'].includes(req.method ?? '')) return next();
          const url = new URL(req.url ?? '/', 'http://localhost');
          if (url.pathname !== '/misode' && !url.pathname.startsWith('/misode/')) return next();
          if (/\.[^/]+$/.test(url.pathname)) return next();
          let file;
          try {
            file = resolve(appRoot, '.' + decodeURIComponent(url.pathname.slice('/misode'.length)), 'index.html');
            const boundary = resolve(appRoot) + sep;
            if (!file.startsWith(boundary)) return next();
            const html = await readFile(file);
            if (!url.pathname.endsWith('/')) {
              res.writeHead(301, { Location: url.pathname + '/' + url.search });
              res.end();
              return;
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(req.method === 'HEAD' ? undefined : html);
          } catch { next(); }
        });
      },
    },
  };
}
