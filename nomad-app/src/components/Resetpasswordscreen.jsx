import React from 'react';

export default function ResetPasswordScreen({ newPassword, setNewPassword, handleUpdatePassword, authError, authLoading }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-2">🔑 新しいパスワードを設定</h2>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          メール内のリンクから戻ってきました。新しいパスワードを入力してください。
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">新しいパスワード</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="6文字以上"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
            {authLoading ? '処理中...' : 'パスワードを更新する'}
          </button>
        </form>
      </div>
    </div>
  );
}