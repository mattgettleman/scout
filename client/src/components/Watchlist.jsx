import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import CompanyCard from './CompanyCard.jsx';
import './Watchlist.css';

export default function Watchlist() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const all = await api.getCompanies();
      setCompanies(all.filter(c => c.on_watchlist));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setLooking(true);
    setLookupResult(null);
    try {
      const result = await api.lookupCompany(addName.trim());
      setLookupResult(result);
    } catch (err) {
      setLookupResult({ name: addName, error: err.message });
    } finally { setLooking(false); }
  };

  const handleConfirmAdd = async () => {
    if (!lookupResult) return;
    setAdding(true);
    try {
      const existing = companies.find(c => c.name.toLowerCase() === lookupResult.name.toLowerCase());
      if (existing) {
        await api.updateCompany(existing.id, { on_watchlist: true });
      } else {
        await api.addCompany({
          ...lookupResult,
          sector: lookupResult.sector || [],
          on_watchlist: true
        });
      }
      setAddName('');
      setLookupResult(null);
      setShowAdd(false);
      load();
    } catch (err) {
      alert('Failed to add: ' + err.message);
    } finally { setAdding(false); }
  };

  const handleUpdate = (id, updates) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleRemove = (id) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="watchlist">
      <div className="watchlist-header">
        <div>
          <h1 className="watchlist-title">Watchlist</h1>
          <p className="watchlist-sub">{companies.length} companies you're tracking</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowAdd(!showAdd); setLookupResult(null); setAddName(''); }}>
          {showAdd ? 'Cancel' : '+ Add Company'}
        </button>
      </div>

      {showAdd && (
        <div className="add-company-panel">
          <form onSubmit={handleLookup} className="lookup-form">
            <input
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="Company name (e.g. Beehive Industries)"
              autoFocus
            />
            <button type="submit" className="btn-primary" disabled={looking || !addName.trim()}>
              {looking ? 'Looking up…' : 'Look up'}
            </button>
          </form>
          <p className="lookup-hint">AI will research the company and pre-fill its details.</p>

          {lookupResult && !lookupResult.error && (
            <div className="lookup-result">
              <div className="lookup-result-header">
                <strong>{lookupResult.name}</strong>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {(lookupResult.sector || []).map(s => (
                    <span key={s} className={`sector-badge ${s}`}>{s}</span>
                  ))}
                  {lookupResult.stage && <span className="stage-badge">{lookupResult.stage}</span>}
                </div>
              </div>
              {lookupResult.description && <p style={{fontSize:13,color:'var(--text-secondary)',margin:'6px 0'}}>{lookupResult.description}</p>}
              {lookupResult.ats_type && lookupResult.ats_type !== 'unknown' && (
                <p style={{fontSize:12,color:'var(--text-muted)'}}>ATS: {lookupResult.ats_type}{lookupResult.ats_slug ? ` (${lookupResult.ats_slug})` : ''}</p>
              )}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button className="btn-primary" onClick={handleConfirmAdd} disabled={adding}>
                  {adding ? 'Adding…' : 'Add to Watchlist'}
                </button>
                <button className="btn-secondary" onClick={() => setLookupResult(null)}>Edit</button>
              </div>
            </div>
          )}
          {lookupResult?.error && (
            <p style={{fontSize:13,color:'#b03030',marginTop:8}}>Lookup failed: {lookupResult.error}</p>
          )}
        </div>
      )}

      {loading ? (
        <div style={{padding:'48px',textAlign:'center'}}><span className="spinner" /></div>
      ) : companies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <div className="empty-state-title">No companies yet</div>
          <div className="empty-state-body">Add companies you care about, or use Discover to find mission-aligned ones.</div>
        </div>
      ) : (
        <div className="watchlist-grid">
          {companies.map(c => (
            <CompanyCard
              key={c.id}
              company={c}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              mode="watchlist"
            />
          ))}
        </div>
      )}
    </div>
  );
}
