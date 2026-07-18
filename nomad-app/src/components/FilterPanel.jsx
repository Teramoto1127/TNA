import React from 'react';

const CONGESTION_OPTIONS = ['空席あり', 'やや混雑', '満席'];
const WIFI_THRESHOLDS = [
  { label: '指定なし', value: 0 },
  { label: '50Mbps以上', value: 50 },
  { label: '100Mbps以上', value: 100 },
  { label: '150Mbps以上', value: 150 },
];

export default function FilterPanel({ filters, setFilters, onClose, resultCount }) {
  const toggleCongestion = (status) => {
    setFilters((prev) => {
      const already = prev.congestionStatuses.includes(status);
      const next = already
        ? prev.congestionStatuses.filter((s) => s !== status)
        : [...prev.congestionStatuses, status];
      // 全解除は許容しない（最低1つは選択されている状態を維持）
      if (next.length === 0) return prev;
      return { ...prev, congestionStatuses: next };
    });
  };

  const resetFilters = () => {
    setFilters({
      hasPowerOnly: false,
      minWifiSpeed: 0,
      congestionStatuses: [...CONGESTION_OPTIONS],
      favoritesOnly: false,
    });
  };

  return (
    <div className="modal absolute top-20 left-4 right-4 md:left-4 md:right-auto md:w-80 z-20 bg-white rounded-2xl shadow-2xl p-5 border border-gray-150">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">🔍 絞り込み</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 font-bold"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={filters.hasPowerOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, hasPowerOnly: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          ⚡ 電源ありのみ
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={filters.favoritesOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, favoritesOnly: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          ⭐ お気に入りのみ表示
        </label>

        <div>
          <p className="text-[10px] font-bold text-gray-500 mb-1.5">📶 Wi-Fi速度</p>
          <select
            value={filters.minWifiSpeed}
            onChange={(e) => setFilters((prev) => ({ ...prev, minWifiSpeed: Number(e.target.value) }))}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {WIFI_THRESHOLDS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-500 mb-1.5">混雑状況</p>
          <div className="flex gap-2">
            {CONGESTION_OPTIONS.map((status) => {
              const active = filters.congestionStatuses.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleCongestion(status)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">{resultCount}件のスポットを表示中</span>
        <button
          onClick={resetFilters}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          リセット
        </button>
      </div>
    </div>
  );
}