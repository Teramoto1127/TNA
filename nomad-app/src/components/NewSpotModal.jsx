import React from 'react';
import { createPortal } from 'react-dom';

export default function NewSpotModal({ newSpotForm, setNewSpotForm, handleCreateSpot, tempMarker }) {
  return createPortal(
    <div
      className="fixed top-0 right-0 bottom-0 left-0"
      style={{ backgroundColor: 'yellow', padding: '20px', fontSize: '24px', zIndex: 999999 }}
    >
      テスト：fixed top-0 right-0 bottom-0 left-0
    </div>,
    document.body
  );
}