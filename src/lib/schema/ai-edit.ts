// "Aanpassen met AI": what Gemini gets (a compact copy of the lists with short refs) and what it may answer
// (edits, additions, deletions). Pure TS (no Svelte/DOM/Supabase). The refs ("L1", "r12") keep the request small and
// let the client map every answer back to real ids; refs the AI invents are dropped (see ai/edit.ts).
import { z } from 'zod';

export const MAX_EDIT_ROWS = 800;
export const MAX_EDIT_CHARS = 120_000;
export const MAX_INSTRUCTION = 500;

/** Compact view of one list, as sent to the server and on to Gemini. */
export type EditListInput = {
	ref: string;
	title: string;
	kind: string;
	columns: { prompt: string; answer: string };
	dimensions: string[];
	rows: { ref: string; prompt: string; answers: string[]; tags: Record<string, string> }[];
};

const text = z.string().default('');
const answers = z.array(z.string()).default([]);

export const AiEditOutputSchema = z.object({
	/** One short Dutch sentence about what was done (or why nothing was). */
	summary: text,
	edits: z.array(z.object({ list: text, row: text, prompt: text, answers, reason: text })).default([]),
	additions: z
		.array(z.object({ list: text, prompt: text, answers, tags: z.array(z.object({ name: z.string(), value: z.string() })).default([]), reason: text }))
		.default([]),
	deletions: z.array(z.object({ list: text, row: text, reason: text })).default([])
});
export type AiEditOutput = z.infer<typeof AiEditOutputSchema>;

const str = { type: 'string' } as const;
const strings = { type: 'array', items: str } as const;

export const AI_EDIT_JSON_SCHEMA = {
	type: 'object',
	properties: {
		summary: { type: 'string', description: 'One short Dutch sentence: what you changed, or why nothing needed changing.' },
		edits: {
			type: 'array',
			description: 'Existing rows to change. Give the complete new prompt and answers.',
			items: {
				type: 'object',
				properties: { list: str, row: str, prompt: str, answers: strings, reason: { type: 'string', description: 'Dutch, a few words.' } },
				required: ['list', 'row', 'prompt', 'answers', 'reason']
			}
		},
		additions: {
			type: 'array',
			description: 'New rows. Only when the user asks to add something.',
			items: {
				type: 'object',
				properties: {
					list: str,
					prompt: str,
					answers: strings,
					tags: { type: 'array', items: { type: 'object', properties: { name: str, value: str }, required: ['name', 'value'] } },
					reason: str
				},
				required: ['list', 'prompt', 'answers', 'tags', 'reason']
			}
		},
		deletions: {
			type: 'array',
			description: 'Existing rows to remove. Only when the user asks for it.',
			items: { type: 'object', properties: { list: str, row: str, reason: str }, required: ['list', 'row', 'reason'] }
		}
	},
	required: ['summary', 'edits', 'additions', 'deletions']
} as const;
