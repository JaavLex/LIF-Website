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

const GridOverlay = L.GridLayer.extend({
  createTile(coords: L.Coords) {
    const tile = document.createElement('canvas');
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;

    const ctx = tile.getContext('2d');
    if (!ctx) return tile;

    const map = this._map as L.Map;
    const zoom = map.getZoom();
    const spacing = getGridSpacing(zoom);

    // Compute world-coordinate bounds for this tile
    const nwPoint = coords.scaleBy(size);
    const sePoint = nwPoint.add(size);
    const nw = map.unproject(nwPoint, coords.z);
    const se = map.unproject(sePoint, coords.z);

    // World coords: lng = X, lat = Z
    const minX = Math.floor(nw.lng / spacing) * spacing;
    const maxX = Math.ceil(se.lng / spacing) * spacing;
    const minZ = Math.floor(se.lat / spacing) * spacing;
    const maxZ = Math.ceil(nw.lat / spacing) * spacing;

    ctx.strokeStyle = 'rgba(0, 255, 65, 0.35)';
    ctx.lineWidth = 1;

    // Draw vertical lines (constant X)
    for (let x = minX; x <= maxX; x += spacing) {
      const px = map.project(L.latLng(nw.lat, x), coords.z).subtract(nwPoint);
      ctx.beginPath();
      ctx.moveTo(px.x, 0);
      ctx.lineTo(px.x, size.y);
      ctx.stroke();
    }

    // Draw horizontal lines (constant Z)
    for (let z = minZ; z <= maxZ; z += spacing) {
      const px = map.project(L.latLng(z, nw.lng), coords.z).subtract(nwPoint);
      ctx.beginPath();
      ctx.moveTo(0, px.y);
      ctx.lineTo(size.x, px.y);
      ctx.stroke();
    }

    // Draw labels at intersections near tile edges
    const labelFontSize = Math.max(8, Math.min(11, 8 + zoom));
    ctx.font = `${labelFontSize}px 'Courier New', monospace`;
    ctx.fillStyle = 'rgba(0, 255, 65, 0.6)';
    ctx.textBaseline = 'top';

    for (let x = minX; x <= maxX; x += spacing) {
      for (let z = minZ; z <= maxZ; z += spacing) {
        const px = map.project(L.latLng(z, x), coords.z).subtract(nwPoint);
        // Only label if intersection is near top or left edge of tile (avoid duplication)
        if (px.x >= 0 && px.x < 40 && px.y >= 0 && px.y < 20) {
          ctx.fillText(`${formatLabel(x)}`, px.x + 2, px.y + 2);
          ctx.fillText(`${formatLabel(z)}`, px.x + 2, px.y + 2 + labelFontSize + 1);
        }
      }
    }

    return tile;
  },
});

export function createGridOverlay(pane = 'overlayPane'): L.GridLayer {
  return new (GridOverlay as any)({
    tileSize: 256,
    opacity: 1,
    pane,
  });
}
