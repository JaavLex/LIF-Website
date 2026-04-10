import type { Metadata } from 'next';
import MapPageClient from './MapPageClient';
import './map.css';

export const metadata: Metadata = {
  title: 'Carte Tactique | LIF Roleplay',
  description: 'Carte en temps réel du théâtre des opérations',
};

export default function MapPage() {
  return <MapPageClient />;
}
