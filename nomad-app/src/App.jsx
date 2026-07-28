import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';

import HomeScreen from './components/HomeScreen.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import ResetPasswordScreen from './components/ResetPasswordScreen.jsx';
import MapScreen from './components/MapScreen.jsx';
import { supabase } from './lib/supabaseClient.js';

function transformSpot(spotRow, commentsForSpot = [], latestReport = null) {
  const baselineTime = spotRow.updated_at ? new Date(spotRow.updated_at).getTime() : 0;
  const reportTime = latestReport ? new Date(latestReport.created_at).getTime() : -1;
  const useReport = reportTime > baselineTime;

  return {
    id: spotRow.id,
    name: spotRow.name,
    lat: spotRow.lat,
    lng: spotRow.lng,
    wifiSpeed: spotRow.wifi_speed,
    hasPower: spotRow.has_power,
    congestion: useReport ? latestReport.status : spotRow.congestion,
    updatedAt: useReport ? latestReport.created_at : spotRow.updated_at,
    hostId: spotRow.host_id,
    latestReportId: useReport ? latestReport.id : null,
    latestReportUserId: useReport ? latestReport.user_id : null,
    comments: commentsForSpot.map((c) => ({
      id: c.id,
      content: c.content,
      username: c.profiles?.username || '匿名ユーザー',
      createdAt: c.created_at,
      userId: c.user_id,
    })),
  };
}

const FAVORITES_STORAGE_KEY = 'nomadspot_favorite_ids';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('index');
  const [loginRole, setLoginRole] = useState(null);
  const [username, setUsername] = useState('');

  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [newComment, setNewComment] = useState("");

  const [tempMarker, setTempMarker] = useState(null);
  const tempMarkerRef = useRef(null);
  useEffect(() => {
    tempMarkerRef.current = tempMarker;
  }, [tempMarker]);
  const [newSpotForm, setNewSpotForm] = useState(null);
  const [editSpotForm, setEditSpotForm] = useState(null);

  const [favoriteIds, setFavoriteIds] = useState([]);

  const [filters, setFilters] = useState({
    hasPowerOnly: false,
    minWifiSpeed: 0,
    congestionStatuses: ['空席あり', 'やや混雑', '満席'],
    favoritesOnly: false,
  });

  const MAP_STYLE_URL = 'https://osm.gdl.jp/styles/osm-bright-ja/style.json';

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('プロフィール取得エラー:', error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setCurrentUser(session.user);
          setUsername(profile.username);
          setLoginRole(profile.role);
          setCurrentScreen('map');
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentScreen('resetPassword');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchAllData = async () => {
    const [
      { data: spotsData, error: spotsError },
      { data: commentsData, error: commentsError },
      { data: reportsData, error: reportsError },
    ] = await Promise.all([
      supabase.from('spots').select('*').order('created_at', { ascending: false }),
      supabase.from('comments').select('*, profiles(username)').order('created_at', { ascending: false }),
      supabase.from('congestion_reports').select('*').order('created_at', { ascending: false }),
    ]);

    if (spotsError) {
      console.error('スポット取得エラー:', spotsError);
      return;
    }
    if (commentsError) {
      console.error('口コミ取得エラー:', commentsError);
    }
    if (reportsError) {
      console.error('混雑報告取得エラー:', reportsError);
    }

    const commentsBySpot = {};
    (commentsData || []).forEach((c) => {
      if (!commentsBySpot[c.spot_id]) commentsBySpot[c.spot_id] = [];
      commentsBySpot[c.spot_id].push(c);
    });

    const latestReportBySpot = {};
    (reportsData || []).forEach((r) => {
      if (!latestReportBySpot[r.spot_id]) latestReportBySpot[r.spot_id] = r;
    });

    setSpots(
      (spotsData || []).map((row) =>
        transformSpot(row, commentsBySpot[row.id] || [], latestReportBySpot[row.id] || null)
      )
    );
  };

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('public:spots-and-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spots' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'congestion_reports' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      if (currentUser) {
        const { data, error } = await supabase
          .from('favorites')
          .select('spot_id')
          .eq('user_id', currentUser.id);
        if (!error) setFavoriteIds((data || []).map((f) => f.spot_id));
      } else {
        try {
          const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
          setFavoriteIds(saved ? JSON.parse(saved) : []);
        } catch {
          setFavoriteIds([]);
        }
      }
    };
    loadFavorites();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
      } catch {
        // no-op
      }
    }
  }, [favoriteIds, currentUser]);

  const toggleFavorite = async (spotId) => {
    const already = favoriteIds.includes(spotId);

    if (currentUser) {
      if (already) {
        await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('spot_id', spotId);
      } else {
        await supabase.from('favorites').insert({ user_id: currentUser.id, spot_id: spotId });
      }
    }

    setFavoriteIds((prev) =>
      already ? prev.filter((id) => id !== spotId) : [...prev, spotId]
    );
  };

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

  const handleGuestEntry = () => {
    setLoginRole('user');
    setCurrentScreen('map');
  };

  const resetAuthForm = () => {
    setEmail('');
    setPassword('');
    setSignupUsername('');
    setAuthError('');
    setMode('login');
  };

  const handleHostLoginEntry = () => {
    resetAuthForm();
    setLoginRole('host');
    setCurrentScreen('login');
  };

  const handleUserLoginEntry = () => {
    resetAuthForm();
    setLoginRole('user');
    setCurrentScreen('login');
  };

  const handleLoginPromptFromMap = () => {
    resetAuthForm();
    setLoginRole('user');
    setCurrentScreen('login');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('ログインに失敗しました。メールアドレスとパスワードをご確認ください。');
      setAuthLoading(false);
      return;
    }

    const profile = await fetchProfile(data.user.id);
    if (!profile) {
      setAuthError('プロフィール情報の取得に失敗しました。');
      setAuthLoading(false);
      return;
    }

    setCurrentUser(data.user);
    setUsername(profile.username);
    setLoginRole(profile.role);
    setAuthLoading(false);
    setCurrentScreen('map');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!signupUsername.trim()) {
      setAuthError('表示名を入力してください');
      return;
    }

    setAuthLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }

    if (!data.user) {
      setAuthError('登録は完了しましたが、確認メールが送信された可能性があります。メール内のリンクから認証を完了してから再度ログインしてください。');
      setAuthLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: signupUsername,
      role: loginRole,
    });

    if (profileError) {
      setAuthError(`プロフィールの作成に失敗しました: ${profileError.message}`);
      setAuthLoading(false);
      return;
    }

    setCurrentUser(data.user);
    setUsername(signupUsername);
    setAuthLoading(false);
    setCurrentScreen('map');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!resetEmail.trim()) {
      setAuthError('メールアドレスを入力してください');
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setResetEmailSent(true);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (newPassword.length < 6) {
      setAuthError('パスワードは6文字以上にしてください');
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setNewPassword('');
    alert('パスワードを更新しました。');
    setCurrentScreen(currentUser ? 'map' : 'index');
  };

  const handleLogout = async () => {
    if (currentUser) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setLoginRole(null);
    setUsername('');
    resetAuthForm();
    setSelectedSpot(null);
    setNewSpotForm(null);
    if (tempMarker) tempMarker.remove();
    setTempMarker(null);
    setCurrentScreen('index');
  };

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

    map.on('click', (e) => {
      if (loginRole !== 'host') return;
      if (e.originalEvent.target.closest('button') || e.originalEvent.target.closest('.modal')) {
        return;
      }

      const { lng, lat } = e.lngLat;

      if (tempMarkerRef.current) tempMarkerRef.current.remove();

      const el = document.createElement('div');
      el.className = 'w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-lg animate-pulse cursor-pointer';
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
  }, [currentScreen, loginRole]);

  useEffect(() => {
    if (currentScreen !== 'map') return;
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(filteredSpots.map((s) => s.id));

    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markersRef.current[id].marker.remove();
        delete markersRef.current[id];
      }
    });

    filteredSpots.forEach((spot) => {
      const color =
        spot.congestion === '空席あり' ? '#10B981' :
        spot.congestion === 'やや混雑' ? '#F59E0B' :
        '#EF4444';

      const existing = markersRef.current[spot.id];

      if (existing) {
        existing.el.style.backgroundColor = color;
        existing.el.innerText = spot.hasPower ? '⚡' : '☕';
        existing.marker.setLngLat([spot.lng, spot.lat]);
        existing.spotRef.current = spot;
        return;
      }

      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold transition-shadow hover:brightness-110 hover:shadow-xl';
      el.style.backgroundColor = color;
      el.innerText = spot.hasPower ? '⚡' : '☕';

      const spotRef = { current: spot };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);

      el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      el.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const latestSpot = spotRef.current;
        setSelectedSpot(latestSpot);
        setNewSpotForm(null);
        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove();
          setTempMarker(null);
        }
        const viewportHeight = mapContainerRef.current?.clientHeight || window.innerHeight;
        map.easeTo({
          center: [latestSpot.lng, latestSpot.lat],
          zoom: 15,
          padding: { top: 90, bottom: viewportHeight * 0.6, left: 0, right: 0 },
        });
      });

      markersRef.current[spot.id] = { marker, el, spotRef };
    });
  }, [filteredSpots, currentScreen]);

  useEffect(() => {
    if (!newSpotForm || !tempMarkerRef.current) return;
    if (Number.isNaN(newSpotForm.lat) || Number.isNaN(newSpotForm.lng)) return;
    tempMarkerRef.current.setLngLat([newSpotForm.lng, newSpotForm.lat]);
  }, [newSpotForm?.lat, newSpotForm?.lng]);

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

  const handleReport = async (spotId, status) => {
    if (!currentUser) return;

    if (loginRole === 'host') {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('spots')
        .update({ congestion: status, updated_at: nowIso })
        .eq('id', spotId)
        .eq('host_id', currentUser.id);

      if (error) {
        alert(`更新に失敗しました: ${error.message}`);
        return;
      }

      setSelectedSpot((prev) =>
        prev && prev.id === spotId
          ? { ...prev, congestion: status, updatedAt: nowIso, latestReportId: null, latestReportUserId: null }
          : prev
      );
      alert(`管理店舗の混雑状況を「${status}」に公式更新しました！`);
    } else {
      const { data, error } = await supabase
        .from('congestion_reports')
        .insert({ spot_id: spotId, user_id: currentUser.id, status })
        .select()
        .single();

      if (error) {
        alert(`報告に失敗しました: ${error.message}`);
        return;
      }

      setSelectedSpot((prev) =>
        prev && prev.id === spotId
          ? {
              ...prev,
              congestion: status,
              updatedAt: data.created_at,
              latestReportId: data.id,
              latestReportUserId: currentUser.id,
            }
          : prev
      );
      alert(`「${status}」の混雑情報を報告しました！`);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!currentUser || !reportId) return;
    const { error } = await supabase
      .from('congestion_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', currentUser.id);

    if (error) {
      alert(`取り消しに失敗しました: ${error.message}`);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedSpot || !currentUser) return;

    const { error } = await supabase.from('comments').insert({
      spot_id: selectedSpot.id,
      user_id: currentUser.id,
      content: newComment,
    });

    if (error) {
      alert(`投稿に失敗しました: ${error.message}`);
      return;
    }

    setNewComment("");
  };

  const handleDeleteComment = async (commentId) => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUser.id);

    if (error) {
      alert(`削除に失敗しました: ${error.message}`);
    }
  };

  const handleCreateSpot = async (e) => {
    e.preventDefault();
    console.log('handleCreateSpot が呼ばれました。newSpotForm:', newSpotForm, 'currentUser:', currentUser);

    if (!newSpotForm.name.trim()) {
      alert("店舗名を入力してください");
      return;
    }
    if (!currentUser) {
      alert("ログインが必要です");
      return;
    }

    const { data, error } = await supabase
      .from('spots')
      .insert({
        name: newSpotForm.name,
        lat: newSpotForm.lat,
        lng: newSpotForm.lng,
        wifi_speed: newSpotForm.wifiSpeed,
        has_power: newSpotForm.hasPower,
        congestion: newSpotForm.congestion,
        host_id: currentUser.id,
      })
      .select()
      .single();

    setNewSpotForm(null);
    if (tempMarker) {
      tempMarker.remove();
      setTempMarker(null);
    }

    if (error) {
      console.error('スポット登録エラー:', error);
      alert(`登録に失敗しました: ${error.message}`);
      return;
    }

    setSelectedSpot(transformSpot(data, []));
    alert(`新店舗「${data.name}」をマップに登録しました！`);
  };

  const openEditSpot = (spot) => {
    setEditSpotForm({
      id: spot.id,
      name: spot.name,
      wifiSpeed: spot.wifiSpeed,
      hasPower: spot.hasPower,
    });
  };

  const openManualAddSpot = () => {
    console.log('openManualAddSpot が呼ばれました。現在のloginRole:', loginRole);

    if (loginRole !== 'host') {
      console.log('ホストではないため処理を中断しました');
      return;
    }

    const defaultLat = 35.681236;
    const defaultLng = 139.767125;

    if (tempMarkerRef.current) tempMarkerRef.current.remove();

    const el = document.createElement('div');
    el.className = 'w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-lg animate-pulse cursor-pointer';
    el.innerText = '＋';

    const marker = mapRef.current
      ? new maplibregl.Marker({ element: el }).setLngLat([defaultLng, defaultLat]).addTo(mapRef.current)
      : null;

    setTempMarker(marker);
    setSelectedSpot(null);
    setEditSpotForm(null);
    setNewSpotForm({
      lat: defaultLat,
      lng: defaultLng,
      name: "",
      hasPower: true,
      congestion: "空席あり",
      wifiSpeed: "100Mbps",
    });

    console.log('newSpotFormをセットしました。これでフォームが開くはずです');

    if (mapRef.current) {
      mapRef.current.easeTo({ center: [defaultLng, defaultLat], zoom: 15 });
    }
  };

  const handleUpdateSpot = async (e) => {
    e.preventDefault();
    if (!editSpotForm.name.trim()) {
      alert("店舗名を入力してください");
      return;
    }
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('spots')
      .update({
        name: editSpotForm.name,
        wifi_speed: editSpotForm.wifiSpeed,
        has_power: editSpotForm.hasPower,
      })
      .eq('id', editSpotForm.id)
      .eq('host_id', currentUser.id)
      .select()
      .single();

    if (error) {
      alert(`更新に失敗しました: ${error.message}`);
      return;
    }

    setEditSpotForm(null);
    setSelectedSpot((prev) =>
      prev && prev.id === data.id
        ? { ...prev, name: data.name, wifiSpeed: data.wifi_speed, hasPower: data.has_power }
        : prev
    );
    alert("店舗情報を更新しました！");
  };

  const handleDeleteSpot = async (spotId) => {
    if (!currentUser) return;
    if (!window.confirm('この店舗を削除します。この操作は取り消せません。よろしいですか？')) return;

    const { error } = await supabase
      .from('spots')
      .delete()
      .eq('id', spotId)
      .eq('host_id', currentUser.id);

    if (error) {
      alert(`削除に失敗しました: ${error.message}`);
      return;
    }

    setSelectedSpot(null);
  };

  if (currentScreen === 'index') {
    return (
      <HomeScreen
        onGuestEntry={handleGuestEntry}
        onHostLogin={handleHostLoginEntry}
        onUserLogin={handleUserLoginEntry}
      />
    );
  }

  if (currentScreen === 'login') {
    return (
      <LoginScreen
        loginRole={loginRole}
        mode={mode}
        setMode={setMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        signupUsername={signupUsername}
        setSignupUsername={setSignupUsername}
        handleLogin={handleLogin}
        handleSignup={handleSignup}
        authError={authError}
        authLoading={authLoading}
        onBack={() => setCurrentScreen('index')}
        resetEmail={resetEmail}
        setResetEmail={setResetEmail}
        resetEmailSent={resetEmailSent}
        handleForgotPassword={handleForgotPassword}
      />
    );
  }

  if (currentScreen === 'resetPassword') {
    return (
      <ResetPasswordScreen
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        handleUpdatePassword={handleUpdatePassword}
        authError={authError}
        authLoading={authLoading}
      />
    );
  }

  return (
    <MapScreen
      loginRole={loginRole}
      username={username}
      isLoggedIn={Boolean(currentUser)}
      currentUserId={currentUser?.id || null}
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
      handleDeleteReport={handleDeleteReport}
      handleAddComment={handleAddComment}
      handleDeleteComment={handleDeleteComment}
      newComment={newComment}
      setNewComment={setNewComment}
      filters={filters}
      setFilters={setFilters}
      visibleSpotCount={filteredSpots.length}
      favoriteIds={favoriteIds}
      toggleFavorite={toggleFavorite}
      onLoginPrompt={handleLoginPromptFromMap}
      editSpotForm={editSpotForm}
      setEditSpotForm={setEditSpotForm}
      openEditSpot={openEditSpot}
      handleUpdateSpot={handleUpdateSpot}
      handleDeleteSpot={handleDeleteSpot}
      onManualAddSpot={openManualAddSpot}
    />
  );
}