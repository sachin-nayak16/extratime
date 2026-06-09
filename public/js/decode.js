// ─── DECODE THIS ──────────────────────────────────────────

const DECODE_SCORING = [100, 85, 70, 55, 40, 25]; // pts by attempt (1st, 2nd, 3rd...)

let decodeRiddles = []; // all riddles across dates
let decodeAttempts = 0;

async function initDecode() {
  const state = getState();
  buildDecodeStats(state);

  try {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60*24*60*60*1000).toISOString().split('T')[0];
    const { data } = await sb.from('daily_content')
      .select('date, riddle')
      .gte('date', sixtyDaysAgo)
      .lte('date', CONFIG.today)
      .not('riddle', 'is', null)
      .order('date', { ascending: false });

    decodeRiddles = (data || []).filter(r => r.riddle?.riddle);
  } catch {
    decodeRiddles = [];
  }

  renderDecodeList();
}

function renderDecodeList() {
  const pane = document.getElementById('pane-decode');
  // Clear existing content below stats
  let existing = document.getElementById('decode-list');
  if (existing) existing.remove();

  const list = document.createElement('div');
  list.id = 'decode-list';

  if (!decodeRiddles.length) {
    list.innerHTML = `<p style="font-size:13px;color:var(--text-3);padding:12px 0">No riddles yet — check back soon!</p>`;
    pane.appendChild(list);
    return;
  }

  decodeRiddles.forEach(({ date, riddle }) => {
    const isToday = date === CONFIG.today;
    const stateKey = `et_state_${date}`;
    const dayState = JSON.parse(localStorage.getItem(stateKey) || '{}');
    const solved = dayState.decode_done && dayState.decode_solved;
    const gaveUp = dayState.decode_gave_up;
    const dateLabel = new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const typeLabel = riddle.type === 'match' ? '⚔️ Match' : '👤 Player';

    const card = document.createElement('div');
    card.className = `decode-card${solved ? ' solved' : gaveUp ? ' gave-up' : ''}`;
    card.innerHTML = `
      <div class="decode-card-meta">
        <span class="decode-card-date">${isToday ? '📌 Today' : dateLabel}</span>
        <span class="decode-card-type">${typeLabel}</span>
        ${solved ? `<span class="decode-card-status ok">✓ Solved · ${dayState.score_decode || 0} pts</span>` : ''}
        ${gaveUp ? `<span class="decode-card-status gave-up">Revealed</span>` : ''}
      </div>
      <div class="decode-card-preview">${riddle.riddle.slice(0, 80)}${riddle.riddle.length > 80 ? '...' : ''}</div>
    `;
    card.onclick = () => openDecodeRiddle(date, riddle);
    list.appendChild(card);
  });

  pane.appendChild(list);
}

function openDecodeRiddle(date, riddle) {
  const stateKey = `et_state_${date}`;
  const dayState = JSON.parse(localStorage.getItem(stateKey) || '{}');
  const solved = dayState.decode_done && dayState.decode_solved;
  const gaveUp = dayState.decode_gave_up;
  decodeAttempts = dayState.decode_attempts || 0;

  const overlay = document.createElement('div');
  overlay.id = 'decode-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';

  const typeLabel = riddle.type === 'match' ? '⚔️ Match riddle' : '👤 Player riddle';
  const isMatch = riddle.type === 'match';

  let answerHtml = '';
  if (isMatch) {
    // Build country options
    const countries = WC_COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('');
    const years = [];
    for (let y = 1930; y <= 2026; y += 4) {
      if (y === 1942 || y === 1946) continue;
      years.push(`<option value="${y}">${y}</option>`);
    }
    answerHtml = `
      <div class="decode-match-inputs" id="decode-match-inputs">
        <div class="decode-match-field">
          <label>Team A</label>
          <select id="decode-team-a" ${solved || gaveUp ? 'disabled' : ''}>
            <option value="">Select team...</option>${countries}
          </select>
          <div class="decode-field-result" id="decode-ta-result"></div>
        </div>
        <div class="decode-match-vs">vs</div>
        <div class="decode-match-field">
          <label>Team B</label>
          <select id="decode-team-b" ${solved || gaveUp ? 'disabled' : ''}>
            <option value="">Select team...</option>${countries}
          </select>
          <div class="decode-field-result" id="decode-tb-result"></div>
        </div>
        <div class="decode-match-field">
          <label>Edition (Year)</label>
          <select id="decode-year" ${solved || gaveUp ? 'disabled' : ''}>
            <option value="">Select year...</option>${years}
          </select>
          <div class="decode-field-result" id="decode-year-result"></div>
        </div>
      </div>`;
  } else {
    answerHtml = `
      <input class="text-input" type="text" id="decode-player-inp"
        placeholder="Type player name..." autocomplete="off" spellcheck="false"
        ${solved || gaveUp ? 'disabled' : ''}
        onkeydown="if(event.key==='Enter') submitDecodeAnswer('${date}')">`;
  }

  const ptsPreview = DECODE_SCORING[Math.min(decodeAttempts, DECODE_SCORING.length - 1)];

  overlay.innerHTML = `
    <div class="decode-modal">
      <button class="decode-close" onclick="document.getElementById('decode-overlay').remove()">✕</button>
      <div class="decode-modal-type">${typeLabel}</div>
      <div class="decode-modal-riddle">"${riddle.riddle}"</div>

      <div class="decode-modal-answer-area">
        ${answerHtml}
        <div class="decode-modal-fb" id="decode-modal-fb" style="display:none"></div>
        ${solved ? `
          <div class="decode-modal-solved">
            ✅ You solved this! The answer was <strong>${riddle.type === 'match'
              ? `${riddle.match_answer?.team_a} vs ${riddle.match_answer?.team_b}, ${riddle.match_answer?.year}`
              : riddle.answer}</strong>
            <div style="color:var(--green);font-weight:700;font-size:15px;margin-top:6px">+${dayState.score_decode || 0} pts</div>
          </div>` : ''}
        ${gaveUp ? `
          <div class="decode-modal-gaveup">
            The answer was <strong>${riddle.type === 'match'
              ? `${riddle.match_answer?.team_a} vs ${riddle.match_answer?.team_b}, ${riddle.match_answer?.year}`
              : riddle.answer}</strong>
          </div>` : ''}
        ${!solved && !gaveUp ? `
          <div class="decode-modal-actions">
            <button class="btn-g" onclick="submitDecodeAnswer('${date}')">Submit answer</button>
            <button class="btn-w decode-giveup-btn" onclick="giveUpDecode('${date}')">Give Up</button>
          </div>
          <div class="decode-pts-preview" id="decode-pts-preview">
            Attempts: <strong>${decodeAttempts}</strong> · Worth <strong>${ptsPreview} pts</strong> if correct now
          </div>` : ''}
      </div>
    </div>
  `;

  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function submitDecodeAnswer(date) {
  const stateKey = `et_state_${date}`;
  const dayState = JSON.parse(localStorage.getItem(stateKey) || '{}');
  const riddleData = decodeRiddles.find(r => r.date === date)?.riddle;
  if (!riddleData) return;

  const isMatch = riddleData.type === 'match';
  const fb = document.getElementById('decode-modal-fb');
  decodeAttempts++;

  let correct = false;

  if (isMatch) {
    const ta = document.getElementById('decode-team-a')?.value;
    const tb = document.getElementById('decode-team-b')?.value;
    const yr = document.getElementById('decode-year')?.value;
    if (!ta || !tb || !yr) {
      showDecodeFb('Please fill in all three fields.', 'warn'); return;
    }
    const ma = riddleData.match_answer;
    const taOk = ta === ma.team_a || tb === ma.team_a;
    const tbOk = ta === ma.team_b || tb === ma.team_b;
    const yrOk = parseInt(yr) === ma.year;
    correct = taOk && tbOk && yrOk;

    if (!correct) {
      const taRes = document.getElementById('decode-ta-result');
      const tbRes = document.getElementById('decode-tb-result');
      const yrRes = document.getElementById('decode-year-result');
      const teamGuessed = new Set([ta, tb]);
      const teamAnswer = new Set([ma.team_a, ma.team_b]);
      const teamsOk = [...teamAnswer].every(t => teamGuessed.has(t));

      if (taRes) taRes.innerHTML = (ta === ma.team_a || ta === ma.team_b) ? '✓' : '✗';
      if (tbRes) tbRes.innerHTML = (tb === ma.team_a || tb === ma.team_b) ? '✓' : '✗';
      if (yrRes) yrRes.innerHTML = yrOk ? '✓' : '✗';

      const hints = [];
      if (teamsOk && !yrOk) hints.push('Both teams are correct — wrong year!');
      else if (!teamsOk && yrOk) hints.push('Year is correct — check the teams!');
      else if ((ta === ma.team_a || ta === ma.team_b) && !(tb === ma.team_a || tb === ma.team_b)) hints.push('Team A is correct!');
      else if ((tb === ma.team_a || tb === ma.team_b) && !(ta === ma.team_a || ta === ma.team_b)) hints.push('Team B is correct!');

      showDecodeFb(`Not quite. ${hints.join(' ')} Keep trying!`, 'warn');
    }
  } else {
    const userAns = document.getElementById('decode-player-inp')?.value?.trim() || '';
    const normalise = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const accepted = (riddleData.accepted || [riddleData.answer?.toLowerCase()]).map(a => normalise(a));
    const userNorm = normalise(userAns);
    function lev(a, b) {
      const m = a.length, n = b.length;
      const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
        dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
      return dp[m][n];
    }
    correct = accepted.some(a =>
      userNorm === a ||
      (userNorm.length >= 4 && (userNorm.includes(a) || a.includes(userNorm))) ||
      (Math.abs(userNorm.length - a.length) <= 1 && lev(userNorm, a) <= 1)
    );
    if (!correct) showDecodeFb('Not quite. Keep trying!', 'warn');
  }

  // Update pts preview
  const ptsPreview = DECODE_SCORING[Math.min(decodeAttempts, DECODE_SCORING.length - 1)];
  const ptsEl = document.getElementById('decode-pts-preview');
  if (ptsEl) ptsEl.innerHTML = `Attempts: <strong>${decodeAttempts}</strong> · Worth <strong>${ptsPreview} pts</strong> if correct now`;

  // Save attempt count
  const updatedState = { ...dayState, decode_attempts: decodeAttempts };
  localStorage.setItem(stateKey, JSON.stringify(updatedState));

  if (correct) {
    const pts = DECODE_SCORING[Math.min(decodeAttempts - 1, DECODE_SCORING.length - 1)];
    const isToday = date === CONFIG.today;

    // Streak only for today
    let streak = dayState.decode_streak || 0;
    let best = dayState.decode_best || 0;
    if (isToday) {
      streak = getPrevStreak('decode_streak') + 1;
      best = Math.max(dayState.decode_best || 0, streak);
    }

    const newState = {
      ...updatedState,
      decode_done: true, decode_solved: true,
      score_decode: pts, decode_streak: streak, decode_best: best,
    };
    localStorage.setItem(stateKey, JSON.stringify(newState));

    if (isToday) {
      saveScoreToDb('decode', pts);
      updateScoreDisplay();
      buildDecodeStats(getState());
    }

    // Show solved state in modal
    document.getElementById('decode-overlay').remove();
    openDecodeRiddle(date, riddleData);
    renderDecodeList();
  }
}

function giveUpDecode(date) {
  const stateKey = `et_state_${date}`;
  const dayState = JSON.parse(localStorage.getItem(stateKey) || '{}');
  const riddleData = decodeRiddles.find(r => r.date === date)?.riddle;
  if (!riddleData) return;

  const isToday = date === CONFIG.today;
  const streak = isToday ? 0 : (dayState.decode_streak || 0); // break streak for today

  const newState = {
    ...dayState,
    decode_done: true, decode_gave_up: true, decode_solved: false,
    score_decode: 0, decode_streak: streak,
  };
  localStorage.setItem(stateKey, JSON.stringify(newState));

  if (isToday) {
    saveScoreToDb('decode', 0);
    buildDecodeStats(getState());
  }

  document.getElementById('decode-overlay').remove();
  openDecodeRiddle(date, riddleData);
  renderDecodeList();
}

function showDecodeFb(msg, type) {
  const fb = document.getElementById('decode-modal-fb');
  if (!fb) return;
  fb.className = `fb ${type}`;
  fb.textContent = msg;
  fb.style.display = 'block';
}

function buildDecodeStats(state) {
  const played = state.decode_played || 0;
  const won = state.decode_won || 0;
  const winPct = played > 0 ? Math.round((won / played) * 100) : 0;
  const streak = state.decode_streak || 0;
  const best = state.decode_best || 0;
  const el = document.getElementById('decode-stats');
  if (el) el.innerHTML = `
    <div class="stat"><div class="stat-v">${played}</div><div class="stat-l">Played</div></div>
    <div class="stat"><div class="stat-v">${winPct}%</div><div class="stat-l">Win %</div></div>
    <div class="stat"><div class="stat-v">${streak}</div><div class="stat-l">Streak</div></div>
    <div class="stat"><div class="stat-v">${best}</div><div class="stat-l">Best</div></div>
  `;
}

// WC countries pulled from heroes_db
const WC_COUNTRIES = ["Algeria","Angola","Argentina","Australia","Austria","Belgium","Bolivia","Bosnia-Herzegovina","Brazil","Bulgaria","Cameroon","Canada","Chile","Colombia","Costa Rica","Croatia","Cuba","Czechia","Czechoslovakia","Côte d'Ivoire","Denmark","Ecuador","Egypt","El Salvador","England","France","Germany DR","Germany","Ghana","Greece","Haiti","Honduras","Hungary","IR Iran","Iceland","Iraq","Israel","Italy","Jamaica","Japan","Korea DPR","Korea Republic","Kuwait","Mexico","Morocco","Netherlands","New Zealand","Nigeria","Northern Ireland","Norway","Panama","Paraguay","Peru","Poland","Portugal","Qatar","Rep. of Ireland","Romania","Russia","Saudi Arabia","Scotland","Senegal","Serbia & Montenegro","Serbia","Slovakia","Slovenia","South Africa","Soviet Union","Spain","Sweden","Switzerland","Togo","Tunisia","Türkiye","UAE","Ukraine","United States","Uruguay","Wales","West Germany","Yugoslavia"];
