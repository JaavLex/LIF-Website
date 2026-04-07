'use client';

export function DisclaimerModal({ onAccept }: { onAccept: () => void }) {
	return (
		<div className="comms-modal-backdrop">
			<div className="comms-modal">
				<h2 style={{ color: 'var(--primary)' }}>AVIS IMPORTANT</h2>
				<p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
					Le système COMMS n&apos;est <strong>pas une messagerie privée</strong>.
				</p>
				<ul style={{ fontSize: '0.8rem', lineHeight: 1.6, paddingLeft: '1.2rem' }}>
					<li>
						<strong>Aucun message n&apos;est anonyme</strong> — l&apos;option «
						envoi anonyme » masque uniquement votre identité dans l&apos;interface,
						mais votre véritable identité est enregistrée.
					</li>
					<li>
						Tous les messages, y compris les messages directs et les groupes
						privés, sont <strong>consultables par la modération</strong> à des
						fins de sécurité et de modération RP.
					</li>
					<li>
						Les messages sont stockés en clair pour audit. Ne partagez jamais
						d&apos;informations sensibles réelles.
					</li>
					<li>
						Tout abus (harcèlement, contenu inapproprié, fuite OOC) sera
						sanctionné.
					</li>
				</ul>
				<p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
					En cliquant sur « J&apos;accepte », vous reconnaissez avoir lu et accepté
					ces conditions.
				</p>
				<div className="comms-modal-actions">
					<button className="comms-modal-btn primary" onClick={onAccept}>
						J&apos;ACCEPTE
					</button>
				</div>
			</div>
		</div>
	);
}
