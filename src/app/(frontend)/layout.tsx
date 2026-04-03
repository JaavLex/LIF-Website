import type { Metadata } from 'next';
import './globals.css';
import { DevBanner } from '@/components/DevBanner';
import { VersionInfo } from '@/components/VersionInfo';

export const metadata: Metadata = {
	title: 'LIF - Légion Internationale Francophone | Arma Reforger',
	description:
		'Communauté francophone sur Arma Reforger. Rejoignez nos deux serveurs dédiés pour des opérations militaires tactiques et immersives.',
	keywords: [
		'Arma Reforger',
		'communauté francophone',
		'milsim',
		'serveur français',
		'jeu militaire',
	],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="fr">
			<body>
					<DevBanner />
					<VersionInfo />
					{children}
				</body>
		</html>
	);
}
