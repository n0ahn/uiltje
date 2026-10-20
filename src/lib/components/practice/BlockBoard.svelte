<script lang="ts">
	import { tick } from 'svelte';
	import type { Cell, CellStatus } from '../../engine/blocks';
	import Input from '../ui/Input.svelte';

	type Props = {
		blockId: string;
		cells: Cell[];
		inputs: Record<string, string>;
		statuses: Record<string, CellStatus>;
		/** Hint text per row (learn mode). */
		hints: Record<string, string>;
		/** Show correct/wrong per cell (learn mode). */
		feedback: boolean;
		/** Key of the cell that has focus, for the hint buttons. */
		focused?: string | null;
		onsubmit: () => void;
	};
	let { blockId, cells, inputs = $bindable(), statuses, hints, feedback, focused = $bindable(null), onsubmit }: Props = $props();

	let root: HTMLElement | undefined = $state();

	const locked = (key: string) => feedback && ['correct', 'assisted', 'revealed'].includes(statuses[key] ?? 'idle');
	const inputState = (key: string) => {
		const s = statuses[key] ?? 'idle';
		if (!feedback) return 'idle' as const;
		return s === 'correct' || s === 'assisted' ? ('correct' as const) : s === 'wrong' ? ('wrong' as const) : s === 'revealed' ? ('revealed' as const) : ('idle' as const);
	};

	function fields(): HTMLInputElement[] {
		return [...(root?.querySelectorAll<HTMLInputElement>('input[data-key]:not([readonly])') ?? [])];
	}

	// A new block: focus the first field.
	$effect(() => {
		void blockId;
		void tick().then(() => fields()[0]?.focus());
	});

	function onKeydown(event: KeyboardEvent) {
		// Alt/Ctrl/Cmd + Enter are shortcuts of the runner (check / next block), not "next field".
		if (event.key !== 'Enter' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
		event.preventDefault();
		const all = fields();
		const next = all[all.indexOf(event.currentTarget as HTMLInputElement) + 1];
		if (next) next.focus();
		else onsubmit();
	}
</script>

<div bind:this={root} class="flex flex-col gap-3" role="group" aria-label="Blok om in te vullen">
	{#each cells as cell (cell.rowKey)}
		<div class="grid grid-cols-[minmax(0,38%)_minmax(0,1fr)] items-start gap-3">
			<span class="mt-2 flex min-h-10 items-center rounded-full bg-surface-2 px-4 font-heading font-medium wrap-anywhere">{cell.shown}</span>
			<div>
				<Input
					label={cell.way === 'forward' ? `Vorm bij ${cell.shown}` : `Bepaling van ${cell.shown}`}
					hideLabel
					answer
					data-key={cell.rowKey}
					value={inputs[cell.rowKey] ?? ''}
					oninput={(e) => (inputs[cell.rowKey] = e.currentTarget.value)}
					state={inputState(cell.rowKey)}
					readonly={locked(cell.rowKey)}
					onfocus={() => (focused = cell.rowKey)}
					onkeydown={onKeydown}
				/>
				{#if hints[cell.rowKey] && !locked(cell.rowKey)}
					<p class="mt-1 px-1 text-sm font-semibold text-text-muted" aria-live="polite">Hint: <span class="font-mono tracking-wider">{hints[cell.rowKey]}</span></p>
				{/if}
			</div>
		</div>
	{/each}
</div>