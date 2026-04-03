import type { Metadata } from 'next';
import { Rajdhani, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { DevBanner } from '@/components/DevBanner';
import { VersionInfo } from '@/components/VersionInfo';

const heading = Rajdhani({
	subsets: ['latin'],
	weight: ['500', '600', '700'],
	variable: '--font-heading',
	display: 'swap',
});

const body = Source_Sans_3({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	variable: '--font-body',
	display: 'swap',
});

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
			<body className={`${heading.variable} ${body.variable}`}>
				<DevBanner />
				<VersionInfo />
				{children}
			</body>
		</html>
	);
}
