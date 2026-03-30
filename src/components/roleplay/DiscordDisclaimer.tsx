'use client';

interface DiscordDisclaimerProps {
	title?: string;
	reason: 'not_member' | 'no_operator_role';
	inviteUrl?: string;
}

export function DiscordDisclaimer({
	title = 'ACCÈS RESTREINT',
	reason,
	inviteUrl,
}: DiscordDisclaimerProps) {
	return (
		<div className="disclaimer-panel">
			<div className="disclaimer-icon">⚠</div>
			<h2 className="disclaimer-title">{title}</h2>
			{reason === 'not_member' ? (
				<>
					<p className="disclaimer-message">
						Vous n&apos;êtes pas membre du serveur Discord. Rejoignez le serveur pour accéder à toutes les fonctionnalités.
					</p>
					<ul className="disclaimer-restrictions">
						<li>Création de personnages désactivée</li>
						<li>Création de renseignements désactivée</li>
						<li>Modification de dossiers désactivée</li>
					</ul>
					{inviteUrl && (
						<a
							href={inviteUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="disclaimer-discord-btn"
						>
							Rejoindre le serveur Discord
						</a>
					)}
				</>
			) : (
				<>
					<p className="disclaimer-message">
						Vous n&apos;avez pas encore complété votre entrée en service. Créez un ticket d&apos;entrée en service qu&apos;un modérateur examinera et approuvera.
					</p>
					<ul className="disclaimer-restrictions">
						<li>Création de personnages désactivée</li>
						<li>Création de renseignements désactivée</li>
						<li>Modification de dossiers désactivée</li>
					</ul>
				</>
			)}
		</div>
	);
}
