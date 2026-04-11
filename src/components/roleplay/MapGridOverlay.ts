import L from 'leaflet';

/**
 * Density tiers: maps zoom level → grid spacing in meters.
 */
function getGridSpacing(zoom: number): number {
  if (zoom <= -2) return 1000;
  if (zoom <= 0) return 500;
  if (zoom === 1) return 100;
  if (zoom === 2) return 50;
  return 10; // zoom >= 3
}

function formatLabel(meters: number): string {
  return String(Math.floor(meters)).padStart(5, '0');
}

// Pip-Boy dark green grid lines
const LINE_STYLE: L.PolylineOptions = {
  color: '#1a3a1a',
  weight: 2,
  opacity: 0.7,
  interactive: false,
};

// Defensive caps to prevent runaway DOM/layer counts when the map extent is
// large and the user zooms in. Anything above these limits is skipped.
const MAX_LINES_PER_AXIS = 400;
const MAX_LABELS = 1500;

/**
 * Creates a grid overlay as an L.LayerGroup containing polylines and labels.
 *
 * Only draws lines/labels that intersect the current viewport (plus a small
 * pad) rather than the full map extent. This turns cost from O(map_area /
 * spacing²) into O(viewport_area / spacing²), which keeps zoom in/out smooth
 * on large maps where the old implementation could produce tens of thousands
 * of label markers at fine zoom.
 */
export function createGridOverlay(
  map: L.Map,
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
): L.LayerGroup {
  const group = L.layerGroup();
  let rafHandle: number | null = null;

  function draw() {
    rafHandle = null;
    group.clearLayers();
    const zoom = map.getZoom();
    const spacing = getGridSpacing(zoom);

    const { minX, minZ, maxX, maxZ } = bounds;

    // Visible viewport in CRS.Simple coordinates (lat=Z, lng=X).
    const vb = map.getBounds();
    const pad = spacing;
    const viewMinX = Math.max(minX, vb.getWest() - pad);
    const viewMaxX = Math.min(maxX, vb.getEast() + pad);
    const viewMinZ = Math.max(minZ, vb.getSouth() - pad);
    const viewMaxZ = Math.min(maxZ, vb.getNorth() + pad);
    if (viewMinX >= viewMaxX || viewMinZ >= viewMaxZ) return;

    // If the visible cell count would exceed the per-axis cap, bail — the
    // user has zoomed to a state where the grid wouldn't be readable anyway.
    const xCount = Math.ceil((viewMaxX - viewMinX) / spacing);
    const zCount = Math.ceil((viewMaxZ - viewMinZ) / spacing);
    if (xCount > MAX_LINES_PER_AXIS || zCount > MAX_LINES_PER_AXIS) return;

    const startX = Math.ceil(viewMinX / spacing) * spacing;
    const endX = Math.floor(viewMaxX / spacing) * spacing;
    const startZ = Math.ceil(viewMinZ / spacing) * spacing;
    const endZ = Math.floor(viewMaxZ / spacing) * spacing;

    // Lines span the visible slice only, clamped to map bounds.
    const lineZ1 = Math.max(minZ, viewMinZ);
    const lineZ2 = Math.min(maxZ, viewMaxZ);
    const lineX1 = Math.max(minX, viewMinX);
    const lineX2 = Math.min(maxX, viewMaxX);

    for (let x = startX; x <= endX; x += spacing) {
      if (x < minX || x > maxX) continue;
      group.addLayer(L.polyline([[lineZ1, x], [lineZ2, x]], LINE_STYLE));
    }
    for (let z = startZ; z <= endZ; z += spacing) {
      if (z < minZ || z > maxZ) continue;
      group.addLayer(L.polyline([[z, lineX1], [z, lineX2]], LINE_STYLE));
    }

    const labelSpacing = spacing < 100 ? spacing * 5 : spacing;
    const labelStartX = Math.ceil(viewMinX / labelSpacing) * labelSpacing;
    const labelStartZ = Math.ceil(viewMinZ / labelSpacing) * labelSpacing;

    let labelCount = 0;
    for (let x = labelStartX; x < viewMaxX && labelCount < MAX_LABELS; x += labelSpacing) {
      if (x < minX || x > maxX) continue;
      for (let z = labelStartZ; z < viewMaxZ && labelCount < MAX_LABELS; z += labelSpacing) {
        if (z < minZ || z > maxZ) continue;
        const label = L.marker([z, x], {
          icon: L.divIcon({
            className: 'grid-label',
            html: `<span>${formatLabel(x)}<br/>${formatLabel(z)}</span>`,
            iconSize: [70, 28],
            iconAnchor: [-5, -4],
          }),
          interactive: false,
        });
        group.addLayer(label);
        labelCount++;
      }
    }
  }

  function scheduleDraw() {
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(() => {
      try { draw(); } catch { /* map may be gone */ }
    });
  }

  function subscribe() {
    map.on('zoomend', scheduleDraw);
    map.on('moveend', scheduleDraw);
  }
  function unsubscribe() {
    map.off('zoomend', scheduleDraw);
    map.off('moveend', scheduleDraw);
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }

  draw();
  subscribe();

  group.on('remove', unsubscribe);
  // Defer the redraw on re-add — mutating the group synchronously inside the
  // 'add' event re-enters Leaflet's add iteration and hits a parentNode crash.
  group.on('add', () => {
    unsubscribe();
    subscribe();
    scheduleDraw();
  });

  return group;
}
