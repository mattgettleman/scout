import React, { useState } from 'react';
import { api } from '../api.js';
import JobCard from './JobCard.jsx';
import './CompanyCard.css';

function stageLabel(stage) {
  const map = { 'seed': 'Seed', 'series-a': 'Series A', 'series-b': 'Series B', 'series-c': 'Series C', 'series-d': 'Series D', 'series-e': 'Series E', 'growth': 'Growth', 'public': 'Public' };
  return map[stage] || stage || '';
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function CompanyCard({ company, onUpdate, onRemove, mode = 'watchlist' }) {
  const [expanded, setExpanded] = useState(false);
  const [jobs, setJobs] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newFilter, setNewFilter] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);

  const loadJobs = async () => {
    const data = await api.getCompany(company.id);
    setJobs(data.jobs || []);
  };

  const handleExpand = async () => {
    if (!expanded && !jobs) await loadJobs();
    setExpanded(!expanded);
  };

  const handleSync = async (e) => {
    e.stopPropagation();
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncCompany(company.id);
      setSyncResult(res);
      await loadJobs();
    } catch (err) {
      setSyncResult({ error: err.message });
    } finally { setSyncing(false); }
  };

  const handleAddToWatchlist = async (e) => {
    e.stopPropagation();
    setAdding(true);
    try {
      await api.updateCompany(company.id, { on_watchlist: true });
      onUpdate(company.id, { on_watchlist: true });
    } finally { setAdding(false); }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${company.name} from your watchlist?`)) return;
    await api.updateCompany(company.id, { on_watchlist: false });
    onRemove(company.id);
  };

  const handleJobUpdate = (jobId, updates) => {
    setJobs(prev => prev?.map(j => j.id === jobId ? { ...j, ...updates } : j));
  };

  const saveFilter = async (filters) => {
    setSavingFilter(true);
    try {
      const updated = await api.updateCompany(company.id, { role_filter: filters });
      onUpdate(company.id, { role_filter: updated.role_filter });
      // Reload jobs with new filter
      const data = await api.getCompany(company.id);
      setJobs(data.jobs || []);
    } finally { setSavingFilter(false); }
  };

  const addFilter = async () => {
    const trimmed = newFilter.trim();
    if (!trimmed) return;
    const current = company.role_filter || [];
    if (current.includes(trimmed)) { setNewFilter(''); return; }
    setNewFilter('');
    await saveFilter([...current, trimmed]);
  };

  const removeFilter = async (f) => {
    await saveFilter((company.role_filter || []).filter(x => x !== f));
  };

  const visibleJobs = jobs?.filter(j => !j.dismissed) || [];

  return (
    <div className={`company-card ${expanded ? 'expanded' : ''}`}>
      <div className="company-card-main" onClick={handleExpand}>
        <div className="company-initials" style={{ background: sectorColor(company.sector) }}>
          {initials(company.name)}
        </div>
        <div className="company-info">
          <div className="company-name-row">
            <span className="company-name">{company.name}</span>
            <div className="company-badges">
              {(company.sector || []).map(s => (
                <span key={s} className={`sector-badge ${s}`}>{s}</span>
              ))}
              {company.stage && <span className="stage-badge">{stageLabel(company.stage)}</span>}
              {company.employee_count && <span className="size-badge">{company.employee_count}</span>}
            </div>
          </div>
          {company.description && <p className="company-desc">{company.description}</p>}
          {company.ai_reason && mode === 'discover' && (
            <p className="company-ai-reason">{company.ai_reason}</p>
          )}
        </div>
        <div className="company-card-right">
          {mode === 'watchlist' && (
            <div className="company-stats">
              {company.unseen_count > 0 && (
                <span className="unseen-count">{company.unseen_count} new</span>
              )}
              {company.job_count > 0 && (
                <span className="job-count">{company.job_count} role{company.job_count !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
          <div className="company-actions">
            {mode === 'watchlist' && (
              <>
                <button className="icon-btn" onClick={handleSync} disabled={syncing} title="Sync jobs">
                  {syncing ? <span className="spinner" style={{width:14,height:14}} /> : '↻'}
                </button>
                <button className="icon-btn remove" onClick={handleRemove} title="Remove from watchlist">×</button>
              </>
            )}
            {mode === 'discover' && !company.on_watchlist && (
              <button className="btn-primary" onClick={handleAddToWatchlist} disabled={adding} style={{fontSize:12,padding:'6px 14px'}}>
                {adding ? 'Adding…' : '+ Watch'}
              </button>
            )}
            {mode === 'discover' && company.on_watchlist && (
              <span className="watching-label">Watching</span>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer" className="icon-btn" onClick={e => e.stopPropagation()} title="Visit website">↗</a>
            )}
          </div>
          <span className={`expand-arrow ${expanded ? 'open' : ''}`}>›</span>
        </div>
      </div>

      {syncResult && (
        <div className={`sync-result ${syncResult.error ? 'error' : 'ok'}`}>
          {syncResult.error ? `Error: ${syncResult.error}` : `+${syncResult.added || 0} new roles (${syncResult.fetched || 0} fetched)`}
        </div>
      )}

      {expanded && mode === 'watchlist' && (
        <div className="company-role-filters" onClick={e => e.stopPropagation()}>
          <div className="role-filter-label">Role filters {savingFilter && <span className="filter-saving">saving…</span>}</div>
          <div className="role-filter-chips">
            {(company.role_filter || []).map(f => (
              <span key={f} className="role-filter-chip">
                {f}
                <button className="role-chip-remove" onClick={() => removeFilter(f)}>×</button>
              </span>
            ))}
            <div className="role-filter-add">
              <input
                className="role-filter-input"
                type="text"
                placeholder="+ Add filter…"
                value={newFilter}
                onChange={e => setNewFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFilter()}
              />
            </div>
          </div>
          {(company.role_filter || []).length > 0 && (
            <div className="role-filter-hint">Only jobs matching these keywords will show</div>
          )}
        </div>
      )}

      {expanded && (
        <div className="company-jobs">
          {!jobs ? (
            <div style={{padding:'16px',color:'var(--text-muted)'}}>Loading…</div>
          ) : visibleJobs.length === 0 ? (
            <div style={{padding:'16px',color:'var(--text-muted)',fontSize:13}}>
              No matching roles right now. {!company.ats_slug && 'No ATS configured — '}
              {company.career_page_url
                ? <a href={company.career_page_url} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>Check careers page ↗</a>
                : company.website && <a href={`${company.website}/careers`} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>Check careers page ↗</a>
              }
            </div>
          ) : (
            <div className="company-job-list">
              {visibleJobs.map(job => (
                <JobCard key={job.id} job={{ ...job, company_name: company.name, company_sector: company.sector }} onUpdate={handleJobUpdate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function sectorColor(sectors) {
  const s = sectors?.[0];
  if (s === 'climate') return '#daeee5';
  if (s === 'health') return '#daeaf3';
  if (s === 'education') return '#f5e8d0';
  return '#e8e8f0';
}
