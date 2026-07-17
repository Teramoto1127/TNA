import React from 'react';

export default function LoginScreen({ loginRole, username, password, setUsername, setPassword, handleLogin, onBack }) {
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