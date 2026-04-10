import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './map.css';

export const metadata: Metadata = {
  title: 'Carte Tactique | LIF Roleplay',
  description: 'Carte en temps réel du théâtre des opérations',
};

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

export default function MapPage() {
  return <TacticalMap />;
}
