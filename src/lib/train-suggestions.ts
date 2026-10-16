import { request, type PlayerSearchResponse } from './train-api';

/** Reuse OreUI Dropdown's menu/item faces with editable-combobox behavior. */
export function initPlayerSuggestions(page: HTMLElement) {
	page.querySelectorAll<HTMLElement>('[data-player-input]').forEach(wrapper => {
		const input = wrapper.querySelector('input')!;
		const menu = wrapper.querySelector<HTMLElement>('.ore-dropdown-menu')!;
		let active = -1;
		let matches: string[] = [];
		let timer: number | undefined;
		let controller: AbortController | undefined;
		let generation = 0;
		function cancel() {
			window.clearTimeout(timer); controller?.abort(); generation++;
		}
		function close() {
			cancel();
			if (menu.matches(':popover-open')) menu.hidePopover();
			input.setAttribute('aria-expanded', 'false');
			input.removeAttribute('aria-activedescendant'); active = -1;
		}
		function position() {
			if (!menu.matches(':popover-open')) return;
			const rect = input.getBoundingClientRect();
			const below = innerHeight - rect.bottom - 4;
			const above = rect.top - 4;
			const down = below >= Math.min(menu.scrollHeight, 160) || below >= above;
			menu.style.width = `${Math.min(rect.width, innerWidth - 8)}px`;
			menu.style.left = `${Math.max(4, Math.min(rect.left, innerWidth - rect.width - 4))}px`;
			menu.style.setProperty('--train-suggestions-space', `${Math.max(0, down ? below : above)}px`);
			menu.style.top = `${down ? rect.bottom : rect.top - menu.offsetHeight}px`;
			menu.style.setProperty('--ore-dropdown-scrollbar-width', `${menu.offsetWidth - menu.clientWidth}px`);
		}
		function select(index: number) {
			if (!matches[index]) return;
			input.value = matches[index];
			input.dispatchEvent(new Event('change', { bubbles: true }));
			close();
		}
		function render(names: string[], message = '', total = names.length) {
			if (document.activeElement !== input) return;
			matches = names;
			active = -1; input.removeAttribute('aria-activedescendant');
			const items = matches.map((name, index) => {
				const item = document.createElement('button');
				item.type = 'button'; item.className = 'ore-dropdown-item';
				item.id = `${menu.id}-${index}`; item.textContent = name;
				item.setAttribute('role', 'option'); item.setAttribute('aria-selected', 'false'); item.tabIndex = -1;
				// Keep the input focused so typing, touch selection and the modal agree.
				item.addEventListener('pointerdown', event => event.preventDefault());
				item.addEventListener('click', () => select(index));
				return item;
			});
			if (!items.length) {
				const empty = document.createElement('div');
				empty.className = 'ore-dropdown-item'; empty.setAttribute('role', 'status');
				empty.textContent = '暂无匹配候选，可输入完整玩家名';
				menu.replaceChildren(empty);
			} else menu.replaceChildren(...items);
			if (message || total > names.length) {
				const note = document.createElement('div'); note.className = 'ore-dropdown-item'; note.setAttribute('role', 'status');
				note.textContent = message || `共 ${total} 个匹配，请继续输入缩小范围`;
				if (message) menu.replaceChildren(note); else menu.append(note);
			}
			if (!menu.matches(':popover-open')) menu.showPopover();
			input.setAttribute('aria-expanded', 'true'); position();
		}
		function schedule() {
			cancel();
			if (!input.value.trim()) { render([], '输入关键词开始搜索'); return; }
			render([], '搜索中…');
			const serial = generation;
			timer = window.setTimeout(async () => {
				const activeRequest = new AbortController(); controller = activeRequest;
				try {
					const data = await request<PlayerSearchResponse>('api/players/search', { keyword: input.value.trim(), limit: 20 }, activeRequest.signal);
					if (serial !== generation || activeRequest.signal.aborted) return;
					render(data.names || [], '', data.total || 0);
				} catch {
					if (serial === generation && !activeRequest.signal.aborted) render([], '候选加载失败，可输入完整玩家名');
				}
			}, 200);
		}
		input.addEventListener('focus', schedule);
		input.addEventListener('click', () => { if (!menu.matches(':popover-open')) schedule(); });
		input.addEventListener('input', event => { if (!(event as InputEvent).isComposing) schedule(); });
		input.addEventListener('compositionstart', () => { cancel(); close(); });
		input.addEventListener('compositionend', schedule);
		input.addEventListener('blur', close);
		input.addEventListener('keydown', event => {
			if (event.isComposing) return;
			if (event.key === 'Escape' && menu.matches(':popover-open')) {
				event.preventDefault(); event.stopPropagation(); close();
			} else if (event.key === 'Tab') close();
			else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				if (!menu.matches(':popover-open')) { schedule(); return; }
				if (!matches.length) return;
				active = (active + (event.key === 'ArrowDown' ? 1 : active < 0 ? 0 : -1) + matches.length) % matches.length;
				menu.querySelectorAll<HTMLElement>('[role="option"]').forEach((item, index) => {
					item.setAttribute('aria-selected', String(index === active));
					// OreUI already styles checked items; no new active-item face.
					item.setAttribute('aria-checked', String(index === active));
					if (index === active) { input.setAttribute('aria-activedescendant', item.id); item.scrollIntoView({ block: 'nearest' }); }
				});
			} else if (event.key === 'Enter' && menu.matches(':popover-open') && active >= 0) {
				event.preventDefault(); select(active);
			}
		});
		const dialog = input.closest('dialog');
		dialog?.addEventListener('close', close);
		input.form?.addEventListener('reset', close);
		window.addEventListener('resize', position);
		window.addEventListener('scroll', position, true);
		window.addEventListener('pagehide', close);
	});
}
