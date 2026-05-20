// ─── APP INIT ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  updateScoreDisplay();

  // Get today's date and yesterday's date
  const today = CONFIG.today;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Load today's content
  let todayContent = null;
  let yesterdayContent = null;
  try {
    const { data } = await sb.from('daily_content').select('*').eq('date', today).maybeSingle();
    todayContent = data;
  } catch {}

  // Load yesterday's content for predictor results
  try {
    const { data } = await sb.from('daily_content').select('*').eq('date', yesterdayStr).maybeSingle();
    yesterdayContent = data;
  } catch {}

  // Show coming-soon banners where needed
  showContentBanners(todayContent);

  // Init all games
  initCrossword(todayContent);
  initQuiz();
  initPredictor(todayContent, yesterdayContent);
  initDecode(todayContent);
  initHeroes(todayContent);

  // Handle magic link redirect
  if (window.location.hash.includes('access_token')) {
    history.replaceState(null, '', window.location.pathname);
  }
});

// ── CONTENT BANNERS ────────────────────────────────────────
function showContentBanners(content) {
  const checks = [
    { key:'crossword',      pane:'cw',     label:'Daily Crossword' },
    { key:'quiz_questions', pane:'quiz',   label:'Daily Quiz' },
    { key:'matches',        pane:'pred',   label:'Super Predictor' },
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
