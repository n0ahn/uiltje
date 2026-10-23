// Supabase side of the question bank (phase 9). Tables and functions: ai/sql/006_grammar_questions.sql.
// The owner reads and writes the table directly (row level security); everyone else only gets approved questions
// through list_approved_questions(). Generation itself is a server route (needs the Gemini key).
import type { SupabaseClient } from '@supabase/supabase-js';
import { StorageError } from '../storage/adapter';
import { parseList } from './suggestions-core';
import {
	ApprovedRowSchema,
	BankRowSchema,
	toApprovedQuestion,
	toBankQuestion,
	validateEdit,
	type ApprovedQuestion,
	type BankQuestion,
	type Draft,
	type QuestionStatus
} from './questions-core';

const COLUMNS = 'id,ref,kind,prompt,translation,explanation,status,check_ok,check_note,created_at';

function fail(error: { message?: string; code?: string } | null, message = 'Er ging iets mis. Controleer je internetverbinding en probeer het opnieuw.'): never {
	console.error('[questions]', error);
	throw new StorageError(message);
}

const blankToNull = (text: string) => (text.trim() === '' ? null : text.trim());

export function createQuestionsApi(client: SupabaseClient) {
	return {
		/** Everything of one catalogue ("ltc-2027/"), for the owner. */
		async listForCatalogue(catalogueId: string): Promise<BankQuestion[]> {
			const { data, error } = await client.from('grammar_questions').select(COLUMNS).like('ref', `${catalogueId}/%`).order('created_at', { ascending: true }).limit(5000);
			if (error) fail(error);
			return parseList(BankRowSchema, data).map(toBankQuestion);
		},

		/** Saves generated drafts (owner only). */
		async saveDrafts(userId: string, drafts: readonly Draft[], model: string): Promise<BankQuestion[]> {
			if (drafts.length === 0) return [];
			const { data, error } = await client
				.from('grammar_questions')
				.insert(
					drafts.map((d) => ({
						ref: d.ref,
						kind: d.kind,
						prompt: d.prompt,
						translation: blankToNull(d.translation),
						explanation: blankToNull(d.explanation),
						check_ok: d.checkOk,
						check_note: blankToNull(d.checkNote),
						model: model || null,
						created_by: userId
					}))
				)
				.select(COLUMNS);
			if (error) fail(error, 'De vragen konden niet bewaard worden.');
			return parseList(BankRowSchema, data).map(toBankQuestion);
		},

		async setStatus(userId: string, ids: readonly string[], status: QuestionStatus): Promise<void> {
			if (ids.length === 0) return;
			const reviewed = status === 'draft' ? { reviewed_by: null, reviewed_at: null } : { reviewed_by: userId, reviewed_at: new Date().toISOString() };
			const { error } = await client.from('grammar_questions').update({ status, ...reviewed }).in('id', [...ids]);
			if (error) fail(error);
		},

		/** Edits the text of a question; an edited question goes back to "draft" so it is looked at again. */
		async edit(id: string, kind: BankQuestion['kind'], input: { prompt: string; translation: string; explanation: string }): Promise<void> {
			const problem = validateEdit(input, kind);
			if (problem) throw new StorageError(problem);
			const { error } = await client
				.from('grammar_questions')
				.update({ prompt: input.prompt.trim(), translation: blankToNull(input.translation), explanation: blankToNull(input.explanation), status: 'draft', check_ok: null, check_note: 'Bewerkt: niet opnieuw gecontroleerd.', reviewed_by: null, reviewed_at: null })
				.eq('id', id);
			if (error) fail(error);
		},

		async remove(ids: readonly string[]): Promise<void> {
			if (ids.length === 0) return;
			const { error } = await client.from('grammar_questions').delete().in('id', [...ids]);
			if (error) fail(error);
		},

		/** Approved questions of one catalogue, the same for every signed-in user. */
		async approved(catalogueId: string): Promise<ApprovedQuestion[]> {
			const { data, error } = await client.rpc('list_approved_questions', { p_prefix: `${catalogueId}/` });
			if (error) fail(error);
			return parseList(ApprovedRowSchema, data).map(toApprovedQuestion);
		}
	};
}

export type QuestionsApi = ReturnType<typeof createQuestionsApi>;
