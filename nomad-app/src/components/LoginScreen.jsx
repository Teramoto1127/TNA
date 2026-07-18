import React from 'react';

export default function LoginScreen({
  loginRole,
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  signupUsername,
  setSignupUsername,
  handleLogin,
  handleSignup,
  authError,
  authLoading,
  onBack,
}) {
  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-600 font-bold mb-4 inline-block"
        >
          ← トップへ戻る
        </button>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          {loginRole === 'host' ? '☕ ホスト管理者' : '👤 一般ユーザー'}
        </h2>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          {loginRole === 'host'
            ? '地図上のクリックでご自身の新規店舗を追加したり、店舗の公式混雑状況を直接更新することができます。'
            : 'リアルタイムの混雑情報報告や、みんなの役に立つ口コミ投稿機能をご利用いただけます。'}
        </p>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              !isSignup ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              isSignup ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">表示名</label>
              <input
                type="text"
                required
                placeholder="例: nomad_taro"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">メールアドレス</label>
            <input
              type="email"
              required
              placeholder="例: taro@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">パスワード</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="6文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {authError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md"
          >
            {authLoading ? '処理中...' : isSignup ? 'アカウントを作成する' : 'ログインしてマップを開く'}
          </button>
        </form>
      </div>
    </div>
  );
}