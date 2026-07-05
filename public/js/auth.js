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
  ['lb-signin-today','lb-signin-weekly','lb-signin-alltime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  loadStreak(user.id);
  hideAuth();
}

let signInPromptShown = false;

function onSignedOut() {
  document.getElementById('signin-btn').style.display = 'block';
  document.getElementById('user-pill').style.display = 'none';
  document.getElementById('streak-pill').style.display = 'none';
  // Show leaderboard sign-in buttons
  ['lb-signin-today','lb-signin-weekly','lb-signin-alltime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  });
  // Show sign-in prompt after short delay (avoids flash on first load)
  if (!signInPromptShown) {
    signInPromptShown = true;
    setTimeout(showSignInPrompt, 1200);
  }
}

function showSignInPrompt() {
  if (document.getElementById('signin-prompt')) return;
  const overlay = document.createElement('div');
  overlay.id = 'signin-prompt';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:#13131a;border:1px solid #2a2a3d;border-radius:16px;padding:32px 24px;max-width:360px;width:100%;text-align:center;position:relative">
      <div style="font-size:40px;margin-bottom:12px">🏆</div>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:8px;letter-spacing:-.3px">Sign in to save your scores</div>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:24px;line-height:1.6">Your points, streaks and leaderboard rank are only saved when you're signed in. Don't play and lose your score!</div>
      <button onclick="signInWithGoogle()" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px 16px;font-size:14px;font-weight:600;color:#fff;background:#1a1a24;border:1px solid #2a2a3d;border-radius:8px;cursor:pointer;font-family:inherit;margin-bottom:10px">
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.576c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.576 9 3.576z" fill="#EA4335"/></svg>
        Continue with Google
      </button>
      <button onclick="document.getElementById('signin-prompt').remove()" style="width:100%;padding:10px;font-size:12px;font-weight:600;color:#475569;background:none;border:none;cursor:pointer">Maybe later — play as guest</button>
    </div>
  `;
  document.body.appendChild(overlay);
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
    const { error } = await sb.from('daily_scores').upsert({
      user_id: user.id, date: CONFIG.today, game, score,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date,game' });
    if (error) throw error;
    updateDailyTotal(user.id);
  } catch {
    showSaveWarning();
  }
}

function showSaveWarning() {
  if (document.getElementById('save-warning')) return;
  const banner = document.createElement('div');
  banner.id = 'save-warning';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999;background:#7c2d12;color:#fed7aa;font-size:12px;font-weight:600;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #ea580c';
  banner.innerHTML = `
    <span>⚠️ Your scores aren't saving to the leaderboard. This is usually caused by a browser extension (ad blocker or privacy tool). Try disabling extensions for this site, or use Chrome incognito.</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:1px solid #ea580c;color:#fed7aa;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px;white-space:nowrap">Dismiss</button>
  `;
  document.body.appendChild(banner);
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
    syncStreakToDb(userId);
  } catch {}
}

async function syncStreakToDb(userId) {
  try {
    // Calculate current streak from localStorage — count consecutive days played
    let streak = 0;
    let longest = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const state = JSON.parse(localStorage.getItem(`et_state_${dateStr}`) || '{}');
      const played = state.quiz_done || state.cw_solved || state.heroes_done || state.decode_done;
      if (played) {
        streak++;
        longest = Math.max(longest, streak);
      } else if (i > 0) {
        break; // streak broken
      }
      d.setDate(d.getDate() - 1);
    }
    if (streak === 0) return;
    const { data: existing } = await sb.from('user_streaks').select('longest').eq('user_id', userId).maybeSingle();
    const newLongest = Math.max(longest, existing?.longest || 0);
    await sb.from('user_streaks').upsert({
      user_id: userId,
      streak_days: streak,
      longest: newLongest,
      last_played: CONFIG.today,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch {}
}
