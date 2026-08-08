import React from 'react';
import { Search, Dices, ArrowUpDown, Filter } from 'lucide-react';

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  timeFilter,
  setTimeFilter,
  playtimeThreshold,
  setPlaytimeThreshold,
  onOpenPicker
}) {
  return (
    <div className="filter-bar">
      <div className="filter-row">
        {/* Search input */}
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search unplayed games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sort dropdown */}
        <div className="select-box" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowUpDown size={16} style={{ color: '#9ca3af' }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="reviewScore">Sort by Review Score (Highest First)</option>
            <option value="metacritic">Sort by Metacritic Score</option>
            <option value="hltbAsc">Sort by Time to Beat (Shortest First)</option>
            <option value="hltbDesc">Sort by Time to Beat (Longest First)</option>
            <option value="name">Sort by Game Title (A-Z)</option>
          </select>
        </div>

        {/* Playtime threshold */}
        <div className="select-box">
          <select 
            value={playtimeThreshold} 
            onChange={(e) => setPlaytimeThreshold(Number(e.target.value))}
          >
            <option value={0}>Completely Unplayed (0h)</option>
            <option value={60}>Minimal Playtime (&lt; 1h)</option>
            <option value={120}>Under 2 Hours (&lt; 2h)</option>
          </select>
        </div>

        {/* Random Picker Button */}
        <button className="btn btn-dice" onClick={onOpenPicker}>
          <Dices size={18} /> Pick For Me!
        </button>
      </div>

      {/* Quick Time Filters Pills */}
      <div className="filter-row" style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
          <Filter size={14} /> Time to Beat:
        </div>
        <div className="pills-group">
          <button
            className={`pill-btn ${timeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTimeFilter('all')}
          >
            All Times
          </button>
          <button
            className={`pill-btn ${timeFilter === 'short' ? 'active' : ''}`}
            onClick={() => setTimeFilter('short')}
          >
            Quick (&lt; 10 hrs)
          </button>
          <button
            className={`pill-btn ${timeFilter === 'medium' ? 'active' : ''}`}
            onClick={() => setTimeFilter('medium')}
          >
            Medium (10 - 25 hrs)
          </button>
          <button
            className={`pill-btn ${timeFilter === 'long' ? 'active' : ''}`}
            onClick={() => setTimeFilter('long')}
          >
            Long (25 - 50 hrs)
          </button>
          <button
            className={`pill-btn ${timeFilter === 'epic' ? 'active' : ''}`}
            onClick={() => setTimeFilter('epic')}
          >
            Epic (50+ hrs)
          </button>
        </div>
      </div>
    </div>
  );
}
