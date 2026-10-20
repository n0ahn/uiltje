<script lang="ts" generics="T">
	// A group of radio cards (one choice out of a few). Native radio inputs, so arrow keys and screen readers work.
	type Choice = { id: T; name: string; text?: string };
	type Props = {
		legend: string;
		options: readonly Choice[];
		value: T;
		cols?: 2 | 3 | 4 | 5;
		onchange?: (value: T) => void;
	};

	let { legend, options, value = $bindable(), cols = 2, onchange }: Props = $props();

	const uid = $props.id();
	const name = `option-group-${uid}`;
	const COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' } as const;

	function choose(id: T) {
		value = id;
		onchange?.(id);
	}
</script>

<fieldset>
	<legend class="mb-2 font-heading text-lg font-semibold">{legend}</legend>
	<div class={['grid gap-2', COLS[cols]]}>
		{#each options as option (String(option.id))}
			<label class={['cursor-pointer rounded-tile border-2 p-3', value === option.id ? 'border-primary bg-primary-soft' : 'border-border']}>
				<input type="radio" class="sr-only" {name} value={String(option.id)} checked={value === option.id} onchange={() => choose(option.id)} />
				<span class="block font-heading font-semibold">{option.name}</span>
				{#if option.text}<span class="block text-sm text-text-muted">{option.text}</span>{/if}
			</label>
		{/each}
	</div>
</fieldset>
