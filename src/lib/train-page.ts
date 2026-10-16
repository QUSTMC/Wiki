import {
	cumulativeMetrics, dailyMetrics, request, GameApiError, formatNumber, formatDuration,
	winRate, entryValue, entryContext, queryInteger,
	type BoardsResponse, type PlayerRecord,
} from './train-api';
import { initPlayerSuggestions } from './train-suggestions';

type State = { view: 'total' | 'daily'; metric: string; limit: number; page: number; minGames: number; date: string; uuid: string };
type PlayerResponse = { data: PlayerRecord | PlayerRecord[]; roleNames?: Record<string, string> };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
	const node = document.createElement(tag);
	if (text) node.textContent = text;
	if (className) node.className = className;
	return node;
}
function table(headers: string[], rows: HTMLElement[][], hiddenColumns: number[] = []) {
	const wrapper = el('div', '', 'ore-table');
	wrapper.dataset.variant = 'striped';
	const node = el('table');
	const head = el('thead');
	const tr = el('tr');
	headers.forEach((title, index) => {
		const cell = el('th', title, hiddenColumns.includes(index) ? 'train-desktop' : '');
		cell.scope = 'col'; tr.append(cell);
	});
	head.append(tr);
	const body = el('tbody');
	rows.forEach((cells) => {
		const row = el('tr');
		cells.forEach((content, index) => {
			const cell = el('td', '', hiddenColumns.includes(index) ? 'train-desktop' : '');
			cell.append(content); row.append(cell);
		});
		body.append(row);
	});
	node.append(head, body); wrapper.append(node);
	return wrapper;
}
function facts(values: [string, string][], className = 'train-facts') {
	const list = el('dl', '', className);
	values.forEach(([title, value]) => {
		const item = el('div'); item.append(el('dt', title), el('dd', value)); list.append(item);
	});
	return list;
}

export function initTrainPage() {
	const page = document.querySelector<HTMLElement>('.train-page');
	if (!page || page.dataset.initialized) return;
	page.dataset.initialized = 'true';
	const get = <T extends HTMLElement>(selector: string) => page.querySelector<T>(selector)!;
	const playerPage = page.dataset.player === 'true';
	const root = page.dataset.root!;
	const query = new URLSearchParams(location.search);
	const name = (query.get('name') || '').trim();
	let state: State = {
		view: query.get('view') === 'daily' ? 'daily' : 'total', metric: query.get('metric') || 'totalWinRate',
		limit: queryInteger(query.get('limit'), 100, 10),
		page: /^\d{1,4}$/.test(query.get('page') || '') ? Math.max(1, Number(query.get('page'))) : 1,
		minGames: queryInteger(query.get('minGames'), 1000, 2),
		date: /^\d{4}-\d{2}-\d{2}$/.test(query.get('date') || '') ? query.get('date')! : '',
		uuid: query.get('uuid') || '',
	};
	let committed: State | undefined;
	let records: PlayerRecord[] = [];
	let roleNames: Record<string, string> = {};
	let controller: AbortController | undefined;
	let hasNextPage = false;
	const result = get<HTMLDivElement>('[data-results]');
	const status = get<HTMLParagraphElement>('[data-status]');
	const refresh = get<HTMLButtonElement>('[data-refresh]');
	const panel = get<HTMLElement>('#train-panel');
	const search = get<HTMLFormElement>('.train-search');
	const input = get<HTMLInputElement>('[name="name"]');
	const date = get<HTMLInputElement>('[data-date]');
	input.value = name;
	initPlayerSuggestions(page);

	function urlParams(s = state) {
		const params = new URLSearchParams({ view: s.view, metric: s.metric, limit: String(s.limit), page: String(s.page), minGames: String(s.minGames) });
		if (s.date) params.set('date', s.date);
		return params;
	}
	function writeUrl() {
		const params = urlParams();
		if (playerPage) {
			params.set('name', name);
			if (state.uuid) params.set('uuid', state.uuid);
			get<HTMLAnchorElement>('[data-back]').href = `${root}?${urlParams()}`;
		}
		history.replaceState(null, '', `${location.pathname}?${params}`);
	}
	function syncControls() {
		const metrics = state.view === 'daily' ? dailyMetrics : cumulativeMetrics;
		if (!metrics[state.metric]) state.metric = Object.keys(metrics)[0];
		page!.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => {
			const selected = button.dataset.view === state.view;
			button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
		});
		panel.setAttribute('aria-labelledby', `train-tab-${state.view}`);
		page!.querySelectorAll<HTMLElement>('[data-daily-control]').forEach(node => node.hidden = state.view !== 'daily');
		page!.querySelectorAll<HTMLElement>('[data-total-control]').forEach(node => node.hidden = state.view === 'daily');
		date.value = state.date;
		if (!playerPage) {
			const metric = get<HTMLSelectElement>('[data-metric]');
			metric.replaceChildren(...Object.entries(metrics).map(([key, title]) => new Option(title, key)));
			metric.value = state.metric;
			for (const [selector, value, presets, suffix] of [
				['[data-limit]', state.limit, [10, 20, 50], '人 / 页'],
				['[data-min-games]', state.minGames, [2, 5, 10], '局'],
			] as const) {
				const select = get<HTMLSelectElement>(selector);
				select.querySelector('[data-custom]')?.remove();
				if (!(presets as readonly number[]).includes(value)) {
					const option = new Option(`${value} ${suffix}（自定义）`, String(value)); option.dataset.custom = ''; select.add(option);
				}
				select.value = String(value);
			}
		}
	}
	function syncPagination() {
		if (playerPage) return;
		const busy = panel.getAttribute('aria-busy') === 'true';
		get<HTMLButtonElement>('[data-page-prev]').disabled = busy || state.page <= 1;
		get<HTMLButtonElement>('[data-page-next]').disabled = busy || !hasNextPage;
	}
	function renderLeaderboard(data: BoardsResponse, requested: State) {
		const daily = requested.view === 'daily';
		const label = (daily ? dailyMetrics : cumulativeMetrics)[requested.metric];
		result.replaceChildren(el('h2', label));
		if (daily) result.append(el('p', `${data.date || requested.date} · ${formatNumber(data.totalPlayers)} 位玩家 · ${formatNumber(data.totalMatches)} 局`, 'train-muted'));
		else result.append(el('p', requested.metric === 'playTime' ? '按游玩时长排序，不设最低参赛门槛。' : `至少 ${requested.minGames} 局；阵营指标按对应阵营参赛场次筛选。`, 'train-muted'));
		if (requested.metric === 'teamKillRate' || requested.metric === 'teamKills') result.append(el('p', '按误杀数值从高到低排列。', 'train-muted'));
		const entries = data.boards?.[requested.metric]?.entries || [];
		get<HTMLElement>('[data-pagination]').hidden = !entries.length && requested.page === 1;
		const board = data.boards?.[requested.metric];
		get<HTMLElement>('[data-page-label]').textContent = board?.totalPages ? `第 ${requested.page} / ${board.totalPages} 页 · 共 ${board.total} 人` : '暂无排名';
		if (!entries.length) { result.append(el('p', daily ? '当天暂无记录。' : '暂无符合条件的玩家，可降低最低参赛局数。', 'train-empty')); return; }
		const rows = entries.map(entry => {
			const link = el('a', entry.playerName || '未知玩家');
			const params = urlParams(requested); params.set('name', entry.playerName || '');
			link.href = `${root}player/?${params}`;
			const score = el('div');
			score.append(el('strong', entryValue(requested.metric, entry, daily)));
			const context = daily ? entry.detail || '' : entryContext(requested.metric, entry);
			if (context) score.append(el('small', context, 'train-mobile-context'));
			return [el('span', String(entry.rank)), link, score, el('span', entry.detail || '—')];
		});
		result.append(table(['排名', '玩家', label, '明细'], rows, [3]));
	}
	function selectedRecord() { return records.find(record => record.rawStats.uuid === state.uuid) || records[0]; }
	function renderOverview() {
		const record = selectedRecord();
		if (!record) return;
		state.uuid = record.rawStats.uuid;
		const stats = record.rawStats;
		get<HTMLElement>('[data-overview]').hidden = false;
		get<HTMLElement>('[data-name]').textContent = record.playerName;
		document.title = `${record.playerName} · 玩家战绩 | QUSTMC`;
		get<HTMLElement>('[data-uuid]').textContent = `UUID · ${stats.uuid}`;
		get<HTMLElement>('[data-account-label]').hidden = records.length < 2;
		get<HTMLElement>('[data-merged]').hidden = records.length < 2;
		const select = get<HTMLSelectElement>('[data-account]');
		select.replaceChildren(...records.map((record, index) => new Option(`账号 ${index + 1} · ${record.rawStats.uuid}`, record.rawStats.uuid)));
		select.value = state.uuid;
		get<HTMLElement>('[data-summary]').replaceChildren(...facts([
			['参赛场次', formatNumber(stats.totalGamesPlayed)], ['胜场', formatNumber(stats.totalWins)],
			['胜率', winRate(stats.totalWins, stats.totalGamesPlayed)], ['游玩时间', formatDuration(stats.totalPlayTime)],
		]).children);
	}
	function renderCumulativePlayer() {
		const record = selectedRecord(); if (!record) return;
		const s = record.rawStats;
		result.replaceChildren(el('h2', '阵营表现'));
		const rows = [['乘客', 'Civilian'], ['义警', 'Sheriff'], ['杀手', 'Killer'], ['中立', 'Neutral']].map(([label, key]) => [
			el('span', label), el('span', formatNumber(s[`total${key}Games`])), el('span', formatNumber(s[`total${key}Wins`])),
			el('span', winRate(s[`total${key}Wins`], s[`total${key}Games`])),
			el('span', formatNumber(s[`total${key}Kills`])), el('span', formatNumber(s[`total${key}Deaths`])),
		]);
		result.append(table(['阵营', '场次', '胜场', '胜率', '击杀', '死亡'], rows, [2, 4, 5]));
		result.append(facts([['负场', formatNumber(s.totalLosses)], ['击杀', formatNumber(s.totalKills)], ['死亡', formatNumber(s.totalDeaths)], ['误杀', formatNumber(s.totalTeamKills)]]));
		result.append(el('h2', '职业明细'));
		const roles = Object.entries(s.roleStats || {});
		if (!roles.length) result.append(el('p', '暂无职业记录。', 'train-muted'));
		roles.forEach(([id, role]) => {
			const details = el('details', '', 'ore-accordion');
			const summary = el('summary');
			summary.append(el('span', record.roleNames?.[id] || roleNames[id] || id, 'ore-accordion-title'));
			const content = el('div', '', 'ore-accordion-content');
			content.append(facts([
				['场次', formatNumber(role.timesPlayed)], ['胜场', formatNumber(role.winsAsRole)],
				['胜率', winRate(role.winsAsRole, role.timesPlayed)], ['负场', formatNumber(role.lossesAsRole)],
				['击杀', formatNumber(role.killsAsRole)], ['死亡', formatNumber(role.deathsAsRole)], ['误杀', formatNumber(role.teamKillsAsRole)],
			]));
			details.append(summary, content); result.append(details);
		});
	}
	function renderDailyPlayer(data: BoardsResponse, message = '') {
		result.replaceChildren(el('h2', `${data.date || state.date || '当前统计日'} 日统计`));
		const boards = Object.entries(data.player?.boards || {});
		if (!boards.length) { result.append(el('p', message || '当天暂无记录。', 'train-empty')); return; }
		const rows = boards.map(([metric, entry]) => {
			const value = el('div'); value.append(el('strong', entryValue(metric, entry, true)));
			if (entry.detail) value.append(el('small', entry.detail, 'train-mobile-context'));
			return [el('span', dailyMetrics[metric] || metric), value, el('span', entry.rank > 0 ? `${entry.rank} / ${formatNumber(data.totalPlayers)}` : '—'), el('span', entry.detail || '—')];
		});
		result.append(table(['指标', '成绩', '全服排名', '明细'], rows, [3]));
	}

	async function load() {
		controller?.abort();
		const active = new AbortController(); controller = active;
		const requested = { ...state };
		status.textContent = '加载中…'; panel.setAttribute('aria-busy', 'true');
		syncPagination();
		refresh.disabled = true; refresh.setAttribute('data-loading', '');
		try {
			if (playerPage && !name) {
				result.replaceChildren(el('p', '输入玩家名，查询战绩。', 'train-empty'));
				status.textContent = ''; return;
			}
			const params: Record<string, string | number> = { limit: requested.limit };
			if (!playerPage) params.page = requested.page;
			if (requested.view === 'daily') { if (requested.date) params.date = requested.date; }
			else params.minGames = requested.minGames;
			let data: BoardsResponse | undefined;
			let dayMessage = '';
			if (playerPage) {
				const [player, daily] = await Promise.all([
					request<PlayerResponse>(`api/stats/player/${encodeURIComponent(name)}`, {}, active.signal),
					requested.view === 'daily' ? request<BoardsResponse>('api/match-stats', { ...params, player: name }, active.signal).catch(error => {
						if (!(error instanceof GameApiError) || !/无对局记录/.test(error.message)) throw error;
						dayMessage = error.message;
						return { ...error.response, success: true, date: error.response.date || requested.date, player: { playerName: name, boards: {} } } as BoardsResponse;
					}) : undefined,
				]);
				if (active.signal.aborted) return;
				records = Array.isArray(player.data) ? player.data : [player.data];
				if (!records.length || records.some(record => !record?.rawStats)) throw new Error('Invalid player data');
				roleNames = player.roleNames || {}; data = daily;
			} else {
				const path = requested.view === 'daily' ? 'api/match-stats' : 'api/leaderboard';
				data = await request<BoardsResponse>(path, params, active.signal);
				if (data.date) params.date = data.date;
				const totalPages = data.boards?.[requested.metric]?.totalPages || 0;
				if (requested.page > Math.max(1, totalPages)) {
					params.page = requested.page = Math.max(1, totalPages);
					data = await request<BoardsResponse>(path, params, active.signal);
				}
				if (active.signal.aborted) return;
				const board = data.boards?.[requested.metric];
				hasNextPage = requested.page < (board?.totalPages || 0);
				state.page = requested.page;
			}
			if (active.signal.aborted) return;
			if (data?.date) state.date = requested.date = data.date;
			syncControls();
			if (playerPage) {
				renderOverview();
				if (requested.view === 'daily') renderDailyPlayer(data!, dayMessage); else renderCumulativePlayer();
			} else renderLeaderboard(data!, requested);
			committed = { ...state }; writeUrl();
			status.textContent = '';
			get<HTMLElement>('[data-updated]').textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
		} catch (error) {
			if (active.signal.aborted) return;
			if (committed) { state = { ...committed }; syncControls(); writeUrl(); }
			else if (error instanceof GameApiError) result.replaceChildren(el('p', error.message, 'train-empty'));
			status.textContent = committed || !(error instanceof GameApiError) ? '刷新失败' : '';
		} finally {
			if (controller === active) { panel.setAttribute('aria-busy', 'false'); refresh.disabled = false; refresh.removeAttribute('data-loading'); syncPagination(); }
		}
	}

	search.addEventListener('submit', event => {
		event.preventDefault();
		const value = input.value.trim(); if (!value) { input.focus(); return; }
		location.assign(`${root}player/?${new URLSearchParams({ name: value })}`);
	});
	page.addEventListener('change', event => {
		const target = event.target as HTMLElement;
		if (target.matches('[data-account]')) {
			state.uuid = (target as HTMLSelectElement).value;
			renderOverview(); if (state.view === 'total') renderCumulativePlayer();
			if (committed) committed.uuid = state.uuid;
			writeUrl(); return;
		}
		if (target.matches('[data-view]')) { state.view = target.dataset.view as State['view']; syncControls(); }
		else if (target.matches('[data-date]')) { if (!date.validity.valid || !date.value) return; state.date = date.value; }
		else if (target.matches('[data-metric]')) state.metric = (target as HTMLSelectElement).value;
		else if (target.matches('[data-limit]')) state.limit = Number((target as HTMLSelectElement).value);
		else if (target.matches('[data-min-games]')) state.minGames = Number((target as HTMLSelectElement).value);
		else return;
		state.page = 1;
		void load();
	});
	if (!playerPage) {
		const dialog = get<HTMLDialogElement>('#train-advanced');
		const advanced = get<HTMLFormElement>('[data-advanced-form]');
		const field = (name: string) => advanced.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
		function syncAdvanced() {
			const daily = field('view').value === 'daily';
			const personal = Boolean(field('player').value.trim());
			const metric = field('metric') as HTMLSelectElement;
			const metrics = daily ? dailyMetrics : cumulativeMetrics;
			const previous = metric.value;
			metric.replaceChildren(...Object.entries(metrics).map(([key, title]) => new Option(title, key)));
			metric.value = metrics[previous] ? previous : Object.keys(metrics)[0];
			const playtime = !daily && metric.value === 'playTime';
			advanced.querySelectorAll<HTMLElement>('[data-advanced-board], [data-advanced-daily], [data-advanced-playtime]').forEach(node => {
				node.hidden = (node.hasAttribute('data-advanced-board') && personal)
					|| (node.hasAttribute('data-advanced-total') && (daily || playtime))
					|| (node.hasAttribute('data-advanced-daily') && !daily)
					|| (node.hasAttribute('data-advanced-playtime') && (personal || !playtime));
			});
			metric.disabled = personal;
			field('limit').disabled = personal;
			field('minGames').disabled = personal || daily || playtime;
			field('date').disabled = !daily;
		}
		get<HTMLButtonElement>('[data-advanced-open]').addEventListener('click', () => {
			field('player').value = input.value.trim();
			field('view').value = state.view;
			field('limit').value = String(state.limit);
			field('minGames').value = String(state.minGames);
			field('date').value = state.date;
			syncAdvanced(); field('metric').value = state.metric; syncAdvanced();
		});
		advanced.addEventListener('change', syncAdvanced);
		field('player').addEventListener('input', syncAdvanced);
		advanced.addEventListener('reset', event => {
			event.preventDefault();
			field('player').value = ''; field('view').value = 'total';
			field('limit').value = '10'; field('minGames').value = '2'; field('date').value = '';
			syncAdvanced(); field('metric').value = 'totalWinRate'; syncAdvanced();
		});
		advanced.addEventListener('submit', event => {
			event.preventDefault();
			if (!advanced.reportValidity()) return;
			const requested: State = { ...state, view: field('view').value as State['view'], metric: field('metric').value,
				limit: field('limit').disabled ? state.limit : Number(field('limit').value),
				minGames: field('minGames').disabled ? state.minGames : Number(field('minGames').value), date: field('date').value, page: 1 };
			const playerName = field('player').value.trim();
			dialog.close('query');
			if (playerName) {
				const params = urlParams(requested); params.set('name', playerName);
				location.assign(`${root}player/?${params}`); return;
			}
			state = requested; syncControls(); void load();
		});
		get<HTMLButtonElement>('[data-page-prev]').addEventListener('click', () => { if (state.page > 1) { state.page--; void load(); } });
		get<HTMLButtonElement>('[data-page-next]').addEventListener('click', () => { if (hasNextPage) { state.page++; void load(); } });
	}
	refresh.addEventListener('click', () => void load());
	window.addEventListener('pagehide', () => controller?.abort());
	// A bfcache restore can interrupt an in-flight request; retry only that interrupted load.
	window.addEventListener('pageshow', event => { if (event.persisted && panel.getAttribute('aria-busy') === 'true') void load(); });
	syncControls(); void load();
}
