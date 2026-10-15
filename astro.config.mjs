// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import secretPagesIntegration from './src/lib/secret-integration.mjs';
import loadingDiagnostics from './src/lib/loading-diagnostics.mjs';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'QUSTMC',
			favicon: '/icon.ico',
			components: {
				Sidebar: './src/components/Sidebar.astro',
				PageFrame: './src/components/PageFrame.astro',
			},
			head: [
				{ tag: 'link', attrs: { rel: 'preload', href: '/B_Minecrafter.Reg(主标题).ttf', as: 'font', type: 'font/ttf', crossorigin: 'anonymous' } },
				{ tag: 'script', content: loadingDiagnostics },
				{
					tag: 'script',
					content: `let loadingTransitionDisabled = false;
					try {
						const diagnostic = new URL(location.href).searchParams.get('loading-transition');
						if (diagnostic === 'off') sessionStorage.setItem('oreui-loading-diagnostic', 'no-native');
						if (diagnostic === 'on') sessionStorage.removeItem('oreui-loading-diagnostic');
						loadingTransitionDisabled = sessionStorage.getItem('oreui-loading-diagnostic') === 'no-native';
					} catch {}
					if (loadingTransitionDisabled) document.documentElement.dataset.oreuiLoadingDiagnostic = 'no-native';
					if (!loadingTransitionDisabled && typeof ViewTransition !== 'undefined' && 'waitUntil' in ViewTransition.prototype && 'onpagereveal' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
						const style = document.createElement('style');
						style.textContent = '@view-transition { navigation: auto; }';
						document.head.append(style);
					}`,
				},
			],
			customCss: ['./src/styles/oreui.css', './src/styles/custom.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/QUSTMC/QUST_Wiki' }],
			
		}),
		secretPagesIntegration(),
	],
});
