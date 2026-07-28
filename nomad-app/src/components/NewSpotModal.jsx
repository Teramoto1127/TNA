import React from 'react';
import { createPortal } from 'react-dom';

export default function NewSpotModal({ newSpotForm, setNewSpotForm, handleCreateSpot, tempMarker }) {
  const modalContent = (
    // デバッグのため、TailwindのクラスではなくインラインCSSで直接指定
    // これで表示されるかどうかで、Tailwind側の問題かを切り分ける
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            ➕ 新店舗を公式登録
          </h3>
          <button
            onClick={() => { setNewSpotForm(null); if (tempMarker) tempMarker.remove(); }}
            style={{ color: '#9CA3AF', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreateSpot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#6B7280', marginBottom: '4px' }}>
              店舗名
            </label>
            <input
              type="text"
              required
              placeholder="例: スターバックス〇〇店"
              value={newSpotForm.name}
              onChange={(e) => setNewSpotForm({ ...newSpotForm, name: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#6B7280', marginBottom: '4px' }}>
                緯度 (lat)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={newSpotForm.lat}
                onChange={(e) => setNewSpotForm({ ...newSpotForm, lat: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#6B7280', marginBottom: '4px' }}>
                経度 (lng)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={newSpotForm.lng}
                onChange={(e) => setNewSpotForm({ ...newSpotForm, lng: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#6B7280', marginBottom: '4px' }}>
              Wi-Fi速度目安
            </label>
            <input
              type="text"
              placeholder="例: 100Mbps"
              value={newSpotForm.wifiSpeed}
              onChange={(e) => setNewSpotForm({ ...newSpotForm, wifiSpeed: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', paddingTop: '4px' }}>
            <input
              type="checkbox"
              checked={newSpotForm.hasPower}
              onChange={(e) => setNewSpotForm({ ...newSpotForm, hasPower: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
            ⚡ 全席電源あり
          </label>

          <button
            type="submit"
            style={{
              width: '100%',
              backgroundColor: '#4F46E5',
              color: 'white',
              fontWeight: 'bold',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            マップに公式登録する
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}