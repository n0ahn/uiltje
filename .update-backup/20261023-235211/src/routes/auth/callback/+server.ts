import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/';
	// only allow relative redirects inside the app
	const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, safeNext);
	}

	redirect(303, '/login?error=callback');
};