export default function Loading() {
	return (
		<div className="boot-screen" role="status" aria-label="Chargement">
			<div className="boot-screen-grid" aria-hidden />
			<div className="boot-screen-vignette" aria-hidden />
			<div className="boot-screen-scanline" aria-hidden />
			<div className="boot-screen-noise" aria-hidden />

			<span className="boot-screen-rail boot-screen-rail--left" aria-hidden>
				LIF // ARMA REFORGER // SECURE TERMINAL
			</span>
			<span className="boot-screen-rail boot-screen-rail--right" aria-hidden>
				CONNEXION CHIFFRÉE — NIVEAU 03
			</span>

			<div className="boot-screen-frame">
				<span className="boot-screen-corner tl" aria-hidden />
				<span className="boot-screen-corner tr" aria-hidden />
				<span className="boot-screen-corner bl" aria-hidden />
				<span className="boot-screen-corner br" aria-hidden />

				<header className="boot-screen-head">
					<div className="boot-screen-tab">
						<span className="boot-screen-tab-num">SYS</span>
						<span className="boot-screen-tab-divider" aria-hidden />
						<span className="boot-screen-tab-text">
							<span className="boot-screen-tab-eyebrow">PROTOCOLE</span>
							<span className="boot-screen-tab-title">INITIALISATION</span>
						</span>
					</div>
					<div className="boot-screen-meta">
						<span className="boot-screen-meta-dot" aria-hidden />
						<span>LIEN ACTIF</span>
						<span className="boot-screen-meta-sep" aria-hidden>
							//
						</span>
						<span>VERROUILLAGE EN COURS</span>
					</div>
				</header>

				<div className="boot-screen-stage">
					<div className="boot-screen-glyph" aria-hidden>
						<span className="boot-screen-glyph-ring" />
						<span className="boot-screen-glyph-ring boot-screen-glyph-ring--alt" />
						<span className="boot-screen-glyph-core">L</span>
						<span className="boot-screen-glyph-blip" />
					</div>

					<div className="boot-screen-readout">
						<h1 className="boot-screen-title">
							<span className="boot-screen-title-num">// 01</span>
							<span className="boot-screen-title-line">Chargement</span>
							<span className="boot-screen-title-line accent">du module</span>
						</h1>
						<p className="boot-screen-subtitle">
							Authentification en cours · veuillez patienter
						</p>

						<ul className="boot-screen-log" aria-hidden>
							<li>
								<span className="boot-screen-log-prompt">&gt;</span>
								<span>handshake.tls</span>
								<span className="boot-screen-log-status ok">OK</span>
							</li>
							<li>
								<span className="boot-screen-log-prompt">&gt;</span>
								<span>auth.session</span>
								<span className="boot-screen-log-status ok">OK</span>
							</li>
							<li>
								<span className="boot-screen-log-prompt">&gt;</span>
								<span>roster.sync</span>
								<span className="boot-screen-log-status ok">OK</span>
							</li>
							<li>
								<span className="boot-screen-log-prompt">&gt;</span>
								<span>render.layout</span>
								<span className="boot-screen-log-status pending">…</span>
							</li>
						</ul>

						<div className="boot-screen-bar" aria-hidden>
							<div className="boot-screen-bar-track">
								<div className="boot-screen-bar-fill" />
							</div>
							<div className="boot-screen-bar-meta">
								<span>BUFFER</span>
								<span>// LIVE</span>
							</div>
						</div>
					</div>
				</div>

				<footer className="boot-screen-foot">
					<span>L.I.F · LÉGION INTERNATIONALE FRANCOPHONE</span>
					<span className="boot-screen-foot-cursor" aria-hidden>
						▮
					</span>
				</footer>
			</div>
		</div>
	);
}
