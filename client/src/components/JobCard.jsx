import React from 'react';
import { api } from '../api.js';
import './JobCard.css';

function fitClass(score) {
  if (score == null) return 'low';
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function JobCard({ job, onUpdate }) {
  const fc = fitClass(job.fit_score);

  const handleDismiss = async (e) => {
    e.stopPropagation();
    await api.updateJob(job.id, { dismissed: true });
    onUpdate(job.id, { dismissed: true });
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    await api.updateJob(job.id, { saved: !job.saved, seen: true });
    onUpdate(job.id, { saved: !job.saved, seen: true });
  };

  const handleClick = async () => {
    window.open(job.url, '_blank');
    if (!job.seen) {
      await api.updateJob(job.id, { seen: true });
      onUpdate(job.id, { seen: true });
    }
  };

  return (
    <div className={`job-card ${job.saved ? 'saved' : ''}`} onClick={handleClick}>
      <div className="job-card-top">
        <div className="job-card-meta">
          <span className="job-company">{job.company_name}</span>
          {(job.company_sector || []).map(s => (
            <span key={s} className={`sector-badge ${s}`}>{s}</span>
          ))}
        </div>
        <div className="job-card-actions">
          {job.remote && <span className="remote-badge">Remote</span>}
          <button className={`save-btn ${job.saved ? 'on' : ''}`} onClick={handleSave} title={job.saved ? 'Unsave' : 'Save'}>
            {job.saved ? '★' : '☆'}
          </button>
          <button className="dismiss-btn" onClick={handleDismiss} title="Dismiss">×</button>
        </div>
      </div>

      <div className="job-title">{job.title}</div>

      <div className="job-card-bottom">
        <div className="job-card-left">
          {job.location && <span className="job-location">{job.location}</span>}
          {job.salary_text && <span className="job-salary">{job.salary_text}</span>}
          <span className="job-time">{timeAgo(job.posted_at || job.fetched_at)}</span>
        </div>
        <div className="job-card-right">
          {job.fit_score != null ? (
            <div className="fit-info">
              <span className={`fit-pill ${fc}`}>{job.fit_score}</span>
              {job.fit_notes && <span className="fit-notes">{job.fit_notes}</span>}
            </div>
          ) : (
            <span className="fit-pill low">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
