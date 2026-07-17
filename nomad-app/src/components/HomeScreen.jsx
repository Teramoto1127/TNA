import React from 'react';

export default function HomeScreen({ onGuestEntry, onHostLogin, onUserLogin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col justify-between font-sans">
      <header className="p-6 max-w-7xl mx-auto w-full flex justify-between items-center">
        <div className="text-xl font-black text-gray-900 flex items-center gap-1">
          📍 <span className="text-blue-600">NomadSpot</span>
        </div>
        <button
          onClick={onUserLogin}
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
            onClick={onGuestEntry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-200 transition-all text-base"
          >
            🔍 一般ユーザーとして探す (ログイン不要)
          </button>
          <button
            onClick={onHostLogin}
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