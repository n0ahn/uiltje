import { redirect } from '@sveltejs/kit';

// The leaderboard has no page of its own yet; send visitors to the friends placeholder.
export const load = () => {
	redirect(307, '/friends');
};
