import React from 'react';
import NewSpotModal from './NewSpotModal.jsx';
import SpotDetailPanel from './SpotDetailPanel.jsx';

export default function MapScreen({
  loginRole,
  username,
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
  handleAddComment,
  newComment,
  setNewComment,
}) {
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
            {loginRole === 'host' ? `👑 HOST: ${username}` : '👤 USER モード'}
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
            onClick={handleLogout}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          >
            🚪 ログアウト
          </button>
          {loginRole === 'user' && (
            <div className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1.5 rounded-full font-semibold">
              🪙 120 pt
            </div>
          )}
        </div>
      </header>

      <div ref={mapContainerRef} className="w-full h-full" />

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

      {selectedSpot && (
        <SpotDetailPanel
          selectedSpot={selectedSpot}
          loginRole={loginRole}
          newComment={newComment}
          setNewComment={setNewComment}
          handleReport={handleReport}
          handleAddComment={handleAddComment}
          setSelectedSpot={setSelectedSpot}
        />
      )}
    </div>
  );
}
