'use client';

import dynamic from 'next/dynamic';

const TacticalMap = dynamic(() => import('@/components/roleplay/TacticalMap'), {
  ssr: false,
  loading: () => (
    <div className="tactical-map-page">
      <div className="map-container">
        <div className="map-no-data">
          <span className="blinking">Chargement du terminal cartographique...</span>
        </div>
      </div>
    </div>
  ),
});

export default function MapLoader() {
  return <TacticalMap />;
}
