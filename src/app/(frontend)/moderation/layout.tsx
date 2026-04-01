import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Modération | LIF',
	description: 'Panneau de modération — Accès restreint',
};

export default function ModerationLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
