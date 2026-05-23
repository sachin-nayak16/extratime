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
  // Use local date (not UTC) to avoid off-by-one in IST timezone
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  document.getElementById('global-date').value = today;
  currentDate = today;
  buildQuizEditor();
  buildMatchEditor();
  loadDateContent(today);
  loadDashboardStats();
  loadSchedule();
}

function onDateChange() {
  const input = document.getElementById('global-date');
  // valueAsDate is always UTC midnight — convert to local date string
  const d = input.valueAsDate;
  if (d) {
    // Add timezone offset to get local date
    const local = new Date(d.getTime() + d.getTimezoneOffset() * -60000);
    currentDate = local.toISOString().split('T')[0];
  } else {
    // Fallback: try parsing the raw value
    const raw = input.value;
    if (raw.includes('/')) {
      const p = raw.split('/');
      currentDate = p.length === 3 ? `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` : raw;
    } else {
      currentDate = raw;
    }
  }
  document.getElementById('date-status').textContent = `Loading ${currentDate}...`;
  loadDateContent(currentDate);
}

async function loadDateContent(date) {
  const statusEl = document.getElementById('date-status');
  statusEl.textContent = 'Checking...';
  statusEl.style.color = '#94a3b8';
  try {
    const { data } = await sb.from('daily_content').select('*').eq('date', date).maybeSingle();
    if (data) {
      statusEl.textContent = '✓ Content exists for this date';
      statusEl.style.color = '#059669';
      populateAllForms(data);
    } else {
      statusEl.textContent = '📝 No content yet — add below';
      statusEl.style.color = '#94a3b8';
    }
  } catch(e) {
    statusEl.textContent = 'Error: ' + e.message;
    statusEl.style.color = '#dc2626';
  }
  updateContentStatus();
}

function populateAllForms(data) {
  // Crossword — restore into canvas
  if (data.crossword && !data.crossword.draft) {
    const cw = data.crossword;
    // Rebuild cwWords from saved data
    cwWords = [];
    (cw.across || []).forEach(a => {
      if (a.answer) cwWords.push({ word: a.answer, row: a.row, col: a.colStart, dir: 'H' });
    });
    (cw.down || []).forEach(d => {
      if (d.answer) cwWords.push({ word: d.answer, row: d.rowStart, col: d.col, dir: 'V' });
    });
    // Canvas will render when panel is opened
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
  // Matches — rebuild match editor with saved data
  if (data.matches?.length) {
    const container = document.getElementById('matches-container');
    container.innerHTML = '';
    matchCount = 1;
    data.matches.forEach(m => {
      addMatch();
      const n = matchCount - 1;
      const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== null && val !== undefined) el.value = val; };
      setVal(`m${n}-home`, m.home_team);
      setVal(`m${n}-away`, m.away_team);
      setVal(`m${n}-comp`, m.competition);
      setVal(`m${n}-venue`, m.venue);
      if (m.kickoff) setVal(`m${n}-time`, m.kickoff.slice(0,16));
      if (m.home_result !== null && m.home_result !== undefined) setVal(`m${n}-home-result`, m.home_result);
      if (m.away_result !== null && m.away_result !== undefined) setVal(`m${n}-away-result`, m.away_result);
      setVal(`m${n}-home-scorers`, (m.home_actual_scorers||[]).join(', '));
      setVal(`m${n}-away-scorers`, (m.away_actual_scorers||[]).join(', '));
      // Finals mode
      if (m.is_final) {
        const cb = document.getElementById(`m${n}-final`);
        if (cb) { cb.checked = true; toggleFinalFields(n); }
        if (m.went_to_et !== null && m.went_to_et !== undefined) {
          setVal(`m${n}-went-et`, m.went_to_et ? 'yes' : 'no');
        }
        if (m.went_to_pens !== null && m.went_to_pens !== undefined) {
          setVal(`m${n}-went-pens`, m.went_to_pens ? 'yes' : 'no');
        }
      }
      // Populate squads
      ['home','away'].forEach(side => {
        const squad = side === 'home' ? m.home_squad : m.away_squad;
        const listId = `m${n}-${side}-players`;
        const list = document.getElementById(listId);
        if (!list || !squad?.length) return;
        list.innerHTML = '';
        squad.forEach(p => {
          const div = document.createElement('div');
          div.className = 'player-item';
          div.innerHTML = `
            <input type="text" value="${p.name}">
            <select>
              <option value="Forward" ${p.position==='Forward'?'selected':''}>FWD</option>
              <option value="Midfielder" ${p.position==='Midfielder'?'selected':''}>MID</option>
              <option value="Defender" ${p.position==='Defender'?'selected':''}>DEF</option>
              <option value="Goalkeeper" ${p.position==='Goalkeeper'?'selected':''}>GK</option>
            </select>
            <button onclick="this.parentElement.remove()">×</button>
          `;
          list.appendChild(div);
        });
      });
    });
  }
}

// ── PANEL NAVIGATION ─────────────────────────────────────
function showPanel(name, btn) {
  document.querySelectorAll('.apanel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.anav').forEach(n => n.classList.remove('active'));
  document.getElementById(`apanel-${name}`).classList.add('active');
  btn.classList.add('active');
  if (name === 'schedule') loadSchedule();
  if (name === 'crossword') { initCWCanvas(); cwRenderGrid(); }
}

// ── CROSSWORD CANVAS BUILDER ──────────────────────────────
const CW_ROWS = 20, CW_COLS = 20;
let cwDir = 'H';
let cwWords = [];
let cwSelectedCell = null;

function initCWCanvas() {
  const canvas = document.getElementById('cw-canvas');
  if (!canvas || canvas.children.length > 0) return;
  canvas.innerHTML = '';
  for (let r = 0; r < CW_ROWS; r++) {
    for (let c = 0; c < CW_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cw-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.onclick = () => cwCellClick(r, c);
      canvas.appendChild(cell);
    }
  }
}

function cwSetDir(dir) {
  cwDir = dir;
  document.getElementById('dir-h').classList.toggle('active', dir === 'H');
  document.getElementById('dir-v').classList.toggle('active', dir === 'V');
}

function cwCellClick(r, c) {
  // If clicking a cell that's part of an existing word, offer to delete it
  const existingWord = cwWords.find(w => {
    if (w.dir === 'H') return w.row === r && c >= w.col && c < w.col + w.word.length;
    return w.col === c && r >= w.row && r < w.row + w.word.length;
  });

  if (existingWord) {
    if (confirm(`Delete "${existingWord.word}"?`)) {
      cwWords = cwWords.filter(w => w !== existingWord);
      cwRenderGrid();
    }
    return;
  }

  // Show word input popup
  cwShowWordInput(r, c);
}

function cwShowWordInput(r, c) {
  // Remove existing popup
  document.getElementById('cw-word-popup')?.remove();

  const popup = document.createElement('div');
  popup.id = 'cw-word-popup';
  popup.className = 'cw-word-input';
  popup.innerHTML = `
    <div style="font-size:11px;font-weight:600;color:var(--text-2);margin-bottom:8px">
      Place word at row ${r+1}, col ${c+1} — ${cwDir === 'H' ? '→ Horizontal' : '↓ Vertical'}
    </div>
    <input type="text" id="cw-word-inp" placeholder="TYPE WORD" maxlength="20"
      oninput="this.value=this.value.toUpperCase().replace(/[^A-Z]/g,'')"
      onkeydown="if(event.key==='Enter')cwConfirmWord(${r},${c});if(event.key==='Escape')document.getElementById('cw-word-popup')?.remove()">
    <div class="cw-word-input-btns">
      <button class="btn-g" style="flex:1" onclick="cwConfirmWord(${r},${c})">Place word</button>
      <button class="btn-w" onclick="document.getElementById('cw-word-popup')?.remove()">Cancel</button>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => document.getElementById('cw-word-inp')?.focus(), 50);
}

function cwConfirmWord(r, c) {
  const word = document.getElementById('cw-word-inp')?.value?.trim()?.toUpperCase();
  if (!word || word.length < 2) { showToast('Please type a word (min 2 letters)'); return; }

  // Check it fits in grid
  if (cwDir === 'H' && c + word.length > CW_COLS) {
    showToast(`Word too long — only ${CW_COLS - c} columns available`); return;
  }
  if (cwDir === 'V' && r + word.length > CW_ROWS) {
    showToast(`Word too long — only ${CW_ROWS - r} rows available`); return;
  }

  // Check for conflicts with existing words
  for (let i = 0; i < word.length; i++) {
    const wr = cwDir === 'H' ? r : r + i;
    const wc = cwDir === 'H' ? c + i : c;
    const existing = cwGetCell(wr, wc);
    if (existing && existing !== word[i]) {
      showToast(`Conflict at row ${wr+1}, col ${wc+1}: existing letter "${existing}" ≠ "${word[i]}"`);
      return;
    }
  }

  // Add word
  cwWords.push({ word, row: r, col: c, dir: cwDir });
  document.getElementById('cw-word-popup')?.remove();
  cwRenderGrid();
}

function cwGetCell(r, c) {
  // Returns the letter at r,c from any placed word, or null
  for (const w of cwWords) {
    if (w.dir === 'H' && w.row === r && c >= w.col && c < w.col + w.word.length) {
      return w.word[c - w.col];
    }
    if (w.dir === 'V' && w.col === c && r >= w.row && r < w.row + w.word.length) {
      return w.word[r - w.row];
    }
  }
  return null;
}

function cwRenderGrid() {
  // Clear all cells
  document.querySelectorAll('.cw-cell').forEach(cell => {
    cell.className = 'cw-cell';
    cell.textContent = '';
  });

  // Fill in letters
  cwWords.forEach(w => {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.dir === 'H' ? w.row : w.row + i;
      const c = w.dir === 'H' ? w.col + i : w.col;
      const cell = document.querySelector(`.cw-cell[data-r="${r}"][data-c="${c}"]`);
      if (cell) {
        cell.classList.add('filled');
        cell.textContent = w.word[i];
      }
    }
  });

  // Add word numbers
  const numbered = cwGetNumberedWords();
  numbered.forEach(({row, col, num}) => {
    const cell = document.querySelector(`.cw-cell[data-r="${row}"][data-c="${col}"]`);
    if (cell) {
      const numEl = document.createElement('span');
      numEl.className = 'cw-num';
      numEl.textContent = num;
      cell.insertBefore(numEl, cell.firstChild);
    }
  });

  // Update status and done button
  const status = document.getElementById('cw-canvas-status');
  const doneBtn = document.getElementById('cw-done-btn');
  if (cwWords.length === 0) {
    status.textContent = 'Click any cell to place your first word';
    doneBtn.disabled = true;
  } else {
    status.textContent = `${cwWords.length} word${cwWords.length===1?'':'s'} placed. Click a word to delete it.`;
    doneBtn.disabled = cwWords.length < 2;
  }
}

function cwGetNumberedWords() {
  // Assign numbers to words in reading order (top-left to bottom-right)
  const starts = new Map();
  cwWords.forEach(w => {
    const key = `${w.row},${w.col}`;
    if (!starts.has(key)) starts.set(key, []);
    starts.get(key).push(w);
  });

  const sortedKeys = [...starts.keys()].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  let num = 1;
  const result = [];
  sortedKeys.forEach(key => {
    const [row, col] = key.split(',').map(Number);
    result.push({ row, col, num });
    num++;
  });
  return result;
}

function cwClearAll() {
  if (cwWords.length > 0 && !confirm('Clear all words?')) return;
  cwWords = [];
  cwRenderGrid();
}

function cwDone() {
  if (cwWords.length < 2) { showToast('Place at least 2 words first.'); return; }

  // Validate — check all intersections are correct
  let conflicts = false;
  const cellMap = new Map();
  for (const w of cwWords) {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.dir === 'H' ? w.row : w.row + i;
      const c = w.dir === 'H' ? w.col + i : w.col;
      const key = `${r},${c}`;
      if (cellMap.has(key) && cellMap.get(key) !== w.word[i]) {
        conflicts = true; break;
      }
      cellMap.set(key, w.word[i]);
    }
    if (conflicts) break;
  }

  if (conflicts) { showToast('There are letter conflicts on the grid. Please fix them first.'); return; }

  // Build clues form
  const numbered = cwGetNumberedWords();
  const numMap = new Map(numbered.map(n => [`${n.row},${n.col}`, n.num]));

  const form = document.getElementById('cw-clues-form');
  form.innerHTML = '';

  cwWords.forEach(w => {
    const num = numMap.get(`${w.row},${w.col}`) || '?';
    const dirLabel = w.dir === 'H' ? 'Across' : 'Down';
    const div = document.createElement('div');
    div.className = 'clue-block';
    div.innerHTML = `
      <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px">
        ${num} ${dirLabel} — <span style="color:#059669;letter-spacing:1px">${w.word}</span>
        <span style="font-size:10px;color:var(--text-3)">(${w.word.length} letters, row ${w.row+1}, col ${w.col+1})</span>
      </div>
      <div class="field"><label>Clue <span class="req">*</span></label>
        <input type="text" id="cw-clue-${num}-${w.dir}" placeholder="Enter clue for ${w.word}..."
          data-word="${w.word}" data-row="${w.row}" data-col="${w.col}" data-dir="${w.dir}" data-num="${num}">
      </div>
      <div class="field"><label>Word lengths <span class="hint">only if multi-word answer, e.g. 4,5 for TONIKROOS</span></label>
        <input type="text" id="cw-wl-${num}-${w.dir}" placeholder="e.g. 4,5 or leave blank">
      </div>
    `;
    form.appendChild(div);
  });

  document.getElementById('cw-step1').style.display = 'none';
  document.getElementById('cw-step2').style.display = 'block';
}

function cwBackToGrid() {
  document.getElementById('cw-step1').style.display = 'block';
  document.getElementById('cw-step2').style.display = 'none';
}

async function cwSaveFromCanvas() {
  const numbered = cwGetNumberedWords();
  const numMap = new Map(numbered.map(n => [`${n.row},${n.col}`, n.num]));

  const across = [], down = [];

  for (const w of cwWords) {
    const num = numMap.get(`${w.row},${w.col}`);
    const clueEl = document.getElementById(`cw-clue-${num}-${w.dir}`);
    const wlEl = document.getElementById(`cw-wl-${num}-${w.dir}`);
    const clue = clueEl?.value?.trim();
    if (!clue) { showToast(`Please add a clue for ${w.word}`); return; }

    const wl = wlEl?.value?.trim() || null;
    if (wl) {
      const parts = wl.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n));
      if (parts.reduce((a,b)=>a+b,0) !== w.word.length) {
        showToast(`Word length mismatch for ${w.word}: "${wl}" doesn't add up to ${w.word.length}`);
        return;
      }
    }

    const entry = {
      number: num,
      answer: w.word,
      clue,
      wordLengths: wl,
      display: wl ? `(${wl})` : `(${w.word.length})`,
    };

    if (w.dir === 'H') {
      entry.row = w.row;
      entry.colStart = w.col;
      across.push(entry);
    } else {
      entry.col = w.col;
      entry.rowStart = w.row;
      down.push(entry);
    }
  }

  across.sort((a,b) => a.number - b.number);
  down.sort((a,b) => a.number - b.number);

  const crossword = { draft: false, across, down };
  const ok = await upsertContent({ crossword });
  if (ok) {
    showToast('✅ Crossword saved!');
    updateContentStatus();
  }
}

let cwSolution = null; // stores the solved layout

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

function importCSV(n, side) {
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
  const raw = document.getElementById('hero-search').value.trim();
  const val = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const dd = document.getElementById('hero-dd');
  dd.innerHTML = '';
  if (!val || val.length < 2) { dd.style.display = 'none'; return; }
  const matches = (typeof ALL_PLAYERS !== 'undefined' ? ALL_PLAYERS : [])
    .filter(p => {
      const n = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return n(p.name).includes(val) || n(p.firstName).includes(val) || n(p.country).includes(val);
    })
    .slice(0, 20);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.style.cssText = 'display:block;max-height:280px;overflow-y:auto;';
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
    const { data } = await sb.from('daily_content').select('*').eq('date', currentDate).maybeSingle();
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

    // Load per-game stats
    const { data: gameScores } = await sb.from('daily_scores').select('game,score,user_id').eq('date', currentDate);
    if (gameScores?.length) {
      renderGameStats(gameScores);
    }
  } catch { /* silent fail */ }
}

function renderGameStats(scores) {
  const existing = document.getElementById('game-stats-card');
  if (existing) existing.remove();

  const games = ['quiz','predictor','decode','heroes'];
  const gameLabels = { quiz:'Quiz', predictor:'Super Predictor', decode:'Decode This', heroes:'WC Heroes' };

  const card = document.createElement('div');
  card.id = 'game-stats-card';
  card.className = 'acard';
  card.style.marginTop = '14px';

  let html = `<div class="acard-title">Today's player activity <span style="font-size:10px;font-weight:400;color:var(--text-3)">(signed-in users only)</span></div>
    <table class="status-table">
      <thead><tr><th>Game</th><th>Players</th><th>Avg score</th><th>Top score</th></tr></thead>
      <tbody>`;

  games.forEach(game => {
    const gameRows = scores.filter(s => s.game === game);
    const numericScores = gameRows.map(s => typeof s.score === 'number' ? s.score : 0);
    const players = gameRows.length;
    const avg = players ? Math.round(numericScores.reduce((a,b)=>a+b,0)/players) : 0;
    const top = players ? Math.max(...numericScores) : 0;
    html += `<tr>
      <td>${gameLabels[game]}</td>
      <td>${players}</td>
      <td>${players ? avg + ' pts' : '—'}</td>
      <td>${players ? top + ' pts' : '—'}</td>
    </tr>`;
  });

  // Crossword stats from user_streaks (win/loss not in daily_scores)
  const { } = {};
  html += `</tbody></table>`;
  card.innerHTML = html;

  const dashPanel = document.getElementById('apanel-dashboard');
  dashPanel.appendChild(card);
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

function previewDate() {
  const url = `${window.location.origin}/index.html?preview=${currentDate}`;
  window.open(url, '_blank');
}

// ── BOOT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', checkAdminAuth);
