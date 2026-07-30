import React, { useState } from 'react';

function formatDateTime(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function SpotDetailPanel({
  selectedSpot,
  loginRole,
  currentUserId,
  newComment,
  setNewComment,
  handleReport,
  handleDeleteReport,
  handleAddComment,
  handleDeleteComment,
  setSelectedSpot,
  isFavorite,
  onToggleFavorite,
  canInteract,
  onEditSpot,
  onDeleteSpot,
  onMeasureWifi,
}) {
  const [measuring, setMeasuring] = useState(false);
  const [measureError, setMeasureError] = useState('');

  const handleMeasureClick = async () => {
    setMeasuring(true);
    setMeasureError('');
    try {
      await onMeasureWifi(selectedSpot.id);
    } catch (err) {
      setMeasureError(err.message || '測定に失敗しました');
    } finally {
      setMeasuring(false);
    }
  };

  const isOwnSpot = loginRole === 'host' && currentUserId && selectedSpot.hostId === currentUserId;
  const isOwnReport = currentUserId && selectedSpot.latestReportUserId === currentUserId;

  // ホストの場合は「自分の店舗」の時だけ混雑状況を更新できる。
  // 一般ユーザーは今まで通り、ログインしていれば誰でも報告できる。
  const canReportCongestion = loginRole === 'host' ? isOwnSpot : canInteract;

  const congestionColor =
    selectedSpot.congestion === '空席あり' ? '#10B981' :
    selectedSpot.congestion === 'やや混雑' ? '#F59E0B' : '#EF4444';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        backgroundColor: 'white',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
        padding: '24px',
        maxWidth: '480px',
        margin: '0 auto',
        border: '1px solid #f3f4f6',
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          {selectedSpot.name}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isOwnSpot && (
            <>
              <button
                onClick={() => onEditSpot(selectedSpot)}
                title="この店舗を編集"
                style={{ color: '#9CA3AF', fontSize: '14px', fontWeight: 'bold', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✏️
              </button>
              <button
                onClick={() => onDeleteSpot(selectedSpot.id)}
                title="この店舗を削除"
                style={{ color: '#9CA3AF', fontSize: '14px', fontWeight: 'bold', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                🗑️
              </button>
            </>
          )}
          <button
            onClick={() => onToggleFavorite(selectedSpot.id)}
            title={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isFavorite ? '#FBBF24' : '#D1D5DB',
            }}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button
            onClick={() => setSelectedSpot(null)}
            style={{ color: '#9CA3AF', fontSize: '18px', fontWeight: 'bold', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>
          📶 公式: {selectedSpot.wifiSpeed}
        </span>
        <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>
          ⚡ {selectedSpot.hasPower ? '電源あり' : '電源なし'}
        </span>
        {selectedSpot.crowdWifiCount > 0 && (
          <span style={{ backgroundColor: '#ECFDF5', color: '#047857', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>
            📊 実測: {selectedSpot.crowdWifiSpeed}Mbps（{selectedSpot.crowdWifiCount}件）
          </span>
        )}
      </div>

      {canInteract && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={handleMeasureClick}
            disabled={measuring}
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: measuring ? '#9CA3AF' : '#2563EB',
              background: 'none',
              border: '1px solid ' + (measuring ? '#E5E7EB' : '#BFDBFE'),
              borderRadius: '999px',
              padding: '5px 12px',
              cursor: measuring ? 'default' : 'pointer',
            }}
          >
            {measuring ? '📶 測定中...（数秒お待ちください）' : '📶 このWi-Fiを測定して報告'}
          </button>
          {measureError && (
            <p style={{ fontSize: '10px', color: '#EF4444', marginTop: '4px' }}>{measureError}</p>
          )}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '12px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>現在の混雑状況</p>
          <span
            style={{
              display: 'inline-block',
              marginTop: '4px',
              fontSize: '14px',
              fontWeight: '800',
              padding: '4px 12px',
              borderRadius: '999px',
              color: 'white',
              backgroundColor: congestionColor,
            }}
          >
            {selectedSpot.congestion}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'right' }}>
          最終更新: {formatDateTime(selectedSpot.updatedAt)}
          {isOwnReport && (
            <button
              onClick={() => handleDeleteReport(selectedSpot.latestReportId)}
              style={{ display: 'block', marginLeft: 'auto', marginTop: '4px', color: '#F43F5E', fontWeight: 'bold', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
            >
              自分の報告を取り消す
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
        {loginRole === 'host'
          ? (isOwnSpot ? '📢 【公式権限】店舗のリアルタイム混雑度を更新' : '📢 今ココにいる？状況を教えてポイントGET！')
          : '📢 今ココにいる？状況を教えてポイントGET！'}
      </p>

      {canReportCongestion ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {['空席あり', 'やや混雑', '満席'].map((status) => {
            const colors =
              status === '空席あり'
                ? { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' }
                : status === 'やや混雑'
                ? { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }
                : { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' };
            return (
              <button
                key={status}
                onClick={() => handleReport(selectedSpot.id, status)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                }}
              >
                {status === '空席あり' ? '🟢 余裕' : status === 'やや混雑' ? '🟡 やや混' : '🔴 満席'}
              </button>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '16px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '8px' }}>
          {loginRole === 'host'
            ? '※この店舗はご自身が登録した店舗ではないため、混雑状況を更新できません。'
            : '※ログインすると混雑状況を報告できます。'}
        </p>
      )}

      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>💬 みんなの口コミ</h4>

        {loginRole === 'user' && canInteract ? (
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="「静かで快適」「Wi-Fiサクサク」など..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ flex: 1, padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              style={{ backgroundColor: '#2563EB', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', border: 'none', cursor: 'pointer' }}
            >
              投稿
            </button>
          </form>
        ) : loginRole === 'host' ? (
          <p style={{ fontSize: '10px', color: '#4F46E5', fontWeight: '600', marginBottom: '12px', backgroundColor: '#EEF2FF', padding: '8px', borderRadius: '8px' }}>
            ※一般ユーザーからの生の声が表示されています（ホストは閲覧のみ可能）
          </p>
        ) : (
          <p style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '12px' }}>
            ※ログインすると、このスポットの口コミを投稿できるようになります。
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '128px', overflowY: 'auto', paddingRight: '4px' }}>
          {selectedSpot.comments && selectedSpot.comments.length > 0 ? (
            selectedSpot.comments.map((comment) => (
              <div key={comment.id} style={{ backgroundColor: '#F9FAFB', padding: '10px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.6', color: '#374151', border: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: '#6B7280', fontSize: '10px' }}>
                    {comment.username} ・ {formatDateTime(comment.createdAt)}
                  </span>
                  {currentUserId && comment.userId === currentUserId && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      削除
                    </button>
                  )}
                </div>
                {comment.content}
              </div>
            ))
          ) : (
            <p style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
              口コミはまだありません。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}