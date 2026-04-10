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

const LINE_STYLE: L.PolylineOptions = {
  color: 'rgba(0, 255, 65, 0.45)',
  weight: 2,
  interactive: false,
};

/**
 * Creates a grid overlay as an L.LayerGroup containing polylines and labels.
 * Redraws on zoom change to adjust grid density.
 *
 * @param map The Leaflet map instance
 * @param bounds The world-coordinate bounds [minZ, minX] to [maxZ, maxX]
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

    // Snap to grid
    const startX = Math.floor(minX / spacing) * spacing;
    const endX = Math.ceil(maxX / spacing) * spacing;
    const startZ = Math.floor(minZ / spacing) * spacing;
    const endZ = Math.ceil(maxZ / spacing) * spacing;

    // Vertical lines (constant X)
    for (let x = startX; x <= endX; x += spacing) {
      const line = L.polyline(
        [[minZ, x], [maxZ, x]],
        LINE_STYLE,
      );
      group.addLayer(line);
    }

    // Horizontal lines (constant Z)
    for (let z = startZ; z <= endZ; z += spacing) {
      const line = L.polyline(
        [[z, minX], [z, maxX]],
        LINE_STYLE,
      );
      group.addLayer(line);
    }

    // Labels at intersections — use DivIcon markers
    // Only show labels at coarser intervals to avoid clutter
    const labelSpacing = spacing < 100 ? spacing * 5 : spacing;
    const labelStartX = Math.ceil(minX / labelSpacing) * labelSpacing;
    const labelStartZ = Math.ceil(minZ / labelSpacing) * labelSpacing;

    for (let x = labelStartX; x <= maxX; x += labelSpacing) {
      for (let z = labelStartZ; z <= maxZ; z += labelSpacing) {
        const label = L.marker([z, x], {
          icon: L.divIcon({
            className: 'grid-label',
            html: `<span>${formatLabel(x)}<br/>${formatLabel(z)}</span>`,
            iconSize: [70, 28],
            iconAnchor: [-3, 14],
          }),
          interactive: false,
        });
        group.addLayer(label);
      }
    }
  }

  draw();
  map.on('zoomend', draw);

  // Clean up listener when layer is removed
  group.on('remove', () => {
    map.off('zoomend', draw);
  });
  group.on('add', () => {
    map.off('zoomend', draw); // avoid double-binding
    map.on('zoomend', draw);
    draw();
  });

  return group;
}
