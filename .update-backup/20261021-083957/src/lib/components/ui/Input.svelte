<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';

	type Props = Omit<HTMLInputAttributes, 'class' | 'value'> & {
		label: string;
		value?: string;
		/** Result of checking an answer. */
		state?: 'idle' | 'correct' | 'wrong' | 'revealed';
		/** Answer field: large text, no autocapitalize/autocomplete/spellcheck. */
		answer?: boolean;
		/** Hide the label visually (it stays available to screen readers). */
		hideLabel?: boolean;
		class?: string;
	};

	let {
		label,
		value = $bindable(''),
		state = 'idle',
		answer = false,
		hideLabel = false,
		class: className = '',
		id,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `input-${uid}`);
	const status = $derived(state === 'correct' ? 'Goed' : state === 'wrong' ? 'Nog niet goed' : '');
</script>

<div class={className}>
	<label for={inputId} class={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-semibold text-text-muted'}>
		{label}
	</label>
	<div class="relative">
		<input
			autocapitalize={answer ? 'none' : undefined}
			autocomplete={answer ? 'off' : undefined}
			spellcheck={answer ? false : undefined}
			{...rest}
			id={inputId}
			class="input"
			data-state={state}
			data-answer={answer || undefined}
			aria-invalid={state === 'wrong' ? 'true' : undefined}
			bind:value
		/>
		{#if state === 'correct'}
			<Icon
				name="check"
				size={20}
				class="pointer-events-none absolute top-1/2 right-3 text-sage-edge animate-[check-pop_180ms_var(--ease-cozy)] transform-[translateY(-50%)]"
			/>
		{/if}
	</div>
	<span class="sr-only" aria-live="polite">{status}</span>
</div>