<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';

	type Props = {
		open?: boolean;
		title: string;
		onclose?: () => void;
		children: Snippet;
		/** Footer buttons. */
		actions?: Snippet;
	};

	let { open = $bindable(false), title, onclose, children, actions }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const uid = $props.id();
	const titleId = `modal-title-${uid}`;

	// Keep the native <dialog> in sync with `open`. Esc and the close button reset it via onclose.
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === dialog) dialog?.close();
	}
</script>

<!-- Esc is handled natively by <dialog>; the backdrop click is a convenience on top. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} class="modal" aria-labelledby={titleId} onclose={handleClose} onclick={handleBackdropClick}>
	<div class="p-6">
		<div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border sm:hidden" aria-hidden="true"></div>
		<div class="mb-4 flex items-start justify-between gap-4">
			<h2 id={titleId}>{title}</h2>
			<Button variant="ghost" size="sm" iconOnly aria-label="Sluiten" onclick={() => dialog?.close()}>
				<Icon name="x" size={20} />
			</Button>
		</div>
		<div>{@render children()}</div>
		{#if actions}
			<div class="mt-6 flex flex-wrap justify-end gap-3">{@render actions()}</div>
		{/if}
	</div>
</dialog>