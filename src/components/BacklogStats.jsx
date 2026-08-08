import React from 'react';
import { Gamepad2, Star, Clock, Zap } from 'lucide-react';

export default function BacklogStats({ games }) {
  if (!games || games.length === 0) return null;

  const totalCount = games.length;

  // Calculate average review score
  const gamesWithReviews = games.filter(g => typeof g.reviewScore === 'number' && g.reviewScore > 0);
  const avgReview = gamesWithReviews.length > 0
    ? Math.round(gamesWithReviews.reduce((sum, g) => sum + g.reviewScore, 0) / gamesWithReviews.length)
    : 0;

  // Total Main Story completion hours
  const totalMainHours = games.reduce((sum, g) => {
    return sum + (g.hltb?.main ? g.hltb.main : 0);
  }, 0);

  // Quick picks under 10 hours
  const quickPicks = games.filter(g => g.hltb?.main && g.hltb.main <= 10).length;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon blue">
          <Gamepad2 size={24} />
        </div>
        <div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Unplayed Backlog Games</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon emerald">
          <Star size={24} />
        </div>
        <div>
          <div className="stat-value">{avgReview > 0 ? `${avgReview}%` : 'N/A'}</div>
          <div className="stat-label">Avg Review Score</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon purple">
          <Clock size={24} />
        </div>
        <div>
          <div className="stat-value">{Math.round(totalMainHours)}h</div>
          <div className="stat-label">Total Time to Beat (Main Story)</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon amber">
          <Zap size={24} />
        </div>
        <div>
          <div className="stat-value">{quickPicks}</div>
          <div className="stat-label">Quick Beat Games (&lt; 10h)</div>
        </div>
      </div>
    </div>
  );
}
