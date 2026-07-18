import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Vite環境でCSSの読み込みエラーを防ぐための型チェック無視コメント
// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';

import HomeScreen from './components/HomeScreen.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import MapScreen from './components/MapScreen.jsx';
import { INITIAL_SPOTS } from './data/initialSpots.js';

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

  // --- お気に入り（ブラウザのlocalStorageで永続化） ---
  const FAVORITES_STORAGE_KEY = 'nomadspot_favorite_ids';
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // localStorageが使えない環境では何もしない
    }
  }, [favoriteIds]);

  const toggleFavorite = (spotId) => {
    setFavoriteIds((prev) =>
      prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId]
    );
  };

  // --- 条件フィルター ---
  const [filters, setFilters] = useState({
    hasPowerOnly: false,
    minWifiSpeed: 0,
    congestionStatuses: ['空席あり', 'やや混雑', '満席'],
    favoritesOnly: false,
  });

  const parseWifiSpeed = (wifiSpeed) => {
    const match = String(wifiSpeed).match(/\d+/);
    return match ? Number(match[0]) : 0;
  };

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      if (filters.hasPowerOnly && !spot.hasPower) return false;
      if (parseWifiSpeed(spot.wifiSpeed) < filters.minWifiSpeed) return false;
      if (!filters.congestionStatuses.includes(spot.congestion)) return false;
      if (filters.favoritesOnly && !favoriteIds.includes(spot.id)) return false;
      return true;
    });
  }, [spots, filters, favoriteIds]);

  const MAP_STYLE_URL = 'https://osm.gdl.jp/styles/osm-bright-ja/style.json';

  // トップページからのナビゲーション
  const handleGuestEntry = () => {
    setLoginRole('user');
    setCurrentScreen('map');
  };

  const handleHostLoginEntry = () => {
    setLoginRole('host');
    setCurrentScreen('login');
  };

  const handleUserLoginEntry = () => {
    setLoginRole('user');
    setCurrentScreen('login');
  };

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

    filteredSpots.forEach((spot) => {
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
  }, [filteredSpots, currentScreen, tempMarker]);

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
      <HomeScreen
        onGuestEntry={handleGuestEntry}
        onHostLogin={handleHostLoginEntry}
        onUserLogin={handleUserLoginEntry}
      />
    );
  }

  // ==========================================
  // 2. ログイン画面
  // ==========================================
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        loginRole={loginRole}
        username={username}
        password={password}
        setUsername={setUsername}
        setPassword={setPassword}
        handleLogin={handleLogin}
        onBack={() => setCurrentScreen('index')}
      />
    );
  }

  // ==========================================
  // 3. メインマップ画面 & 追加機能
  // ==========================================
  return (
    <MapScreen
      loginRole={loginRole}
      username={username}
      handleLogout={handleLogout}
      handleGeoLocation={handleGeoLocation}
      mapContainerRef={mapContainerRef}
      selectedSpot={selectedSpot}
      setSelectedSpot={setSelectedSpot}
      newSpotForm={newSpotForm}
      setNewSpotForm={setNewSpotForm}
      tempMarker={tempMarker}
      handleCreateSpot={handleCreateSpot}
      handleReport={handleReport}
      handleAddComment={handleAddComment}
      newComment={newComment}
      setNewComment={setNewComment}
      filters={filters}
      setFilters={setFilters}
      visibleSpotCount={filteredSpots.length}
      favoriteIds={favoriteIds}
      toggleFavorite={toggleFavorite}
    />
  );
}