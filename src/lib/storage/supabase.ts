// Account storage in Supabase (PLAN §4, §5). Same interface as the guest adapter; RLS keeps every row private
// to its owner, and the queries still filter on the user so they stay correct when friends get read access.
// Reads are validated (zod / parseStudySet); text and JSON only.
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseStudySet } from '../schema/migrate';
import { parseUserSettings } from '../settings/settings';
import { StorageError, type ProgressMap, type SetSummary, type StorageAdapter } from './adapter';
import {
	fromProgressRows,
	fromSessionLogRows,
	fromSessionRows,
	isUuid,
	toProgressRows,
	toSessionLogRow,
	toSessionRow,
	toSetRow,
	toSetSummaries
} from './rows';

const PAGE = 1000; // PostgREST returns at most 1000 rows per request by default
const WRITE_CHUNK = 500;

function fail(action: 'read' | 'write', error: { message?: string; code?: string } | null): never {
	// Details stay in the console; the message is for the user.
	console.error('[storage]', action, error);
	throw new StorageError(
		action === 'read'
			? 'Laden lukt niet. Controleer je internetverbinding en probeer het opnieuw.'
			: 'Opslaan lukt niet. Controleer je internetverbinding en probeer het opnieuw.'
	);
}

export function createSupabaseAdapter(client: SupabaseClient, userId: string): StorageAdapter {
	/** Last progress known to be in the database per set, so a save only sends the rows that changed. */
	const known = new Map<string, ProgressMap>();

	async function fetchProgress(setId: string): Promise<ProgressMap> {
		const rows: unknown[] = [];
		for (let from = 0; ; from += PAGE) {
			const { data, error } = await client
				.from('row_progress')
				.select('list_id,row_id,correct,wrong,assisted,streak')
				.eq('user_id', userId)
				.eq('set_id', setId)
				.order('list_id')
				.order('row_id')
				.range(from, from + PAGE - 1);
			if (error) fail('read', error);
			rows.push(...data);
			if (data.length < PAGE) break;
		}
		return fromProgressRows(setId, rows);
	}

	return {
		async listSets(): Promise<SetSummary[]> {
			const { data, error } = await client
				.from('sets')
				.select('id,title,subject,folder,list_count,row_count,updated_at')
				.eq('owner_id', userId)
				.order('updated_at', { ascending: false });
			if (error) fail('read', error);
			return toSetSummaries(data);
		},

		async getSet(id) {
			if (!isUuid(id)) return null;
			const { data, error } = await client.from('sets').select('data').eq('owner_id', userId).eq('id', id).maybeSingle();
			if (error) fail('read', error);
			if (!data) return null;
			const parsed = parseStudySet(data.data);
			return parsed.ok ? parsed.set : null;
		},

		async saveSet(set) {
			if (!isUuid(set.id)) throw new StorageError('Deze set heeft een ongeldig id en kan niet in je account worden opgeslagen.');
			const { error } = await client.from('sets').upsert({ ...toSetRow(set), owner_id: userId }, { onConflict: 'id' });
			if (error) fail('write', error);
		},

		async deleteSet(id) {
			if (!isUuid(id)) return;
			// Progress goes with the set (cascade). Tests on only this set go too; tests over several sets stay.
			const { error: testError } = await client
				.from('practice_sessions')
				.delete()
				.eq('user_id', userId)
				.eq('set_ids', `{${id}}`);
			if (testError) fail('write', testError);
			const { error } = await client.from('sets').delete().eq('owner_id', userId).eq('id', id);
			if (error) fail('write', error);
			known.delete(id);
		},

		async getProgress(setId) {
			if (!isUuid(setId)) return {};
			const progress = await fetchProgress(setId);
			known.set(setId, progress);
			return { ...progress };
		},

		async saveProgress(setId, progress) {
			if (!isUuid(setId)) return;
			const rows = toProgressRows(setId, progress, known.get(setId) ?? {}, new Date());
			for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
				const chunk = rows.slice(i, i + WRITE_CHUNK).map((r) => ({ ...r, user_id: userId }));
				const { error } = await client.from('row_progress').upsert(chunk, { onConflict: 'user_id,set_id,list_id,row_id' });
				if (error) {
					known.delete(setId); // unknown state now: next save sends everything
					fail('write', error);
				}
			}
			known.set(setId, { ...(known.get(setId) ?? {}), ...progress });
		},

		async getSettings() {
			const { data, error } = await client.from('user_settings').select('data').eq('user_id', userId).maybeSingle();
			if (error) fail('read', error);
			return parseUserSettings(data?.data ?? null);
		},

		async saveSettings(settings) {
			const { error } = await client.from('user_settings').upsert({ user_id: userId, data: settings }, { onConflict: 'user_id' });
			if (error) fail('write', error);
		},

		async saveTestResult(record) {
			if (!isUuid(record.id)) throw new StorageError('Dit toetsresultaat heeft een ongeldig id en kan niet worden opgeslagen.');
			const row = { ...toSessionRow(record), user_id: userId };
			let { error } = await client.from('practice_sessions').upsert(row, { onConflict: 'id' });
			// ai/sql/009 not run yet: save the test without the whole-set columns (it then does not count for a challenge).
			if (error && (error.code === 'PGRST204' || error.code === '42703')) {
				const { test_kind, whole_set, ...old } = row;
				void test_kind;
				void whole_set;
				({ error } = await client.from('practice_sessions').upsert(old, { onConflict: 'id' }));
			}
			if (error) fail('write', error);
		},

		async saveSession(log) {
			const { error } = await client
				.from('practice_sessions')
				.upsert({ ...toSessionLogRow(log), user_id: userId }, { onConflict: 'id' });
			if (error) fail('write', error);
		},

		async listSessions(sinceMs) {
			const rows: unknown[] = [];
			for (let from = 0; from < 5 * PAGE; from += PAGE) {
				const { data, error } = await client
					.from('practice_sessions')
					.select('id,mode,set_ids,started_at,ended_at,total,correct')
					.eq('user_id', userId)
					.gte('ended_at', new Date(sinceMs).toISOString())
					.order('ended_at', { ascending: false })
					.range(from, from + PAGE - 1);
				if (error) fail('read', error);
				rows.push(...data);
				if (data.length < PAGE) break;
			}
			return fromSessionLogRows(rows);
		},

		async listTestResults(limit = 50) {
			const { data, error } = await client
				.from('practice_sessions')
				.select('id,title,set_ids,ended_at,total,correct,grade,passed,duration_seconds,timed_out,wrong')
				.eq('user_id', userId)
				.eq('mode', 'test')
				.order('ended_at', { ascending: false })
				.limit(limit);
			if (error) fail('read', error);
			return fromSessionRows(data);
		}
	};
}
