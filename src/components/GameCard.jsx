import { Star, ExternalLink, Play, Clock, ThumbsUp } from 'lucide-react';

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

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const POPULAR_HLTB_IDS = {
  "portal 2": 7231,
  "portal": 7230,
  "the witcher 3: wild hunt": 10270,
  "hollow knight": 26286,
  "hades": 59746,
  "elden ring": 68151,
  "god of war": 38050,
  "celeste": 42818,
  "stardew valley": 24009,
  "terraria": 9853,
  "subnautica": 23023,
  "cyberpunk 2077": 46397,
  "red dead redemption 2": 27100,
  "mass effect legendary edition": 90647,
  "bioshock infinite": 1068,
  "doom": 2708,
  "outer wilds": 57523,
  "disco elysium": 57335,
  "half-life 2": 4078,
  "sekiro: shadows die twice": 57425
};

export default function GameCard({ game }) {
  const {
    appid,
    name,
    header_image,
    reviewScore,
    reviewDesc,
    totalReviews,
    totalReviewsEnglish,
    metacritic,
    metacriticUrl,
    hltb,
    genres,
    playtime_forever,
    release_date,
    developer,
    publisher,
    isSteamCached,
    isHltbCached
  } = game;

  const steamStoreUrl = `https://store.steampowered.com/app/${appid}`;
  const steamRunUrl = `steam://run/${appid}`;
  const isHighRating = reviewScore && reviewScore >= 85;
  const playedTime = formatPlaytime(playtime_forever);
  const reviewCountStr = formatReviewCount(totalReviews);
  const reviewCountEnglishStr = formatReviewCount(totalReviewsEnglish);

  const resolvedHltbId = hltb?.hltbId || POPULAR_HLTB_IDS[name.toLowerCase().trim()];
  const hltbLink = resolvedHltbId
    ? `https://howlongtobeat.com/game/${resolvedHltbId}`
    : `https://howlongtobeat.com/?q=${encodeURIComponent(name)}`;

  const resolvedMetacriticUrl = metacriticUrl || (metacritic ? `https://www.metacritic.com/game/pc/${slugify(name)}` : null);

  const devPubLine = developer && publisher && developer !== publisher
    ? `${developer} / ${publisher}`
    : developer || publisher || null;

  // 1. Neither is cached: Show full skeleton card
  if (!isSteamCached && !isHltbCached) {
    return (
      <div className="game-card skeleton-card">
        <div className="card-media skeleton-media">
          <img
            src={`https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`}
            alt={name}
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
            }}
          />
          <div className="skeleton-media-overlay">
            <span className="skeleton-pulse-text">Syncing details...</span>
          </div>
        </div>
        <div className="card-body">
          <h3 className="game-title" style={{ marginBottom: '0.5rem' }}>{name}</h3>
          <div className="skeleton-bar" style={{ width: '65%', height: '14px', marginBottom: '0.8rem' }}></div>
          <div className="skeleton-bar" style={{ width: '100%', height: '35px', marginBottom: '0.8rem' }}></div>
          <div className="skeleton-bar" style={{ width: '40%', height: '12px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`game-card ${(!isSteamCached || !isHltbCached) ? 'partial-sync' : ''}`}>
      <div className="card-media">
        <img
          src={header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`}
          alt={name}
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Metacritic Badge (Link if url is available or generated) */}
        {isSteamCached && metacritic && (
          resolvedMetacriticUrl ? (
            <a
              href={resolvedMetacriticUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="meta-score-link"
              style={{ textDecoration: 'none' }}
            >
              <span className="meta-score" title={`View Metacritic page (Score: ${metacritic})`}>
                {metacritic}
              </span>
            </a>
          ) : (
            <span className="meta-score" title={`Metacritic Score: ${metacritic}`}>
              {metacritic}
            </span>
          )
        )}

        {/* Playtime badge */}
        {playedTime && (
          <div className="playtime-badge" title="Your playtime">
            <Clock size={11} /> {playedTime}
          </div>
        )}

        {/* Steam Review Score Badge / Progress Indicator */}
        {isSteamCached ? (
          reviewScore !== null && reviewScore !== undefined && (
            <div className={`score-badge ${isHighRating ? 'high' : 'medium'}`} title={reviewDesc}>
              <Star size={13} fill={isHighRating ? '#34d399' : '#fbbf24'} />
              <span>{reviewScore}%</span>
            </div>
          )
        ) : (
          <div className="score-badge syncing" style={{ background: 'rgba(9, 13, 22, 0.85)' }}>
            <span className="pulse-dot score-dot"></span>
          </div>
        )}
      </div>

      <div className="card-body">
        <h3 className="game-title" title={name}>
          <a href={steamStoreUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            {name}
          </a>
        </h3>

        {/* Meta row: release date + dev/pub + review details */}
        <div className="card-meta-row">
          {isSteamCached ? (
            <>
              {reviewDesc && reviewDesc !== 'No Reviews' && (
                <span className="card-meta-item" title={`${totalReviewsEnglish ? `${totalReviewsEnglish.toLocaleString()} English reviews / ` : ''}${totalReviews.toLocaleString()} global reviews`}>
                  <ThumbsUp size={12} style={{ marginRight: '4px' }} /> {reviewDesc} {totalReviewsEnglish ? `(${reviewCountEnglishStr} EN / ${reviewCountStr} global)` : `(${reviewCountStr} global)`}
                </span>
              )}
              {release_date && (
                <span className="card-meta-item">📅 {release_date}</span>
              )}
              {devPubLine && (
                <span className="card-meta-item" title={developer !== publisher && publisher ? `Dev: ${developer} · Pub: ${publisher}` : undefined}>
                  🏢 {devPubLine}
                </span>
              )}
            </>
          ) : (
            <div className="skeleton-bar" style={{ width: '80%', height: '12px', margin: '2px 0' }}></div>
          )}
        </div>

        {/* HowLongToBeat Breakdown / Progress Indicator */}
        {isHltbCached ? (
          <a
            href={hltbLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hltb-link-wrapper"
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div className="hltb-section clickable-hltb" title="Click to view HowLongToBeat details">
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
          </a>
        ) : (
          <div className="hltb-section syncing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '39px', color: 'var(--text-muted)', fontSize: '0.78rem', gap: '0.4rem' }}>
            <span className="pulse-dot hltb-dot"></span> Syncing completion times...
          </div>
        )}

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
