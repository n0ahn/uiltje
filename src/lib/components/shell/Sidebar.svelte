<script lang="ts">
	import { page } from '$app/state';
	import { auth } from '../../state/auth.svelte';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import { NAV, isActive } from './nav';
	import ProfileMenu from './ProfileMenu.svelte';
	import SidebarCard from './SidebarCard.svelte';

	type Props = { name: string; username: string };
	let { name, username }: Props = $props();
</script>

<!-- Desktop (>=1024px): full sidebar. Tablet (640-1023px): 72px icon rail with tooltips. Hidden on mobile. -->
<aside class="vt-chrome fixed inset-y-0 left-0 z-30 hidden w-18 flex-col border-r border-border bg-surface sm:flex lg:w-62">
	<div class="flex items-center justify-center lg:justify-between lg:pr-4">
		<a href="/" class="flex items-center justify-center gap-2 px-4 pt-5 pb-4 lg:justify-start lg:px-5" aria-label="Uiltje, naar home">
			<Owl size={30} pose="idle" />
			<span class="hidden font-heading text-2xl font-bold lg:inline">Uiltje</span>
		</a>
	</div>

	<nav aria-label="Hoofdmenu" class="flex flex-col gap-1 px-3">
		{#each NAV as item, i (item.href)}
			{@const active = isActive(item, page.url.pathname)}
			{#if i === 0 || NAV[i - 1]?.group !== item.group}
				<p class={['px-3 text-xs font-semibold tracking-wide text-text-muted uppercase', i === 0 ? 'hidden' : 'mt-3 hidden lg:block']}>{item.group}</p>
				{#if i > 0}<hr class="mx-2 my-2 border-border lg:hidden" />{/if}
			{/if}
			<a
				href={item.href}
				title={item.label}
				aria-label={item.label}
				aria-current={active ? 'page' : undefined}
				class="nav-item flex h-11 items-center justify-center gap-3 rounded-tile font-semibold text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text lg:justify-start lg:px-3"
			>
				<Icon name={item.icon} />
				<span class="hidden lg:inline">{item.label}</span>
			</a>
		{/each}
	</nav>

	<div class="mt-auto flex flex-col gap-3 p-3">
		<div class="hidden lg:block"><SidebarCard /></div>
		{#if auth.user}
			<ProfileMenu {name} {username} variant="card" />
		{:else}
			<!-- Guests get a visible login button instead of an account menu. -->
			<Button href="/login" class="w-full px-0 lg:px-5" aria-label="Inloggen" title="Inloggen">
				<Icon name="log-in" size={20} />
				<span class="hidden lg:inline">Inloggen</span>
			</Button>
			<p class="hidden text-center text-xs text-text-muted lg:block">Log in om je sets overal te hebben.</p>
		{/if}
	</div>
</aside>

<style>
	.nav-item {
		position: relative;
	}
	.nav-item[aria-current='page'] {
		background: var(--color-primary-soft);
		color: var(--color-primary-text);
	}
	/* 4px primary bar on the left edge with rounded ends */
	.nav-item :global(svg) {
		transition: transform 300ms var(--ease-spring);
	}
	.nav-item:hover :global(svg) {
		transform: scale(1.12) rotate(-4deg);
	}
	.nav-item[aria-current='page']::before {
		animation: bar-grow 420ms var(--ease-spring);
		content: '';
		position: absolute;
		left: -12px;
		top: 8px;
		bottom: 8px;
		width: 4px;
		border-radius: 0 4px 4px 0;
		background: var(--color-primary);
	}
	@keyframes bar-grow {
		from {
			transform: scaleY(0);
		}
	}
</style>