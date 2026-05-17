// ─── APP INIT ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  updateScoreDisplay();

  // Check today's content from Supabase, then init all games
  let todayContent = null;
  try {
    const { data } = await sb
      .from('daily_content')
      .select('*')
      .eq('date', CONFIG.today)
      .maybeSingle();
    todayContent = data;
  } catch { /* silent — games fall back to samples */ }

  // Show coming-soon banners for missing content
  showContentBanners(todayContent);

  // Init all games
  initCrossword(todayContent);
  initQuiz();
  initPredictor();
  initDecode();
  initHeroes();

  // Handle magic link redirect
  if (window.location.hash.includes('access_token')) {
    history.replaceState(null, '', window.location.pathname);
  }
});

// ── CONTENT BANNERS ────────────────────────────────────────
// Shows a "content coming soon" notice on any tab without today's content.
// Games with sample fallbacks still work — banner is informational only.

function showContentBanners(content) {
  const checks = [
    { key: 'crossword',      pane: 'cw',     label: 'Daily Crossword' },
    { key: 'quiz_questions', pane: 'quiz',   label: 'Daily Quiz' },
    { key: 'matches',        pane: 'pred',   label: 'Super Predictor' },
    { key: 'riddle',         pane: 'decode', label: 'Decode This' },
    { key: 'wc_hero',        pane: 'heroes', label: 'WC Heroes' },
  ];

  checks.forEach(({ key, pane, label }) => {
    const hasContent = content?.[key];
    const paneEl = document.getElementById(`pane-${pane}`);
    if (!paneEl) return;

    // Remove any existing banner
    const existing = paneEl.querySelector('.coming-soon-banner');
    if (existing) existing.remove();

    if (!hasContent) {
      const banner = document.createElement('div');
      banner.className = 'coming-soon-banner';
      banner.innerHTML = `
        <div class="csb-icon">⏳</div>
        <div>
          <div class="csb-title">Today's ${label} is coming soon</div>
          <div class="csb-sub">Check back later — content is added daily. In the meantime you can play yesterday's sample below.</div>
        </div>
      `;
      // Insert at top of pane, after the title
      const title = paneEl.querySelector('.gtitle');
      if (title?.nextSibling) paneEl.insertBefore(banner, title.nextSibling);
      else paneEl.prepend(banner);
    }
  });
}
