// ─── ADMIN PANEL ───────────────────────────────────────────
const ADMIN_PASSWORD = 'extratime2026';

let currentDate = new Date().toISOString().split('T')[0];
let cwValidated = false;
let heroSelectedPlayer = null;
let matchCount = 1;

// ── TEAM DATABASE ─────────────────────────────────────────
const TEAMS = [
  // England
  'Arsenal','Aston Villa','Brentford','Brighton','Burnley','Chelsea','Crystal Palace',
  'Everton','Fulham','Ipswich Town','Leeds United','Leicester City','Liverpool',
  'Luton Town','Man City','Man United','Newcastle','Nottm Forest','Sheffield United',
  'Southampton','Tottenham','West Ham','Wolves','Bournemouth','Watford',
  // Spain
  'Real Madrid','Barcelona','Atletico Madrid','Sevilla','Real Betis','Valencia',
  'Villarreal','Athletic Bilbao','Real Sociedad','Osasuna','Celta Vigo','Getafe',
  // Germany
  'Bayern Munich','Borussia Dortmund','RB Leipzig','Bayer Leverkusen','Eintracht Frankfurt',
  'Wolfsburg','Borussia Monchengladbach','Freiburg','Stuttgart','Hoffenheim',
  // Italy
  'Juventus','AC Milan','Inter Milan','Napoli','Roma','Lazio','Atalanta','Fiorentina',
  'Torino','Bologna','Udinese','Verona',
  // France
  'PSG','Marseille','Lyon','Monaco','Lille','Nice','Rennes','Lens','Strasbourg',
  // Portugal
  'Benfica','Porto','Sporting CP','Braga',
  // Netherlands
  'Ajax','PSV','Feyenoord','AZ Alkmaar',
  // Champions League / Europe
  'Celtic','Rangers','Anderlecht','Club Brugge','Galatasaray','Fenerbahce','Besiktas',
  'Dinamo Zagreb','Red Star Belgrade','Shakhtar Donetsk','Olympiakos','PAOK',
  // International
  'England','France','Germany','Spain','Italy','Portugal','Brazil','Argentina',
  'Netherlands','Belgium','Croatia','Denmark','Sweden','Norway','Switzerland',
  'Mexico','USA','Uruguay','Colombia','Chile','Peru','Ecuador',
  'Japan','South Korea','Australia','Saudi Arabia','Morocco','Senegal',
  'Cameroon','Ghana','Nigeria','Egypt','Tunisia','Algeria',
  'India','Iran','Qatar','UAE',
].sort();

function teamAutocomplete(inputId, ddId) {
  const val = document.getElementById(inputId)?.value?.toLowerCase().trim();
  const dd = document.getElementById(ddId);
  if (!dd) return;
  dd.innerHTML = '';
  if (!val || val.length < 1) { dd.style.display = 'none'; return; }
  const matches = TEAMS.filter(t => t.toLowerCase().includes(val)).slice(0, 8);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.style.display = 'block';
  matches.forEach(team => {
    const div = document.createElement('div');
    div.className = 'hero-dd-opt';
    div.textContent = team;
    div.onmousedown = (e) => {
      e.preventDefault();
      document.getElementById(inputId).value = team;
      dd.style.display = 'none';
    };
    dd.appendChild(div);
  });
  // Close dropdown when clicking outside
  document.getElementById(inputId).onblur = () => {
    setTimeout(() => { dd.style.display = 'none'; }, 150);
  };
}

// ── AUTH ──────────────────────────────────────────────────
function adminLogin() {
  const pwd = document.getElementById('admin-pwd').value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    initAdmin();
  } else {
    document.getElementById('login-err').style.display = 'block';
    document.getElementById('admin-pwd').value = '';
    document.getElementById('admin-pwd').focus();
  }
}

function adminLogout() {
  sessionStorage.removeItem('admin_auth');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
}

function checkAdminAuth() {
  if (sessionStorage.getItem('admin_auth') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    initAdmin();
  }
}

// ── INIT ─────────────────────────────────────────────────
function initAdmin() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('global-date').value = today;
  currentDate = today;
  buildQuizEditor();
  buildMatchEditor();
  loadDateContent(today);
  loadDashboardStats();
  loadSchedule();
}

function onDateChange() {
  currentDate = document.getElementById('global-date').value;
  loadDateContent(currentDate);
}

async function loadDateContent(date) {
  const statusEl = document.getElementById('date-status');
  statusEl.textContent = 'Loading...';
  try {
    const { data } = await sb.from('daily_content').select('*').eq('date', date).single();
    if (data) {
      statusEl.textContent = '✓ Content exists for this date';
      statusEl.style.color = '#059669';
      populateAllForms(data);
    } else {
      statusEl.textContent = 'No content yet for this date';
      statusEl.style.color = '#94a3b8';
    }
  } catch {
    statusEl.textContent = 'No content yet for this date';
    statusEl.style.color = '#94a3b8';
  }
  updateContentStatus();
}

function populateAllForms(data) {
  // Crossword
  if (data.crossword) {
    const cw = data.crossword;
    ['a1','a2','a3','a4','a5','a6'].forEach((k,i) => {
      const w = i < 3 ? cw.across?.[i] : cw.down?.[i-3];
      if (w) {
        document.getElementById(`cw-${k}`).value = w.answer || '';
        document.getElementById(`cw-c${i+1}`).value = w.clue || '';
        document.getElementById(`cw-wl${i+1}`).value = w.wordLengths || '';
      }
    });
    cwPreview();
  }
  // Quiz
  if (data.quiz_questions) {
    data.quiz_questions.forEach((q, i) => {
      const idx = i + 1;
      const qEl = document.getElementById(`q-text-${idx}`); if (qEl) qEl.value = q.question || '';
      const aEl = document.getElementById(`q-ans-${idx}`); if (aEl) aEl.value = q.answer || '';
      const hEl = document.getElementById(`q-hint-${idx}`); if (hEl) hEl.value = q.hint || '';
      const acEl = document.getElementById(`q-accepted-${idx}`); if (acEl) acEl.value = (q.accepted||[]).join(', ');
      const dEl = document.getElementById(`q-diff-${idx}`); if (dEl) dEl.value = q.difficulty || 'easy';
      const eEl = document.getElementById(`q-exp-${idx}`); if (eEl) eEl.value = q.explanation || '';
    });
  }
  // Decode
  if (data.riddle) {
    document.getElementById('decode-riddle').value = data.riddle.riddle || '';
    document.getElementById('decode-answer').value = data.riddle.answer || '';
    document.getElementById('decode-accepted').value = (data.riddle.accepted || []).join(', ');
    document.getElementById('decode-hint').value = data.riddle.hint || '';
  }
  // WC Hero
  if (data.wc_hero) {
    heroSelectedPlayer = data.wc_hero;
    showHeroSelectedCard(data.wc_hero);
    document.getElementById('hero-save-btn').disabled = false;
  }
}

// ── PANEL NAVIGATION ─────────────────────────────────────
function showPanel(name, btn) {
  document.querySelectorAll('.apanel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.anav').forEach(n => n.classList.remove('active'));
  document.getElementById(`apanel-${name}`).classList.add('active');
  btn.classList.add('active');
  if (name === 'schedule') loadSchedule();
}

// ── CROSSWORD (AUTO-SOLVER) ───────────────────────────────
// You just enter 6 answers + clues. The solver figures out
// which are across/down and where they go on the grid.

let cwSolution = null; // stores the solved layout

function cwAutoSolve() {
  cwSolution = null;
  cwValidated = false;
  document.getElementById('cw-save-btn').disabled = true;
  const statusEl = document.getElementById('cw-status');
  statusEl.style.display = 'block';

  const answers = [1,2,3,4,5,6].map(i =>
    (document.getElementById(`cw-a${i}`)?.value?.trim()?.toUpperCase() || '').replace(/\s/g,'')
  );
  const clues = [1,2,3,4,5,6].map(i =>
    document.getElementById(`cw-c${i}`)?.value?.trim() || ''
  );
  const wordLengths = [1,2,3,4,5,6].map(i =>
    document.getElementById(`cw-wl${i}`)?.value?.trim() || null
  );

  // Validate all filled in
  if (answers.some(a => !a)) {
    statusEl.className = 'validate-status validate-fail';
    statusEl.textContent = '❌ Please fill in all 6 answers before solving.';
    return;
  }
  if (answers.some(a => a.length < 4)) {
    statusEl.className = 'validate-status validate-fail';
    statusEl.textContent = '❌ All answers must be at least 4 letters long.';
    return;
  }
  if (clues.some(c => !c)) {
    statusEl.className = 'validate-status validate-fail';
    statusEl.textContent = '❌ Please fill in all 6 clues.';
    return;
  }

  // Validate word lengths if provided
  for (let i = 0; i < 6; i++) {
    if (wordLengths[i]) {
      const parts = wordLengths[i].split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n));
      const sum = parts.reduce((a,b) => a+b, 0);
      if (sum !== answers[i].length) {
        statusEl.className = 'validate-status validate-fail';
        statusEl.textContent = `❌ Word length mismatch for answer ${i+1}: "${wordLengths[i]}" sums to ${sum} but "${answers[i]}" has ${answers[i].length} letters.`;
        return;
      }
    }
  }

  statusEl.className = 'validate-status validate-ok';
  statusEl.textContent = '⏳ Solving grid layout...';

  // Run solver (async to not block UI)
  setTimeout(() => {
    const solution = CW_SOLVER.solve(answers);
    if (!solution) {
      statusEl.className = 'validate-status validate-fail';
      statusEl.innerHTML = `❌ Could not find a valid grid arrangement for these 6 words.<br>
        <strong>Tips:</strong> Try words that share more common letters. 
        For example, if two words both contain the letter R or E they are more likely to intersect.
        You can also try swapping one word for a synonym.`;
      return;
    }

    // Attach clues and word lengths
    solution.across.forEach((a, i) => {
      const origIdx = solution.acrossOrigIdx[i];
      a.clue = clues[origIdx];
      a.wordLengths = wordLengths[origIdx];
      a.display = wordLengths[origIdx] ? `(${wordLengths[origIdx]})` : `(${a.word.length})`;
    });
    solution.down.forEach((d, i) => {
      const origIdx = solution.downOrigIdx[i];
      d.clue = clues[origIdx];
      d.wordLengths = wordLengths[origIdx];
      d.display = wordLengths[origIdx] ? `(${wordLengths[origIdx]})` : `(${d.word.length})`;
    });

    cwSolution = solution;
    cwValidated = true;
    document.getElementById('cw-save-btn').disabled = false;

    // Show what was assigned
    const acrossWords = solution.across.map((a,i) => `${i+1} Across: ${a.word} ${a.display}`).join(' · ');
    const downWords = solution.down.map((d,i) => `${i+4} Down: ${d.word} ${d.display}`).join(' · ');
    const intCount = solution.intersections.length;

    statusEl.className = 'validate-status validate-ok';
    statusEl.innerHTML = `✓ Grid solved! ${intCount} intersections found.<br>
      <strong>Across:</strong> ${acrossWords}<br>
      <strong>Down:</strong> ${downWords}<br>
      <small>The solver chose the arrangement with the most intersections.</small>`;
  }, 50);
}

async function saveCW(asDraft = false) {
  if (!asDraft && !cwValidated) { showToast('Please auto-solve the crossword first.'); return; }
  if (!asDraft && !cwSolution) { showToast('No valid solution found yet.'); return; }

  let crossword;
  if (asDraft) {
    // Save raw entries as draft without a solved layout
    crossword = {
      draft: true,
      raw: [1,2,3,4,5,6].map(i => ({
        answer: document.getElementById(`cw-a${i}`)?.value?.trim()?.toUpperCase() || '',
        clue: document.getElementById(`cw-c${i}`)?.value?.trim() || '',
        wordLengths: document.getElementById(`cw-wl${i}`)?.value?.trim() || null,
      })),
    };
  } else {
    crossword = {
      draft: false,
      across: cwSolution.across.map((a, i) => ({
        number: i + 1,
        answer: a.word,
        clue: a.clue,
        wordLengths: a.wordLengths,
        display: a.display,
        row: a.row,
        colStart: a.colStart,
      })),
      down: cwSolution.down.map((d, i) => ({
        number: i + 4,
        answer: d.word,
        clue: d.clue,
        wordLengths: d.wordLengths,
        display: d.display,
        col: d.col,
        rowStart: d.rowStart,
      })),
      intersections: cwSolution.intersections,
    };
  }

  const ok = await upsertContent({ crossword });
  if (ok) showToast(asDraft ? '✅ Draft saved!' : '✅ Crossword saved!');
  updateContentStatus();
}

// ── QUIZ ─────────────────────────────────────────────────
function buildQuizEditor() {
  const container = document.getElementById('quiz-questions');
  container.innerHTML = '';
  const diffs = ['easy','easy','medium','medium','hard'];
  for (let i = 1; i <= 5; i++) {
    const div = document.createElement('div');
    div.className = 'q-block';
    div.innerHTML = `
      <div class="q-block-hdr">
        <span class="q-num">Question ${i}</span>
        <select id="q-diff-${i}" style="font-size:11px;padding:3px 8px;border:0.5px solid var(--border);border-radius:99px;background:var(--bg-3)">
          <option value="easy" ${diffs[i-1]==='easy'?'selected':''}>Easy</option>
          <option value="medium" ${diffs[i-1]==='medium'?'selected':''}>Medium</option>
          <option value="hard" ${diffs[i-1]==='hard'?'selected':''}>Hard</option>
        </select>
      </div>
      <div class="field"><label>Question <span class="req">*</span></label>
        <input type="text" id="q-text-${i}" placeholder="e.g. Who scored the Hand of God goal in 1986?">
      </div>
      <div class="form-grid">
        <div class="field"><label>Correct answer <span class="req">*</span></label>
          <input type="text" id="q-ans-${i}" placeholder="e.g. Maradona">
        </div>
        <div class="field"><label>Accepted variations <span class="hint">(comma separated)</span></label>
          <input type="text" id="q-accepted-${i}" placeholder="e.g. maradona, diego maradona">
        </div>
      </div>
      <div class="field"><label>Assist hint <span class="req">*</span> <span class="hint">Shown when player uses an Assist token</span></label>
        <input type="text" id="q-hint-${i}" placeholder="e.g. Argentine legend, widely considered one of the greatest ever">
      </div>
      <div class="field"><label>Explanation <span class="hint">Shown after answer is submitted</span></label>
        <input type="text" id="q-exp-${i}" placeholder="e.g. Diego Maradona scored with his hand against England in 1986">
      </div>
    `;
    container.appendChild(div);
  }
}

async function saveQuiz() {
  const questions = [];
  for (let i = 1; i <= 5; i++) {
    const q = document.getElementById(`q-text-${i}`)?.value?.trim();
    if (!q) { showToast(`Question ${i} is empty.`); return; }
    const ans = document.getElementById(`q-ans-${i}`)?.value?.trim();
    if (!ans) { showToast(`Please fill in the correct answer for question ${i}.`); return; }
    const hint = document.getElementById(`q-hint-${i}`)?.value?.trim();
    if (!hint) { showToast(`Please fill in an Assist hint for question ${i}.`); return; }
    const acceptedRaw = document.getElementById(`q-accepted-${i}`)?.value?.trim();
    const accepted = acceptedRaw
      ? acceptedRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [ans.toLowerCase()];
    // Always include the answer itself in accepted list
    if (!accepted.includes(ans.toLowerCase())) accepted.unshift(ans.toLowerCase());
    questions.push({
      question: q,
      answer: ans,
      accepted,
      hint,
      difficulty: document.getElementById(`q-diff-${i}`)?.value || 'easy',
      explanation: document.getElementById(`q-exp-${i}`)?.value?.trim() || '',
    });
  }
  const ok = await upsertContent({ quiz_questions: questions });
  if (ok) showToast('✅ Quiz saved!');
  updateContentStatus();
}

// ── SUPER PREDICTOR ───────────────────────────────────────
function buildMatchEditor() {
  const container = document.getElementById('matches-container');
  container.innerHTML = '';
  matchCount = 1;
  addMatch();
}

function addMatch() {
  const container = document.getElementById('matches-container');
  const n = matchCount;
  const div = document.createElement('div');
  div.className = 'match-block';
  div.id = `match-block-${n}`;
  div.innerHTML = `
    <div class="match-block-hdr">Match ${n}</div>
    <div class="form-grid">
    <div class="form-grid">
      <div class="field"><label>Home team <span class="req">*</span></label>
        <input type="text" id="m${n}-home" placeholder="e.g. Man City" oninput="teamAutocomplete('m${n}-home','m${n}-home-dd')" autocomplete="off">
        <div class="hero-dd" id="m${n}-home-dd"></div>
      </div>
      <div class="field"><label>Away team <span class="req">*</span></label>
        <input type="text" id="m${n}-away" placeholder="e.g. Chelsea" oninput="teamAutocomplete('m${n}-away','m${n}-away-dd')" autocomplete="off">
        <div class="hero-dd" id="m${n}-away-dd"></div>
      </div>
      <div class="field"><label>Kick-off time</label><input type="datetime-local" id="m${n}-time"></div>
      <div class="field"><label>Competition</label><input type="text" id="m${n}-comp" placeholder="e.g. FA Cup Final"></div>
      <div class="field"><label>Venue</label><input type="text" id="m${n}-venue" placeholder="e.g. Wembley"></div>
      <div class="field" style="display:flex;align-items:center;gap:8px;padding-top:20px">
        <input type="checkbox" id="m${n}-final" onchange="toggleFinalFields(${n})" style="width:16px;height:16px;accent-color:#059669">
        <label style="font-size:12px;color:var(--text);text-transform:none;letter-spacing:0;cursor:pointer" for="m${n}-final">🏆 Finals mode (ET & Penalties predictions)</label>
      </div>
    </div>

    <div id="m${n}-final-fields" style="display:none;background:#ecfdf5;border:0.5px solid #6ee7b7;border-radius:var(--radius);padding:12px;margin-bottom:12px">
      <div class="acard-title" style="color:#065f46;margin-bottom:8px">Finals mode — ET & Penalties</div>
      <div class="form-grid">
        <div class="field"><label>Did it go to Extra Time?</label>
          <select id="m${n}-went-et"><option value="">Not yet</option><option value="yes">Yes</option><option value="no">No</option></select>
        </div>
        <div class="field"><label>Did it go to Penalties?</label>
          <select id="m${n}-went-pens"><option value="">Not yet</option><option value="yes">Yes</option><option value="no">No</option></select>
        </div>
      </div>
    </div>

    <div class="csv-import-box">
      <div class="csv-title">📋 Paste squad CSV (fastest way)</div>
      <div class="csv-sub">Format: one player per line — <code>Name, Position</code> e.g. <code>Haaland, Forward</code></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
        <div>
          <div class="field" style="margin-bottom:4px"><label>Home squad CSV</label>
            <textarea id="m${n}-home-csv" placeholder="Haaland, Forward&#10;De Bruyne, Midfielder&#10;Dias, Defender&#10;Ederson, Goalkeeper" rows="5" style="font-size:11px;font-family:monospace"></textarea>
          </div>
          <button class="add-player-btn" onclick="importCSV(${n},'home')">Import home squad</button>
        </div>
        <div>
          <div class="field" style="margin-bottom:4px"><label>Away squad CSV</label>
            <textarea id="m${n}-away-csv" placeholder="Palmer, Midfielder&#10;Jackson, Forward&#10;Colwill, Defender&#10;Sanchez, Goalkeeper" rows="5" style="font-size:11px;font-family:monospace"></textarea>
          </div>
          <button class="add-player-btn" onclick="importCSV(${n},'away')">Import away squad</button>
        </div>
      </div>
    </div>

    <div class="section-lbl">Home squad <span class="hint">(or add manually below)</span></div>
    <div class="player-list" id="m${n}-home-players"></div>
    <button class="add-player-btn" onclick="addPlayer('m${n}-home-players')">+ Add home player</button>

    <div class="section-lbl">Away squad</div>
    <div class="player-list" id="m${n}-away-players"></div>
    <button class="add-player-btn" onclick="addPlayer('m${n}-away-players')">+ Add away player</button>

    <div class="section-lbl">Actual result <span class="hint">(fill after match to trigger scoring)</span></div>
    <div class="result-row">
      <input class="result-inp" type="number" id="m${n}-home-result" min="0" max="20" placeholder="—">
      <span class="result-dash">—</span>
      <input class="result-inp" type="number" id="m${n}-away-result" min="0" max="20" placeholder="—">
    </div>
    <div class="section-lbl">Actual goalscorers <span class="hint">(comma separated, for scoring)</span></div>
    <div class="form-grid">
      <div class="field"><input type="text" id="m${n}-home-scorers" placeholder="e.g. Haaland, Foden"></div>
      <div class="field"><input type="text" id="m${n}-away-scorers" placeholder="e.g. Palmer, Jackson"></div>
    </div>
  `;
  container.appendChild(div);
  matchCount++;
}

function toggleFinalFields(n) {
  const cb = document.getElementById(`m${n}-final`);
  const fields = document.getElementById(`m${n}-final-fields`);
  if (fields) fields.style.display = cb?.checked ? 'block' : 'none';
}
  const csvId = `m${n}-${side}-csv`;
  const listId = `m${n}-${side}-players`;
  const raw = document.getElementById(csvId)?.value?.trim();
  if (!raw) { showToast('Paste some CSV first.'); return; }

  const list = document.getElementById(listId);
  list.innerHTML = ''; // clear existing

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let added = 0;
  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    const name = parts[0];
    const posRaw = (parts[1] || '').toLowerCase();
    let position = 'Forward';
    if (posRaw.includes('mid')) position = 'Midfielder';
    else if (posRaw.includes('def')) position = 'Defender';
    else if (posRaw.includes('goal') || posRaw.includes('gk')) position = 'Goalkeeper';
    else if (posRaw.includes('fwd') || posRaw.includes('for')) position = 'Forward';
    if (!name) return;
    const div = document.createElement('div');
    div.className = 'player-item';
    div.innerHTML = `
      <input type="text" value="${name}">
      <select>
        <option value="Forward" ${position==='Forward'?'selected':''}>FWD</option>
        <option value="Midfielder" ${position==='Midfielder'?'selected':''}>MID</option>
        <option value="Defender" ${position==='Defender'?'selected':''}>DEF</option>
        <option value="Goalkeeper" ${position==='Goalkeeper'?'selected':''}>GK</option>
      </select>
      <button onclick="this.parentElement.remove()">×</button>
    `;
    list.appendChild(div);
    added++;
  });
  showToast(`${added} players imported!`);
}

function addPlayer(containerId) {
  const c = document.getElementById(containerId);
  const div = document.createElement('div');
  div.className = 'player-item';
  div.innerHTML = `
    <input type="text" placeholder="Player name">
    <select>
      <option value="Forward">FWD</option>
      <option value="Midfielder">MID</option>
      <option value="Defender">DEF</option>
      <option value="Goalkeeper">GK</option>
    </select>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  c.appendChild(div);
}

async function savePredictor() {
  const matches = [];
  for (let n = 1; n < matchCount; n++) {
    const block = document.getElementById(`match-block-${n}`);
    if (!block) continue;
    const home = document.getElementById(`m${n}-home`)?.value?.trim();
    const away = document.getElementById(`m${n}-away`)?.value?.trim();
    if (!home || !away) continue;

    const getPlayers = (listId) => {
      const items = document.getElementById(listId)?.querySelectorAll('.player-item') || [];
      return Array.from(items).map(item => ({
        name: item.querySelector('input[type=text]')?.value?.trim() || '',
        position: item.querySelector('select')?.value || 'Forward',
      })).filter(p => p.name);
    };

    matches.push({
      id: n,
      home_team: home,
      away_team: away,
      kickoff: document.getElementById(`m${n}-time`)?.value || null,
      competition: document.getElementById(`m${n}-comp`)?.value?.trim() || '',
      venue: document.getElementById(`m${n}-venue`)?.value?.trim() || '',
      home_squad: getPlayers(`m${n}-home-players`),
      away_squad: getPlayers(`m${n}-away-players`),
      home_result: parseInt(document.getElementById(`m${n}-home-result`)?.value) ?? null,
      away_result: parseInt(document.getElementById(`m${n}-away-result`)?.value) ?? null,
      home_actual_scorers: (document.getElementById(`m${n}-home-scorers`)?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
      away_actual_scorers: (document.getElementById(`m${n}-away-scorers`)?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
      is_final: document.getElementById(`m${n}-final`)?.checked || false,
      went_to_et: document.getElementById(`m${n}-went-et`)?.value === 'yes' ? true : document.getElementById(`m${n}-went-et`)?.value === 'no' ? false : null,
      went_to_pens: document.getElementById(`m${n}-went-pens`)?.value === 'yes' ? true : document.getElementById(`m${n}-went-pens`)?.value === 'no' ? false : null,
    });
  }
  if (!matches.length) { showToast('Please add at least one match.'); return; }
  const ok = await upsertContent({ matches });
  if (ok) showToast('✅ Fixtures saved!');
  updateContentStatus();
}

// ── DECODE THIS ───────────────────────────────────────────
async function saveDecode() {
  const riddle = document.getElementById('decode-riddle')?.value?.trim();
  const answer = document.getElementById('decode-answer')?.value?.trim();
  const accepted = document.getElementById('decode-accepted')?.value?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const hint = document.getElementById('decode-hint')?.value?.trim() || '';
  if (!riddle || !answer || !accepted?.length) { showToast('Please fill in the riddle, answer, and accepted variations.'); return; }
  const ok = await upsertContent({ riddle: { riddle, answer, accepted, hint } });
  if (ok) showToast('✅ Riddle saved!');
  updateContentStatus();
}

// ── WC HEROES ─────────────────────────────────────────────
// Reuse ALL_PLAYERS from heroes.js — loaded before admin.js
function heroAdminFilter() {
  const val = document.getElementById('hero-search').value.toLowerCase().trim();
  const dd = document.getElementById('hero-dd');
  dd.innerHTML = '';
  if (!val) { dd.style.display = 'none'; return; }
  const matches = (typeof ALL_PLAYERS !== 'undefined' ? ALL_PLAYERS : [])
    .filter(p => p.name.toLowerCase().includes(val) || p.firstName.toLowerCase().includes(val) || p.country.toLowerCase().includes(val))
    .slice(0, 8);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.style.display = 'block';
  matches.forEach(p => {
    const div = document.createElement('div');
    div.className = 'hero-dd-opt';
    div.innerHTML = `<div>${p.firstName} <span style="color:var(--text-3);font-size:11px">${p.name !== p.firstName ? '('+p.name+')' : ''}</span></div><div class="hero-dd-sub">${p.country} · ${p.position} · ${p.debutWC}</div>`;
    div.onclick = () => {
      heroSelectedPlayer = p;
      showHeroSelectedCard(p);
      document.getElementById('hero-search').value = '';
      dd.style.display = 'none';
      document.getElementById('hero-save-btn').disabled = false;
    };
    dd.appendChild(div);
  });
}

function showHeroSelectedCard(p) {
  document.getElementById('hero-selected-card').style.display = 'block';
  document.getElementById('hero-sel-name').textContent = `${p.firstName} (${p.name}) — ${p.country}`;
  document.getElementById('hero-sel-data').innerHTML = [
    ['Confederation', p.confederation],
    ['Country', p.country],
    ['Position', p.position],
    ['Debut WC', p.debutWC],
    ['Editions', p.editions],
    ['Goals', p.goals],
    ['WC Winner', p.wcWinner],
  ].map(([l,v]) => `<div class="hsd"><div class="hsd-l">${l}</div><div class="hsd-v">${v}</div></div>`).join('');
}

function clearHeroSelection() {
  heroSelectedPlayer = null;
  document.getElementById('hero-selected-card').style.display = 'none';
  document.getElementById('hero-save-btn').disabled = true;
  document.getElementById('hero-search').value = '';
}

function addNewHero() {
  const p = {
    name: document.getElementById('new-hero-name').value.trim(),
    firstName: document.getElementById('new-hero-fn').value.trim(),
    confederation: document.getElementById('new-hero-conf').value,
    country: document.getElementById('new-hero-country').value.trim(),
    position: document.getElementById('new-hero-pos').value,
    debutWC: parseInt(document.getElementById('new-hero-debut').value),
    editions: parseInt(document.getElementById('new-hero-editions').value),
    goals: parseInt(document.getElementById('new-hero-goals').value),
    wcWinner: document.getElementById('new-hero-winner').value,
  };
  if (!p.name || !p.firstName || !p.country) { showToast('Please fill in at least name, first name, and country.'); return; }
  heroSelectedPlayer = p;
  showHeroSelectedCard(p);
  document.getElementById('hero-save-btn').disabled = false;
  showToast('Player added and selected!');
}

async function saveHeroes() {
  if (!heroSelectedPlayer) { showToast('Please select a player first.'); return; }
  const ok = await upsertContent({ wc_hero: heroSelectedPlayer });
  if (ok) showToast('✅ WC Hero saved!');
  updateContentStatus();
}

// ── SUPABASE HELPERS ──────────────────────────────────────
async function upsertContent(updates) {
  setSaveStatus('Saving...');
  if (!sb) {
    setSaveStatus('Save failed');
    showToast('❌ Database not connected. Check config.js credentials and refresh.');
    return false;
  }
  try {
    // First try to get existing row
    const { data: existing } = await sb
      .from('daily_content')
      .select('*')
      .eq('date', currentDate)
      .maybeSingle();

    const payload = { ...(existing || {}), ...updates, date: currentDate };
    delete payload.id; // remove id if present so upsert works cleanly

    const { error } = await sb
      .from('daily_content')
      .upsert(payload, { onConflict: 'date' });

    if (error) throw error;

    setSaveStatus('Saved ✓');
    setTimeout(() => setSaveStatus(''), 3000);
    return true;
  } catch (e) {
    setSaveStatus('Save failed');
    console.error('Save error:', e);
    showToast('❌ Save failed: ' + (e.message || 'Check Supabase RLS policies'));
    return false;
  }
}

function setSaveStatus(msg) {
  document.getElementById('save-status').textContent = msg;
}

async function updateContentStatus() {
  const tbody = document.getElementById('content-status-tbody');
  if (!tbody) return;
  try {
    const { data } = await sb.from('daily_content').select('*').eq('date', currentDate).single();
    const games = [
      { name:'Crossword',       key:'crossword',       summary: data?.crossword ? '6 clues ready' : '—' },
      { name:'Quiz',            key:'quiz_questions',  summary: data?.quiz_questions ? '5 questions' : '—' },
      { name:'Super Predictor', key:'matches',         summary: data?.matches ? `${data.matches.length} match${data.matches.length===1?'':'es'}` : '—' },
      { name:'Decode This',     key:'riddle',          summary: data?.riddle ? 'Riddle set' : '—' },
      { name:'WC Heroes',       key:'wc_hero',         summary: data?.wc_hero ? data.wc_hero.display || data.wc_hero.name : '—' },
    ];
    tbody.innerHTML = games.map(g => {
      const live = data?.[g.key];
      const pill = live ? `<span class="pill pill-live">Live</span>` : `<span class="pill pill-empty">Missing</span>`;
      return `<tr><td>${g.name}</td><td>${pill}</td><td>${g.summary}</td><td><button class="edit-link" onclick="showPanel('${g.key==='quiz_questions'?'quiz':g.key==='wc_hero'?'heroes':g.key==='matches'?'predictor':g.key}',document.querySelector('.anav'))">Edit</button></td></tr>`;
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-3);font-size:12px;padding:10px">No content yet for this date</td></tr>';
  }
}

async function loadDashboardStats() {
  try {
    const { count: playerCount } = await sb.from('leaderboard').select('*', { count:'exact', head:true }).eq('date', currentDate);
    document.getElementById('ds-players').textContent = playerCount || 0;
    const { data: schedData } = await sb.from('daily_content').select('date');
    document.getElementById('ds-scheduled').textContent = schedData?.length || 0;
    const { data: streakData } = await sb.from('user_streaks').select('streak_days').gte('streak_days', 1);
    document.getElementById('ds-streak').textContent = streakData?.length || 0;
    const { data: scores } = await sb.from('leaderboard').select('total_score').eq('date', currentDate);
    const avg = scores?.length ? Math.round(scores.reduce((s,r) => s + r.total_score, 0) / scores.length) : 0;
    document.getElementById('ds-avg').textContent = avg;
  } catch { /* silent fail */ }
}

async function loadSchedule() {
  const tbody = document.getElementById('schedule-tbody');
  if (!tbody) return;
  try {
    const { data } = await sb.from('daily_content').select('date,crossword,quiz_questions,matches,riddle,wc_hero').order('date', { ascending: false }).limit(14);
    if (!data?.length) { tbody.innerHTML = '<tr><td colspan="7" class="loading">No scheduled content yet</td></tr>'; return; }
    tbody.innerHTML = data.map(row => {
      const status = [row.crossword, row.quiz_questions, row.matches, row.riddle, row.wc_hero];
      const filled = status.filter(Boolean).length;
      let pill = filled === 5 ? '<span class="pill pill-live">Complete</span>' :
                 filled > 0  ? '<span class="pill pill-partial">Partial</span>' :
                                '<span class="pill pill-empty">Empty</span>';
      const check = v => v ? '✓' : '—';
      return `<tr>
        <td>${row.date === currentDate ? '<strong>Today</strong>' : row.date}</td>
        <td>${check(row.crossword)}</td>
        <td>${check(row.quiz_questions)}</td>
        <td>${check(row.matches)}</td>
        <td>${check(row.riddle)}</td>
        <td>${check(row.wc_hero)}</td>
        <td>${pill}</td>
      </tr>`;
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading schedule</td></tr>';
  }
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
}

// ── BOOT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', checkAdminAuth);
