<script lang="ts">
	import { page } from '$app/state';
	import SetEditor from '#lib/components/editor/SetEditor.svelte';
</script>

{#key page.params.id}
	<SetEditor setId={page.params.id ?? null} />
{/key}