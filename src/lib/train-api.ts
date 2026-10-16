/** Public, read-only game API. Browser requests intentionally bypass Workers. */
export const TRAIN_API = 'https://train.lista233.cn/';

export const cumulativeMetrics: Record<string, string> = {
	totalWinRate: '总胜率', civilianWinRate: '乘客胜率', sheriffWinRate: '义警胜率',
	killerWinRate: '杀手胜率', killerAvgKills: '杀手场均击杀', survivalRate: '存活率',
	teamKillRate: '误杀率', playTime: '游玩时长',
};
export const dailyMetrics: Record<string, string> = {
	totalWins: '总胜场', neutralWins: '中立胜场', killerWins: '杀手胜场', sheriffWins: '义警胜场',
	passengerWins: '乘客胜场', justiceKills: '正义击杀数', teamKills: '误杀次数',
	killerKills: '杀手击杀数', taskCompletions: '任务完成数',
};
export interface Entry {
	rank: number; playerName?: string; value?: number; detail?: string;
	detailRaw?: { count?: number; total?: number; percent?: number; avg?: number; ticks?: number };
}
export interface BoardsResponse {
	success: boolean; date?: string; totalPlayers?: number; totalMatches?: number;
	page?: number; limit?: number;
	boards?: Record<string, { unit?: string; title?: string; total?: number; totalPages?: number; entries: Entry[] }>;
	player?: { playerName: string; boards: Record<string, Entry> };
}
export interface PlayerSearchResponse { success: boolean; keyword?: string; total?: number; names?: string[]; }
/** Limits chosen for the query UI, also applied to shared URLs. */
export function queryInteger(value: string | null, max: number, fallback: number): number {
	const number = Number(value);
	return Number.isInteger(number) && number >= 1 && number <= max ? number : fallback;
}
export interface RoleStats {
	timesPlayed?: number; winsAsRole?: number; lossesAsRole?: number;
	killsAsRole?: number; deathsAsRole?: number; teamKillsAsRole?: number;
}
export interface PlayerRecord {
	playerName: string;
	rawStats: { uuid: string; roleStats?: Record<string, RoleStats>; [key: string]: unknown };
	roleNames?: Record<string, string>;
}
export class GameApiError extends Error {
	response: Partial<BoardsResponse>;
	constructor(message: string, response: Partial<BoardsResponse> = {}) {
		super(message);
		this.response = response;
	}
}

export async function request<T>(path: string, params: Record<string, string | number>, signal: AbortSignal): Promise<T> {
	const url = new URL(path, TRAIN_API);
	Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
	const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), cache: 'no-store', credentials: 'omit' });
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const body = await response.json();
	if (body.success !== true) throw new GameApiError(typeof body.message === 'string' ? body.message : '查询失败', body);
	return body as T;
}

export function formatNumber(value: unknown): string {
	return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value) : '—';
}
export function formatDuration(ticks: unknown): string {
	if (typeof ticks !== 'number' || !Number.isFinite(ticks) || ticks < 0) return '—';
	const minutes = Math.floor(ticks / 20 / 60);
	if (minutes < 1) return `${Math.floor(ticks / 20)} 秒`;
	return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分` : `${minutes} 分`;
}
export function winRate(wins: unknown, games: unknown): string {
	return typeof wins === 'number' && typeof games === 'number' && games > 0 ? `${formatNumber(wins / games * 100)}%` : '—';
}
export function entryValue(metric: string, entry: Entry, daily = false): string {
	if (metric === 'playTime') return formatDuration(entry.detailRaw?.ticks ?? entry.value);
	const value = formatNumber(entry.value);
	return value !== '—' && !daily && metric !== 'killerAvgKills' ? `${value}%` : value;
}
/** Never mistake the team-kill denominator (kills) for games played. */
export function entryContext(metric: string, entry: Entry): string {
	const total = entry.detailRaw?.total;
	if (typeof total !== 'number' || metric === 'playTime') return '';
	return `${formatNumber(total)} ${metric === 'teamKillRate' ? '次击杀' : '场'}`;
}
