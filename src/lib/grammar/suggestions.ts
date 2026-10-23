// Supabase side of the grammar suggestions (phase 9). The tables and functions are in ai/sql/004_grammar_suggestions.sql.
// Same rule as the social features: nobody reads other people's rows directly; accepted rules come through a function
// that leaves the author out, and the owner reviews through functions that check the owner flag.
import type { SupabaseClient } from '@supabase/supabase-js';
import { StorageError } from '../storage/adapter';
import {
	CommunityItemSchema,
	parseList,
	SuggestionRowSchema,
	toCommunityItem,
	toSuggestion,
	validateSuggestion,
	type CommunityItem,
	type Suggestion,
	type SuggestionInput,
	type SuggestionStatus,
	type SuggestionSubject
} from './suggestions-core';

const COLUMNS = 'id,subject,term,definition,example,example_translation,source,status,created_at';

function fail(error: { message?: string; code?: string } | null, message = 'Er ging iets mis. Controleer je internetverbinding en probeer het opnieuw.'): never {
	console.error('[suggestions]', error);
	throw new StorageError(message);
}

const blankToNull = (text: string) => (text.trim() === '' ? null : text.trim());

export function createSuggestionsApi(client: SupabaseClient) {
	return {
		/** Sends a suggestion. Throws a StorageError with a Dutch message when it is invalid or the limit is reached. */
		async submit(userId: string, input: SuggestionInput): Promise<void> {
			const problem = validateSuggestion(input);
			if (problem) throw new StorageError(problem);
			const { error } = await client.from('grammar_suggestions').insert({
				user_id: userId,
				subject: input.subject,
				term: input.term.trim(),
				definition: input.definition.trim(),
				example: blankToNull(input.example),
				example_translation: blankToNull(input.exampleTranslation),
				source: blankToNull(input.source)
			});
			if (error) {
				// 42501 = row-level security: in practice the limit of 20 suggestions per day.
				if (error.code === '42501') throw new StorageError('Je hebt vandaag al veel voorstellen gedaan. Probeer het morgen opnieuw.');
				fail(error, 'Het voorstel kon niet verstuurd worden. Probeer het later opnieuw.');
			}
		},

		/** Accepted rules for a subject, the same for everyone. */
		async communityItems(subject: SuggestionSubject): Promise<CommunityItem[]> {
			const { data, error } = await client.rpc('list_community_items', { p_subject: subject });
			if (error) fail(error);
			return parseList(CommunityItemSchema, data).map(toCommunityItem);
		},

		async isAdmin(): Promise<boolean> {
			const { data, error } = await client.rpc('is_app_admin');
			if (error) return false; // before the SQL is run, nobody is admin
			return data === true;
		},

		/** Your own suggestions, newest first. */
		async mine(userId: string): Promise<Suggestion[]> {
			const { data, error } = await client.from('grammar_suggestions').select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false });
			if (error) fail(error);
			return parseList(SuggestionRowSchema, data).map(toSuggestion);
		},

		/** Owner only (row level security returns your own rows for anyone else): suggestions waiting for a decision, oldest first. */
		async pending(): Promise<Suggestion[]> {
			const { data, error } = await client.from('grammar_suggestions').select(COLUMNS).eq('status', 'new').order('created_at', { ascending: true });
			if (error) fail(error);
			return parseList(SuggestionRowSchema, data).map(toSuggestion);
		},

		/** Owner only: fix a suggestion (typos, a clearer explanation) before accepting it. */
		async edit(id: string, subject: SuggestionSubject, input: Omit<SuggestionInput, 'subject'>): Promise<void> {
			const problem = validateSuggestion({ ...input, subject });
			if (problem) throw new StorageError(problem);
			const { error } = await client.rpc('update_grammar_suggestion', {
				p_id: id,
				p_term: input.term,
				p_definition: input.definition,
				p_example: input.example,
				p_example_translation: input.exampleTranslation,
				p_source: input.source
			});
			if (error) fail(error, 'Aanpassen mislukt. Is de SQL (006) al gedraaid? Dit mag alleen de beheerder.');
		},

		/** Owner only. */
		async review(id: string, status: SuggestionStatus): Promise<void> {
			const { error } = await client.rpc('review_grammar_suggestion', { p_id: id, p_status: status });
			if (error) fail(error, 'Dit mag alleen de beheerder.');
		}
	};
}

export type SuggestionsApi = ReturnType<typeof createSuggestionsApi>;
