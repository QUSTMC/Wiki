// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import secretPagesIntegration from './src/lib/secret-integration.mjs';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'QUSTMC',
			favicon: '/icon.ico',
			components: {
				Sidebar: './src/components/Sidebar.astro',
			},
			//customCss: ['./src/styles/custom.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/QUSTMC/QUST_Wiki' }],
			
		}),
		secretPagesIntegration(),
	],
});
