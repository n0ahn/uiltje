<script lang="ts">
	import { page } from '$app/state';
	import Icon from '../ui/Icon.svelte';
	import { NAV, isActive } from './nav';

	const tabs = NAV.filter((item) => item.mobile);
</script>

<!-- Mobile (<640px) bottom tab bar, 64px + safe area. -->
<nav
	aria-label="Hoofdmenu"
	class="vt-chrome fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
>
	<ul class="grid h-16 grid-cols-5">
		{#each tabs as item (item.href)}
			{@const active = isActive(item, page.url.pathname)}
			<li>
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class="flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold tracking-tight text-text-muted transition-colors duration-200 active:scale-95 aria-[current=page]:text-primary-text"
				>
					<span
						class={[
							'grid h-8 w-14 place-items-center rounded-full transition-colors duration-200',
							active && 'animate-[select-pop_420ms_var(--ease-cozy)] bg-primary-soft'
						]}
					>
						<Icon name={item.icon} size={22} />
					</span>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>