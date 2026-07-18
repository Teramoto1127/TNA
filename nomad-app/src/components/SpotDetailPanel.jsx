import React from 'react';

export default function SpotDetailPanel({ selectedSpot, loginRole, newComment, setNewComment, handleReport, handleAddComment, setSelectedSpot, isFavorite, onToggleFavorite, canInteract }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-2xl shadow-2xl p-6 transition-all transform duration-300 max-w-md mx-auto border border-gray-100 max-h-[60vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-bold text-gray-900">{selectedSpot.name}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(selectedSpot.id)}
            title={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
            className={`text-lg font-bold p-1 transition-all ${
              isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400'
            }`}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button
            onClick={() => setSelectedSpot(null)}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>
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

      <p className="text-xs font-bold text-gray-700 mb-2">
        {loginRole === 'host' ? '📢 【公式権限】店舗のリアルタイム混雑度を更新' : '📢 今ココにいる？状況を教えてポイントGET！'}
      </p>
      {canInteract ? (
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
      ) : (
        <p className="text-[10px] text-gray-400 mb-4 bg-gray-50 p-2 rounded-lg">
          ※ログインすると混雑状況を報告できます。
        </p>
      )}

      <div className="border-t border-gray-100 pt-3">
        <h4 className="text-xs font-bold text-gray-900 mb-2">💬 みんなの口コミ</h4>

        {loginRole === 'user' && canInteract ? (
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
  );
}