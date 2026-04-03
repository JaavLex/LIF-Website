import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export const metadata: Metadata = {
	title: 'Modération | LIF',
	description: 'Panneau de modération — Accès restreint',
};

export const dynamic = 'force-dynamic';

export default async function ModerationLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Server-side auth gate — redirects non-admins before any client code runs
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;

	if (!token) {
		redirect('/api/auth/discord?redirect=/moderation');
	}

	const session = verifySession(token);
	if (!session) {
		redirect('/api/auth/discord?redirect=/moderation');
	}

	const permissions = await checkAdminPermissions(session);
	if (!permissions.isAdmin) {
		redirect('/roleplay');
	}

	return <>{children}</>;
}
