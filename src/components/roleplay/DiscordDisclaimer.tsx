'use client';

interface DiscordDisclaimerProps {
	title?: string;
	message?: string;
	inviteUrl?: string;
}

export function DiscordDisclaimer({
	title = 'ACCÈS RESTREINT',
	message = 'Vous devez être membre du serveur Discord et avoir complété votre entrée en service pour accéder à toutes les fonctionnalités.',
	inviteUrl,
}: DiscordDisclaimerProps) {
	return (
		<div className="disclaimer-panel">
			<div className="disclaimer-icon">⚠</div>
			<h2 className="disclaimer-title">{title}</h2>
			<p className="disclaimer-message">{message}</p>
			<ul className="disclaimer-restrictions">
				<li>Création de personnages désactivée</li>
				<li>Accès au renseignement désactivé</li>
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
		</div>
	);
}
