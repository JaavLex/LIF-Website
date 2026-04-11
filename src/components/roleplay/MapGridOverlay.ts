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

/**
 * Creates a grid overlay as an L.LayerGroup containing polylines and labels.
 * Redraws on zoom change to adjust grid density.
 */
export function createGridOverlay(
  map: L.Map,
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
): L.LayerGroup {
  const group = L.layerGroup();

  function draw() {
    group.clearLayers();
    const zoom = map.getZoom();
    const spacing = getGridSpacing(zoom);

    const { minX, minZ, maxX, maxZ } = bounds;

    // Snap to grid — clamp INSIDE bounds so lines never draw outside map
    const startX = Math.ceil(minX / spacing) * spacing;
    const endX = Math.floor(maxX / spacing) * spacing;
    const startZ = Math.ceil(minZ / spacing) * spacing;
    const endZ = Math.floor(maxZ / spacing) * spacing;

    // Vertical lines (constant X)
    for (let x = startX; x <= endX; x += spacing) {
      if (x < minX || x > maxX) continue;
      group.addLayer(L.polyline([[minZ, x], [maxZ, x]], LINE_STYLE));
    }

    // Horizontal lines (constant Z)
    for (let z = startZ; z <= endZ; z += spacing) {
      if (z < minZ || z > maxZ) continue;
      group.addLayer(L.polyline([[z, minX], [z, maxX]], LINE_STYLE));
    }

    // Labels at intersections
    // At fine zoom show labels less often to avoid clutter
    const labelSpacing = spacing < 100 ? spacing * 5 : spacing;
    const labelStartX = Math.ceil(minX / labelSpacing) * labelSpacing;
    const labelStartZ = Math.ceil(minZ / labelSpacing) * labelSpacing;

    for (let x = labelStartX; x < maxX; x += labelSpacing) {
      for (let z = labelStartZ; z < maxZ; z += labelSpacing) {
        if (x < minX || z < minZ) continue;
        // Offset label to bottom-right of intersection so it sits INSIDE the cell,
        // not on top of the grid lines
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
      }
    }
  }

  draw();
  map.on('zoomend', draw);

  group.on('remove', () => {
    map.off('zoomend', draw);
  });
  group.on('add', () => {
    map.off('zoomend', draw);
    map.on('zoomend', draw);
    draw();
  });

  return group;
}
