// ─── SUPABASE CONFIG ───────────────────────────────────────
// Replace these with your actual Supabase project values
// Found in: Supabase Dashboard → Project Settings → API
const SUPABASE_URL = 'https://ttrljkgdxhsczcrqluzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0cmxqa2dkeGhzY3pjcnFsdXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTY0MTcsImV4cCI6MjA5NDU5MjQxN30.WxLBQXqhqvSNN1gsOO_jGjRNDx6mrKJkRTQmJTFQjgE';

// ─── INIT SUPABASE ─────────────────────────────────────────
let sb;
try {
  const { createClient } = supabase;
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'extratime-auth',
    }
  });
} catch(e) {
  console.error('Supabase failed to initialise:', e);
}

// ─── APP CONFIG ────────────────────────────────────────────
// Use local date (not UTC) so IST users get the correct date after midnight
const _now = new Date();
const _localDate = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;

const CONFIG = {
  siteName: 'Extra Time',
  siteUrl: 'https://www.playextratime.com',
  today: _localDate,
};

// ─── SCORING ───────────────────────────────────────────────
const SCORING = {
  quiz: {
    perQuestion: 10,
    assistCost: 5,
  },
  predictor: {
    exactScore: 5,
    correctOutcome: 3,
    correctGoalDiff: 3,
    scorerForward: 2,
    scorerMidfielder: 3,
    scorerDefender: 4,
  },
  heroes: {
    // Score = Math.round((1 / guesses) * 100 * 4)
    formula: (guesses) => Math.round((1 / guesses) * 100 * 4),
  },
};

// ─── DAILY STATE ───────────────────────────────────────────
// Tracks what the user has completed today
// Persisted to localStorage, synced to Supabase when signed in
const STATE_KEY = `et_state_${CONFIG.today}`;

function getState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
  } catch { return {}; }
}

function saveState(updates) {
  const state = { ...getState(), ...updates };
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  return state;
}

// ─── SCORE TRACKING ────────────────────────────────────────
function updateScoreDisplay() {
  const state = getState();
  let total = 0;
  ['quiz', 'pred', 'heroes', 'decode'].forEach(key => {
    const el = document.getElementById(`sc-${key}`);
    const score = state[`score_${key}`];
    if (el) {
      if (score !== undefined) {
        el.textContent = score === 'Locked' ? 'Locked' : `${score}pts`;
        if (typeof score === 'number') total += score;
      }
    }
  });
  // Crossword status — tick if solved, pending if played but not solved, — if not started
  const cwEl = document.getElementById('sc-crossword');
  if (cwEl) {
    if (state.cw_solved) cwEl.textContent = '✓';
    else if (state.cw_played) cwEl.textContent = '…';
    else cwEl.textContent = '—';
  }
  const totalEl = document.getElementById('sc-total');
  if (totalEl) totalEl.textContent = total;
}

// ─── TAB SWITCHER ──────────────────────────────────────────
function showTab(name, btn) {
  sessionStorage.setItem('et_active_tab', name);
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`pane-${name}`).classList.add('active');
  btn.classList.add('active');
  if (name === 'cw') document.getElementById('hidden-inp').focus();
  if (name === 'lb') loadLeaderboard();
}

function restoreActiveTab() {
  const saved = sessionStorage.getItem('et_active_tab');
  if (!saved || saved === 'heroes') return;
  const btn = document.querySelector(`.tab[onclick*="'${saved}'"]`);
  if (btn) showTab(saved, btn);
}

// ─── SHARE ─────────────────────────────────────────────────
function shareScore(game) {
  const state = getState();
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('share-date').textContent = date;
  const scores = [];
  if (state.cw_solved) scores.push(`Crossword ✓ (${state.cw_attempts || 0} attempts)`);
  if (state.score_quiz !== undefined) scores.push(`Quiz: ${state.score_quiz}pts`);
  if (state.score_pred === 'Locked') scores.push(`Predictor: Locked ✓`);
  if (state.decode_solved) scores.push(`Decode This ✓`);
  if (state.score_heroes !== undefined) scores.push(`WC Heroes: ${state.score_heroes}pts`);
  document.getElementById('share-scores').innerHTML = scores.join('<br>') || 'No scores yet today';
  document.getElementById('share-modal').style.display = 'flex';
}

function hideShare() {
  document.getElementById('share-modal').style.display = 'none';
}

function copyShareCard() {
  const state = getState();
  const date = new Date().toLocaleDateString('en-GB');
  let text = `Extra Time — ${date}\n`;
  if (state.cw_solved) text += `Crossword ✓\n`;
  if (state.score_quiz !== undefined) text += `Quiz: ${state.score_quiz}pts\n`;
  if (state.score_heroes !== undefined) text += `WC Heroes: ${state.score_heroes}pts\n`;
  text += `\n${CONFIG.siteUrl}`;
  navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!')).catch(() => alert('Copy failed — please copy manually.'));
}

// ── STREAK HELPER ─────────────────────────────────────────
// Returns the streak value from yesterday's saved state for a given key
// Used by all games to correctly compute consecutive day streaks
function getPrevStreak(streakKey) {
  try {
    const yd = new Date();
    yd.setDate(yd.getDate() - 1);
    const ydStr = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;
    const ydState = JSON.parse(localStorage.getItem(`et_state_${ydStr}`)) || {};
    return ydState[streakKey] || 0;
  } catch { return 0; }
}
