<script lang="ts" generics="T">
	// A compact switch between a few choices (like tabs). Native radio inputs, so arrow keys and screen readers work.
	// The description of the chosen option shows below, so the choices themselves stay short.
	type Choice = { id: T; name: string; text?: string };
	type Props = {
		legend: string;
		options: readonly Choice[];
		value: T;
		/** Hide the legend visually (it stays for screen readers). */
		hideLegend?: boolean;
		/** Put the choices under each other, for longer names. */
		stack?: boolean;
		onchange?: (value: T) => void;
	};
	let { legend, options, value = $bindable(), hideLegend = false, stack = false, onchange }: Props = $props();

	const uid = $props.id();
	const name = `segmented-${uid}`;
	const current = $derived(options.find((o) => o.id === value));

	function choose(id: T) {
		value = id;
		onchange?.(id);
	}
</script>

<fieldset class="flex min-w-0 flex-col gap-1.5">
	<legend class={['mb-1.5 text-sm font-semibold text-text-muted', hideLegend && 'sr-only']}>{legend}</legend>
	<div class={['flex w-full gap-1 bg-surface-2 p-1', stack ? 'flex-col rounded-3xl' : 'rounded-full']}>
		{#each options as option (String(option.id))}
			<label
				class={[
					'flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-center font-heading text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-primary/50',
					value === option.id ? 'bg-surface text-text shadow-card' : 'text-text-muted hover:text-text'
				]}
			>
				<input type="radio" class="sr-only" {name} value={String(option.id)} checked={value === option.id} onchange={() => choose(option.id)} />
				{option.name}
			</label>
		{/each}
	</div>
	{#if current?.text}<p class="px-1 text-sm text-text-muted">{current.text}</p>{/if}
</fieldset>
