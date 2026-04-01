import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import './Settings.css';

const ALL_SECTORS = ['climate', 'health', 'education', 'other'];

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newRole, setNewRole] = useState('');

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        target_roles: profile.target_roles,
        mission_sectors: profile.mission_sectors,
        comp_floor: profile.comp_floor,
        company_size_min: profile.company_size_min,
        company_size_max: profile.company_size_max,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="settings-loading">Loading…</div>;

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

        <div className="settings-save-row">
          <button className="btn-primary settings-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
