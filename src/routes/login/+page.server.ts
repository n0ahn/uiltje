import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Someone who is already signed in has no business on the login page.
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (user) redirect(303, '/');
	return {};
};
