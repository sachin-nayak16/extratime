// ─── AUTH ──────────────────────────────────────────────────

async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) onSignedIn(session.user);

  sb.auth.onAuthStateChange((_event, session) => {
    if (session) onSignedIn(session.user);
    else onSignedOut();
  });
}

function onSignedIn(user) {
  document.getElementById('signin-btn').style.display = 'none';
  document.getElementById('user-pill').style.display = 'flex';
  document.getElementById('user-name').textContent = user.user_metadata?.username || user.email?.split('@')[0] || 'Player';
  loadStreak(user.id);
}

function onSignedOut() {
  document.getElementById('signin-btn').style.display = 'block';
  document.getElementById('user-pill').style.display = 'none';
  document.getElementById('streak-pill').style.display = 'none';
}

async function loadStreak(userId) {
  const { data } = await sb
    .from('user_streaks')
    .select('streak_days')
    .eq('user_id', userId)
    .single();
  if (data?.streak_days > 0) {
    document.getElementById('streak-val').textContent = data.streak_days;
    document.getElementById('streak-pill').style.display = 'block';
  }
}

function showAuth() {
  document.getElementById('auth-modal').style.display = 'flex';
}

function hideAuth() {
  document.getElementById('auth-modal').style.display = 'none';
}

async function signIn() {
  const email = document.getElementById('auth-email').value.trim();
  const username = document.getElementById('auth-username').value.trim();
  const fb = document.getElementById('auth-fb');
  fb.style.display = 'none';

  if (!email) { showFb(fb, 'err', 'Please enter your email address.'); return; }

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      data: { username: username || email.split('@')[0] },
      emailRedirectTo: window.location.origin,
    }
  });

  if (error) { showFb(fb, 'err', error.message); return; }
  showFb(fb, 'ok', 'Magic link sent! Check your email and click the link to sign in.');
}

async function signOut() {
  await sb.auth.signOut();
}

function showFb(el, type, msg) {
  el.className = `fb ${type}`;
  el.textContent = msg;
  el.style.display = 'block';
}

async function saveScoreToDb(game, score) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('daily_scores').upsert({
    user_id: user.id,
    date: CONFIG.today,
    game,
    score,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date,game' });
  updateDailyTotal(user.id);
}

async function updateDailyTotal(userId) {
  const { data } = await sb
    .from('daily_scores')
    .select('score')
    .eq('user_id', userId)
    .eq('date', CONFIG.today);
  if (!data) return;
  const total = data.reduce((sum, row) => sum + (typeof row.score === 'number' ? row.score : 0), 0);
  await sb.from('leaderboard').upsert({
    user_id: userId,
    date: CONFIG.today,
    total_score: total,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' });
}
