import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import JobCard from './JobCard.jsx';
import PasteModal from './PasteModal.jsx';
import './Feed.css';

export default function Feed({ onCountChange }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | saved
  const [showPaste, setShowPaste] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getFeed();
      setJobs(data);
      onCountChange?.(data.length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleJobUpdate = (jobId, updates) => {
    setJobs(prev => {
      const next = prev.map(j => j.id === jobId ? { ...j, ...updates } : j);
      const visible = next.filter(j => !j.dismissed);
      onCountChange?.(visible.filter(j => !j.seen).length);
      return updates.dismissed ? prev.filter(j => j.id !== jobId) : next;
    });
  };

  const handlePasteAdded = (job) => {
    setJobs(prev => [job, ...prev]);
    onCountChange?.(c => c + 1);
  };

  const visible = filter === 'saved' ? jobs.filter(j => j.saved) : jobs;

  return (
    <div className="feed">
      <div className="feed-header">
        <div>
          <h1 className="feed-title">Feed</h1>
          <p className="feed-sub">{jobs.length} new role{jobs.length !== 1 ? 's' : ''} at companies you're watching</p>
        </div>
        <div className="feed-controls">
          <button className="paste-btn" onClick={() => setShowPaste(true)}>+ Add Role</button>
          <div className="feed-filters">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn ${filter === 'saved' ? 'active' : ''}`} onClick={() => setFilter('saved')}>Saved</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{padding: '48px', textAlign:'center'}}><span className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <div className="empty-state-title">
            {filter === 'saved' ? 'No saved roles yet' : 'All caught up'}
          </div>
          <div className="empty-state-body">
            {filter === 'saved'
              ? "Star roles you want to revisit and they'll appear here."
              : 'Sync your watchlist to pull in new roles, or paste one in manually.'}
          </div>
        </div>
      ) : (
        <div className="feed-list">
          {visible.map(job => (
            <JobCard key={job.id} job={job} onUpdate={handleJobUpdate} />
          ))}
        </div>
      )}

      {showPaste && (
        <PasteModal
          onClose={() => setShowPaste(false)}
          onAdded={handlePasteAdded}
        />
      )}
    </div>
  );
}
