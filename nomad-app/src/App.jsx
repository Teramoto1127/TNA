import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Vite環境でCSSの読み込みエラーを防ぐための型チェック無視コメント
// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';

// 1. サンプルの店舗データ（ホスト識別用の hostId と、口コミ用の comments を拡張）
const INITIAL_SPOTS = [
  {
    id: "1",
    name: "ノマドカフェ 渋谷店",
    lat: 35.658034,
    lng: 139.701636,
    wifiSpeed: "95Mbps",
    hasPower: true,
    congestion: "空席あり",
    updatedAt: "10分前",
    hostId: "host_shibuya",
    comments: ["Wi-Fiが安定していて作業が捗ります！", "静かで集中しやすい環境。"]
  },
  {
    id: "2",
    name: "コワーキングスペース 新宿",
    lat: 35.689607,
    lng: 139.699540,
    wifiSpeed: "120Mbps",
    hasPower: true,
    congestion: "やや混雑",
    updatedAt: "5分前",
    hostId: "host_shinjuku",
    comments: ["コンセントが各席に配置されていて便利です。"]
  }
];

export default function App() {
  // --- 画面切り替え & ログイン用ステート ---
  const [currentScreen, setCurrentScreen] = useState('index'); // 'index' | 'login' | 'map'
  const [loginRole, setLoginRole] = useState(null); // 'user' | 'host'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // --- マップ・データ用ステート ---
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const [spots, setSpots] = useState(INITIAL_SPOTS);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [newComment, setNewComment] = useState("");

  // 新規スポット仮ピン & フォーム（ホスト用）
  const [tempMarker, setTempMarker] = useState(null);
  const [newSpotForm, setNewSpotForm] = useState(null);

  const MAP_STYLE_URL = 'https://osm.gdl.jp/styles/osm-bright-ja/style.json';

  // ログイン処理
  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert("ユーザー名を入力してください");
      return;
    }
    setCurrentScreen('map');
  };

  // ログアウト処理
  const handleLogout = () => {
    setLoginRole(null);
    setUsername('');
    setPassword('');
    setSelectedSpot(null);
    setNewSpotForm(null);
    if (tempMarker) tempMarker.remove();
    setTempMarker(null);
    setCurrentScreen('index');
  };

  // 地図の初期化 (マップ画面が表示された時のみ実行)
  useEffect(() => {
    if (currentScreen !== 'map' || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [139.701636, 35.658034],
      zoom: 14,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // 地図クリック時（ホスト権限のみ、新規店舗登録ピンを配置可能）
    map.on('click', (e) => {
      if (loginRole !== 'host') return;
      if (e.originalEvent.target.closest('button') || e.originalEvent.target.closest('.modal')) {
        return;
      }

      const { lng, lat } = e.lngLat;
      
      // 既存の仮ピンを削除
      if (tempMarker) tempMarker.remove();

      const el = document.createElement('div');
      el.className = 'w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-lg animate-bounce cursor-pointer';
      el.innerText = '＋';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      setTempMarker(marker);
      setNewSpotForm({
        lat,
        lng,
        name: "",
        hasPower: true,
        congestion: "空席あり",
        wifiSpeed: "100Mbps"
      });
      setSelectedSpot(null);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [currentScreen, loginRole, tempMarker]);

  // スポットのピンを地図上に配置
  useEffect(() => {
    if (currentScreen !== 'map') return;
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
      el.className = 'w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110';
      el.style.backgroundColor = color;
      el.innerText = spot.hasPower ? '⚡' : '☕';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedSpot(spot);
        setNewSpotForm(null);
        if (tempMarker) {
          tempMarker.remove();
          setTempMarker(null);
        }
        map.easeTo({ center: [spot.lng, spot.lat], zoom: 15 });
      });

      markersRef.current[spot.id] = marker;
    });
  }, [spots, currentScreen, tempMarker]);

  // 現在地ジャンプ（一般ユーザー専用）
  const handleGeoLocation = () => {
    if (!navigator.geolocation) {
      alert("お使いのブラウザは位置情報に対応していません");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapRef.current) {
          mapRef.current.easeTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 1500
          });
        }
      },
      () => {
        alert("位置情報の取得に失敗しました。GPSの設定を確認してください。");
      }
    );
  };

  // 混雑状況のアップデート（一般 or ホストでメッセージを変更）
  const handleReport = (spotId, status) => {
    setSpots((prevSpots) => 
      prevSpots.map((spot) => {
        if (spot.id === spotId) {
          const updated = {
            ...spot,
            congestion: status,
            updatedAt: loginRole === 'host' ? "公式たった今" : "たった今"
          };
          setSelectedSpot(updated);
          return updated;
        }
        return spot;
      })
    );

    if (loginRole === 'host') {
      alert(`管理店舗の混雑状況を「${status}」に公式更新しました！`);
    } else {
      alert(`「${status}」の混雑情報を報告しました！10ポイント獲得！`);
    }
  };

  // 口コミの追加（一般ユーザー限定）
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSpots((prevSpots) =>
      prevSpots.map((spot) => {
        if (spot.id === selectedSpot.id) {
          const updatedComments = [newComment, ...(spot.comments || [])];
          const updated = { ...spot, comments: updatedComments };
          setSelectedSpot(updated);
          return updated;
        }
        return spot;
      })
    );
    setNewComment("");
  };

  // 新規スポットの追加（ホスト限定）
  const handleCreateSpot = (e) => {
    e.preventDefault();
    if (!newSpotForm.name.trim()) {
      alert("店舗名を入力してください");
      return;
    }

    const newSpot = {
      id: Date.now().toString(),
      name: newSpotForm.name,
      lat: newSpotForm.lat,
      lng: newSpotForm.lng,
      wifiSpeed: newSpotForm.wifiSpeed,
      hasPower: newSpotForm.hasPower,
      congestion: newSpotForm.congestion,
      updatedAt: "公式登録直後",
      hostId: username,
      comments: []
    };

    setSpots((prev) => [newSpot, ...prev]);
    setNewSpotForm(null);
    if (tempMarker) {
      tempMarker.remove();
      setTempMarker(null);
    }
    setSelectedSpot(newSpot);
    alert(`新店舗「${newSpot.name}」をマップに登録しました！`);
  };

  // ==========================================
  // 1. トップページ（Index）
  // ==========================================
  if (currentScreen === 'index') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col justify-between font-sans">
        <header className="p-6 max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="text-xl font-black text-gray-900 flex items-center gap-1">
            📍 <span className="text-blue-600">NomadSpot</span>
          </div>
          <button 
            onClick={() => { setLoginRole('user'); setCurrentScreen('login'); }}
            className="text-sm font-bold bg-white text-blue-600 border border-gray-200 px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all"
          >
            ログイン
          </button>
        </header>

        <main className="max-w-4xl mx-auto text-center px-6 py-12 flex-1 flex flex-col justify-center items-center">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3.5 py-1.5 rounded-full tracking-wide mb-6">
            💻 ノマドワーカー専用のリアルタイムマップ
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-6">
            作業スポットを、<br />かつてないほどスマートに探そう。
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-xl mb-10 leading-relaxed">
            電源・Wi-Fi環境はもちろん、他のワーカーが報告したリアルタイムの混雑情報もチェック可能。店舗オーナー自身による公式情報の発信も対応。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button
              onClick={() => { setLoginRole('user'); setCurrentScreen('map'); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-200 transition-all text-base"
            >
              🔍 一般ユーザーとして探す (ログイン不要)
            </button>
            <button
              onClick={() => { setLoginRole('host'); setCurrentScreen('login'); }}
              className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all text-base"
            >
              ☕ 店舗ホスト用ログイン (店舗登録・管理)
            </button>
          </div>
        </main>

        <footer className="p-6 text-center text-xs text-gray-400 border-t border-gray-200 bg-white/60">
          &copy; 2026 NomadSpot Checker. All rights reserved.
        </footer>
      </div>
    );
  }

  // ==========================================
  // 2. ログイン画面
  // ==========================================
  if (currentScreen === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <button 
            onClick={() => setCurrentScreen('index')} 
            className="text-xs text-gray-400 hover:text-gray-600 font-bold mb-4 inline-block"
          >
            ← トップへ戻る
          </button>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {loginRole === 'host' ? '☕ ホスト管理者ログイン' : '👤 一般ユーザーログイン'}
          </h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            {loginRole === 'host' 
              ? '地図上のクリックでご自身の新規店舗を追加したり、店舗の公式混雑状況を直接更新することができます。' 
              : 'リアルタイムの混雑情報報告や、みんなの役に立つ口コミ投稿機能をご利用いただけます。'}
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">ユーザーID / アカウント名</label>
              <input
                type="text"
                required
                placeholder="例: nomad_taro"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">パスワード</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md"
            >
              ログインしてマップを開く
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. メインマップ画面 & 追加機能
  // ==========================================
  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      {/* ヘッダー */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-md shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 
            onClick={handleLogout}
            className="text-lg font-bold text-gray-800 flex items-center gap-1 cursor-pointer hover:opacity-85"
          >
            📍 <span className="text-blue-600">NomadSpot</span>
          </h1>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
            loginRole === 'host' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {loginRole === 'host' ? `👑 HOST: ${username}` : '👤 USER モード'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {loginRole === 'user' && (
            <button
              onClick={handleGeoLocation}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-sm"
            >
              🎯 現在地
            </button>
          )}
          <button
            onClick={handleLogout}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          >
            🚪 ログアウト
          </button>
          {loginRole === 'user' && (
            <div className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1.5 rounded-full font-semibold">
              🪙 120 pt
            </div>
          )}
        </div>
      </header>

      {/* 地図コンテナ */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 【ホスト用ヘルプ案内】 */}
      {loginRole === 'host' && !newSpotForm && (
        <div className="absolute top-20 left-4 right-4 md:left-4 md:right-auto z-10 bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg animate-pulse max-w-sm">
          💡 ご自身の新しい店舗をマップに追加したい場合は、地図上の追加したい場所を直接クリックしてください！
        </div>
      )}

      {/* 新規店舗登録フォーム (ホストのみ出現) */}
      {newSpotForm && loginRole === 'host' && (
        <div className="modal absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-20 bg-white rounded-2xl shadow-2xl p-6 border border-gray-150">
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
      )}

      {/* スポット詳細パネル */}
      {selectedSpot && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-2xl shadow-2xl p-6 transition-all transform duration-300 max-w-md mx-auto border border-gray-100 max-h-[60vh] overflow-y-auto">
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

          {/* 現在の混雑状況 */}
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

          {/* 混雑状況の報告/公式更新ボタン */}
          <p className="text-xs font-bold text-gray-700 mb-2">
            {loginRole === 'host' ? '📢 【公式権限】店舗のリアルタイム混雑度を更新' : '📢 今ココにいる？状況を教えてポイントGET！'}
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
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

          {/* 口コミセクション */}
          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-bold text-gray-900 mb-2">💬 みんなの口コミ</h4>
            
            {/* ログイン中の一般ユーザーのみ口コミ追加が可能 */}
            {loginRole === 'user' ? (
              <form onSubmit={handleAddComment} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="「静かで快適」「Wi-Fiサクサク」など..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all"
                >
                  投稿
                </button>
              </form>
            ) : loginRole === 'host' ? (
              <p className="text-[10px] text-indigo-600 font-semibold mb-3 bg-indigo-50 p-2 rounded-lg">
                ※一般ユーザーからの生の声が表示されています（ホストは閲覧のみ可能）
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 mb-3">
                ※ログインすると、このスポットの口コミを投稿できるようになります。
              </p>
            )}

            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {selectedSpot.comments && selectedSpot.comments.length > 0 ? (
                selectedSpot.comments.map((comment, index) => (
                  <div key={index} className="bg-gray-50 p-2.5 rounded-lg text-xs leading-relaxed text-gray-700 border border-gray-100">
                    {comment}
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gray-400 text-center py-2">口コミはまだありません。</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}