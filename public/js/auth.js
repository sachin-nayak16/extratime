// ─── AUTH ──────────────────────────────────────────────────

async function initAuth() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) onSignedIn(session.user);
    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // Create profile if doesn't exist
        await ensureProfile(session.user);
        onSignedIn(session.user);
      } else onSignedOut();
    });
  } catch(e) { console.error('Auth init error:', e); }
}

async function ensureProfile(user) {
  try {
    const { data } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!data) {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Player';
      await sb.from('profiles').insert({ id: user.id, username });
    }
  } catch(e) { console.error('Profile error:', e); }
}

function onSignedIn(user) {
  document.getElementById('signin-btn').style.display = 'none';
  document.getElementById('user-pill').style.display = 'flex';
  document.getElementById('user-name').textContent = user.user_metadata?.username || user.email?.split('@')[0] || 'Player';
  // Hide leaderboard sign-in buttons
  ['lb-signin-today','lb-signin-alltime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  loadStreak(user.id);
  hideAuth();
}

function onSignedOut() {
  document.getElementById('signin-btn').style.display = 'block';
  document.getElementById('user-pill').style.display = 'none';
  document.getElementById('streak-pill').style.display = 'none';
  // Show leaderboard sign-in buttons
  ['lb-signin-today','lb-signin-alltime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  });
}

async function loadStreak(userId) {
  try {
    const { data } = await sb.from('user_streaks').select('streak_days').eq('user_id', userId).maybeSingle();
    if (data?.streak_days > 0) {
      document.getElementById('streak-val').textContent = data.streak_days;
      document.getElementById('streak-pill').style.display = 'block';
    }
  } catch {}
}

function showAuth() { document.getElementById('auth-modal').style.display = 'flex'; }
function hideAuth() { document.getElementById('auth-modal').style.display = 'none'; }

async function signInWithGoogle() {
  const fb = document.getElementById('auth-fb');
  fb.style.display = 'none';
  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) throw error;
  } catch(e) {
    fb.className = 'fb err';
    fb.textContent = 'Error: ' + e.message;
    fb.style.display = 'block';
  }
}

async function signIn() {
  // Keep as fallback but not shown in UI
  const email = document.getElementById('auth-email')?.value?.trim();
  if (!email) return;
  const fb = document.getElementById('auth-fb');
  try {
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
    fb.className = 'fb ok';
    fb.textContent = '✓ Magic link sent! Check your email.';
    fb.style.display = 'block';
  } catch(e) {
    fb.className = 'fb err';
    fb.textContent = 'Error: ' + e.message;
    fb.style.display = 'block';
  }
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
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('daily_scores').upsert({
      user_id: user.id, date: CONFIG.today, game, score,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date,game' });
    updateDailyTotal(user.id);
  } catch {}
}

async function updateDailyTotal(userId) {
  try {
    const { data } = await sb.from('daily_scores').select('score').eq('user_id', userId).eq('date', CONFIG.today);
    if (!data) return;
    const total = data.reduce((sum, row) => sum + (typeof row.score === 'number' ? row.score : 0), 0);
    await sb.from('leaderboard').upsert({
      user_id: userId, date: CONFIG.today, total_score: total,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' });
  } catch {}
}
