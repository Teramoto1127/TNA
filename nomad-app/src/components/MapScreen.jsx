import React, { useState } from 'react';
import NewSpotModal from './NewSpotModal.jsx';
import EditSpotModal from './EditSpotModal.jsx';
import SpotDetailPanel from './SpotDetailPanel.jsx';
import FilterPanel from './FilterPanel.jsx';

export default function MapScreen({
  loginRole,
  username,
  isLoggedIn,
  currentUserId,
  handleLogout,
  handleGeoLocation,
  mapContainerRef,
  selectedSpot,
  setSelectedSpot,
  newSpotForm,
  setNewSpotForm,
  tempMarker,
  handleCreateSpot,
  handleReport,
  handleDeleteReport,
  handleAddComment,
  handleDeleteComment,
  newComment,
  setNewComment,
  filters,
  setFilters,
  visibleSpotCount,
  favoriteIds,
  toggleFavorite,
  onLoginPrompt,
  editSpotForm,
  setEditSpotForm,
  openEditSpot,
  handleUpdateSpot,
  handleDeleteSpot,
}) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const activeFilterCount =
    (filters.hasPowerOnly ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.minWifiSpeed > 0 ? 1 : 0) +
    (filters.congestionStatuses.length < 3 ? 1 : 0);

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
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
            {loginRole === 'host'
              ? `👑 HOST: ${username}`
              : isLoggedIn
                ? `👤 ${username}`
                : '👤 ゲストモード（閲覧のみ）'}
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
            onClick={() => setShowFilterPanel((prev) => !prev)}
            className="relative bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-sm"
          >
            🔍 絞り込み
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {loginRole === 'user' && !isLoggedIn && (
            <button
              onClick={onLoginPrompt}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-sm"
            >
              🔑 ログイン
            </button>
          )}
          <button
            onClick={handleLogout}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          >
            🚪 {isLoggedIn ? 'ログアウト' : 'トップへ戻る'}
          </button>
          {loginRole === 'user' && isLoggedIn && (
            <div className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1.5 rounded-full font-semibold">
              🪙 120 pt
            </div>
          )}
        </div>
      </header>

      <div ref={mapContainerRef} className="w-full h-full" />

      {showFilterPanel && (
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          onClose={() => setShowFilterPanel(false)}
          resultCount={visibleSpotCount}
        />
      )}

      {loginRole === 'host' && !newSpotForm && (
        <div className="absolute top-20 left-4 right-4 md:left-4 md:right-auto z-10 bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg animate-pulse max-w-sm">
          💡 ご自身の新しい店舗をマップに追加したい場合は、地図上の追加したい場所を直接クリックしてください！
        </div>
      )}

      {newSpotForm && loginRole === 'host' && (
        <NewSpotModal
          newSpotForm={newSpotForm}
          setNewSpotForm={setNewSpotForm}
          handleCreateSpot={handleCreateSpot}
          tempMarker={tempMarker}
        />
      )}

      {editSpotForm && loginRole === 'host' && (
        <EditSpotModal
          editSpotForm={editSpotForm}
          setEditSpotForm={setEditSpotForm}
          handleUpdateSpot={handleUpdateSpot}
        />
      )}

      {selectedSpot && (
        <SpotDetailPanel
          selectedSpot={selectedSpot}
          loginRole={loginRole}
          currentUserId={currentUserId}
          newComment={newComment}
          setNewComment={setNewComment}
          handleReport={handleReport}
          handleDeleteReport={handleDeleteReport}
          handleAddComment={handleAddComment}
          handleDeleteComment={handleDeleteComment}
          setSelectedSpot={setSelectedSpot}
          isFavorite={favoriteIds.includes(selectedSpot.id)}
          onToggleFavorite={toggleFavorite}
          canInteract={loginRole === 'host' ? true : isLoggedIn}
          onEditSpot={openEditSpot}
          onDeleteSpot={handleDeleteSpot}
        />
      )}
    </div>
  );
}