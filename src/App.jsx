import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import BacklogStats from './components/BacklogStats';
import FilterBar from './components/FilterBar';
import GameCard from './components/GameCard';
import RandomPickerModal from './components/RandomPickerModal';
import SettingsModal from './components/SettingsModal';
import { fetchUserSummary, fetchBacklogGames, getStoredSettings, saveStoredSettings, clearStoredSettings } from './utils/api';
import { LogIn, Sparkles, AlertCircle, Lock, RefreshCw, Gamepad2 } from 'lucide-react';

export default function App() {
  const [steamid, setSteamid] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);

  // Filters & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('reviewScore'); // default sort by review score!
  const [timeFilter, setTimeFilter] = useState('all');
  const [playtimeThreshold, setPlaytimeThreshold] = useState(0);

  // Modals State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initial setup: read URL parameters or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSteamid = params.get('steamid');
    const stored = getStoredSettings();

    if (urlSteamid) {
      setSteamid(urlSteamid);
      saveStoredSettings(urlSteamid, stored.apiKey);
      // Clean up URL without reloading page
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (stored.steamid) {
      setSteamid(stored.steamid);
      setApiKey(stored.apiKey);
    } else {
      // Default to demo mode so user gets an immediate preview
      setSteamid('demo');
    }
  }, []);

  // Fetch backlog when steamid, apiKey, or playtimeThreshold changes
  useEffect(() => {
    if (!steamid) return;

    let isMounted = true;
    setLoading(true);
    setErrorInfo(null);

    async function loadData() {
      try {
        const isDemo = steamid === 'demo';
        
        // Fetch user profile summary
        const userSummary = await fetchUserSummary(steamid, apiKey);
        if (isMounted) setUser(userSummary);

        // Fetch backlog games list
        const data = await fetchBacklogGames(steamid, apiKey, isDemo, playtimeThreshold);
        if (isMounted) {
          setGames(data.games || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading backlog data:', err);
          setErrorInfo({
            code: err.code || 'ERROR',
            message: err.message || 'Failed to load Steam library.'
          });
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [steamid, apiKey, playtimeThreshold]);

  const handleSaveSettings = (newSteamid, newApiKey) => {
    setSteamid(newSteamid || 'demo');
    setApiKey(newApiKey || '');
    saveStoredSettings(newSteamid, newApiKey);
  };

  const handleTryDemo = () => {
    setSteamid('demo');
    saveStoredSettings('demo', apiKey);
  };

  const handleLogout = () => {
    clearStoredSettings();
    setUser(null);
    setSteamid('demo');
  };

  // Filter & Sort Logic
  const filteredAndSortedGames = useMemo(() => {
    if (!games) return [];

    return games
      .filter((game) => {
        // Search text matching
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const nameMatch = game.name.toLowerCase().includes(q);
          const genreMatch = game.genres && game.genres.some(g => g.toLowerCase().includes(q));
          if (!nameMatch && !genreMatch) return false;
        }

        // Time to beat filter matching
        const mainTime = game.hltb?.main;
        if (timeFilter === 'short' && (!mainTime || mainTime > 10)) return false;
        if (timeFilter === 'medium' && (!mainTime || mainTime <= 10 || mainTime > 25)) return false;
        if (timeFilter === 'long' && (!mainTime || mainTime <= 25 || mainTime > 50)) return false;
        if (timeFilter === 'epic' && (!mainTime || mainTime <= 50)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'reviewScore') {
          const scoreA = a.reviewScore !== null && a.reviewScore !== undefined ? a.reviewScore : -1;
          const scoreB = b.reviewScore !== null && b.reviewScore !== undefined ? b.reviewScore : -1;
          return scoreB - scoreA;
        }
        if (sortBy === 'metacritic') {
          const metaA = a.metacritic || -1;
          const metaB = b.metacritic || -1;
          return metaB - metaA;
        }
        if (sortBy === 'hltbAsc') {
          const timeA = a.hltb?.main || 9999;
          const timeB = b.hltb?.main || 9999;
          return timeA - timeB;
        }
        if (sortBy === 'hltbDesc') {
          const timeA = a.hltb?.main || -1;
          const timeB = b.hltb?.main || -1;
          return timeB - timeA;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [games, searchQuery, sortBy, timeFilter]);

  return (
    <div className="app-container">
      <Header
        user={user}
        apiKey={apiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTryDemo={handleTryDemo}
        onLogout={handleLogout}
        isDemo={steamid === 'demo'}
      />

      {/* Aggregate Stats Dashboard */}
      {!loading && !errorInfo && <BacklogStats games={games} />}

      {/* Filter and Sorting Bar */}
      {!errorInfo && (
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          playtimeThreshold={playtimeThreshold}
          setPlaytimeThreshold={setPlaytimeThreshold}
          onOpenPicker={() => setIsPickerOpen(true)}
        />
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-box">
          <div className="spinner"></div>
          <h3 style={{ fontSize: '1.2rem', color: '#66c0f4', fontFamily: 'var(--font-heading)' }}>
            Fetching Steam Review Scores & HowLongToBeat Stats...
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
            Gathering unplayed games and completion times
          </p>
        </div>
      ) : errorInfo ? (
        <div
          style={{
            background: 'rgba(22, 30, 46, 0.9)',
            border: '1px solid var(--border-accent)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            maxWidth: '650px',
            margin: '3rem auto'
          }}
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Lock size={30} />
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            {errorInfo.code === 'NO_API_KEY' ? 'Steam API Key Needed' : 'Unable to Access Steam Library'}
          </h3>

          <p style={{ color: '#9ca3af', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            {errorInfo.message}
          </p>

          <div style={{ background: 'rgba(10, 15, 26, 0.6)', border: '1px dashed var(--border-subtle)', borderRadius: '12px', padding: '1rem', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <strong style={{ color: '#66c0f4', display: 'block', marginBottom: '0.5rem' }}>💡 Quick Fix Solutions:</strong>
            <ul style={{ paddingLeft: '1.2rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Option 1:</strong> Enter your free Steam Web API key in <em>Settings</em>.</li>
              <li><strong>Option 2:</strong> Ensure your Steam Profile privacy settings have <em>"Game details"</em> set to <strong>Public</strong>.</li>
              <li><strong>Option 3:</strong> Click <em>"Explore Demo Backlog"</em> below to see the app in action!</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setIsSettingsOpen(true)}>
              Configure API Key / Steam ID
            </button>
            <button className="btn btn-secondary" onClick={handleTryDemo}>
              <Sparkles size={16} /> Explore Demo Backlog
            </button>
          </div>
        </div>
      ) : filteredAndSortedGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <Gamepad2 size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No unplayed games match your criteria</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Try adjusting your search query or time filter.
          </p>
        </div>
      ) : (
        <div className="games-grid">
          {filteredAndSortedGames.map((game) => (
            <GameCard key={game.appid} game={game} />
          ))}
        </div>
      )}

      {/* Modals */}
      <RandomPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        games={games}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSteamid={steamid}
        currentApiKey={apiKey}
        onSave={handleSaveSettings}
        onTryDemo={handleTryDemo}
      />
    </div>
  );
}
