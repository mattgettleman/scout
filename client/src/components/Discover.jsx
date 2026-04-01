import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import CompanyCard from './CompanyCard.jsx';
import './Discover.css';

export default function Discover() {
  const [results, setResults] = useState([]);
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

      // Save suggested companies to DB so they show up in watchlist if added
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

      // Refresh companies list
      const allCompanies = await api.getCompanies();
      setCompanies(allCompanies);
      setResults(saved);
      setRan(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleUpdate = (id, updates) => {
    setResults(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleRemove = (id) => {
    setResults(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="discover">
      <div className="discover-header">
        <div>
          <h1 className="discover-title">Discover</h1>
          <p className="discover-sub">AI-powered company recommendations based on your profile and watchlist</p>
        </div>
      </div>

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

      {error && (
        <div className="discover-error">
          {error.includes('API') || error.includes('key') || error.includes('auth')
            ? 'AI features require an ANTHROPIC_API_KEY in Replit Secrets. Add one at console.anthropic.com.'
            : `Error: ${error}`}
        </div>
      )}

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
    </div>
  );
}
