import React, { useState } from 'react';
import { X, Key, UserCheck, Sparkles, ExternalLink, HelpCircle } from 'lucide-react';
import { resolveCustomUrl } from '../utils/api';

export default function SettingsModal({ isOpen, onClose, currentSteamid, currentApiKey, onSave, onTryDemo }) {
  const [inputSteamId, setInputSteamId] = useState(currentSteamid || '');
  const [inputApiKey, setInputApiKey] = useState(currentApiKey || '');
  const [isResolving, setIsResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    let finalSteamId = inputSteamId.trim();

    // Check if input is a Steam URL or custom vanity name
    if (finalSteamId.includes('steamcommunity.com') || (!/^\d{17}$/.test(finalSteamId) && finalSteamId.length > 0 && finalSteamId !== 'demo')) {
      try {
        setIsResolving(true);
        finalSteamId = await resolveCustomUrl(finalSteamId, inputApiKey.trim());
      } catch (err) {
        setErrorMsg(err.message || 'Could not resolve Steam URL or custom vanity name.');
        setIsResolving(false);
        return;
      } finally {
        setIsResolving(false);
      }
    }

    onSave(finalSteamId, inputApiKey.trim());
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key className="gradient-text" /> Steam Settings & API Credentials
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
              Steam ID 64 or Custom Profile URL
            </label>
            <input
              type="text"
              placeholder="e.g. 76561198012345678 or https://steamcommunity.com/id/yourname"
              value={inputSteamId}
              onChange={(e) => setInputSteamId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                background: 'rgba(10, 15, 26, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
              Tip: Standard 17-digit Steam ID, custom vanity name, or Steam profile link.
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
              Steam Web API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="Paste your Steam Web API Key here..."
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                background: 'rgba(10, 15, 26, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
              Get a free API key from{' '}
              <a
                href="https://steamcommunity.com/dev/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#66c0f4', textDecoration: 'none' }}
              >
                steamcommunity.com/dev/apikey <ExternalLink size={11} />
              </a>
            </p>
          </div>

          {errorMsg && (
            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', color: '#f43f5e', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                onTryDemo();
                onClose();
              }}
            >
              <Sparkles size={16} /> Load Demo
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isResolving}>
              {isResolving ? 'Resolving Steam Profile...' : 'Save & Load Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
