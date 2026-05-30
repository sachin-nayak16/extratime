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

let predMatches = [], completedMatches = [];
let predSelections = {};
let countdownTimers = [];

async function initPredictor(todayContent, yesterdayContent) {
  const state = getState();

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7*24*60*60*1000).toISOString().split('T')[0];

    const { data } = await sb.from('daily_content')
      .select('date, matches')
      .gte('date', thirtyDaysAgo)
      .lte('date', nextWeek)
      .not('matches', 'is', null);

    const allMatches = [];
    const seen = new Set();
    (data || []).forEach(row => {
      (row.matches || []).forEach(m => {
        if (!m.kickoff) return;
        // Deduplicate by home+away+kickoff
        const key = `${m.home_team}|${m.away_team}|${m.kickoff}`;
        if (seen.has(key)) return;
        seen.add(key);
        allMatches.push({ ...m, _date: row.date });
      });
    });

    allMatches.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

    // Completed = explicitly marked complete by admin
    completedMatches = allMatches.filter(m => m.completed === true);

    // Active = not completed, kickoff within next 7 days or last 24h
    predMatches = allMatches.filter(m => {
      if (m.completed) return false;
      const ko = new Date(m.kickoff);
      const diffHours = (ko - now) / (1000 * 60 * 60);
      return diffHours > -24 && diffHours < 7 * 24;
    });

    if (!predMatches.length && !completedMatches.length) predMatches = SAMPLE_MATCHES;
  } catch {
    predMatches = todayContent?.matches?.length ? todayContent.matches : SAMPLE_MATCHES;
    completedMatches = [];
  }

  // Check yesterday's results
  if (yesterdayContent?.matches?.length) {
    const yesterdayState = (() => {
      try {
        const yd = new Date(); yd.setDate(yd.getDate()-1);
        const key = `et_state_${yd.toISOString().split('T')[0]}`;
        return JSON.parse(localStorage.getItem(key)) || {};
      } catch { return {}; }
    })();
    if (yesterdayState.pred_locked && !yesterdayState.pred_result_shown) {
      checkAndShowResultsForMatches(yesterdayState, yesterdayContent.matches, true);
    }
  }

  // Check today's results
  if (state.pred_locked && !state.pred_result_shown) {
    checkAndShowResults(state);
  }

  renderMatches();
}

// ── RENDER COMPLETED MATCHES ─────────────────────────────
function getAllPredictions() {
  // Scan all et_state_* keys. Each date's state also has locked_match_ids.
  // We store all found predictions in an array, then for each completed match
  // we find the entry where the match was actually locked on that date.
  // Key insight: store alongside each pred the STATE DATE so we can match
  // it to the Supabase row date where the match lives.
  const allEntries = []; // [{stateDate, matchId, pred, isLocked, score}]
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('et_state_')) continue;
    const stateDate = key.replace('et_state_', '');
    try {
      const s = JSON.parse(localStorage.getItem(key));
      const lockedIds = s?.locked_match_ids || [];
      const score = typeof s?.score_pred === 'number' ? s.score_pred : null;
      (s?.pred_data || []).forEach(p => {
        allEntries.push({
          stateDate,
          matchId: p.matchId,
          pred: p,
          isLocked: lockedIds.includes(p.matchId),
          score,
        });
      });
    } catch {}
  }
  return allEntries;
}

function renderCompletedMatches(container) {
  if (!completedMatches.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;color:var(--text-3);padding:20px 0;text-align:center';
    empty.textContent = 'No completed matches yet.';
    container.appendChild(empty);
    return;
  }

  const allPredEntries = getAllPredictions();

  // Show newest first
  [...completedMatches].reverse().forEach(match => {
    // Find the locked prediction for this match.
    // Match by: same matchId AND stateDate close to kickoff date (within 3 days),
    // preferring locked entries. Falls back to any entry with matching id.
    const kickoffDate = match.kickoff ? match.kickoff.split('T')[0] : match._date || '';
    const kickoffMs = new Date(kickoffDate).getTime();

    let entry = allPredEntries
      .filter(e => e.matchId === match.id && e.isLocked)
      .sort((a, b) => Math.abs(new Date(a.stateDate) - kickoffMs) - Math.abs(new Date(b.stateDate) - kickoffMs))[0];

    if (!entry) {
      entry = allPredEntries
        .filter(e => e.matchId === match.id)
        .sort((a, b) => Math.abs(new Date(a.stateDate) - kickoffMs) - Math.abs(new Date(b.stateDate) - kickoffMs))[0];
    }

    const pred = entry?.pred;
    const isLocked = entry?.isLocked || false;

    const hasResult = match.home_result !== null && match.home_result !== undefined
      && match.away_result !== null && match.away_result !== undefined;

    const kickoff = new Date(match.kickoff);
    const dateStr = kickoff.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

    let userPredHtml = '—';
    if (isLocked && pred) {
      const h = pred.home ?? pred.homeScore;
      const a = pred.away ?? pred.awayScore;
      const scorers = pred.scorers?.map(s => s.name).join(', ');
      userPredHtml = `${h}–${a}${scorers ? ` · ${scorers}` : ''}`;
    }

    const card = document.createElement('div');
    card.className = 'match-overview-card is-completed';
    card.innerHTML = `
      <div class="mc-meta">
        <span class="mc-comp" style="color:var(--text-3)">${match.competition}</span>
        <span class="mc-dot">·</span>
        <span class="mc-date">${dateStr}</span>
      </div>
      <div class="mc-teams">
        <span class="mc-team home">${match.home_team}</span>
        <span class="mc-vs">vs</span>
        <span class="mc-team away">${match.away_team}</span>
      </div>
      <div class="mc-footer" style="justify-content:space-between">
        ${hasResult ? `<div style="font-size:13px;font-weight:800;color:#fff">${match.home_result} – ${match.away_result} <span style="font-size:10px;font-weight:500;color:var(--text-3)">FT</span></div>` : '<div style="font-size:11px;color:var(--text-3)">Result pending</div>'}
        ${isLocked
          ? `<div style="font-size:11px;font-weight:600;color:var(--text-2)">
               Your prediction: <strong style="color:#fff">${userPredHtml}</strong>
               ${entry?.score !== null ? `<span style="margin-left:8px;color:var(--green);font-weight:700">${entry.score} pts</span>` : '<span style="margin-left:8px;color:var(--text-3)">(pending)</span>'}
             </div>`
          : `<div style="font-size:11px;color:var(--text-3)">No prediction made</div>`}
      </div>
    `;
    container.appendChild(card);
  });

}

// ── RENDER MATCH LIST (overview cards) ───────────────────
let predActiveTab = 'upcoming';

function switchPredTab(tab) {
  predActiveTab = tab;
  renderMatches();
}

function renderMatches() {
  const container = document.getElementById('matches-container');
  container.innerHTML = '';
  countdownTimers.forEach(t => clearInterval(t));
  countdownTimers = [];

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.className = 'pred-tabs';
  tabBar.innerHTML = `
    <button class="pred-tab ${predActiveTab==='upcoming'?'active':''}" onclick="switchPredTab('upcoming')">
      Upcoming ${predMatches.length ? `<span class="pred-tab-count">${predMatches.length}</span>` : ''}
    </button>
    <button class="pred-tab ${predActiveTab==='past'?'active':''}" onclick="switchPredTab('past')">
      Past ${completedMatches.length ? `<span class="pred-tab-count">${completedMatches.length}</span>` : ''}
    </button>
  `;
  container.appendChild(tabBar);

  if (predActiveTab === 'past') {
    renderCompletedMatches(container);
    return;
  }


  const state = getState();
  const lockedMatchIds = state.locked_match_ids || [];

  predMatches.forEach(match => {
    if (!predSelections[match.id]) {
      predSelections[match.id] = { homeScore:1, awayScore:1, scorers:[], et:null, pens:null };
    }
    const savedPred = (state.pred_data || []).find(p => p.matchId === match.id);
    if (savedPred) {
      predSelections[match.id] = { ...predSelections[match.id], ...savedPred };
    }

    const kickoff = new Date(match.kickoff);
    const isKickedOff = kickoff <= new Date();
    const isLocked = lockedMatchIds.includes(match.id) || isKickedOff;
    const dateStr = kickoff.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
    const timeStr = kickoff.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

    const sel = predSelections[match.id];
    const lockedBadge = isLocked
      ? `<div class="mc-locked-badge">✓ Locked · ${sel.homeScore ?? 1}–${sel.awayScore ?? 1}</div>`
      : `<div class="mc-predict-btn" onclick="openMatchDetail(${match.id})">Predict now →</div>`;

    const card = document.createElement('div');
    card.className = `match-overview-card${isLocked ? ' is-locked' : ''}`;
    card.id = `match-overview-${match.id}`;
    card.innerHTML = `
      <div class="mc-meta">
        <span class="mc-comp">${match.competition}</span>
        <span class="mc-dot">·</span>
        <span class="mc-date">${dateStr}, ${timeStr}</span>
        ${match.venue ? `<span class="mc-dot">·</span><span class="mc-venue">${match.venue}</span>` : ''}
      </div>
      <div class="mc-teams">
        <span class="mc-team home">${match.home_team}</span>
        <span class="mc-vs">vs</span>
        <span class="mc-team away">${match.away_team}</span>
      </div>
      <div class="mc-footer">
        <div class="countdown-wrap" id="countdown-${match.id}"></div>
        ${lockedBadge}
      </div>
    `;
    container.appendChild(card);
    startCountdown(match.id, kickoff);
  });


}

// ── OPEN MATCH DETAIL (prediction view) ──────────────────
function openMatchDetail(matchId) {
  const match = predMatches.find(m => m.id === matchId);
  if (!match) return;

  const state = getState();
  const lockedMatchIds = state.locked_match_ids || [];
  const kickoff = new Date(match.kickoff);
  const isKickedOff = kickoff <= new Date();
  const isLocked = lockedMatchIds.includes(match.id) || isKickedOff;

  const container = document.getElementById('matches-container');
  countdownTimers.forEach(t => clearInterval(t));
  countdownTimers = [];
  container.innerHTML = '';

  // Back button
  const back = document.createElement('button');
  back.className = 'mc-back-btn';
  back.innerHTML = '← All matches';
  back.onclick = () => { countdownTimers.forEach(t => clearInterval(t)); countdownTimers = []; renderMatches(); };
  container.appendChild(back);

  const mkBtns = (squad, side) => {
    const byPos = { Forward:[], Midfielder:[], Defender:[], Goalkeeper:[] };
    (squad||[]).forEach(p => { (byPos[p.position] || byPos.Forward).push(p); });

    return ['Forward','Midfielder','Defender','Goalkeeper'].map(pos => {
      const players = byPos[pos];
      if (!players.length) return '';
      const posLabel = POS_LABEL[pos];
      const posCls = POS_CLS[pos];
      const btns = players.map(p => {
        const sel = predSelections[match.id].scorers?.some(s => s.name === p.name);
        return `<button class="player-btn${sel?' sel':''}" ${isLocked?'disabled':''} onclick="toggleScorer(${match.id},'${p.name}','${p.position}',this)">
          ${p.name}
        </button>`;
      }).join('');
      return `<div class="squad-pos-group">
        <div class="squad-pos-label"><span class="${posCls} pos-badge squad-pos-pill">${posLabel}</span></div>
        <div class="player-grid">${btns}</div>
      </div>`;
    }).join('');
  };

  const timeStr = kickoff.toLocaleString('en-IN', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

  const div = document.createElement('div');
  div.className = 'match-card';
  div.id = `match-card-${match.id}`;
  div.innerHTML = `
    <div class="match-time">${match.competition} · ${timeStr}${match.venue ? ' · ' + match.venue : ''}</div>
    <div class="countdown-wrap" id="countdown-${match.id}"></div>
    <div class="match-row">
      <span class="team-name">${match.home_team}</span>
      <span class="vs-badge">vs</span>
      <span class="team-name">${match.away_team}</span>
    </div>
    ${isLocked ? `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:28px;font-weight:900;color:var(--text);letter-spacing:-1px">${predSelections[match.id].homeScore ?? 1} — ${predSelections[match.id].awayScore ?? 1}</div>
      <div style="font-size:11px;color:var(--green);font-weight:600;margin-top:4px">✓ Prediction locked</div>
    </div>` : `
    <div class="score-inputs">
      <input class="score-inp" type="number" min="0" max="20" value="${predSelections[match.id].homeScore}" id="home-score-${match.id}"
        oninput="predSelections[${match.id}].homeScore=+this.value">
      <span class="score-dash">—</span>
      <input class="score-inp" type="number" min="0" max="20" value="${predSelections[match.id].awayScore}" id="away-score-${match.id}"
        oninput="predSelections[${match.id}].awayScore=+this.value">
    </div>`}
    ${match.is_final && !isLocked ? `
    <div class="final-predictions">
      <div class="final-pred-title">🏆 Finals bonus predictions <span class="final-pred-pts">+1 pt correct · −1 pt wrong</span></div>
      <div class="final-pred-row">
        <span class="final-pred-label">Will this go to Extra Time?</span>
        <div class="final-pred-btns">
          <button class="final-btn${predSelections[match.id].et==='yes'?' final-btn-sel':''}" id="et-yes-${match.id}" onclick="setFinalPred(${match.id},'et','yes',this)">Yes</button>
          <button class="final-btn${predSelections[match.id].et==='no'?' final-btn-sel':''}" id="et-no-${match.id}" onclick="setFinalPred(${match.id},'et','no',this)">No</button>
        </div>
      </div>
      <div class="final-pred-row" id="pens-row-${match.id}" style="display:${predSelections[match.id].et==='yes'?'flex':'none'}">
        <span class="final-pred-label">Will this go to Penalties?</span>
        <div class="final-pred-btns">
          <button class="final-btn${predSelections[match.id].pens==='yes'?' final-btn-sel':''}" id="pens-yes-${match.id}" onclick="setFinalPred(${match.id},'pens','yes',this)">Yes</button>
          <button class="final-btn${predSelections[match.id].pens==='no'?' final-btn-sel':''}" id="pens-no-${match.id}" onclick="setFinalPred(${match.id},'pens','no',this)">No</button>
        </div>
      </div>
    </div>` : ''}
    ${!isLocked ? `<div class="scorer-note">🎯 Predict up to 3 goalscorers per team — regardless of your scoreline prediction</div>` : ''}
    <div class="scorer-section">
      <div class="scorer-label">Predict goalscorers</div>
      <div class="scorer-cols">
        <div>
          <div class="scorer-team-name">${match.home_team}</div>
          ${mkBtns(match.home_squad, 'home')}
        </div>
        <div>
          <div class="scorer-team-name">${match.away_team}</div>
          ${mkBtns(match.away_squad, 'away')}
        </div>
      </div>
    </div>
    ${!isLocked ? `
    <button class="btn-full" style="margin-top:10px" onclick="lockMatch(${match.id})">
      Lock prediction for ${match.home_team} vs ${match.away_team}
    </button>
    <p style="font-size:10px;color:var(--text-3);text-align:center;margin-top:5px">Locks at kick-off · Points awarded after final whistle</p>
    ` : ''}
  `;
  container.appendChild(div);
  startCountdown(match.id, kickoff);
}

async function lockMatch(matchId) {
  const state = getState();
  const lockedMatchIds = [...(state.locked_match_ids || [])];
  if (lockedMatchIds.includes(matchId)) return;

  const pred = {
    matchId,
    home: predSelections[matchId]?.homeScore ?? 1,
    away: predSelections[matchId]?.awayScore ?? 1,
    scorers: predSelections[matchId]?.scorers ?? [],
    et: predSelections[matchId]?.et ?? null,
    pens: predSelections[matchId]?.pens ?? null,
  };

  const allPreds = [...(state.pred_data || [])];
  const existingIdx = allPreds.findIndex(p => p.matchId === matchId);
  if (existingIdx >= 0) allPreds[existingIdx] = pred;
  else allPreds.push(pred);

  lockedMatchIds.push(matchId);
  const allLocked = lockedMatchIds.length >= predMatches.length;

  saveState({
    pred_locked: allLocked,
    locked_match_ids: lockedMatchIds,
    pred_data: allPreds,
    score_pred: 'Locked',
  });

  if (allLocked) {
    document.getElementById('sc-pred').textContent = 'Locked';
    updateScoreDisplay();
  }

  // Save to Supabase
  try {
    const { data:{ user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('predictions').upsert({
        user_id: user.id, date: CONFIG.today,
        predictions: allPreds, created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' });
    }
  } catch {}

  const match = predMatches.find(m => m.id === matchId);
  showPredToast(`✅ Locked: ${match?.home_team} vs ${match?.away_team}`);
  renderMatches();
  document.getElementById('matches-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function setFinalPred(matchId, type, val, btn) {
  predSelections[matchId][type] = val;
  // Update button styles
  const yesBtn = document.getElementById(`${type}-yes-${matchId}`);
  const noBtn  = document.getElementById(`${type}-no-${matchId}`);
  if (yesBtn) yesBtn.classList.toggle('final-btn-sel', val === 'yes');
  if (noBtn)  noBtn.classList.toggle('final-btn-sel', val === 'no');
  // Show/hide penalties question based on ET answer
  if (type === 'et') {
    const pensRow = document.getElementById(`pens-row-${matchId}`);
    if (pensRow) {
      pensRow.style.display = val === 'yes' ? 'flex' : 'none';
      if (val === 'no') {
        predSelections[matchId].pens = 'no';
      }
    }
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
    if (p.et !== null) {
      html += `<div style="font-size:11px;color:var(--text-2);margin-bottom:2px">Extra Time: <strong>${p.et === 'yes' ? 'Yes' : 'No'}</strong></div>`;
    }
    if (p.pens !== null && p.et === 'yes') {
      html += `<div style="font-size:11px;color:var(--text-2);margin-bottom:4px">Penalties: <strong>${p.pens === 'yes' ? 'Yes' : 'No'}</strong></div>`;
    }

    // Show countdown if match hasn't started
    if (kickoff && kickoff > new Date()) {
      html += `<div class="countdown-wrap" id="locked-countdown-${p.matchId}"></div>`;
    }
    html += `</div>`;
  });

  html += `<p style="font-size:11px;color:var(--text-3)">Points awarded after the final whistle.</p></div>`;
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

    // ET prediction scoring
    if (m.is_final && p.et !== null && m.went_to_et !== null) {
      const etCorrect = (p.et === 'yes') === (m.went_to_et === true);
      totalPts += etCorrect ? 1 : -1;
      messages.push(etCorrect
        ? `✓ Extra Time prediction correct → +1 pt`
        : `✗ Extra Time prediction wrong → −1 pt`);
      // If ET happened, also score pens prediction
      if (m.went_to_et && p.pens !== null && m.went_to_pens !== null) {
        const pensCorrect = (p.pens === 'yes') === (m.went_to_pens === true);
        totalPts += pensCorrect ? 1 : -1;
        messages.push(pensCorrect
          ? `✓ Penalties prediction correct → +1 pt`
          : `✗ Penalties prediction wrong → −1 pt`);
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
    savePredictionScore(totalPts); // save score to predictions table
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

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('et_state_')) continue;
    const dateStr = key.replace('et_state_', '');
    try {
      const state = JSON.parse(localStorage.getItem(key));
      if (!state?.pred_data?.length || !state?.locked_match_ids?.length) continue;
      const lockedIds = state.locked_match_ids || [];
      const lockedPreds = (state.pred_data || []).filter(p => lockedIds.includes(p.matchId));
      if (!lockedPreds.length) continue;
      history.push({ date: dateStr, state: { ...state, pred_data: lockedPreds } });
    } catch {}
  }

  if (!history.length) return '';

  history.sort((a, b) => b.date.localeCompare(a.date));

  let html = `<div style="margin-top:14px">
    <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px">📋 Your prediction history</div>`;

  history.slice(0, 7).forEach(({ date, state }) => {
    const pts = state.score_pred;
    const isToday = date === CONFIG.today;
    const ptsDisplay = typeof pts === 'number' ? `${pts} pts` : isToday ? '⏳ Pending' : '—';
    const ptsColor = typeof pts === 'number' && pts > 0 ? 'color:var(--green);font-weight:700' : 'color:var(--text-3)';
    const dateLabel = new Date(date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

    html += `<div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:12px;font-weight:600;color:var(--text)">${isToday ? '📌 Today' : dateLabel}</span>
        <span style="font-size:13px;${ptsColor}">${ptsDisplay}</span>
      </div>`;

    state.pred_data?.forEach(p => {
      // Try to get team names from predMatches (works for today's matches)
      const m = predMatches.find(m => m.id === p.matchId);
      const homeTeam = m?.home_team || 'Home';
      const awayTeam = m?.away_team || 'Away';
      const scorerNames = p.scorers?.map(s => `${s.name} (${POS_LABEL[s.position]||'?'})`).join(', ') || '—';
      html += `<div style="font-size:12px;color:var(--text-2);margin-bottom:4px">
        <span style="font-weight:600;color:var(--text)">${homeTeam} vs ${awayTeam}</span>
        · Predicted: <strong>${p.home}–${p.away}</strong>
        ${p.scorers?.length ? `· Scorers: ${scorerNames}` : ''}
      </div>`;
    });

    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

// ── PREDICTION HISTORY (SUPABASE) ────────────────────────
async function loadPredHistory(container) {
  const histDiv = document.createElement('div');
  histDiv.id = 'pred-history-section';
  histDiv.innerHTML = `<div style="font-size:12px;color:var(--text-3);margin-top:14px;padding:10px 0">Loading prediction history...</div>`;
  container.appendChild(histDiv);

  try {
    const { data:{ user } } = await sb.auth.getUser();
    if (!user) {
      const lsHtml = buildPredHistory();
      histDiv.innerHTML = lsHtml || `<div style="font-size:12px;color:var(--text-3);margin-top:14px">No prediction history yet — your future predictions will appear here.</div>`;
      return;
    }

    const { data: preds } = await sb.from('predictions')
      .select('date, predictions, score')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(10);

    if (!preds?.length) {
      histDiv.innerHTML = `<div style="font-size:12px;color:var(--text-3);margin-top:14px">No prediction history yet — your future predictions will appear here.</div>`;
      return;
    }

    const dates = preds.map(p => p.date);
    const { data: contents } = await sb.from('daily_content').select('date, matches').in('date', dates);
    const contentMap = {};
    contents?.forEach(c => { contentMap[c.date] = c.matches || []; });

    let html = `<div style="margin-top:16px">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px">📋 Your prediction history</div>`;

    preds.forEach(({ date, predictions: pData, score }) => {
      const matches = contentMap[date] || [];
      const dateLabel = new Date(date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
      const isToday = date === CONFIG.today;
      const ptsColor = typeof score === 'number' && score > 0 ? '#059669' : 'var(--text-3)';
      const ptsDisplay = typeof score === 'number' ? `${score} pts` : isToday ? '⏳ Pending' : '—';

      html += `<div style="background:var(--bg-2);border:0.5px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;font-weight:600;color:var(--text)">${isToday ? '📌 Today' : dateLabel}</span>
          <span style="font-size:13px;font-weight:700;color:${ptsColor}">${ptsDisplay}</span>
        </div>`;

      (pData || []).forEach(p => {
        const m = matches.find(m => m.id === p.matchId);
        const homeTeam = m?.home_team || 'Home';
        const awayTeam = m?.away_team || 'Away';
        const hasResult = m?.home_result !== null && m?.home_result !== undefined;
        const actualScore = hasResult ? `${m.home_result}–${m.away_result}` : null;
        const emoji = !hasResult ? '' : (p.home===m.home_result&&p.away===m.away_result) ? '✅' :
          ((p.home>p.away?'H':p.away>p.home?'A':'D')===(m.home_result>m.away_result?'H':m.away_result>m.home_result?'A':'D')) ? '🟡' : '❌';

        html += `<div style="margin-bottom:6px">
          <div style="font-size:12px;color:var(--text);font-weight:500;margin-bottom:3px">${homeTeam} vs ${awayTeam}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--text-2)">
            <span>🎯 Predicted: <strong>${p.home}–${p.away}</strong></span>
            ${hasResult ? `<span>${emoji} Actual: <strong>${actualScore}</strong></span>` : '<span style="color:var(--text-3)">Result pending</span>'}
          </div>
          ${p.scorers?.length ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">Scorers: ${p.scorers.map(s=>s.name).join(', ')}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    });

    html += `</div>`;
    histDiv.innerHTML = html;

  } catch {
    // Fallback to localStorage
    const lsHtml = buildPredHistory();
    histDiv.innerHTML = lsHtml || '';
  }
}

// Also update lockPredictions to save score field
async function savePredictionScore(score) {
  try {
    const { data:{ user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('predictions').update({ score }).eq('user_id', user.id).eq('date', CONFIG.today);
  } catch {}
}
