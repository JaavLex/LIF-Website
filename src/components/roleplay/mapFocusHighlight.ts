import L from 'leaflet';

export interface FocusHighlightOptions {
	map: L.Map;
	x: number;
	z: number;
	label?: string;
	durationMs?: number;
}

/**
 * Drops a pulsing "target lock" highlight at the given map coordinates and
 * animates the view to it. The highlight is removed after `durationMs` (default 14s).
 * Returns a cleanup function for unmounts.
 */
export function applyFocusHighlight({
	map,
	x,
	z,
	label,
	durationMs = 14000,
}: FocusHighlightOptions): () => void {
	const safeLabel = label
		? label.replace(/</g, '&lt;').replace(/>/g, '&gt;')
		: '';
	const icon = L.divIcon({
		className: 'map-focus-lock',
		html: `
			<div class="map-focus-lock-wrap">
				<span class="map-focus-lock-ring map-focus-lock-ring-1"></span>
				<span class="map-focus-lock-ring map-focus-lock-ring-2"></span>
				<span class="map-focus-lock-ring map-focus-lock-ring-3"></span>
				<span class="map-focus-lock-cross map-focus-lock-cross-n"></span>
				<span class="map-focus-lock-cross map-focus-lock-cross-s"></span>
				<span class="map-focus-lock-cross map-focus-lock-cross-e"></span>
				<span class="map-focus-lock-cross map-focus-lock-cross-w"></span>
				<span class="map-focus-lock-core"></span>
				${safeLabel ? `<span class="map-focus-lock-label">${safeLabel}</span>` : ''}
			</div>
		`,
		iconSize: [120, 120],
		iconAnchor: [60, 60],
	});

	const marker = L.marker([z, x], { icon, interactive: false, zIndexOffset: 2000 });
	marker.addTo(map);

	try {
		map.flyTo([z, x], 2, { duration: 1.2, easeLinearity: 0.25 });
	} catch {
		map.setView([z, x], 2);
	}

	const timer = setTimeout(() => {
		try { map.removeLayer(marker); } catch { /* already gone */ }
	}, durationMs);

	return () => {
		clearTimeout(timer);
		try { map.removeLayer(marker); } catch { /* already gone */ }
	};
}
