// Temporary, opt-in diagnostics. Observe lifecycle events without changing the loader.
export default String.raw`(() => {
	const key = 'oreui-loading-trace';
	try {
		const mode = new URL(location.href).searchParams.get('loading-transition');
		if (mode === 'trace' || mode === 'trace-main' || mode === 'trace-snapshot') {
			sessionStorage.setItem(key, 'enabled');
			sessionStorage.removeItem('oreui-loading-diagnostic');
			sessionStorage.removeItem(key + '-fade');
		}
		if (mode === 'on' || mode === 'off') {
			sessionStorage.removeItem(key);
			sessionStorage.removeItem(key + '-fade');
		}
		if (sessionStorage.getItem(key) !== 'enabled') return;
	} catch { return; }
	let nativeState = 'not-revealed';
	const report = {
		path: location.pathname,
		fadeDriver: 'css',
		browser: navigator.userAgent,
		reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
		events: [],
	};
	function record(event, details = {}) {
		const loader = document.getElementById('page-loading');
		if (loader?.dataset.state === 'leaving' && report.fadeDriver !== 'snapshot') report.fadeDriver = loader.style.transition === 'none' ? 'frames' : 'css';
		report.events.push({
			ms: Math.round(performance.now() * 10) / 10,
			event, nativeState,
			loader: loader ? { hidden: loader.hidden, state: loader.dataset.state, mode: loader.dataset.mode, font: loader.dataset.fontState } : null,
			...details,
		});
	}
	record('head');
	window.addEventListener('pagereveal', (event) => {
		nativeState = event.viewTransition ? 'active' : 'none';
		record('pagereveal');
		if (!event.viewTransition) return;
		event.viewTransition.ready.then(() => record('native-ready'), (error) => record('native-ready-rejected', { message: error.message }));
		event.viewTransition.finished.then(() => {
			nativeState = 'finished'; record('native-finished');
		}, (error) => { nativeState = 'rejected'; record('native-finished-rejected', { message: error.message }); });
	});
	window.addEventListener('oreui:snapshot-fade', (event) => {
		report.fadeDriver = 'snapshot';
		record(event.detail.phase, { opacity: event.detail.opacity });
	});
	for (const type of ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel']) {
		document.addEventListener(type, (event) => {
			if (event.target.id === 'page-loading' && event.propertyName === 'opacity') record(type, { elapsed: event.elapsedTime });
		}, true);
	}
	window.addEventListener('DOMContentLoaded', () => {
		record('DOMContentLoaded');
		const loader = document.getElementById('page-loading');
		if (!loader) return;
		new MutationObserver(() => {
			record('loader-state');
			if (loader.dataset.state !== 'leaving') return;
			// Read only after the fade should already be running, not at its start.
			setTimeout(() => record('fade-at-80ms', {
				opacity: getComputedStyle(loader).opacity,
				animations: document.getAnimations().map((animation) => ({
					state: animation.playState,
					pseudo: animation.effect?.pseudoElement,
					target: animation.effect?.target?.id,
				})),
			}), 80);
		}).observe(loader, { attributes: true, attributeFilter: ['hidden', 'data-state'] });
	});
	window.addEventListener('pageswap', () => {
		record('pageswap');
		try { sessionStorage.setItem(key + '-previous', JSON.stringify(report)); } catch {}
	});
	window.addEventListener('load', () => {
		record('load');
		setTimeout(() => {
			const button = document.createElement('button');
			button.textContent = '复制加载诊断';
			button.id = 'loading-diagnostic-copy';
			button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:10001;padding:10px;background:#242425;color:white;border:1px solid white;font:14px sans-serif;cursor:pointer';
			button.addEventListener('click', async () => {
				let previous = null;
				try { previous = JSON.parse(sessionStorage.getItem(key + '-previous')); } catch {}
				const text = JSON.stringify({ previous, current: report }, null, 2);
				try {
					await navigator.clipboard.writeText(text);
					button.textContent = '已复制，请粘贴到聊天';
				} catch {
					const output = document.createElement('textarea');
					output.value = text;
					output.style.cssText = 'position:fixed;inset:10%;z-index:10002;background:white;color:black';
					document.body.append(output); output.select();
				}
			});
			document.body.append(button);
		}, 600);
	});
})();`;
