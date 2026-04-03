'use client';

/* ─── Dummy form shared styles ─── */
const dls: React.CSSProperties = {
	display: 'block',
	fontSize: '0.7rem',
	color: 'var(--muted)',
	marginBottom: '0.2rem',
	marginTop: '0.5rem',
};
const dinp: React.CSSProperties = {
	width: '100%',
	padding: '0.3rem 0.5rem',
	fontSize: '0.75rem',
	background: 'var(--bg-tertiary)',
	border: '1px solid var(--border)',
	color: 'var(--text)',
	fontFamily: 'inherit',
};
const dsel: React.CSSProperties = { ...dinp };
const dgrid: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: '1fr 1fr',
	gap: '0.5rem',
};
const dsec: React.CSSProperties = {
	borderTop: '1px solid rgba(74,124,35,0.2)',
	paddingTop: '0.5rem',
	marginTop: '0.5rem',
};

export function DummyCharacterForm() {
	return (
		<div className="tutorial-dummy-form">
			<div className="tutorial-dummy-title">Aperçu — Création de personnage</div>
			<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
				<div
					style={{
						width: 60,
						height: 60,
						border: '1px dashed var(--border)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: '0.6rem',
						color: 'var(--muted)',
						textAlign: 'center',
						flexShrink: 0,
					}}
				>
					Avatar
				</div>
				<div style={{ flex: 1 }}>
					<div
						style={{
							fontSize: '0.7rem',
							padding: '0.3rem',
							background: 'var(--bg-tertiary)',
							border: '1px solid var(--border)',
							color: 'var(--muted)',
						}}
					>
						Grade détecté via Discord
					</div>
				</div>
			</div>

			<div style={dsec}>
				<div
					style={{
						fontSize: '0.75rem',
						color: 'var(--primary)',
						fontWeight: 700,
						marginBottom: '0.3rem',
					}}
				>
					Identité
				</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div>
						<span style={dls}>Prénom *</span>
						<input style={dinp} value="Jean" readOnly />
					</div>
					<div>
						<span style={dls}>Nom *</span>
						<input style={dinp} value="Dupont" readOnly />
					</div>
				</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div>
						<span style={dls}>Date de naissance</span>
						<input style={dinp} value="1992-03-15" readOnly />
					</div>
					<div>
						<span style={dls}>Lieu d'origine</span>
						<input style={dinp} value="Lyon, France" readOnly />
					</div>
				</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div>
						<span style={dls}>Taille (cm)</span>
						<input style={dinp} value="182" readOnly />
					</div>
					<div>
						<span style={dls}>Poids (kg)</span>
						<input style={dinp} value="78" readOnly />
					</div>
				</div>
			</div>

			<div style={dsec}>
				<div
					style={{
						fontSize: '0.75rem',
						color: 'var(--primary)',
						fontWeight: 700,
						marginBottom: '0.3rem',
					}}
				>
					Parcours
				</div>
				<span style={dls}>Parcours civil</span>
				<textarea
					style={{ ...dinp, height: 32, resize: 'none' }}
					value="Ancien mécanicien..."
					readOnly
				/>
				<span style={dls}>Parcours militaire</span>
				<textarea
					style={{ ...dinp, height: 32, resize: 'none' }}
					value="3 ans dans l'infanterie..."
					readOnly
				/>
				<span style={dls}>Parcours judiciaire</span>
				<textarea
					style={{ ...dinp, height: 32, resize: 'none' }}
					value="Casier vierge"
					readOnly
				/>
			</div>

			<div style={dsec}>
				<div
					style={{
						fontSize: '0.75rem',
						color: 'var(--primary)',
						fontWeight: 700,
						marginBottom: '0.3rem',
					}}
				>
					Spécialisations
				</div>
				<div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.25rem' }}>
					<input style={{ ...dinp, flex: 1 }} value="Tireur d'élite" readOnly />
					<span
						style={{
							color: 'var(--danger)',
							padding: '0 0.3rem',
							border: '1px solid var(--danger)',
							fontSize: '0.7rem',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						×
					</span>
				</div>
				<div
					style={{
						fontSize: '0.65rem',
						color: 'var(--muted)',
						border: '1px dashed var(--border)',
						padding: '0.2rem 0.5rem',
						textAlign: 'center',
					}}
				>
					+ Ajouter une spécialisation
				</div>
			</div>

			<div style={dsec}>
				<div
					style={{
						fontSize: '0.75rem',
						color: 'var(--primary)',
						fontWeight: 700,
						marginBottom: '0.3rem',
					}}
				>
					Affectation
				</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div>
						<span style={dls}>Unité</span>
						<select style={dsel} disabled>
							<option>1ère Compagnie</option>
						</select>
					</div>
					<div>
						<span style={dls}>Unité précédente</span>
						<input style={dinp} value="" readOnly />
					</div>
				</div>
			</div>

			<div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
				<span className="tutorial-dummy-btn-submit">Créer le dossier</span>
			</div>
		</div>
	);
}

export function DummyIntelForm() {
	return (
		<div className="tutorial-dummy-form">
			<div className="tutorial-dummy-title">
				Aperçu — Nouveau rapport de renseignement
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Titre *</span>
					<input style={dinp} value="Mouvement ennemi secteur Nord" readOnly />
				</div>
				<div>
					<span style={dls}>Date *</span>
					<input style={dinp} value="2026-03-28" readOnly />
				</div>
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Type</span>
					<select style={dsel} disabled>
						<option>Observation</option>
					</select>
				</div>
				<div>
					<span style={dls}>Classification</span>
					<select style={dsel} disabled>
						<option>Restreint</option>
					</select>
				</div>
			</div>
			<span style={dls}>Description *</span>
			<textarea
				style={{ ...dinp, height: 40, resize: 'none' }}
				value="Convoi de 3 véhicules repéré en direction du checkpoint Alpha..."
				readOnly
			/>
			<span style={dls}>Coordonnées</span>
			<input style={dinp} value="48.8566, 2.3522" readOnly />
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Cible liée</span>
					<select style={dsel} disabled>
						<option>— Sélectionner —</option>
					</select>
				</div>
				<div>
					<span style={dls}>Faction liée</span>
					<select style={dsel} disabled>
						<option>— Sélectionner —</option>
					</select>
				</div>
			</div>
			<div style={dsec}>
				<span style={dls}>Médias</span>
				<div
					style={{
						fontSize: '0.65rem',
						color: 'var(--muted)',
						border: '1px dashed var(--border)',
						padding: '0.3rem 0.5rem',
						textAlign: 'center',
					}}
				>
					📎 Glisser ou cliquer pour ajouter des photos/vidéos
				</div>
			</div>
			<div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
				<span className="tutorial-dummy-btn-submit">Soumettre le rapport</span>
			</div>
		</div>
	);
}

export function DummyAdminCharForm() {
	return (
		<div className="tutorial-dummy-form tutorial-dummy-admin">
			<div className="tutorial-dummy-title">
				Aperçu — Section admin d'une fiche personnage
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Grade (override admin)</span>
					<select style={dsel} disabled>
						<option>Sergent</option>
					</select>
				</div>
				<div>
					<span style={dls}>Statut</span>
					<select style={dsel} disabled>
						<option>En service</option>
					</select>
				</div>
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Classification</span>
					<select style={dsel} disabled>
						<option>Restreint</option>
					</select>
				</div>
				<div>
					<span style={dls}>Officier supérieur</span>
					<select style={dsel} disabled>
						<option>Cpt. Martin</option>
					</select>
				</div>
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Faction</span>
					<input style={dinp} value="LIF" readOnly />
				</div>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.3rem',
						justifyContent: 'flex-end',
					}}
				>
					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.3rem',
							fontSize: '0.7rem',
							color: 'var(--text)',
						}}
					>
						<input type="checkbox" checked readOnly /> Grade forcé
					</label>
					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.3rem',
							fontSize: '0.7rem',
							color: 'var(--text)',
						}}
					>
						<input type="checkbox" readOnly /> Cible / Ennemi
					</label>
				</div>
			</div>
			<div style={dsec}>
				<label
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.3rem',
						fontSize: '0.7rem',
						color: 'var(--text)',
					}}
				>
					<input type="checkbox" readOnly /> Fiche PNJ (non lié à Discord)
				</label>
			</div>
			<span style={dls}>Notes État-Major</span>
			<textarea
				style={{ ...dinp, height: 28, resize: 'none' }}
				value="Agent fiable, à surveiller..."
				readOnly
			/>
			<div style={dsec}>
				<label
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.3rem',
						fontSize: '0.7rem',
						color: 'var(--danger)',
					}}
				>
					<input type="checkbox" readOnly /> Archiver ce dossier
				</label>
			</div>
		</div>
	);
}

export function DummyAdminIntelForm() {
	return (
		<div className="tutorial-dummy-form tutorial-dummy-admin">
			<div className="tutorial-dummy-title">
				Aperçu — Actions admin sur un rapport
			</div>
			<div
				style={{ fontSize: '0.72rem', color: 'var(--text)', marginBottom: '0.5rem' }}
			>
				En tant qu'admin, sur chaque rapport vous pouvez :
			</div>
			<div
				style={{
					display: 'flex',
					gap: '0.4rem',
					flexWrap: 'wrap',
					marginBottom: '0.5rem',
				}}
			>
				<span className="tutorial-dummy-status-btn active">À vérifier</span>
				<span className="tutorial-dummy-status-btn">Vérifié ✓</span>
				<span className="tutorial-dummy-status-btn">Fausse info ✗</span>
				<span className="tutorial-dummy-status-btn">Non concluant</span>
			</div>
			<div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
				<span className="tutorial-dummy-action-btn">✏️ Modifier</span>
				<span className="tutorial-dummy-action-btn danger">🗑️ Supprimer</span>
			</div>
			<div style={dsec}>
				<span style={dls}>Filtre par statut (admin)</span>
				<select style={dsel} disabled>
					<option>Tous les statuts</option>
				</select>
			</div>
		</div>
	);
}

export function DummyAdminTimelineForm() {
	return (
		<div className="tutorial-dummy-form tutorial-dummy-admin">
			<div className="tutorial-dummy-title">Aperçu — Gestion de la chronologie</div>
			<div
				style={{
					border: '1px solid var(--border)',
					padding: '0.4rem',
					marginBottom: '0.4rem',
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<div>
						<span
							style={{
								fontSize: '0.65rem',
								padding: '0.1rem 0.3rem',
								background: 'rgba(74,124,35,0.2)',
								color: 'var(--primary)',
								marginRight: '0.3rem',
							}}
						>
							PROMOTION
						</span>
						<span style={{ fontSize: '0.7rem' }}>Passage au grade de Sergent</span>
					</div>
					<span
						style={{
							color: 'var(--danger)',
							border: '1px solid var(--danger)',
							padding: '0.1rem 0.3rem',
							fontSize: '0.6rem',
						}}
					>
						✕
					</span>
				</div>
				<div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>15/03/2026</div>
			</div>
			<div
				style={{
					border: '1px solid var(--border)',
					padding: '0.4rem',
					marginBottom: '0.5rem',
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<div>
						<span
							style={{
								fontSize: '0.65rem',
								padding: '0.1rem 0.3rem',
								background: 'rgba(139,69,19,0.2)',
								color: '#c9a040',
								marginRight: '0.3rem',
							}}
						>
							MÉDAILLE
						</span>
						<span style={{ fontSize: '0.7rem' }}>Croix du mérite</span>
					</div>
					<span
						style={{
							color: 'var(--danger)',
							border: '1px solid var(--danger)',
							padding: '0.1rem 0.3rem',
							fontSize: '0.6rem',
						}}
					>
						✕
					</span>
				</div>
				<div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>10/02/2026</div>
			</div>
			<div style={dsec}>
				<div
					style={{
						fontSize: '0.72rem',
						color: 'var(--primary)',
						marginBottom: '0.3rem',
						fontWeight: 700,
					}}
				>
					Nouvel événement
				</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div>
						<span style={dls}>Type</span>
						<select style={dsel} disabled>
							<option>Promotion</option>
						</select>
					</div>
					<div>
						<span style={dls}>Date *</span>
						<input style={dinp} value="2026-03-30" readOnly />
					</div>
				</div>
				<span style={dls}>Titre *</span>
				<input style={dinp} value="Promotion Caporal-Chef" readOnly />
				<span style={dls}>Classification</span>
				<select style={dsel} disabled>
					<option>Public</option>
				</select>
				<div style={{ marginTop: '0.4rem', textAlign: 'center' }}>
					<span className="tutorial-dummy-btn-submit">Ajouter</span>
				</div>
			</div>
		</div>
	);
}
