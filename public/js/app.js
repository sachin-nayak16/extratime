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
  const dateLabel = new Date(today).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

  const lines = [];
  lines.push(`⚽ Extra Time · ${dateLabel}`);
  lines.push(`playextratime.com`);
  lines.push('');

  // WC Heroes — show red blocks for wrong guesses, green for final correct
  if (state.heroes_done) {
    const g = state.heroes_guesses || 1;
    const blocks = Array.from({length: g - 1}, () => '🟥').join('') + '🟩';
    lines.push(`🏆 WC Heroes: ${g} guess${g === 1 ? '' : 'es'} ${blocks}`);
  } else {
    lines.push(`⬜ WC Heroes: Not played`);
  }

  // Decode This
  if (state.decode_done && state.decode_solved) {
    const pts = state.score_decode || 0;
    const att = state.decode_attempts || 1;
    lines.push(`🔍 Decode This: Solved in ${att} attempt${att === 1 ? '' : 's'} (${pts} pts)`);
  } else if (state.decode_done) {
    lines.push(`🔍 Decode This: Revealed`);
  } else {
    lines.push(`⬜ Decode This: Not played`);
  }

  // Quiz — fill 5 squares proportionally
  if (state.quiz_done) {
    const pts = state.score_quiz || 0;
    const filled = Math.round((pts / 50) * 5);
    const blocks = '🟩'.repeat(filled) + '⬜'.repeat(5 - filled);
    lines.push(`🧠 Quiz: ${pts}/50 pts ${blocks}`);
  } else {
    lines.push(`⬜ Quiz: Not played`);
  }

  // Crossword
  if (state.cw_solved)       lines.push(`📰 Crossword: Solved ✓`);
  else if (state.cw_played)  lines.push(`📰 Crossword: Not solved`);
  else                        lines.push(`⬜ Crossword: Not played`);


  lines.push('');
  const total = (state.score_heroes || 0)
    + (state.score_quiz || 0)
    + (state.score_decode || 0);
  lines.push(`Total: ${total} pts 🔥`);

  const text = lines.join('\n');

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showShareToast());
  } else {
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
