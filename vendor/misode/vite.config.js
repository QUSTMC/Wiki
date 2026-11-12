import preact from '@preact/preset-vite'
import html from '@rollup/plugin-html'
import { env } from 'process'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const config = JSON.parse(readFileSync(new URL('./src/config.json', import.meta.url), 'utf8'))
const English = JSON.parse(readFileSync(new URL('./src/locales/en.json', import.meta.url), 'utf8'))

const convertFormats = ['give-command', 'loot-table', 'item-modifier', 'recipe-output']

export default defineConfig({
	base: '/misode/',
	server: {
		port: 3000,
	},
	resolve: {
		alias: [
			{ find: /^preact-router$/, replacement: fileURLToPath(new URL('./src/qust/Router.tsx', import.meta.url)) },
			{ find: /^preact-router-original$/, replacement: fileURLToPath(new URL('./node_modules/preact-router/dist/preact-router.es.js', import.meta.url)) },
			{ find: 'react', replacement: 'preact/compat' },
			{ find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
			{ find: 'react-dom', replacement: 'preact/compat' },
			{ find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
		],
	},
	optimizeDeps: {
		esbuildOptions: {
			target: 'es2021',
		},
	},
	build: {
		sourcemap: false,
		target: 'es2021',
		rollupOptions: {
			plugins: [
				html({
					fileName: '404.html',
					title: '404',
					template,
				}),
				...['generators', 'worldgen', 'partners', 'sounds', 'changelog', 'versions', 'guides', 'transformation', 'customized', 'convert', 'whats-new'].map(id => html({
					fileName: `${id}/index.html`,
					title: `${English[`title.${id}`] ?? ''} - ${getVersions()}`,
					template,
				})),
				...config.generators.map(m => html({
					fileName: `${m.url}/index.html`,
					title: `${English[m.id] ?? ''} Generator${m.category === true ? 's' : ''} - ${getVersions(m)}`,
					template,
				})),
				...convertFormats.flatMap(s => convertFormats.filter(t => s !== t).map(t => [s, t])).map(([s, t]) => html({
					fileName: `convert/${s}-to-${t}/index.html`,
					title: `${English[`convert.format.${s}`]} to ${English[`convert.format.${t}`]} Converter - ${getVersions({ minVersion: '1.20.5' })}`,
					template,
				})),
				...config.legacyGuides.map(g => html({
					fileName: `guides/${g.id}/index.html`,
					title: `${g.title} - ${getVersions()}`,
					template,
				})),
			],
		},
	},
	json: {
		stringify: true,
	},
	define: {
		__LATEST_VERSION__: env.latest_version ?? JSON.stringify(config.versions.at(-1).id),
	},
	plugins: [
		preact(),
		viteStaticCopy({
			targets: [
				{ src: 'src/styles/giscus.css', dest: 'assets' },
				{ src: 'src/styles/giscus-burn.css', dest: 'assets' },
			],
		}),
	],
})

function getVersions(m) {
	const minVersion = Math.max(0, config.versions.findIndex(v => m?.minVersion === v.id))
	const maxVersion = config.versions.findIndex(v => m?.maxVersion === v.id)
	const versions = config.versions
		.filter((_, i) => minVersion <= i && (maxVersion === -1 || i <= maxVersion))
		.map(v => v.id)
		.filter((v, _, arr) => v.length === 4 || arr.length <= 3)
		.slice(-3)
	return `Minecraft ${versions.join(', ')}`
}

function template({ files, title }) {
	const source = files.html.find(f => f.fileName === 'index.html').source
	return source.replace(/<title>.*<\/title>/, `<title>${title}</title>`)
}
