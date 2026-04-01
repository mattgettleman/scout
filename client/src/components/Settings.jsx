import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import './Settings.css';

const ALL_SECTORS = ['climate', 'health', 'education', 'other'];

const DISCOVERY_SOURCE_GROUPS = [
  {
    label: 'General databases',
    sources: [
      'Crunchbase (Series B/C companies)',
      'AngelList / Wellfound',
    ]
  },
  {
    label: 'Climate VC portfolios',
    sources: [
      'Breakthrough Energy Ventures portfolio',
      'DCVC (Data Collective) portfolio',
      'Congruent Ventures portfolio',
      'Prelude Ventures portfolio',
    ]
  },
  {
    label: 'Health VC portfolios',
    sources: [
      'Oak HC/FT portfolio',
      'General Catalyst health portfolio',
      'a16z Bio + Health portfolio',
    ]
  },
  {
    label: 'Education VC portfolios',
    sources: [
      'Learn Capital portfolio',
      'NewSchools Venture Fund portfolio',
    ]
  },
  {
    label: 'Growth-stage funds',
    sources: [
      'Y Combinator alumni (Series B+)',
      'a16z portfolio',
      'Bessemer Venture Partners portfolio',
      'Sequoia portfolio',
    ]
  },
];

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {});
  }, []);

  const update = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const addRole = () => {
    const trimmed = newRole.trim();
    if (!trimmed || profile.target_roles.includes(trimmed)) { setNewRole(''); return; }
    update('target_roles', [...(profile.target_roles || []), trimmed]);
    setNewRole('');
  };

  const removeRole = (role) => {
    update('target_roles', profile.target_roles.filter(r => r !== role));
  };

  const toggleSector = (sector) => {
    const current = profile.mission_sectors || [];
    update('mission_sectors', current.includes(sector)
      ? current.filter(s => s !== sector)
      : [...current, sector]
    );
  };

  const toggleSource = (source) => {
    const current = profile.discovery_sources || [];
    update('discovery_sources', current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        target_roles: profile.target_roles,
        mission_sectors: profile.mission_sectors,
        comp_floor: profile.comp_floor,
        company_size_min: profile.company_size_min,
        company_size_max: profile.company_size_max,
        discovery_sources: profile.discovery_sources || [],
        discover_context: profile.discover_context || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="settings-loading">Loading…</div>;

  const activeSources = profile.discovery_sources || [];

  return (
    <div className="settings">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-sub">These preferences feed AI discovery and job scoring</p>
      </div>

      <div className="settings-body">
        <section className="settings-section">
          <h2 className="settings-section-title">Target Roles</h2>
          <p className="settings-section-desc">Role titles Claude uses to discover companies and score job fit</p>
          <div className="role-chips">
            {(profile.target_roles || []).map(role => (
              <span key={role} className="role-chip">
                {role}
                <button className="role-chip-remove" onClick={() => removeRole(role)}>×</button>
              </span>
            ))}
          </div>
          <div className="role-add-row">
            <input
              className="role-input"
              type="text"
              placeholder="Add a role title…"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRole()}
            />
            <button className="btn-secondary" onClick={addRole} disabled={!newRole.trim()}>Add</button>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Mission Sectors</h2>
          <p className="settings-section-desc">Industries you want to focus on</p>
          <div className="sector-checkboxes">
            {ALL_SECTORS.map(sector => (
              <label key={sector} className={`sector-option ${sector}`}>
                <input
                  type="checkbox"
                  checked={(profile.mission_sectors || []).includes(sector)}
                  onChange={() => toggleSector(sector)}
                />
                <span className={`sector-badge ${sector}`}>{sector}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Compensation Floor</h2>
          <p className="settings-section-desc">Minimum base salary (used in AI discovery context)</p>
          <div className="comp-row">
            <span className="comp-prefix">$</span>
            <input
              className="comp-input"
              type="number"
              step="10000"
              value={profile.comp_floor || ''}
              onChange={e => update('comp_floor', parseInt(e.target.value) || 0)}
            />
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Target Company Size</h2>
          <p className="settings-section-desc">Employee count range for ideal companies</p>
          <div className="size-row">
            <input
              className="size-input"
              type="number"
              step="10"
              value={profile.company_size_min || ''}
              onChange={e => update('company_size_min', parseInt(e.target.value) || 0)}
            />
            <span className="size-sep">to</span>
            <input
              className="size-input"
              type="number"
              step="10"
              value={profile.company_size_max || ''}
              onChange={e => update('company_size_max', parseInt(e.target.value) || 0)}
            />
            <span className="size-label">employees</span>
          </div>
        </section>

        {/* Discovery Sources */}
        <section className="settings-section">
          <h2 className="settings-section-title">Discovery Sources</h2>
          <p className="settings-section-desc">
            Tell Claude which ecosystems to draw from when finding companies and roles.
            Claude's training includes knowledge of all these databases and portfolios.
          </p>

          <div className="source-groups">
            {DISCOVERY_SOURCE_GROUPS.map(group => (
              <div key={group.label} className="source-group">
                <div className="source-group-label">{group.label}</div>
                {group.sources.map(source => (
                  <label key={source} className="source-option">
                    <input
                      type="checkbox"
                      checked={activeSources.includes(source)}
                      onChange={() => toggleSource(source)}
                    />
                    <span className="source-name">{source}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          {activeSources.length > 0 && (
            <div className="active-sources-summary">
              {activeSources.length} source{activeSources.length !== 1 ? 's' : ''} active
            </div>
          )}
        </section>

        {/* Additional Context */}
        <section className="settings-section">
          <h2 className="settings-section-title">Additional Search Context</h2>
          <p className="settings-section-desc">
            Freeform instructions for AI discovery — location preferences, funding recency, culture signals, etc.
          </p>
          <textarea
            className="context-textarea"
            placeholder="e.g. Prioritize remote-first companies · Focus on companies that raised in the last 18 months · Avoid companies with recent layoffs"
            value={profile.discover_context || ''}
            onChange={e => update('discover_context', e.target.value || null)}
            rows={3}
          />
        </section>

        {/* What Claude Sees */}
        <section className="settings-section preview-section">
          <button className="preview-toggle" onClick={() => setPreviewOpen(o => !o)}>
            <span>What Claude sees when you run Discover</span>
            <span className={`preview-arrow ${previewOpen ? 'open' : ''}`}>›</span>
          </button>

          {previewOpen && (
            <div className="preview-content">
              <pre className="preview-text">{[
                `Target roles: ${(profile.target_roles || []).join(', ')}`,
                `Mission sectors: ${(profile.mission_sectors || []).join(', ')}`,
                `Company size: ${profile.company_size_min}–${profile.company_size_max} employees`,
                `Comp floor: $${(profile.comp_floor || 0).toLocaleString()}`,
                activeSources.length ? `Discovery sources: ${activeSources.join(', ')}` : null,
                profile.discover_context ? `Additional context: ${profile.discover_context}` : null,
              ].filter(Boolean).join('\n')}</pre>
            </div>
          )}
        </section>

        <div className="settings-save-row">
          <button className="btn-primary settings-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
