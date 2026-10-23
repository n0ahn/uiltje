// Supabase side of the "Uitleggen" disputes (ai/sql/007_explain_disputes.sql). Learners send through a function;
// only the owner reads and resolves them (row level security).
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { StorageError } from '../storage/adapter';

export type DisputeStatus = 'new' | 'accepted' | 'rejected';
export type DisputeInput = { ref?: string; term: string; reference: string; answer: string; aiVerdict: 'goed' | 'bijna' | 'niet'; aiFeedback: string; note: string };
export type Dispute = {
	id: string;
	ref: string | null;
	term: string;
	reference: string;
	answer: string;
	aiVerdict: 'goed' | 'bijna' | 'niet';
	aiFeedback: string;
	note: string;
	status: DisputeStatus;
	createdAt: Date;
};

const RowSchema = z.object({
	id: z.string(),
	ref: z.string().nullable(),
	term: z.string(),
	reference: z.string(),
	answer: z.string(),
	ai_verdict: z.enum(['goed', 'bijna', 'niet']).catch('niet'),
	ai_feedback: z.string().nullable(),
	note: z.string().nullable(),
	status: z.enum(['new', 'accepted', 'rejected']).catch('new'),
	created_at: z.string()
});
const COLUMNS = 'id,ref,term,reference,answer,ai_verdict,ai_feedback,note,status,created_at';

function fail(error: { message?: string; code?: string } | null, message: string): never {
	console.error('[disputes]', error);
	throw new StorageError(message);
}

/** The owner's answer to one of your disputes (handled ones of the last 30 days). */
export type DisputeReply = { id: string; term: string; status: 'accepted' | 'rejected'; reviewedAt: number };

const ReplySchema = z.object({
	id: z.string(),
	term: z.string(),
	status: z.enum(['accepted', 'rejected']),
	reviewed_at: z.string()
});

export function createDisputesApi(client: SupabaseClient) {
	return {
		/** Your own handled disputes (ai/sql/008). Throws when 008 has not been run: callers treat that as "none". */
		async myReplies(): Promise<DisputeReply[]> {
			const { data, error } = await client.rpc('list_my_dispute_replies');
			if (error) fail(error, 'Antwoorden op bezwaren laden is mislukt.');
			return z.array(ReplySchema).parse(data ?? []).map((r) => ({ id: r.id, term: r.term, status: r.status, reviewedAt: Date.parse(r.reviewed_at) || 0 }));
		},

		async submit(input: DisputeInput): Promise<void> {
			const { error } = await client.rpc('submit_explain_dispute', {
				p_ref: input.ref ?? null,
				p_term: input.term,
				p_reference: input.reference,
				p_answer: input.answer,
				p_verdict: input.aiVerdict,
				p_feedback: input.aiFeedback,
				p_note: input.note.trim().slice(0, 600)
			});
			if (error) {
				if (error.code === '42501') throw new StorageError('Je hebt vandaag al veel bezwaren ingediend. Probeer het morgen opnieuw.');
				fail(error, 'Het bezwaar kon niet verstuurd worden. Probeer het later opnieuw.');
			}
		},

		/** Owner only (anyone else gets no rows). Newest status first: waiting ones, oldest first. */
		async list(status: DisputeStatus): Promise<Dispute[]> {
			const { data, error } = await client.from('explain_disputes').select(COLUMNS).eq('status', status).order('created_at', { ascending: status === 'new' });
			if (error) fail(error, 'Bezwaren laden is mislukt.');
			return z.array(RowSchema).parse(data ?? []).map((r) => ({
				id: r.id,
				ref: r.ref,
				term: r.term,
				reference: r.reference,
				answer: r.answer,
				aiVerdict: r.ai_verdict,
				aiFeedback: r.ai_feedback ?? '',
				note: r.note ?? '',
				status: r.status,
				createdAt: new Date(r.created_at)
			}));
		},

		async resolve(id: string, status: DisputeStatus): Promise<void> {
			const { error } = await client.from('explain_disputes').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
			if (error) fail(error, 'Dit mag alleen de beheerder.');
		},

		async remove(id: string): Promise<void> {
			const { error } = await client.from('explain_disputes').delete().eq('id', id);
			if (error) fail(error, 'Verwijderen is mislukt.');
		}
	};
}
