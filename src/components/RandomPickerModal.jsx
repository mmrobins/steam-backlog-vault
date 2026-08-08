import React, { useState } from 'react';
import { X, Dices, Play, ExternalLink, Sparkles, Clock, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RandomPickerModal({ isOpen, onClose, games }) {
  const [maxHours, setMaxHours] = useState('all');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  if (!isOpen) return null;

  const handleSpin = () => {
    setIsSpinning(true);
    setSelectedGame(null);

    // Filter games by max hours constraint if selected
    let candidates = games;
    if (maxHours !== 'all') {
      const limit = Number(maxHours);
      candidates = games.filter(g => g.hltb?.main && g.hltb.main <= limit);
    }

    if (candidates.length === 0) {
      candidates = games; // fallback to all
    }

    setTimeout(() => {
      const randomIdx = Math.floor(Math.random() * candidates.length);
      const chosen = candidates[randomIdx];
      setSelectedGame(chosen);
      setIsSpinning(false);

      // Trigger confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Dices className="gradient-text" /> What Should I Play Next?
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: 600 }}>
            How much free time do you have?
          </label>
          <div className="pills-group" style={{ marginBottom: '1.25rem' }}>
            <button
              className={`pill-btn ${maxHours === 'all' ? 'active' : ''}`}
              onClick={() => setMaxHours('all')}
            >
              Any Length
            </button>
            <button
              className={`pill-btn ${maxHours === '5' ? 'active' : ''}`}
              onClick={() => setMaxHours('5')}
            >
              Quick Session (&le; 5h)
            </button>
            <button
              className={`pill-btn ${maxHours === '15' ? 'active' : ''}`}
              onClick={() => setMaxHours('15')}
            >
              Weekend Game (&le; 15h)
            </button>
            <button
              className={`pill-btn ${maxHours === '35' ? 'active' : ''}`}
              onClick={() => setMaxHours('35')}
            >
              Medium (&le; 35h)
            </button>
          </div>

          <button
            className="btn btn-dice"
            style={{ width: '100%', padding: '0.85rem' }}
            onClick={handleSpin}
            disabled={isSpinning}
          >
            <Dices size={20} /> {isSpinning ? 'Selecting your next masterpiece...' : 'Roll the Backlog Dice! 🎲'}
          </button>
        </div>

        {selectedGame && (
          <div className="picker-card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
              <img
                src={selectedGame.header_image}
                alt={selectedGame.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {selectedGame.reviewScore && (
                <div className="score-badge high" style={{ top: '0.5rem', right: '0.5rem' }}>
                  <Star size={12} fill="#34d399" /> {selectedGame.reviewScore}%
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedGame.name}</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', margin: '0.85rem 0', color: '#66c0f4', fontWeight: 700 }}>
              <div>🎯 Main Story: {selectedGame.hltb?.main ? `${selectedGame.hltb.main} hours` : 'N/A'}</div>
              <div>🏆 100%: {selectedGame.hltb?.completionist ? `${selectedGame.hltb.completionist} hours` : 'N/A'}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <a
                href={`steam://run/${selectedGame.appid}`}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Play size={16} fill="#fff" /> Launch Game Now
              </a>
              <a
                href={`https://store.steampowered.com/app/${selectedGame.appid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <ExternalLink size={16} /> Store
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
