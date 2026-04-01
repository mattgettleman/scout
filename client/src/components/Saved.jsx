import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import JobCard from './JobCard.jsx';
import './Saved.css';

export default function Saved() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getJobs({ saved: 'true', dismissed: 'false' })
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (id, updates) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j)
      .filter(j => !(updates.saved === false) || j.id !== id)
    );
  };

  // Group by company
  const byCompany = jobs.reduce((acc, job) => {
    const key = job.company_name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(job);
    return acc;
  }, {});

  return (
    <div className="saved">
      <div className="saved-header">
        <h1 className="saved-title">Saved</h1>
        <p className="saved-sub">Roles you've bookmarked</p>
      </div>

      {loading && <div className="saved-loading">Loading…</div>}

      {!loading && jobs.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No saved roles yet</div>
          <div className="empty-state-body">Star any role in the Feed to save it here.</div>
        </div>
      )}

      {!loading && Object.entries(byCompany).map(([company, compJobs]) => (
        <div key={company} className="saved-group">
          <div className="saved-group-header">{company}</div>
          <div className="saved-job-list">
            {compJobs.map(job => (
              <JobCard key={job.id} job={job} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
