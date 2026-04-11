'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatGrid } from '@/lib/constants';
import { createGridOverlay } from '../roleplay/MapGridOverlay';

const POI_COLORS: Record<string, string> = {
	bar: '#f5b94a',
	shop: '#7abaff',
	gas: '#ff9a5a',
	city: '#d8f3c4',
};

const INTEL_CLASS_COLORS: Record<string, string> = {
	public: '#7aff7a',
	restricted: '#f5b94a',
	classified: '#ff5050',
};

function makePinIcon(variant: 'shared' | 'gps' | 'sos') {
	const fill =
		variant === 'sos' ? '#ff2b2b' : variant === 'gps' ? '#7aff9a' : '#ff4444';
	const core = variant === 'sos' ? '#200' : variant === 'gps' ? '#052010' : '#1a0505';
	const cls =
		variant === 'sos'
			? 'map-pin-icon map-pin-sos'
			: variant === 'gps'
				? 'map-pin-icon map-pin-gps'
				: 'map-pin-icon';
	return L.divIcon({
		className: cls,
		html: `<svg viewBox="0 0 24 36" width="28" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${fill}" fill-opacity="0.95"/>
      <circle cx="12" cy="12" r="5" fill="${core}" stroke="${fill}" stroke-width="1.5"/>
    </svg>`,
		iconSize: [28, 42],
		iconAnchor: [14, 42],
	});
}

interface PositionPreviewModalProps {
	coords: { x: number; z: number; label?: string; source?: string };
	onClose: () => void;
}

export default function PositionPreviewModal({ coords, onClose }: PositionPreviewModalProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const [loading, setLoading] = useState(true);

	const variant: 'shared' | 'gps' | 'sos' =
		coords.source === 'sos' ? 'sos' : coords.source === 'gps' ? 'gps' : 'shared';
	const title =
		variant === 'sos'
			? 'SIGNAL SOS'
			: variant === 'gps'
				? 'Ma position'
				: 'Position partagée';

	useEffect(() => {
		if (!containerRef.current) return;

		let map: L.Map | null = null;
		let cancelled = false;
		const timers: ReturnType<typeof setTimeout>[] = [];

		(async () => {
			try {
				const [stateRes, poiRes, unitRes, intelRes] = await Promise.allSettled([
					fetch('/api/roleplay/map/state'),
					fetch('/api/roleplay/map/poi'),
					fetch('/api/roleplay/map/units'),
					fetch('/api/roleplay/map/intel'),
				]);

				const data =
					stateRes.status === 'fulfilled' && stateRes.value.ok
						? await stateRes.value.json()
						: null;

				if (cancelled || !containerRef.current || !data) {
					setLoading(false);
					return;
				}

				map = L.map(containerRef.current, {
					crs: L.CRS.Simple,
					minZoom: -3,
					maxZoom: 3,
					zoomControl: true,
					attributionControl: false,
				});

				const terrain = data.terrain;
				const ox = data.offsetX || 0;
				const oz = data.offsetZ || 0;

				if (terrain && data.mapImageUrl) {
					const bounds: L.LatLngBoundsExpression = [
						[oz, ox],
						[oz + terrain.sizeZ, ox + terrain.sizeX],
					];
					L.imageOverlay(data.mapImageUrl, bounds).addTo(map);

					// Clamp pan/zoom within map bounds
					const latLngBounds = L.latLngBounds(
						[oz, ox],
						[oz + terrain.sizeZ, ox + terrain.sizeX],
					);
					map.setMaxBounds(latLngBounds.pad(0.05));
					const fitZoom = map.getBoundsZoom(latLngBounds, false);
					map.setMinZoom(Math.max(-3, fitZoom - 1));

					// Grid overlay matching tactical map
					createGridOverlay(map, {
						minX: ox,
						minZ: oz,
						maxX: ox + terrain.sizeX,
						maxZ: oz + terrain.sizeZ,
					}).addTo(map);
				}

				// POI overlays
				if (poiRes.status === 'fulfilled' && poiRes.value.ok) {
					try {
						const pd = await poiRes.value.json();
						for (const p of pd.pois || []) {
							const color = POI_COLORS[p.type] || '#ccc';
							const m = L.circleMarker([p.z, p.x], {
								radius: 6,
								fillColor: color,
								color: '#000',
								weight: 1,
								fillOpacity: 0.85,
								interactive: true,
							});
							m.bindTooltip(p.name, {
								permanent: p.type === 'city',
								direction: 'right',
								offset: [10, 0],
								className: p.type === 'city' ? 'city-label-tooltip' : undefined,
							});
							m.addTo(map!);
						}
					} catch { /* ignore */ }
				}

				// Unit HQ overlays
				if (unitRes.status === 'fulfilled' && unitRes.value.ok) {
					try {
						const ud = await unitRes.value.json();
						for (const u of ud.units || []) {
							if (u.hqX == null || u.hqZ == null) continue;
							const m = L.circleMarker([u.hqZ, u.hqX], {
								radius: 7,
								fillColor: u.color || '#7aff7a',
								color: '#000',
								weight: 1.5,
								fillOpacity: 0.9,
							});
							m.bindTooltip(`QG · ${u.name}`, {
								direction: 'right',
								offset: [10, 0],
							});
							m.addTo(map!);
						}
					} catch { /* ignore */ }
				}

				// Intel overlays
				if (intelRes.status === 'fulfilled' && intelRes.value.ok) {
					try {
						const id = await intelRes.value.json();
						for (const i of id.markers || []) {
							const color = INTEL_CLASS_COLORS[i.classification] || '#ccc';
							const m = L.circleMarker([i.z, i.x], {
								radius: 5,
								fillColor: color,
								color: '#000',
								weight: 1,
								fillOpacity: 0.8,
							});
							m.bindTooltip(i.title || 'Renseignement', {
								direction: 'right',
								offset: [10, 0],
							});
							m.addTo(map!);
						}
					} catch { /* ignore */ }
				}

				// Main focus marker
				const marker = L.marker([coords.z, coords.x], {
					icon: makePinIcon(variant),
					zIndexOffset: 1000,
				});
				marker.addTo(map);
				const popupLabel =
					variant === 'sos'
						? `<strong style="color:#ff5757;">⚠ SOS ⚠</strong>`
						: variant === 'gps'
							? `<strong style="color:#7aff9a;">Ma position actuelle</strong>`
							: `<strong>Position partagée</strong>`;
				marker
					.bindPopup(
						`<div style="font-size:0.85rem;">
              ${popupLabel}<br/>
              ${formatGrid(coords.x)} / ${formatGrid(coords.z)}
            </div>`,
					)
					.openPopup();

				map.setView([coords.z, coords.x], 1);
				mapRef.current = map;
				setLoading(false);

				[100, 300, 600].forEach(ms => {
					timers.push(
						setTimeout(() => {
							if (!cancelled && map) {
								try { map.invalidateSize(); } catch { /* removed */ }
							}
						}, ms),
					);
				});
			} catch {
				setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
			timers.forEach(clearTimeout);
			if (map) {
				try { map.remove(); } catch { /* already gone */ }
				mapRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const accent =
		variant === 'sos' ? '#ff5757' : variant === 'gps' ? '#7aff9a' : 'var(--primary)';

	return (
		<div className="comms-modal-backdrop" onClick={onClose}>
			<div
				className="comms-modal"
				onClick={e => e.stopPropagation()}
				style={{
					width: '96vw',
					maxWidth: '1600px',
					height: '92vh',
					maxHeight: '1100px',
					display: 'flex',
					flexDirection: 'column',
					borderColor: variant === 'sos' ? '#ff3030' : undefined,
					boxShadow: variant === 'sos' ? '0 0 24px rgba(255, 30, 30, 0.5)' : undefined,
				}}
			>
				<h2
					style={{
						color: accent,
						margin: 0,
						fontSize: '0.9rem',
						textTransform: variant === 'sos' ? 'uppercase' : undefined,
						letterSpacing: variant === 'sos' ? '0.15em' : undefined,
					}}
				>
					{title}: {coords.label || `${formatGrid(coords.x)} / ${formatGrid(coords.z)}`}
				</h2>
				<div
					style={{
						flex: 1,
						position: 'relative',
						marginTop: '0.75rem',
						border: `1px solid ${
							variant === 'sos' ? '#ff3030' : 'var(--cc-line, rgba(255,255,255,0.1))'
						}`,
					}}
				>
					{loading && (
						<div
							style={{
								position: 'absolute',
								inset: 0,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'var(--muted)',
								fontSize: '0.8rem',
								zIndex: 10,
							}}
						>
							Chargement...
						</div>
					)}
					<div ref={containerRef} style={{ width: '100%', height: '100%' }} />
				</div>
				<div className="comms-modal-actions" style={{ marginTop: '0.75rem' }}>
					<button className="comms-modal-btn" onClick={onClose}>
						Fermer
					</button>
				</div>
			</div>
		</div>
	);
}
