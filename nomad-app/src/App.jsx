import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Vite環境でCSSの読み込みエラーを防ぐための型チェック無視コメント
// @ts-ignore
import 'maplibre-gl/dist/maplibre-gl.css';

import HomeScreen from './components/HomeScreen.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import ResetPasswordScreen from './components/ResetPasswordScreen.jsx';
import MapScreen from './components/MapScreen.jsx';
import { supabase } from './lib/supabaseClient.js';

// DBの行（snake_case）をアプリ内で使うcamelCase形式に変換
// latestReport: congestion_reports の中でそのスポットに対する最新の1件（なければnull）
// ホストが直接更新した時刻(spotRow.updated_at)と、一般ユーザーの最新報告時刻を比較し、
// より新しい方を「現在表示する混雑状況」として採用する
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
    // 直近の混雑報告が「一般ユーザーの報告」由来である場合だけ、その報告のIDと投稿者を持つ
    // （ホストの公式更新の場合はnull＝取り消しボタンを出さない）
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
  // --- 画面切り替え & ログイン用ステート ---
  const [currentScreen, setCurrentScreen] = useState('index'); // 'index' | 'login' | 'map'
  const [loginRole, setLoginRole] = useState(null); // 'user' | 'host'
  const [username, setUsername] = useState('');

  // --- Supabase認証用ステート ---
  const [currentUser, setCurrentUser] = useState(null); // supabaseのauth.usersの行
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- パスワードリセット用ステート ---
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // --- マップ・データ用ステート ---
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [newComment, setNewComment] = useState("");

  // 新規スポット仮ピン & フォーム（ホスト用）
  const [tempMarker, setTempMarker] = useState(null);
  const tempMarkerRef = useRef(null);
  useEffect(() => {
    tempMarkerRef.current = tempMarker;
  }, [tempMarker]);
  const [newSpotForm, setNewSpotForm] = useState(null);
  // ホストが自分のスポットを編集する際のフォーム（{ id, name, wifiSpeed, hasPower }）
  const [editSpotForm, setEditSpotForm] = useState(null);

  // --- お気に入り ---
  // ログイン中: favoritesテーブル / ゲスト: localStorage にフォールバック
  const [favoriteIds, setFavoriteIds] = useState([]);

  // --- 条件フィルター ---
  const [filters, setFilters] = useState({
    hasPowerOnly: false,
    minWifiSpeed: 0,
    congestionStatuses: ['空席あり', 'やや混雑', '満席'],
    favoritesOnly: false,
  });

  const MAP_STYLE_URL = 'https://osm.gdl.jp/styles/osm-bright-ja/style.json';

  // ==========================================
  // Supabase: プロフィール取得
  // ==========================================
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

  // ==========================================
  // Supabase: セッション復元（リロード時に自動ログイン）
  // ==========================================
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
      // メール内のパスワードリセットリンクを踏んで戻ってきた時に発火する
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentScreen('resetPassword');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // Supabase: spots / comments / congestion_reports の取得 + リアルタイム購読
  // ==========================================
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

    // reportsDataはcreated_at降順なので、spot_idごとに最初に出てきたものが最新の報告
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

  // ==========================================
  // お気に入りの読み込み（ログイン中はDB、ゲストはlocalStorage）
  // ==========================================
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

  // ゲスト時のみlocalStorageに同期
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
      } catch {
        // localStorageが使えない環境では何もしない
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

  // ==========================================
  // 条件フィルター（絞り込み結果）
  // ==========================================
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

  // ==========================================
  // トップページからのナビゲーション
  // ==========================================
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

  // ゲスト状態からマップ画面のヘッダー経由でログイン画面へ
  const handleLoginPromptFromMap = () => {
    resetAuthForm();
    setLoginRole('user');
    setCurrentScreen('login');
  };

  // ==========================================
  // Supabase認証: ログイン・新規登録・ログアウト
  // ==========================================
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

  // パスワード再設定メールの送信
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

  // メール内のリンクから戻ってきた後、新しいパスワードを設定する
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

  // ログアウト処理
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

  // 地図の初期化 (マップ画面が表示された時のみ実行)
  // ※ 以前は tempMarker を依存配列に含めていたため、ホストが仮ピンを置く/消すたびに
  //   地図インスタンスごと（＝既存の全スポットマーカーも道連れで）作り直されていた。
  //   tempMarkerRef経由で最新値を参照することで、地図自体は画面遷移時にのみ初期化する。
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

  // スポットのピンを地図上に配置（絞り込み結果を反映）
  // ※ 以前は毎回すべてのマーカーを消してから作り直していたため、
  //   リアルタイム更新（他のユーザーの操作）が届いたタイミングでクリックすると
  //   作り直し中のマーカーにクリックが当たらず、別のスポットが選択されたり
  //   意図しない場所へ地図がパンしてしまう不具合があった。
  //   そのため、IDをキーにして「存在するものは中身だけ更新・存在しないものだけ追加/削除」
  //   という差分更新方式に変更する。
  useEffect(() => {
    if (currentScreen !== 'map') return;
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(filteredSpots.map((s) => s.id));

    // 表示対象から外れたスポットのマーカーだけを削除
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
        // 既存マーカーは見た目とクリックハンドラ参照用データだけ更新（DOM要素は作り直さない）
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

      // クリックハンドラは常に最新のspotを参照できるようrefで持つ
      const spotRef = { current: spot };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);

      // ピンの上でマウス/指を押した時点で、地図側のドラッグパン判定に
      // イベントが渡らないようにする（クリックのつもりが数px動いてしまい
      // 「ドラッグ」と認識されて地図が動いてしまう問題への対処）
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
        // ヘッダーと画面下部の詳細パネル（最大で画面の60%）に隠れないよう、
        // 見える範囲の中にピンが来るようpaddingを指定してパンする
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

  // 混雑状況のアップデート
  // ホスト: 自分の店舗のspots.congestionを直接更新（公式情報）
  // 一般ユーザー: congestion_reportsに新しい報告として追加（自分の報告として後で削除可能）
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
    // ※ 他のユーザーの画面へはリアルタイム購読を通じて自動反映されます
  };

  // 自分の混雑報告を取り消す
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
    // ※ 最新の状態はリアルタイム購読経由で再取得されます
  };

  // 口コミの追加（ログイン中の一般ユーザー限定）
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
    // ※ 一覧への反映はリアルタイム購読経由で行われます
  };

  // 自分の口コミを削除する
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
    // ※ 最新の状態はリアルタイム購読経由で再取得されます
  };

  // 新規スポットの追加（ホスト限定）
  const handleCreateSpot = async (e) => {
    e.preventDefault();
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
      alert(`登録に失敗しました: ${error.message}`);
      return;
    }

    setSelectedSpot(transformSpot(data, []));
    alert(`新店舗「${data.name}」をマップに登録しました！`);
  };

  // 編集フォームを開く（ホストが自分のスポットの詳細パネルから呼び出す）
  const openEditSpot = (spot) => {
    setEditSpotForm({
      id: spot.id,
      name: spot.name,
      wifiSpeed: spot.wifiSpeed,
      hasPower: spot.hasPower,
    });
  };

  // スポット情報の更新（ホストが自分の店舗のみ）
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

  // スポットの削除（ホストが自分の店舗のみ）
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
  // 2. ログイン / 新規登録画面
  // ==========================================
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

  // ==========================================
  // 2.5 パスワード再設定画面（メール内リンクから遷移してくる）
  // ==========================================
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

  // ==========================================
  // 3. メインマップ画面 & 追加機能
  // ==========================================
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
    />
  );
}