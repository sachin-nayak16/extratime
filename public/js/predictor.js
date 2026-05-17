// ─── SUPER PREDICTOR ───────────────────────────────────────

const SAMPLE_MATCHES = [
  {
    id: 1,
    home_team: 'Man City',
    away_team: 'Chelsea',
    kickoff: '2026-05-17T17:00:00+05:30',
    competition: 'FA Cup Final',
    venue: 'Wembley',
    home_squad: [
      { name:'Haaland',   position:'Forward'   },
      { name:'De Bruyne', position:'Midfielder' },
      { name:'Foden',     position:'Midfielder' },
      { name:'Doku',      position:'Forward'   },
      { name:'Bernardo',  position:'Midfielder' },
      { name:'Gvardiol',  position:'Defender'  },
      { name:'Rodri',     position:'Midfielder' },
      { name:'Dias',      position:'Defender'  },
    ],
    away_squad: [
      { name:'Palmer',   position:'Midfielder' },
      { name:'Jackson',  position:'Forward'   },
      { name:'Nkunku',   position:'Forward'   },
      { name:'Madueke',  position:'Forward'   },
      { name:'Enzo',     position:'Midfielder' },
      { name:'Colwill',  position:'Defender'  },
      { name:'Mudryk',   position:'Forward'   },
      { name:'Caicedo',  position:'Midfielder' },
    ],
    home_result: null,
    away_result: null,
  }
];

let predMatches = [];
let predSelections = {}; // { matchId: { homeScore, awayScore, scorers: [] } }

async function initPredictor() {
  const state = getState();

  // Check if already locked today
  if (state.pred_locked) {
    renderLockedPredictor(state);
    return;
  }

  // Load from Supabase
  try {
    const { data } = await sb
      .from('daily_content')
      .select('matches')
      .eq('date', CONFIG.today)
      .single();
    predMatches = data?.matches || SAMPLE_MATCHES;
  } catch {
    predMatches = SAMPLE_MATCHES;
  }

  renderMatches();
}

function renderMatches() {
  const container = document.getElementById('matches-container');
  container.innerHTML = '';

  predMatches.forEach(match => {
    predSelections[match.id] = { homeScore:1, awayScore:1, scorers:[] };

    const posMap = { Forward:'F', Midfielder:'M', Defender:'D', Goalkeeper:'GK' };
    const posCls = { Forward:'pos-F', Midfielder:'pos-M', Defender:'pos-D', Goalkeeper:'pos-M' };

    const kickoff = new Date(match.kickoff);
    const timeStr = kickoff.toLocaleString('en-IN', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

    const homePlayerBtns = match.home_squad.map(p => {
      const pos = posMap[p.position] || '?';
      const cls = posCls[p.position] || 'pos-M';
      return `<button class="player-btn" onclick="toggleScorer(${match.id},'${p.name}','${p.position}',this)">${p.name}<span class="${cls} pos-badge">${pos}</span></button>`;
    }).join('');

    const awayPlayerBtns = match.away_squad.map(p => {
      const pos = posMap[p.position] || '?';
      const cls = posCls[p.position] || 'pos-M';
      return `<button class="player-btn" onclick="toggleScorer(${match.id},'${p.name}','${p.position}',this)">${p.name}<span class="${cls} pos-badge">${pos}</span></button>`;
    }).join('');

    const div = document.createElement('div');
    div.className = 'match-card';
    div.innerHTML = `
      <div class="match-time">${match.competition} · ${timeStr} · ${match.venue||''}</div>
      <div class="match-row">
        <span class="team-name">${match.home_team}</span>
        <span class="vs-badge">vs</span>
        <span class="team-name">${match.away_team}</span>
      </div>
      <div class="score-inputs">
        <input class="score-inp" type="number" min="0" max="20" value="1" id="home-score-${match.id}" oninput="predSelections[${match.id}].homeScore=+this.value">
        <span class="score-dash">—</span>
        <input class="score-inp" type="number" min="0" max="20" value="1" id="away-score-${match.id}" oninput="predSelections[${match.id}].awayScore=+this.value">
      </div>
      <div class="scorer-section">
        <div class="scorer-label">Predict goalscorers</div>
        <div class="scorer-cols">
          <div>
            <div class="scorer-team-name">${match.home_team}</div>
            <div class="player-grid">${homePlayerBtns}</div>
          </div>
          <div>
            <div class="scorer-team-name">${match.away_team}</div>
            <div class="player-grid">${awayPlayerBtns}</div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  const lockBtn = document.createElement('button');
  lockBtn.className = 'btn-full';
  lockBtn.textContent = 'Lock in predictions';
  lockBtn.onclick = lockPredictions;
  container.appendChild(lockBtn);

  const note = document.createElement('p');
  note.style.cssText = 'font-size:10px;color:var(--text-3);text-align:center;margin-top:4px';
  note.textContent = 'Locks at kick-off · Points awarded after final whistle';
  container.appendChild(note);
}

function toggleScorer(matchId, playerName, position, btn) {
  const sel = predSelections[matchId].scorers;
  const idx = sel.findIndex(s => s.name === playerName);
  if (idx >= 0) {
    sel.splice(idx, 1);
    btn.classList.remove('sel');
  } else {
    sel.push({ name: playerName, position });
    btn.classList.add('sel');
  }
}

async function lockPredictions() {
  const allPreds = predMatches.map(m => ({
    matchId: m.id,
    home: predSelections[m.id].homeScore,
    away: predSelections[m.id].awayScore,
    scorers: predSelections[m.id].scorers,
  }));

  saveState({ pred_locked:true, pred_data:allPreds, score_pred:'Locked' });

  // Save to Supabase
  const { data:{ user } } = await sb.auth.getUser();
  if (user) {
    await sb.from('predictions').upsert({
      user_id: user.id,
      date: CONFIG.today,
      predictions: allPreds,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' });
  }

  document.getElementById('sc-pred').textContent = 'Locked';
  updateScoreDisplay();

  const summary = allPreds.map(p => {
    const m = predMatches.find(m => m.id === p.matchId);
    const scorerNames = p.scorers.map(s => `${s.name}(${s.position[0]})`).join(', ') || 'None';
    return `${m?.home_team} ${p.home}–${p.away} ${m?.away_team} · Scorers: ${scorerNames}`;
  }).join('<br>');

  const fb = document.getElementById('pred-fb');
  fb.className = 'fb ok';
  fb.innerHTML = `<strong>Predictions locked!</strong><br>${summary}<br><em>Points awarded after the final whistle.</em>`;
  fb.style.display = 'block';

  renderLockedPredictor(getState());
}

function renderLockedPredictor(state) {
  const container = document.getElementById('matches-container');
  const data = state.pred_data || [];
  let html = '<div class="card"><p style="font-size:12px;color:var(--green);font-weight:600;margin-bottom:8px">✓ Predictions locked</p>';
  data.forEach(p => {
    const m = predMatches.find(m => m.id === p.matchId) || { home_team:'Home', away_team:'Away' };
    html += `<p style="font-size:12px;margin-bottom:4px"><strong>${m.home_team} ${p.home}–${p.away} ${m.away_team}</strong></p>`;
    if (p.scorers?.length) {
      html += `<p style="font-size:11px;color:var(--text-2);margin-bottom:8px">Scorers: ${p.scorers.map(s=>`${s.name}(${s.position[0]})`).join(', ')}</p>`;
    }
  });
  html += '<p style="font-size:11px;color:var(--text-3)">Points will be awarded after the final whistle.</p></div>';
  container.innerHTML = html;
}
