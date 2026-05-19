// ─── SUPER PREDICTOR ───────────────────────────────────────

const SAMPLE_MATCHES = [
  {
    id: 1,
    home_team: 'Man City', away_team: 'Chelsea',
    kickoff: '2026-05-17T17:00:00+05:30',
    competition: 'FA Cup Final', venue: 'Wembley',
    home_squad: [
      {name:'Haaland',position:'Forward'},{name:'De Bruyne',position:'Midfielder'},
      {name:'Foden',position:'Midfielder'},{name:'Doku',position:'Forward'},
      {name:'Bernardo',position:'Midfielder'},{name:'Gvardiol',position:'Defender'},
      {name:'Rodri',position:'Midfielder'},{name:'Dias',position:'Defender'},
    ],
    away_squad: [
      {name:'Palmer',position:'Midfielder'},{name:'Jackson',position:'Forward'},
      {name:'Nkunku',position:'Forward'},{name:'Madueke',position:'Forward'},
      {name:'Enzo',position:'Midfielder'},{name:'Colwill',position:'Defender'},
      {name:'Mudryk',position:'Forward'},{name:'Caicedo',position:'Midfielder'},
    ],
    home_result: null, away_result: null,
  }
];

const POS_LABEL = { Forward:'FWD', Midfielder:'MID', Defender:'DEF', Goalkeeper:'GK' };
const POS_CLS   = { Forward:'pos-F', Midfielder:'pos-M', Defender:'pos-D', Goalkeeper:'pos-GK' };
const POS_PTS   = { Forward: SCORING.predictor.scorerForward, Midfielder: SCORING.predictor.scorerMidfielder, Defender: SCORING.predictor.scorerDefender, Goalkeeper: SCORING.predictor.scorerDefender };

let predMatches = [];
let predSelections = {};
let countdownTimers = [];

async function initPredictor(todayContent, yesterdayContent) {
  const state = getState();
  const yesterdayState = (() => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const key = `et_state_${yesterday.toISOString().split('T')[0]}`;
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch { return {}; }
  })();

  // Load today's matches
  try {
    predMatches = todayContent?.matches?.length ? todayContent.matches : SAMPLE_MATCHES;
  } catch { predMatches = SAMPLE_MATCHES; }

  // Show yesterday's results if predictions were locked yesterday and results are in
  if (yesterdayState.pred_locked && !yesterdayState.pred_result_shown) {
    const yesterdayMatches = yesterdayContent?.matches || [];
    if (yesterdayMatches.length) {
      checkAndShowResultsForMatches(yesterdayState, yesterdayMatches, true);
    }
  }

  // Check today's results
  if (state.pred_locked && !state.pred_result_shown) {
    checkAndShowResults(state);
  }

  if (state.pred_locked) {
    renderLockedPredictor(state);
  } else {
    renderMatches();
  }
}

// ── RENDER OPEN MATCHES ───────────────────────────────────
function renderMatches() {
  const container = document.getElementById('matches-container');
  container.innerHTML = '';
  countdownTimers.forEach(t => clearInterval(t));
  countdownTimers = [];

  predMatches.forEach(match => {
    predSelections[match.id] = { homeScore:1, awayScore:1, scorers:[] };

    const kickoff = new Date(match.kickoff);
    const timeStr = kickoff.toLocaleString('en-IN', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

    const mkBtns = (squad, side) => squad.map(p => {
      const lbl = POS_LABEL[p.position] || '?';
      const cls = POS_CLS[p.position] || 'pos-M';
      return `<button class="player-btn" onclick="toggleScorer(${match.id},'${p.name}','${p.position}',this)">
        ${p.name}<span class="${cls} pos-badge">${lbl}</span>
      </button>`;
    }).join('');

    const div = document.createElement('div');
    div.className = 'match-card';
    div.id = `match-card-${match.id}`;
    div.innerHTML = `
      <div class="match-time">${match.competition} · ${timeStr} · ${match.venue||''}</div>
      <div class="countdown-wrap" id="countdown-${match.id}"></div>
      <div class="match-row">
        <span class="team-name">${match.home_team}</span>
        <span class="vs-badge">vs</span>
        <span class="team-name">${match.away_team}</span>
      </div>
      <div class="score-inputs">
        <input class="score-inp" type="number" min="0" max="20" value="1" id="home-score-${match.id}"
          oninput="predSelections[${match.id}].homeScore=+this.value">
        <span class="score-dash">—</span>
        <input class="score-inp" type="number" min="0" max="20" value="1" id="away-score-${match.id}"
          oninput="predSelections[${match.id}].awayScore=+this.value">
      </div>
      <div class="scorer-note">🎯 Predict up to 3 goalscorers per team — regardless of your scoreline prediction</div>
      <div class="scorer-section">
        <div class="scorer-label">Predict goalscorers</div>
        <div class="scorer-cols">
          <div>
            <div class="scorer-team-name">${match.home_team}</div>
            <div class="player-grid">${mkBtns(match.home_squad,'home')}</div>
          </div>
          <div>
            <div class="scorer-team-name">${match.away_team}</div>
            <div class="player-grid">${mkBtns(match.away_squad,'away')}</div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
    startCountdown(match.id, kickoff);
  });

  const lockBtn = document.createElement('button');
  lockBtn.className = 'btn-full';
  lockBtn.id = 'lock-btn';
  lockBtn.textContent = 'Lock in predictions';
  lockBtn.onclick = lockPredictions;
  container.appendChild(lockBtn);

  const note = document.createElement('p');
  note.style.cssText = 'font-size:10px;color:var(--text-3);text-align:center;margin-top:5px';
  note.textContent = 'Locks at kick-off · Points awarded after final whistle';
  container.appendChild(note);
}

// ── COUNTDOWN TIMER ───────────────────────────────────────
function startCountdown(matchId, kickoff) {
  const el = document.getElementById(`countdown-${matchId}`);
  if (!el) return;

  function update() {
    const now = new Date();
    const diff = kickoff - now;
    if (diff <= 0) {
      el.innerHTML = `<div class="countdown live">🔴 Match is live / has started — predictions locked</div>`;
      // Disable inputs
      const card = document.getElementById(`match-card-${matchId}`);
      if (card) card.querySelectorAll('input, button.player-btn').forEach(b => b.disabled = true);
      const lockBtn = document.getElementById('lock-btn');
      if (lockBtn) lockBtn.disabled = true;
      return;
    }
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const mins    = Math.floor((diff % 3600000) / 60000);
    const secs    = Math.floor((diff % 60000) / 1000);
    const parts = [];
    if (days > 0)  parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    el.innerHTML = `<div class="countdown">⏱ Kick-off in ${parts.join(' ')}</div>`;
  }

  update();
  const timer = setInterval(update, 1000);
  countdownTimers.push(timer);
}

// ── TOGGLE SCORER ─────────────────────────────────────────
function toggleScorer(matchId, playerName, position, btn) {
  const sel = predSelections[matchId].scorers;
  const idx = sel.findIndex(s => s.name === playerName);
  if (idx >= 0) {
    // Deselect
    sel.splice(idx, 1);
    btn.classList.remove('sel');
  } else {
    // Check limit — max 3 per team
    // Determine which team this player belongs to
    const match = predMatches.find(m => m.id === matchId);
    const isHome = match?.home_squad?.some(p => p.name === playerName);
    const teamKey = isHome ? 'home' : 'away';
    const teamSquad = isHome ? match?.home_squad : match?.away_squad;
    const teamSelCount = sel.filter(s =>
      (isHome ? match?.home_squad : match?.away_squad)?.some(p => p.name === s.name)
    ).length;
    if (teamSelCount >= 3) {
      // Flash the button to indicate limit reached
      btn.style.background = '#fee2e2';
      btn.style.borderColor = '#ef4444';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 600);
      // Show a small toast
      showPredToast('Max 3 goalscorer predictions per team');
      return;
    }
    sel.push({ name: playerName, position });
    btn.classList.add('sel');
  }
}

function showPredToast(msg) {
  let t = document.getElementById('pred-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'pred-toast';
    t.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:#334155;color:#fff;padding:8px 16px;border-radius:99px;font-size:11px;font-weight:500;z-index:99;opacity:0;transition:opacity .2s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 2000);
}

// ── LOCK PREDICTIONS ──────────────────────────────────────
async function lockPredictions() {
  const allPreds = predMatches.map(m => ({
    matchId: m.id,
    home: predSelections[m.id]?.homeScore ?? 1,
    away: predSelections[m.id]?.awayScore ?? 1,
    scorers: predSelections[m.id]?.scorers ?? [],
  }));

  saveState({ pred_locked:true, pred_data:allPreds, score_pred:'Locked' });

  // Save to Supabase if signed in
  try {
    const { data:{ user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('predictions').upsert({
        user_id: user.id, date: CONFIG.today,
        predictions: allPreds, created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' });
    }
  } catch {}

  document.getElementById('sc-pred').textContent = 'Locked';
  updateScoreDisplay();
  renderLockedPredictor(getState());
}

// ── RENDER LOCKED STATE ───────────────────────────────────
function renderLockedPredictor(state) {
  countdownTimers.forEach(t => clearInterval(t));
  countdownTimers = [];

  const container = document.getElementById('matches-container');
  const data = state.pred_data || [];

  let html = `<div class="card">
    <p style="font-size:13px;color:var(--green);font-weight:600;margin-bottom:10px">✓ Predictions locked</p>`;

  data.forEach(p => {
    const m = predMatches.find(m => m.id === p.matchId) || { home_team:'Home', away_team:'Away', kickoff: null };
    const kickoff = m.kickoff ? new Date(m.kickoff) : null;
    const timeStr = kickoff ? kickoff.toLocaleString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';

    html += `
      <div style="margin-bottom:12px">
        <div class="match-time" style="margin-bottom:5px">${m.competition||''} · ${timeStr}</div>
        <div class="match-row" style="margin-bottom:8px">
          <span class="team-name">${m.home_team}</span>
          <span style="font-size:18px;font-weight:700;color:var(--text);padding:0 12px">${p.home} — ${p.away}</span>
          <span class="team-name">${m.away_team}</span>
        </div>`;

    if (p.scorers?.length) {
      html += `<div style="font-size:11px;color:var(--text-2);margin-bottom:4px">
        <strong>Predicted scorers:</strong> ${p.scorers.map(s=>`${s.name} <span class="${POS_CLS[s.position]||'pos-M'} pos-badge">${POS_LABEL[s.position]||'?'}</span>`).join(', ')}
      </div>`;
    }

    // Show countdown if match hasn't started
    if (kickoff && kickoff > new Date()) {
      html += `<div class="countdown-wrap" id="locked-countdown-${p.matchId}"></div>`;
    }
    html += `</div>`;
  });

  html += `<p style="font-size:11px;color:var(--text-3)">Points awarded after the final whistle.</p></div>`;

  // Prediction history
  html += buildPredHistory();
  container.innerHTML = html;

  // Start countdowns for locked view
  data.forEach(p => {
    const m = predMatches.find(m => m.id === p.matchId);
    if (m?.kickoff) {
      const el = document.getElementById(`locked-countdown-${p.matchId}`);
      if (el) {
        const kickoff = new Date(m.kickoff);
        function upd() {
          const diff = kickoff - new Date();
          if (diff <= 0) { el.innerHTML = `<div class="countdown live">🔴 Match live / started</div>`; return; }
          const h=Math.floor(diff/3600000), mi=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
          el.innerHTML = `<div class="countdown">⏱ Kick-off in ${h>0?h+'h ':''}${mi}m ${s}s</div>`;
        }
        upd(); const t=setInterval(upd,1000); countdownTimers.push(t);
      }
    }
  });
}

// ── RESULT POPUP ──────────────────────────────────────────
function checkAndShowResults(state) {
  checkAndShowResultsForMatches(state, predMatches, false);
}

function checkAndShowResultsForMatches(state, matches, isYesterday) {
  const preds = state.pred_data || [];
  let totalPts = 0;
  const messages = [];

  preds.forEach(p => {
    const m = matches.find(m => m.id === p.matchId);
    if (!m || m.home_result === null || m.away_result === null) return;

    const hr = m.home_result, ar = m.away_result;
    const ph = p.home, pa = p.away;

    if (ph === hr && pa === ar) {
      totalPts += SCORING.predictor.exactScore;
      messages.push(`⚽ Exact score! ${m.home_team} ${hr}–${ar} ${m.away_team} → +${SCORING.predictor.exactScore} pts`);
    } else {
      const actualOutcome = hr > ar ? 'H' : ar > hr ? 'A' : 'D';
      const predOutcome   = ph > pa ? 'H' : pa > ph ? 'A' : 'D';
      if (actualOutcome === predOutcome) {
        totalPts += SCORING.predictor.correctOutcome;
        messages.push(`✓ Correct outcome → +${SCORING.predictor.correctOutcome} pts`);
      }
      if (Math.abs(hr-ar) === Math.abs(ph-pa) && !(ph===hr&&pa===ar)) {
        totalPts += SCORING.predictor.correctGoalDiff;
        messages.push(`✓ Correct goal difference → +${SCORING.predictor.correctGoalDiff} pts`);
      }
    }

    p.scorers?.forEach(s => {
      const allScorers = [...(m.home_actual_scorers||[]), ...(m.away_actual_scorers||[])];
      if (allScorers.map(n=>n.toLowerCase()).includes(s.name.toLowerCase())) {
        const pts = POS_PTS[s.position] || 2;
        totalPts += pts;
        messages.push(`🎯 ${s.name} scored! (${POS_LABEL[s.position]}) → +${pts} pts`);
      }
    });
  });

  if (!messages.length) return;

  if (isYesterday) {
    // Save yesterday's score to today's state
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = `et_state_${yesterday.toISOString().split('T')[0]}`;
    try {
      const s = JSON.parse(localStorage.getItem(key)) || {};
      s.pred_result_shown = true;
      s.score_pred = totalPts;
      localStorage.setItem(key, JSON.stringify(s));
    } catch {}
    messages.unshift(`📅 Yesterday's Super Predictor results:`);
  } else {
    saveState({ score_pred: totalPts, pred_result_shown: true });
    document.getElementById('sc-pred').textContent = totalPts + 'pts';
    updateScoreDisplay();
    saveScoreToDb('predictor', totalPts);
  }

  showResultPopup(totalPts, messages, isYesterday);
}

function showResultPopup(pts, messages, isYesterday=false) {
  const existing = document.getElementById('pred-result-popup');
  if (existing) existing.remove();
  const emoji = pts >= 10 ? '🏆' : pts >= 5 ? '⚽' : pts > 0 ? '😬' : '💪';
  const headline = isYesterday ? "Yesterday's results are in!" :
    pts >= 10 ? 'Great predictions!' : pts >= 5 ? 'Not bad!' : pts > 0 ? 'A few points!' : 'Better luck next time!';
  const popup = document.createElement('div');
  popup.id = 'pred-result-popup';
  popup.className = 'result-popup-overlay';
  popup.innerHTML = `
    <div class="result-popup">
      <div class="rp-emoji">${emoji}</div>
      <div class="rp-headline">${headline}</div>
      <div class="rp-pts">${pts} pts earned</div>
      <div class="rp-msgs">${messages.map(m=>`<div class="rp-msg">${m}</div>`).join('')}</div>
      <button class="btn-full" onclick="document.getElementById('pred-result-popup').remove()">Got it</button>
    </div>
  `;
  document.body.appendChild(popup);
}

// ── PREDICTION HISTORY ────────────────────────────────────
function buildPredHistory() {
  const history = [];

  // Scan localStorage for all past prediction states
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('et_state_')) continue;
    const dateStr = key.replace('et_state_', '');
    if (dateStr === CONFIG.today) continue; // skip today
    try {
      const state = JSON.parse(localStorage.getItem(key));
      if (!state?.pred_locked || !state?.pred_data?.length) continue;
      history.push({ date: dateStr, state });
    } catch {}
  }

  if (!history.length) return '';

  // Sort newest first
  history.sort((a, b) => b.date.localeCompare(a.date));

  let html = `<div style="margin-top:14px">
    <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px">📋 Your prediction history</div>`;

  history.slice(0, 7).forEach(({ date, state }) => {
    const pts = state.score_pred;
    const ptsDisplay = typeof pts === 'number' ? `${pts} pts` : state.pred_result_shown ? '0 pts' : 'Pending';
    const ptsColor = typeof pts === 'number' && pts > 0 ? 'color:#059669;font-weight:600' : 'color:var(--text-3)';
    const dateLabel = new Date(date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

    html += `<div style="background:var(--bg-2);border:0.5px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;font-weight:600;color:var(--text)">${dateLabel}</span>
        <span style="font-size:12px;${ptsColor}">${ptsDisplay}</span>
      </div>`;

    state.pred_data?.forEach(p => {
      const scorerNames = p.scorers?.map(s => `${s.name} (${POS_LABEL[s.position]||'?'})`).join(', ') || '—';
      html += `<div style="font-size:11px;color:var(--text-2);margin-bottom:3px">
        Predicted: <strong>${p.home}–${p.away}</strong> · Scorers: ${scorerNames}
      </div>`;
    });

    html += `</div>`;
  });

  html += `</div>`;
  return html;
}
