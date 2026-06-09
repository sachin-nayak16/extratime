// Clear OAuth hash immediately on load to prevent back-button 400 errors
(function() {
  if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
    history.replaceState(null, '', window.location.pathname);
  }
})();

// ─── APP INIT ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  updateScoreDisplay();

  // Check for preview mode (?preview=YYYY-MM-DD)
  const urlParams = new URLSearchParams(window.location.search);
  const previewDate = urlParams.get('preview');
  const loadDate = previewDate || CONFIG.today;

  if (previewDate) {
    // Show preview banner
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#7c3aed;color:#fff;text-align:center;padding:6px;font-size:11px;font-weight:600;position:sticky;top:0;z-index:200';
    banner.textContent = `👁 PREVIEW MODE — Showing content for ${previewDate}`;
    document.body.insertBefore(banner, document.body.firstChild);
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Load content for loadDate (today or preview date)
  let todayContent = null;
  let yesterdayContent = null;
  try {
    const { data } = await sb.from('daily_content').select('*').eq('date', loadDate).maybeSingle();
    todayContent = data;
  } catch {}

  // Load yesterday's content for predictor results (only in normal mode)
  if (!previewDate) {
    try {
      const { data } = await sb.from('daily_content').select('*').eq('date', yesterdayStr).maybeSingle();
      yesterdayContent = data;
    } catch {}
  }

  // Show coming-soon banners where needed
  showContentBanners(todayContent);

  // Init all games
  initCrossword(todayContent);
  initQuiz();
  initPredictor(todayContent, yesterdayContent);
  initDecode();
  initHeroes(todayContent);

  // Handle OAuth redirect — clear hash so back button doesn't re-trigger Google
  if (window.location.hash.includes('access_token') || window.location.hash.includes('error_description')) {
    history.replaceState(null, '', window.location.pathname);
  }

  // Restore the tab the user was on before refresh
  restoreActiveTab();
});

// ── CONTENT BANNERS ────────────────────────────────────────
function showContentBanners(content) {
  const checks = [
    { key:'crossword',      pane:'cw',     label:'Daily Crossword' },
    { key:'quiz_questions', pane:'quiz',   label:'Daily Quiz' },
    { key:'riddle',         pane:'decode', label:'Decode This' },
    { key:'wc_hero',        pane:'heroes', label:'WC Heroes' },
  ];
  checks.forEach(({ key, pane, label }) => {
    const paneEl = document.getElementById(`pane-${pane}`);
    if (!paneEl) return;
    const existing = paneEl.querySelector('.coming-soon-banner');
    if (existing) existing.remove();
    if (!content?.[key]) {
      const banner = document.createElement('div');
      banner.className = 'coming-soon-banner';
      banner.innerHTML = `
        <div class="csb-icon">⏳</div>
        <div>
          <div class="csb-title">Today's ${label} is coming soon</div>
          <div class="csb-sub">Check back later — content is added daily. You can still play the sample below.</div>
        </div>`;
      const title = paneEl.querySelector('.gtitle');
      if (title?.nextSibling) paneEl.insertBefore(banner, title.nextSibling);
      else paneEl.prepend(banner);
    }
  });
}

// ── SHAREABLE SCORECARD ────────────────────────────────────
function shareScore(game) {
  const state = getState();
  const today = CONFIG.today;
  const dateLabel = new Date(today).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

  // Build scorecard text
  const lines = [];
  lines.push(`⚽ Extra Time — ${dateLabel}`);
  lines.push(`extratime-eight.vercel.app`);
  lines.push('');

  // Crossword
  if (state.cw_solved) lines.push(`🟩 Crossword: Solved ✓`);
  else if (state.cw_played) lines.push(`🟥 Crossword: Not solved`);
  else lines.push(`⬜ Crossword: Not played`);

  // Quiz
  if (state.quiz_done) {
    const pts = state.score_quiz || 0;
    const stars = pts >= 50 ? '⭐⭐⭐' : pts >= 30 ? '⭐⭐' : pts >= 10 ? '⭐' : '';
    lines.push(`🟩 Quiz: ${pts}/50 pts ${stars}`);
  } else lines.push(`⬜ Quiz: Not played`);

  // Predictor
  if (state.pred_locked) {
    const pts = typeof state.score_pred === 'number' ? `${state.score_pred} pts` : 'Locked 🔒';
    lines.push(`🟩 Predictor: ${pts}`);
  } else lines.push(`⬜ Predictor: Not played`);

  // Decode This
  if (state.decode_done) lines.push(`🟩 Decode This: Solved ✓`);
  else if (state.decode_played) lines.push(`🟥 Decode This: Not solved`);
  else lines.push(`⬜ Decode This: Not played`);

  // WC Heroes
  if (state.heroes_done) {
    const guesses = state.heroes_guesses || 0;
    const blocks = '🟩'.repeat(Math.min(guesses-1, 6)).padEnd(6, '🟥').slice(0, guesses-1) + '🟩';
    lines.push(`🟩 WC Heroes: ${guesses} guess${guesses===1?'':'es'} ${blocks}`);
  } else lines.push(`⬜ WC Heroes: Not played`);

  lines.push('');
  lines.push(`Total: ${state.score_quiz||0} + ${typeof state.score_pred==='number'?state.score_pred:0} pts`);

  const text = lines.join('\n');

  // Copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showShareToast());
  } else {
    // Fallback
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showShareToast();
  }
}

function showShareToast() {
  let t = document.getElementById('share-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'share-toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#065f46;color:#ecfdf5;padding:10px 20px;border-radius:99px;font-size:13px;font-weight:500;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,.2)';
    document.body.appendChild(t);
  }
  t.textContent = '✓ Scorecard copied to clipboard!';
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2500);
}
