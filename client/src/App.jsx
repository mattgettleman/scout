import React, { useState, useEffect } from 'react';
import { api } from './api.js';
import Nav from './components/Nav.jsx';
import Feed from './components/Feed.jsx';
import Watchlist from './components/Watchlist.jsx';
import Discover from './components/Discover.jsx';
import Saved from './components/Saved.jsx';
import Settings from './components/Settings.jsx';

export default function App() {
  const [view, setView] = useState('feed');
  const [syncing, setSyncing] = useState(false);
  const [syncBanner, setSyncBanner] = useState(null);
  const [feedCount, setFeedCount] = useState(0);

  const handleSync = async () => {
    setSyncing(true);
    setSyncBanner(null);
    try {
      const result = await api.syncAll();
      setSyncBanner({
        ok: true,
        text: `Synced — ${result.total_added} new role${result.total_added !== 1 ? 's' : ''} added`
      });
      // Force feed to reload by remounting
      if (result.total_added > 0) {
        setView(v => v === 'feed' ? 'feed_reload' : v);
        setTimeout(() => setView('feed'), 50);
      }
    } catch (err) {
      setSyncBanner({ ok: false, text: `Sync failed: ${err.message}` });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncBanner(null), 5000);
    }
  };

  return (
    <div className="app-shell">
      <Nav
        view={view}
        onViewChange={setView}
        feedCount={feedCount}
        syncing={syncing}
        onSync={handleSync}
      />

      {syncBanner && (
        <div className={`sync-banner ${syncBanner.ok ? 'ok' : 'err'}`}>
          {syncBanner.text}
          <button onClick={() => setSyncBanner(null)} style={{marginLeft:12,opacity:0.6}}>×</button>
        </div>
      )}

      <div className="app-content">
        {view === 'feed' && <Feed onCountChange={setFeedCount} />}
        {view === 'watchlist' && <Watchlist />}
        {view === 'discover' && <Discover />}
        {view === 'saved' && <Saved />}
        {view === 'settings' && <Settings />}
      </div>
    </div>
  );
}
