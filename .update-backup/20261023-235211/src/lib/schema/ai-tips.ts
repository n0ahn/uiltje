// "Uitleg bij je fouten": rows the student got wrong go in, a short explanation or mnemonic per row comes out.
// Pure TS (no Svelte/DOM/Supabase). Refs ("r1", "r2") map the answer back to rows; unknown refs are dropped client side.
import { z } from 'zod';

export const MAX_TIP_ITEMS = 30;
export const MAX_TIP_LENGTH = 240;

export type TipItem = { ref: string; list: string; kind: string; prompt: string; answers: string[]; given?: string };
export type TipRequest = { subject: string; level: string; items: TipItem[] };

export const AiTipsOutputSchema = z.object({
	tips: z.array(z.object({ ref: z.string().default(''), tip: z.string().default('') })).default([])
});
export type AiTipsOutput = z.infer<typeof AiTipsOutputSchema>;

export const AI_TIPS_JSON_SCHEMA = {
	type: 'object',
	properties: {
		tips: {
			type: 'array',
			items: {
				type: 'object',
				properties: { ref: { type: 'string' }, tip: { type: 'string', description: 'Dutch, at most two short sentences. Empty string when there is no good tip.' } },
				required: ['ref', 'tip']
			}
		}
	},
	required: ['tips']
} as const;
