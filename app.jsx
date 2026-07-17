import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Vite環境でCSSの読み込みエラーを防ぐための型チェック無視コメント
// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';

// サンプルの店舗データ
const INITIAL_SPOTS = [
  {
    id: "1",
    name: "ノマドカフェ 渋谷店",
    lat: 35.658034,
    lng: 139.701636,
    wifiSpeed: "95Mbps",
    hasPower: true,
    congestion: "空席あり",
    updatedAt: "10分前"
  },
  {
    id: "2",
    name: "コワーキングスペース 新宿",
    lat: 35.689607,
    lng: 139.699540,
    wifiSpeed: "120Mbps",
    hasPower: true,
    congestion: "やや混雑",
    updatedAt: "5分前"
  }
];

export default function MapPage() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const [spots, setSpots] = useState(INITIAL_SPOTS);
  const [selectedSpot, setSelectedSpot] = useState(null);

  // 地図の初期化
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [139.701636, 35.658034],
      zoom: 14,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.remove();
    };
  }, []);

  // スポットのピンを地図上に配置
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 既存のマーカーをクリア
    const activeMarkers = Object.values(markersRef.current);
    activeMarkers.forEach((marker) => {
      if (marker) marker.remove();
    });
    markersRef.current = {};

    spots.forEach((spot) => {
      const color = 
        spot.congestion === '空席あり' ? '#10B981' :
        spot.congestion === 'やや混雑' ? '#F59E0B' :
        '#EF4444';

      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold';
      el.style.backgroundColor = color;
      el.innerText = spot.hasPower ? '⚡' : '☕';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);

      el.addEventListener('click', () => {
        setSelectedSpot(spot);
        map.easeTo({ center: [spot.lng, spot.lat], zoom: 15 });
      });

      markersRef.current[spot.id] = marker;
    });
  }, [spots]);

  // 混雑状況のアップデート
  const handleReport = (spotId, status) => {
    setSpots((prevSpots) => 
      prevSpots.map((spot) => {
        if (spot.id === spotId) {
          const updated = {
            ...spot,
            congestion: status,
            updatedAt: "たった今"
          };
          setSelectedSpot(updated);
          return updated;
        }
        return spot;
      })
    );
    alert(`「${status}」の混雑情報を報告しました！10ポイント獲得！`);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      {/* ヘッダー */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-md shadow-md p-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-1">
          📍 <span className="text-blue-600">NomadSpot</span> チェッカー
        </h1>
        <div className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-semibold">
          🪙 120 pt
        </div>
      </header>

      {/* 地図コンテナ */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* スポット詳細パネル */}
      {selectedSpot && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-2xl shadow-2xl p-6 transition-all transform duration-300 max-w-md mx-auto border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold text-gray-900">{selectedSpot.name}</h2>
            <button 
              onClick={() => setSelectedSpot(null)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
              📶 Wi-Fi: {selectedSpot.wifiSpeed}
            </span>
            <span className="bg-orange-50 text-orange-700 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
              ⚡ {selectedSpot.hasPower ? '電源あり' : '電源なし'}
            </span>
          </div>

          <hr className="border-gray-100 my-3" />

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500">現在の混雑状況</p>
              <span className={`inline-block mt-1 text-sm font-extrabold px-3 py-1 rounded-full text-white ${
                selectedSpot.congestion === '空席あり' ? 'bg-emerald-500' :
                selectedSpot.congestion === 'やや混雑' ? 'bg-amber-500' : 'bg-rose-500'
              }`}>
                {selectedSpot.congestion}
              </span>
            </div>
            <span className="text-xs text-gray-400">最終更新: {selectedSpot.updatedAt}</span>
          </div>

          <p className="text-xs font-bold text-gray-700 mb-2">📢 今ココにいる？状況を教えてポイントGET！</p>
          <div className="grid grid-cols-3 gap-2">
            {['空席あり', 'やや混雑', '満席'].map((status) => (
              <button
                key={status}
                onClick={() => handleReport(selectedSpot.id, status)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  status === '空席あり' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 active:bg-emerald-100' :
                  status === 'やや混雑' ? 'bg-amber-50 text-amber-700 border border-amber-200 active:bg-amber-100' :
                  'bg-rose-50 text-rose-700 border border-rose-200 active:bg-rose-100'
                }`}
              >
                {status === '空席あり' ? '🟢 余裕' : status === 'やや混雑' ? '🟡 やや混' : '🔴 満席'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}