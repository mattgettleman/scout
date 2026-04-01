import React from 'react';
import './Nav.css';

export default function Nav({ view, onViewChange, feedCount, syncing, onSync }) {
  return (
    <header className="nav">
      <div className="nav-brand">
        <span className="nav-logo">◈</span>
        <span className="nav-name">Scout</span>
      </div>
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${view === 'feed' ? 'active' : ''}`}
          onClick={() => onViewChange('feed')}
        >
          Feed
          {feedCount > 0 && <span className="nav-badge">{feedCount}</span>}
        </button>
        <button
          className={`nav-tab ${view === 'watchlist' ? 'active' : ''}`}
          onClick={() => onViewChange('watchlist')}
        >
          Watchlist
        </button>
        <button
          className={`nav-tab ${view === 'discover' ? 'active' : ''}`}
          onClick={() => onViewChange('discover')}
        >
          Discover
        </button>
        <button
          className={`nav-tab ${view === 'saved' ? 'active' : ''}`}
          onClick={() => onViewChange('saved')}
        >
          Saved
        </button>
      </nav>
      <div className="nav-actions">
        <button className={`sync-btn ${syncing ? 'syncing' : ''}`} onClick={onSync} disabled={syncing}>
          {syncing ? <span className="spinner" /> : '↻'}
          {syncing ? 'Syncing…' : 'Sync Jobs'}
        </button>
        <button
          className={`nav-settings ${view === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange(view === 'settings' ? 'feed' : 'settings')}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
