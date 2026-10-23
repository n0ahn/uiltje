<script lang="ts">
	// An on/off switch with its label. A real button with role="switch", so it works with Space and Enter.
	type Props = {
		checked?: boolean;
		label: string;
		description?: string;
		onchange?: (checked: boolean) => void;
	};
	let { checked = $bindable(false), label, description, onchange }: Props = $props();

	const uid = $props.id();
	const labelId = `toggle-label-${uid}`;
	const descId = `toggle-desc-${uid}`;

	function flip() {
		checked = !checked;
		onchange?.(checked);
	}
</script>

<div class="flex items-center justify-between gap-4">
	<div class="min-w-0">
		<p id={labelId} class="font-semibold">{label}</p>
		{#if description}<p id={descId} class="text-sm text-text-muted">{description}</p>{/if}
	</div>
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		aria-labelledby={labelId}
		aria-describedby={description ? descId : undefined}
		class={['group relative h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-ink transition-colors duration-300', checked ? 'bg-sage' : 'bg-surface-2']}
		onclick={flip}
	>
		<span
			class={[
				'absolute top-0.5 left-0.5 size-6 rounded-full border-2 border-ink bg-surface shadow-[0_2px_0_0_var(--color-cream-edge)] transition-[transform,width] duration-400 ease-spring group-active:w-7 motion-reduce:transition-none',
				checked && 'translate-x-6 group-active:translate-x-5'
			]}
		></span>
	</button>
</div>
