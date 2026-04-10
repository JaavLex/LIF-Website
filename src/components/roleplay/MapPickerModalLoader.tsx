'use client';

import dynamic from 'next/dynamic';

const MapPickerModal = dynamic(() => import('./MapPickerModal'), {
  ssr: false,
  loading: () => null,
});

export default MapPickerModal;
