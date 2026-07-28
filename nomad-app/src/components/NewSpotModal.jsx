import React from 'react';

export default function NewSpotModal({ newSpotForm, setNewSpotForm, handleCreateSpot, tempMarker }) {
  return (
    // 画面全体を覆う半透明の背景。これで地図の上に確実に浮かび上がって見える
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
      <div className="modal bg-white rounded-2xl shadow-2xl p-6 border border-gray-150 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1">➕ 新店舗を公式登録</h3>
          <button
            onClick={() => { setNewSpotForm(null); if (tempMarker) tempMarker.remove(); }}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleCreateSpot} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">店舗名</label>
            <input
              type="text"
              required
              placeholder="例: スターバックス〇〇店"
              value={newSpotForm.name}
              onChange={(e) => setNewSpotForm({ ...newSpotForm, name: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">緯度 (lat)</label>
              <input
                type="number"
                step="0.000001"
                required
                value={newSpotForm.lat}
                onChange={(e) => setNewSpotForm({ ...newSpotForm, lat: parseFloat(e.target.value) })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">経度 (lng)</label>
              <input
                type="number"
                step="0.000001"
                required
                value={newSpotForm.lng}
                onChange={(e) => setNewSpotForm({ ...newSpotForm, lng: parseFloat(e.target.value) })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">Wi-Fi速度目安</label>
            <input
              type="text"
              placeholder="例: 100Mbps"
              value={newSpotForm.wifiSpeed}
              onChange={(e) => setNewSpotForm({ ...newSpotForm, wifiSpeed: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium pt-1">
            <input
              type="checkbox"
              checked={newSpotForm.hasPower}
              onChange={(e) => setNewSpotForm({ ...newSpotForm, hasPower: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            ⚡ 全席電源あり
          </label>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow mt-2"
          >
            マップに公式登録する
          </button>
        </form>
      </div>
    </div>
  );
}