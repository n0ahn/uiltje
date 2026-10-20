<script lang="ts">
	import type { SubjectSummary } from '../../dashboard/data';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';

	type Props = { subject: SubjectSummary };
	let { subject }: Props = $props();
</script>

<Card href="/vak/{subject.slug}" accent={subject.accent} class="flex min-h-44 flex-col">
	<span
		class="grid size-11 shrink-0 place-items-center rounded-tile bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-(--accent)"
	>
		<Icon name={subject.icon} size={24} />
	</span>
	<h3 class="mt-3">{subject.name}</h3>
	<p class="text-sm text-text-muted">{subject.sets} {subject.sets === 1 ? 'set' : 'sets'}</p>
	<div class="mt-auto">
		<p class="mb-1.5 text-xs font-semibold text-text-muted">{subject.mastered} van {subject.total} onderdelen onder de knie</p>
		<ProgressBar value={subject.total === 0 ? 0 : subject.mastered / subject.total} accent={subject.accent} label="Voortgang {subject.name}" />
	</div>
</Card>