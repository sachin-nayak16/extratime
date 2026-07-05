// ─── LEADERBOARD ───────────────────────────────────────────

let lbLoaded = false;

async function loadLeaderboard() {
  if (lbLoaded) return;
  lbLoaded = true;
  await Promise.all([
    loadLBToday(),
    loadLBWeekly(),
    loadLBAllTime(),
  ]);
}

async function loadLBToday() {
  const container = document.getElementById('lb-today-card');
  try {
    const { data, error } = await sb
      .from('leaderboard_view_today')
      .select('username, total_score, streak_days, avatar_color')
      .order('total_score', { ascending: false })
      .limit(10);

    if (error || !data?.length) {
      container.innerHTML = '<p class="loading">No scores yet today — be the first!</p>';
      return;
    }
    renderLB(container, data);
  } catch {
    // Fallback sample data
    renderLB(container, [
      { username:'rohankapse',   total_score:480, streak_days:7,  avatar_color:'#fef9c3' },
      { username:'soccermind',   total_score:460, streak_days:5,  avatar_color:'#ede9fe' },
      { username:'goalfever26',  total_score:445, streak_days:12, avatar_color:'#dcfce7' },
      { username:'tikitaka_fan', total_score:430, streak_days:3,  avatar_color:'#fee2e2' },
      { username:'mundialvibe',  total_score:410, streak_days:7,  avatar_color:'#e0f2fe' },
    ]);
  }
}

async function loadLBWeekly() {
  const container = document.getElementById('lb-weekly-card');
  try {
    const { data, error } = await sb
      .from('leaderboard_weekly_view')
      .select('username, total_score, streak_days, avatar_color')
      .order('total_score', { ascending: false })
      .limit(10);

    if (error || !data?.length) {
      container.innerHTML = '<p class="loading">No scores yet this week — be the first!</p>';
      return;
    }
    renderLB(container, data);
  } catch {
    container.innerHTML = '<p class="loading">Could not load weekly scores.</p>';
  }
}

async function loadLBAllTime() {
  const container = document.getElementById('lb-alltime-card');
  try {
    const { data, error } = await sb
      .from('leaderboard_alltime_view')
      .select('username, total_score, streak_days, avatar_color')
      .order('total_score', { ascending: false })
      .limit(10);

    if (error || !data?.length) {
      container.innerHTML = '<p class="loading">No all-time scores yet.</p>';
      return;
    }
    renderLB(container, data);
  } catch {
    renderLB(container, [
      { username:'goalfever26',  total_score:12840, streak_days:12, avatar_color:'#dcfce7' },
      { username:'rohankapse',   total_score:11200, streak_days:7,  avatar_color:'#fef9c3' },
      { username:'mundialvibe',  total_score:9750,  streak_days:7,  avatar_color:'#e0f2fe' },
      { username:'soccermind',   total_score:8900,  streak_days:5,  avatar_color:'#ede9fe' },
      { username:'tikitaka_fan', total_score:7600,  streak_days:3,  avatar_color:'#fee2e2' },
    ]);
  }
}

function renderLB(container, data) {
  const rankClasses = ['gold','silver','bronze','',''];
  container.innerHTML = '';
  data.forEach((p, i) => {
    const initials = (p.username||'??').slice(0,2).toUpperCase();
    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <span class="lb-rank ${rankClasses[i]||''}">${i+1}</span>
      <div class="lb-avatar" style="background:${p.avatar_color||'#e0f2fe'};color:#065f46">${initials}</div>
      <div style="flex:1">
        <div class="lb-name">${p.username}</div>
        <div class="lb-sub">🔥 ${p.streak_days||0} day streak</div>
      </div>
      <span class="lb-pts">${(p.total_score||0).toLocaleString()}</span>
    `;
    container.appendChild(row);
  });
}

function toggleLB(view) {
  ['today','weekly','alltime'].forEach(v => {
    document.getElementById(`lb-${v}`).style.display = view===v ? 'block' : 'none';
    document.getElementById(`tog-${v}`).classList.toggle('active', view===v);
  });
}
