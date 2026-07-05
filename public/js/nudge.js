// ─── CROSS-GAME NUDGE ──────────────────────────────────────
// Shows a "try another game" popup the first time a game is
// completed each day. Rotates the suggested game by day so
// it doesn't feel repetitive.

const NUDGE_GAMES = [
  { id: 'heroes',  label: 'WC Heroes',   emoji: '🏆', tab: 'heroes',  doneKey: 'heroes_done' },
  { id: 'decode',  label: 'Decode This', emoji: '🔍', tab: 'decode',  doneKey: 'decode_done' },
  { id: 'quiz',    label: 'Quiz',        emoji: '🧠', tab: 'quiz',    doneKey: 'quiz_done'   },
  { id: 'cw',      label: 'Crossword',   emoji: '📰', tab: 'cw',      doneKey: 'cw_solved'   },
];

// Pick today's suggested game by rotating through the list using day-of-year
function getTodaySuggestion(completedGameId) {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const unplayed = NUDGE_GAMES.filter(g => {
    if (g.id === completedGameId) return false;
    const state = getState();
    return !state[g.doneKey];
  });
  if (!unplayed.length) return null;
  return unplayed[dayOfYear % unplayed.length];
}

// Call this from each game's completion handler
// gameId: 'heroes' | 'decode' | 'quiz' | 'cw'
function maybeShowNudge(gameId) {
  const nudgeKey = `nudge_shown_${CONFIG.today}_${gameId}`;
  if (sessionStorage.getItem(nudgeKey)) return; // already shown this session
  sessionStorage.setItem(nudgeKey, '1');

  const suggestion = getTodaySuggestion(gameId);
  if (!suggestion) return; // all games done — no nudge needed

  showNudge(gameId, suggestion);
}

function showNudge(fromGameId, suggestion) {
  if (document.getElementById('game-nudge')) return;

  const fromGame = NUDGE_GAMES.find(g => g.id === fromGameId);
  const allDone = NUDGE_GAMES.every(g => {
    const state = getState();
    return g.id === fromGameId || state[g.doneKey];
  });

  const overlay = document.createElement('div');
  overlay.id = 'game-nudge';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease';

  overlay.innerHTML = `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:28px 24px;max-width:340px;width:100%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <button onclick="document.getElementById('game-nudge').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:18px;color:var(--text-3);cursor:pointer;line-height:1">✕</button>

      <div style="font-size:36px;margin-bottom:8px">${fromGame?.emoji || '⭐'}</div>
      <div style="font-size:17px;font-weight:800;color:var(--text);margin-bottom:6px;letter-spacing:-.3px">
        ${fromGame?.label || 'Game'} complete!
      </div>
      <div style="font-size:13px;color:var(--text-3);margin-bottom:22px;line-height:1.5">
        Great job. There's more to play today —<br>why not try <strong style="color:var(--text)">${suggestion.emoji} ${suggestion.label}</strong>?
      </div>

      <button onclick="
        document.getElementById('game-nudge').remove();
        const btn = document.querySelector('.tab[onclick*=\\'${suggestion.tab}\\']');
        if (btn) showTab('${suggestion.tab}', btn);
      " style="width:100%;padding:13px;background:var(--green);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:10px">
        ${suggestion.emoji} Play ${suggestion.label}
      </button>

      <button onclick="document.getElementById('game-nudge').remove()" style="width:100%;padding:10px;font-size:12px;font-weight:600;color:var(--text-3);background:none;border:none;cursor:pointer">
        Maybe later
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
