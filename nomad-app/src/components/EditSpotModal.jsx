import React from 'react';

export default function EditSpotModal({ editSpotForm, setEditSpotForm, handleUpdateSpot }) {
  return (
    <div className="modal absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-20 bg-white rounded-2xl shadow-2xl p-6 border border-gray-150">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-1">✏️ 店舗情報を編集</h3>
        <button
          onClick={() => setEditSpotForm(null)}
          className="text-gray-400 hover:text-gray-600 font-bold"
        >
          ✕
        </button>
      </div>
      <form onSubmit={handleUpdateSpot} className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">店舗名</label>
          <input
            type="text"
            required
            value={editSpotForm.name}
            onChange={(e) => setEditSpotForm({ ...editSpotForm, name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">Wi-Fi速度目安</label>
          <input
            type="text"
            placeholder="例: 100Mbps"
            value={editSpotForm.wifiSpeed}
            onChange={(e) => setEditSpotForm({ ...editSpotForm, wifiSpeed: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium pt-1">
          <input
            type="checkbox"
            checked={editSpotForm.hasPower}
            onChange={(e) => setEditSpotForm({ ...editSpotForm, hasPower: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          ⚡ 全席電源あり
        </label>
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow mt-2"
        >
          変更を保存する
        </button>
      </form>
    </div>
  );
}
