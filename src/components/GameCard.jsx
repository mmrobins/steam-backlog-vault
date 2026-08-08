import React from 'react';
import { Star, ExternalLink, Play, Clock } from 'lucide-react';

function formatPlaytime(minutes) {
  if (!minutes || minutes === 0) return null;
  if (minutes < 60) return `${minutes}m played`;
  const h = Math.round(minutes / 60 * 10) / 10;
  return `${h}h played`;
}

function formatReviewCount(n) {
  if (!n) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
}

export default function GameCard({ game }) {
  const {
    appid,
    name,
    header_image,
    reviewScore,
    reviewDesc,
    totalReviews,
    metacritic,
    hltb,
    genres,
    playtime_forever,
    release_date,
    developer,
    publisher
  } = game;

  const steamStoreUrl = `https://store.steampowered.com/app/${appid}`;
  const steamRunUrl = `steam://run/${appid}`;
  const isHighRating = reviewScore && reviewScore >= 85;
  const playedTime = formatPlaytime(playtime_forever);
  const reviewCountStr = formatReviewCount(totalReviews);

  // If dev and publisher are the same, only show once
  const devPubLine = developer && publisher && developer !== publisher
    ? `${developer} / ${publisher}`
    : developer || publisher || null;

  return (
    <div className="game-card">
      <div className="card-media">
        <img
          src={header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`}
          alt={name}
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Metacritic Badge */}
        {metacritic && (
          <span className="meta-score" title={`Metacritic Score: ${metacritic}`}>
            {metacritic}
          </span>
        )}

        {/* Playtime badge (top-right, below score) */}
        {playedTime && (
          <div className="playtime-badge" title="Your playtime">
            <Clock size={11} /> {playedTime}
          </div>
        )}

        {/* Steam Review Score Badge */}
        {reviewScore !== null && reviewScore !== undefined && (
          <div
            className={`score-badge ${isHighRating ? 'high' : 'medium'}`}
            title={reviewDesc}
          >
            <Star size={13} fill={isHighRating ? '#34d399' : '#fbbf24'} />
            <span>{reviewScore}%</span>
            {reviewCountStr && (
              <span className="review-count">({reviewCountStr})</span>
            )}
          </div>
        )}
      </div>

      <div className="card-body">
        <h3 className="game-title" title={name}>
          <a href={steamStoreUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            {name}
          </a>
        </h3>

        {/* Meta row: release date + dev/pub */}
        <div className="card-meta-row">
          {release_date && (
            <span className="card-meta-item">📅 {release_date}</span>
          )}
          {devPubLine && (
            <span className="card-meta-item" title={developer !== publisher && publisher ? `Dev: ${developer} · Pub: ${publisher}` : undefined}>
              🏢 {devPubLine}
            </span>
          )}
        </div>

        {/* HowLongToBeat Breakdown */}
        <div className="hltb-section">
          <div className="hltb-item">
            <span className="hltb-label" title="Main Story">🎯 Main</span>
            <span className="hltb-value">{hltb?.main ? `${hltb.main}h` : '—'}</span>
          </div>
          <div className="hltb-item">
            <span className="hltb-label" title="Main + Extra Content">🗡️ Extra</span>
            <span className="hltb-value">{hltb?.mainExtra ? `${hltb.mainExtra}h` : '—'}</span>
          </div>
          <div className="hltb-item">
            <span className="hltb-label" title="100% Completionist">🏆 100%</span>
            <span className="hltb-value">{hltb?.completionist ? `${hltb.completionist}h` : '—'}</span>
          </div>
        </div>

        {/* Genres & Tags */}
        {genres && genres.length > 0 && (
          <div className="genre-tags">
            {genres.slice(0, 3).map((genre, idx) => (
              <span key={idx} className="genre-tag">{genre}</span>
            ))}
          </div>
        )}

        {/* Card Actions */}
        <div className="card-actions">
          <a
            href={steamRunUrl}
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            title="Launch game directly in Steam app"
          >
            <Play size={14} fill="#fff" /> Play Game
          </a>
          <a
            href={steamStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            title="Open Steam Store Page"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
