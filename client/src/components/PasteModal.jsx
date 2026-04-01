import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';
import './PasteModal.css';

export default function PasteModal({ onClose, onAdded }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [step, setStep] = useState('input'); // input | loading | needsText | preview | done
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const urlInputRef = useRef(null);

  useEffect(() => {
    urlInputRef.current?.focus();
    // Close on Escape
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSubmitUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setStep('loading');
    setError(null);
    try {
      const res = await api.pasteJob({ url: url.trim() });
      if (res.needs_text) {
        setError(res.error);
        setStep('needsText');
      } else {
        setResult(res);
        setStep('preview');
      }
    } catch (err) {
      setError(err.message);
      setStep('needsText');
    }
  };

  const handleSubmitText = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setStep('loading');
    setError(null);
    try {
      const res = await api.pasteJob({ url: url.trim() || undefined, text: text.trim() });
      if (res.needs_text) {
        setError(res.error);
        setStep('needsText');
      } else {
        setResult(res);
        setStep('preview');
      }
    } catch (err) {
      setError(err.message);
      setStep('needsText');
    }
  };

  const handleConfirm = () => {
    onAdded(result.job);
    setStep('done');
    setTimeout(onClose, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="paste-modal">
        <div className="paste-modal-header">
          <h2>Add a Role</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {step === 'input' && (
          <form onSubmit={handleSubmitUrl} className="paste-form">
            <label className="paste-label">Paste a job URL</label>
            <div className="paste-url-row">
              <input
                ref={urlInputRef}
                type="url"
                placeholder="https://jobs.lever.co/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={!url.trim()}>
                Fetch
              </button>
            </div>
            <div className="paste-divider">
              <span>or</span>
            </div>
            <label className="paste-label">Paste the job text</label>
            <textarea
              placeholder="Copy the full job posting and paste it here…"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
            />
            {text.trim() && (
              <button type="button" className="btn-primary" onClick={handleSubmitText}>
                Analyze text
              </button>
            )}
          </form>
        )}

        {step === 'loading' && (
          <div className="paste-loading">
            <span className="spinner" style={{width:24,height:24}} />
            <p>Analyzing…</p>
          </div>
        )}

        {step === 'needsText' && (
          <form onSubmit={handleSubmitText} className="paste-form">
            {error && <div className="paste-notice">{error}</div>}
            <label className="paste-label">Paste the job text</label>
            <textarea
              autoFocus
              placeholder="Copy the full job posting and paste it here…"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={8}
            />
            <div className="paste-actions">
              <button type="submit" className="btn-primary" disabled={!text.trim()}>
                Analyze
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setStep('input'); setError(null); }}>
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'preview' && result && (
          <div className="paste-preview">
            <div className="preview-field">
              <span className="preview-label">Role</span>
              <span className="preview-value">{result.extracted.title}</span>
            </div>
            <div className="preview-field">
              <span className="preview-label">Company</span>
              <span className="preview-value">{result.extracted.company}</span>
            </div>
            {result.extracted.location && (
              <div className="preview-field">
                <span className="preview-label">Location</span>
                <span className="preview-value">
                  {result.extracted.location}
                  {result.extracted.remote && <span className="remote-badge" style={{marginLeft:8}}>Remote</span>}
                </span>
              </div>
            )}
            {result.extracted.salary_text && (
              <div className="preview-field">
                <span className="preview-label">Salary</span>
                <span className="preview-value">{result.extracted.salary_text}</span>
              </div>
            )}
            {result.extracted.description && (
              <div className="preview-field">
                <span className="preview-label">Summary</span>
                <span className="preview-value preview-desc">{result.extracted.description}</span>
              </div>
            )}
            <p className="preview-scoring-note">Fit score will appear shortly after saving.</p>
            <div className="paste-actions">
              <button className="btn-primary" onClick={handleConfirm}>
                Add to Feed
              </button>
              <button className="btn-secondary" onClick={() => { setStep('input'); setResult(null); }}>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="paste-loading">
            <span style={{fontSize:28}}>✓</span>
            <p>Added to your feed</p>
          </div>
        )}
      </div>
    </div>
  );
}
