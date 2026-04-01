import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import CompanyCard from './CompanyCard.jsx';
import './Discover.css';

export default function Discover() {
  const [mode, setMode] = useState('companies'); // 'companies' | 'roles'
  const [results, setResults] = useState([]);
  const [roleResults, setRoleResults] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(() => {});
  }, []);

  const handleDiscover = async () => {
    setLoading(true);
    setError(null);
    try {
      const { companies: suggested } = await api.discover();

      const saved = [];
      for (const c of suggested) {
        try {
          const existing = companies.find(ex => ex.name.toLowerCase() === c.name.toLowerCase());
          if (existing) {
            saved.push({ ...existing, ai_reason: c.why_recommended });
          } else {
            const created = await api.addCompany({
              name: c.name,
              website: c.website,
              description: c.description,
              sector: c.sector || [],
              stage: c.stage,
              employee_count: c.employee_count,
              ats_type: c.ats_type,
              ats_slug: c.ats_slug !== 'null' ? c.ats_slug : null,
              on_watchlist: false,
              ai_suggested: true,
              ai_reason: c.why_recommended
            });
            saved.push(created);
          }
        } catch (e) {
          saved.push({ ...c, id: Math.random(), sector: c.sector || [], ai_reason: c.why_recommended });
        }
      }

      const allCompanies = await api.getCompanies();
      setCompanies(allCompanies);
      setResults(saved);
      setRan(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleDiscoverRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { roles } = await api.discoverRoles();
      setRoleResults(roles || []);
      setRan(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleAddRoleCompany = async (role) => {
    try {
      const existing = companies.find(c => c.name.toLowerCase() === role.company.toLowerCase());
      if (existing) {
        await api.updateCompany(existing.id, { on_watchlist: true });
        setCompanies(prev => prev.map(c => c.id === existing.id ? { ...c, on_watchlist: true } : c));
        setRoleResults(prev => prev.map(r => r === role ? { ...r, _added: true, _company_id: existing.id } : r));
      } else {
        const created = await api.addCompany({
          name: role.company,
          website: role.website,
          description: null,
          sector: role.sector || [],
          stage: role.stage,
          employee_count: role.employee_count,
          ats_type: role.ats_type,
          ats_slug: role.ats_slug !== 'null' ? role.ats_slug : null,
          on_watchlist: true,
          ai_suggested: true,
          ai_reason: role.why
        });
        await api.syncCompany(created.id);
        setRoleResults(prev => prev.map(r => r === role ? { ...r, _added: true } : r));
        setCompanies(await api.getCompanies());
      }
    } catch (e) {
      // best-effort
    }
  };

  const handleUpdate = (id, updates) => {
    setResults(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleRemove = (id) => {
    setResults(prev => prev.filter(c => c.id !== id));
  };

  const errorMsg = error && (
    error.includes('API') || error.includes('key') || error.includes('auth')
      ? 'AI features require an ANTHROPIC_API_KEY in Replit Secrets. Add one at console.anthropic.com.'
      : `Error: ${error}`
  );

  return (
    <div className="discover">
      <div className="discover-header">
        <div>
          <h1 className="discover-title">Discover</h1>
          <p className="discover-sub">AI-powered recommendations based on your profile and watchlist</p>
        </div>
      </div>

      <div className="discover-mode-toggle">
        <button
          className={`mode-tab ${mode === 'companies' ? 'active' : ''}`}
          onClick={() => { setMode('companies'); setRan(false); setError(null); }}
        >
          Find Companies
        </button>
        <button
          className={`mode-tab ${mode === 'roles' ? 'active' : ''}`}
          onClick={() => { setMode('roles'); setRan(false); setError(null); }}
        >
          Find Roles
        </button>
      </div>

      {mode === 'companies' && (
        <>
          <div className="discover-cta">
            <div className="discover-cta-text">
              <strong>Find companies like your watchlist</strong>
              <p>Claude will suggest mission-aligned companies in climate, health, and education that are the right size and stage for your background.</p>
            </div>
            <button className="btn-primary discover-btn" onClick={handleDiscover} disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{width:14,height:14,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'white'}} /> Finding companies…</>
              ) : (
                ran ? '↻ Refresh suggestions' : '✦ Find companies'
              )}
            </button>
          </div>

          {errorMsg && <div className="discover-error">{errorMsg}</div>}

          {ran && !loading && results.length === 0 && (
            <div className="empty-state" style={{marginTop:32}}>
              <div className="empty-state-title">No results</div>
              <div className="empty-state-body">Try adding a few companies to your watchlist first so Claude has context.</div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="discover-results-header">
                <span>{results.length} companies found</span>
                <span style={{fontSize:12,color:'var(--text-muted)'}}>Click any card to see their open roles · Add to your watchlist to track jobs</span>
              </div>
              <div className="discover-grid">
                {results.map(c => (
                  <CompanyCard
                    key={c.id}
                    company={c}
                    onUpdate={handleUpdate}
                    onRemove={handleRemove}
                    mode="discover"
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {mode === 'roles' && (
        <>
          <div className="discover-cta">
            <div className="discover-cta-text">
              <strong>Find specific roles worth pursuing</strong>
              <p>Claude will suggest (company, role) pairings — companies likely to have or regularly post the types of roles you're targeting.</p>
            </div>
            <button className="btn-primary discover-btn" onClick={handleDiscoverRoles} disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{width:14,height:14,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'white'}} /> Finding roles…</>
              ) : (
                ran ? '↻ Refresh suggestions' : '✦ Find roles'
              )}
            </button>
          </div>

          {errorMsg && <div className="discover-error">{errorMsg}</div>}

          {ran && !loading && roleResults.length === 0 && (
            <div className="empty-state" style={{marginTop:32}}>
              <div className="empty-state-title">No results</div>
              <div className="empty-state-body">Try again — Claude may need more watchlist context.</div>
            </div>
          )}

          {roleResults.length > 0 && (
            <>
              <div className="discover-results-header">
                <span>{roleResults.length} role suggestions</span>
                <span style={{fontSize:12,color:'var(--text-muted)'}}>Add company to watchlist to sync their open jobs</span>
              </div>
              <div className="role-results">
                {roleResults.map((r, i) => (
                  <div key={i} className="role-result-card">
                    <div className="role-result-top">
                      <div className="role-result-left">
                        <div className="role-result-company">{r.company}</div>
                        <div className="role-result-type">{r.role_type}</div>
                        <div className="role-result-badges">
                          {(r.sector || []).map(s => (
                            <span key={s} className={`sector-badge ${s}`}>{s}</span>
                          ))}
                          {r.stage && <span className="stage-badge">{r.stage}</span>}
                          {r.employee_count && <span className="size-badge">{r.employee_count}</span>}
                        </div>
                      </div>
                      <div className="role-result-actions">
                        {r._added ? (
                          <span className="watching-label">Added to watchlist</span>
                        ) : (
                          <button
                            className="btn-primary"
                            style={{fontSize:12,padding:'6px 14px'}}
                            onClick={() => handleAddRoleCompany(r)}
                          >
                            + Watch &amp; Sync
                          </button>
                        )}
                        {r.website && (
                          <a href={r.website} target="_blank" rel="noreferrer" className="icon-btn" title="Visit website">↗</a>
                        )}
                      </div>
                    </div>
                    {r.why && <p className="role-result-why">{r.why}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
