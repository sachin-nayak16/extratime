// ─── APP INIT ──────────────────────────────────────────────
// Runs on page load. Initialises auth and all game modules.

document.addEventListener('DOMContentLoaded', async () => {
  // Init auth first
  await initAuth();

  // Restore score display from local state
  updateScoreDisplay();

  // Init all games
  initCrossword();
  initQuiz();
  initPredictor();
  initDecode();
  initHeroes();

  // Handle magic link redirect (Supabase sends back a token in the URL hash)
  const hash = window.location.hash;
  if (hash.includes('access_token')) {
    // Supabase handles this automatically via onAuthStateChange
    // Clean up the URL
    history.replaceState(null, '', window.location.pathname);
  }
});
