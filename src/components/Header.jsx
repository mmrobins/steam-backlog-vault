import React from 'react';
import { Gamepad2, LogIn, Key, Sparkles, LogOut, ExternalLink } from 'lucide-react';

export default function Header({ user, apiKey, onOpenSettings, onTryDemo, onLogout, isDemo }) {
  return (
    <header className="app-header">
      <div className="logo-area">
        <div className="logo-icon">
          <Gamepad2 size={24} />
        </div>
        <div>
          <h1 className="logo-title gradient-text">Steam Backlog Vault</h1>
          <p className="logo-tagline">Unplayed Games • Review Scores • HowLongToBeat Completion</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isDemo && (
          <span style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Sparkles size={14} /> DEMO MODE
          </span>
        )}

        <button 
          className="btn btn-secondary btn-sm"
          onClick={onOpenSettings}
          title="Configure Steam API Key or Steam ID"
        >
          <Key size={16} /> {apiKey ? 'API Key Active' : 'Settings'}
        </button>

        {user ? (
          <div className="user-profile-badge">
            <img src={user.avatarfull} alt={user.personaname} className="user-avatar" />
            <span className="user-name">{user.personaname}</span>
            <button
              onClick={onLogout}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', marginLeft: '0.3rem' }}
              title="Sign Out / Change User"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={onTryDemo}>
              <Sparkles size={15} /> Try Demo
            </button>
            <a href="/api/auth/steam" className="btn btn-steam btn-sm">
              <LogIn size={16} /> Sign in with Steam
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
