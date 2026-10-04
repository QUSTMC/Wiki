// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'QUSTMC',
			components: {
				Sidebar: './src/components/Sidebar.astro',
			},
			//customCss: ['./src/styles/custom.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/QUSTMC/QUST_Wiki' }],
			
		}),
	],
});
