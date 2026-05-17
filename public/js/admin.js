// ─── ADMIN PANEL ───────────────────────────────────────────
// Password is stored as a hash in config. Change ADMIN_PASSWORD below.
const ADMIN_PASSWORD = 'extratime2026';

let currentDate = new Date().toISOString().split('T')[0];
let cwValidated = false;
let heroSelectedPlayer = null;
let matchCount = 1;

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
      const qEl = document.getElementById(`q-text-${idx}`);
      if (qEl) qEl.value = q.question;
      q.options?.forEach((opt, j) => {
        const optEl = document.getElementById(`q-opt-${idx}-${j+1}`);
        if (optEl) optEl.value = opt;
      });
      const radio = document.querySelector(`input[name="q${idx}-ans"][value="${q.answer+1}"]`);
      if (radio) radio.checked = true;
      const diffEl = document.getElementById(`q-diff-${idx}`);
      if (diffEl) diffEl.value = q.difficulty;
      const expEl = document.getElementById(`q-exp-${idx}`);
      if (expEl) expEl.value = q.explanation || '';
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

// ── CROSSWORD ─────────────────────────────────────────────
function cwPreview() {
  for (let i = 1; i <= 6; i++) {
    const ans = document.getElementById(`cw-a${i}`)?.value?.trim() || '';
    const wl = document.getElementById(`cw-wl${i}`)?.value?.trim() || '';
    const prev = document.getElementById(`cw-prev${i}`);
    if (!prev) continue;
    if (!ans) { prev.textContent = ''; continue; }
    if (wl) {
      const parts = wl.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n));
      const sum = parts.reduce((a,b) => a+b, 0);
      if (sum === ans.length) prev.textContent = `→ (${wl}) ✓`;
      else prev.textContent = `⚠ sum ${sum} ≠ ${ans.length}`;
    } else {
      prev.textContent = `→ (${ans.length})`;
    }
  }
}

function validateCW() {
  cwValidated = false;
  const statusEl = document.getElementById('cw-status');
  statusEl.style.display = 'block';
  document.getElementById('cw-save-btn').disabled = true;

  const answers = [1,2,3,4,5,6].map(i => document.getElementById(`cw-a${i}`)?.value?.trim()?.toUpperCase() || '');
  if (answers.some(a => !a)) {
    statusEl.className = 'validate-status validate-fail';
    statusEl.textContent = '❌ Please fill in all 6 answers before validating.';
    return;
  }

  const across = answers.slice(0, 3);
  const down = answers.slice(3);

  // Find all intersections
  const ints = [];
  across.forEach((aw, ai) => {
    down.forEach((dw, di) => {
      for (let i = 0; i < aw.length; i++) {
        for (let j = 0; j < dw.length; j++) {
          if (aw[i] === dw[j]) ints.push({ ai, di, i, j, ch: aw[i] });
        }
      }
    });
  });

  if (ints.length === 0) {
    statusEl.className = 'validate-status validate-fail';
    statusEl.textContent = '❌ No intersecting letters found between across and down answers. Change one or more answers so they share common letters.';
    return;
  }

  const acrossCovered = new Set(ints.map(x => x.ai));
  const downCovered = new Set(ints.map(x => x.di));

  if (acrossCovered.size < 2 || downCovered.size < 2) {
    statusEl.className = 'validate-status validate-fail';
    statusEl.textContent = '❌ Not enough intersections. Each word needs to cross at least one perpendicular word. Adjust your answers.';
    return;
  }

  // Check word lengths
  for (let i = 1; i <= 6; i++) {
    const ans = answers[i-1];
    const wl = document.getElementById(`cw-wl${i}`)?.value?.trim();
    if (wl) {
      const parts = wl.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n));
      const sum = parts.reduce((a,b) => a+b, 0);
      if (sum !== ans.length) {
        statusEl.className = 'validate-status validate-fail';
        statusEl.textContent = `❌ Word length mismatch for clue ${i}: "${wl}" sums to ${sum} but answer has ${ans.length} letters.`;
        return;
      }
    }
  }

  cwValidated = true;
  statusEl.className = 'validate-status validate-ok';
  statusEl.textContent = `✓ Valid grid! ${ints.length} intersections found. Hard constraints verified. Ready to save.`;
  document.getElementById('cw-save-btn').disabled = false;
}

async function saveCW(asDraft = false) {
  if (!asDraft && !cwValidated) { showToast('Please validate the crossword first.'); return; }

  const crossword = {
    across: [1,2,3].map(i => ({
      answer: document.getElementById(`cw-a${i}`).value.trim().toUpperCase(),
      clue: document.getElementById(`cw-c${i}`).value.trim(),
      wordLengths: document.getElementById(`cw-wl${i}`).value.trim() || null,
    })),
    down: [4,5,6].map(i => ({
      answer: document.getElementById(`cw-a${i}`).value.trim().toUpperCase(),
      clue: document.getElementById(`cw-c${i}`).value.trim(),
      wordLengths: document.getElementById(`cw-wl${i}`).value.trim() || null,
    })),
    draft: asDraft,
  };

  await upsertContent({ crossword });
  showToast(asDraft ? 'Crossword saved as draft.' : 'Crossword saved!');
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
      <div class="field"><label>Question <span class="req">*</span></label><input type="text" id="q-text-${i}" placeholder="Type your question here..."></div>
      <p class="opt-hint">Enter 4 options. Select the radio button next to the correct answer.</p>
      ${[1,2,3,4].map(j => `
        <div class="opt-row">
          <input type="radio" name="q${i}-ans" value="${j}">
          <input type="text" id="q-opt-${i}-${j}" placeholder="Option ${j}">
        </div>`).join('')}
      <div class="field" style="margin-top:8px"><label>Explanation (shown after answer)</label><input type="text" id="q-exp-${i}" placeholder="Brief explanation of the correct answer"></div>
    `;
    container.appendChild(div);
  }
}

async function saveQuiz() {
  const questions = [];
  for (let i = 1; i <= 5; i++) {
    const q = document.getElementById(`q-text-${i}`)?.value?.trim();
    if (!q) { showToast(`Question ${i} is empty.`); return; }
    const opts = [1,2,3,4].map(j => document.getElementById(`q-opt-${i}-${j}`)?.value?.trim() || '');
    if (opts.some(o => !o)) { showToast(`Please fill all 4 options for question ${i}.`); return; }
    const radio = document.querySelector(`input[name="q${i}-ans"]:checked`);
    if (!radio) { showToast(`Please select the correct answer for question ${i}.`); return; }
    questions.push({
      question: q,
      options: opts,
      answer: parseInt(radio.value) - 1,
      difficulty: document.getElementById(`q-diff-${i}`)?.value || 'easy',
      explanation: document.getElementById(`q-exp-${i}`)?.value?.trim() || '',
    });
  }
  await upsertContent({ quiz_questions: questions });
  showToast('Quiz saved!');
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
      <div class="field"><label>Home team <span class="req">*</span></label><input type="text" id="m${n}-home" placeholder="e.g. Man City"></div>
      <div class="field"><label>Away team <span class="req">*</span></label><input type="text" id="m${n}-away" placeholder="e.g. Chelsea"></div>
      <div class="field"><label>Kick-off time</label><input type="datetime-local" id="m${n}-time"></div>
      <div class="field"><label>Competition</label><input type="text" id="m${n}-comp" placeholder="e.g. FA Cup Final"></div>
      <div class="field"><label>Venue</label><input type="text" id="m${n}-venue" placeholder="e.g. Wembley"></div>
    </div>
    <div class="section-lbl">Home squad (goalscorer options)</div>
    <div class="player-list" id="m${n}-home-players">
      <div class="player-item">
        <input type="text" placeholder="Player name e.g. Haaland">
        <select><option value="Forward">F</option><option value="Midfielder">M</option><option value="Defender">D</option><option value="Goalkeeper">GK</option></select>
        <button onclick="this.parentElement.remove()">×</button>
      </div>
    </div>
    <button class="add-player-btn" onclick="addPlayer('m${n}-home-players')">+ Add home player</button>
    <div class="section-lbl">Away squad (goalscorer options)</div>
    <div class="player-list" id="m${n}-away-players">
      <div class="player-item">
        <input type="text" placeholder="Player name e.g. Palmer">
        <select><option value="Forward">F</option><option value="Midfielder">M</option><option value="Defender">D</option><option value="Goalkeeper">GK</option></select>
        <button onclick="this.parentElement.remove()">×</button>
      </div>
    </div>
    <button class="add-player-btn" onclick="addPlayer('m${n}-away-players')">+ Add away player</button>
    <div class="section-lbl">Actual result <span class="hint">(fill after match)</span></div>
    <div class="result-row">
      <input class="result-inp" type="number" id="m${n}-home-result" min="0" max="20" placeholder="0">
      <span class="result-dash">—</span>
      <input class="result-inp" type="number" id="m${n}-away-result" min="0" max="20" placeholder="0">
    </div>
  `;
  container.appendChild(div);
  matchCount++;
}

function addPlayer(containerId) {
  const c = document.getElementById(containerId);
  const div = document.createElement('div');
  div.className = 'player-item';
  div.innerHTML = `
    <input type="text" placeholder="Player name">
    <select><option value="Forward">F</option><option value="Midfielder">M</option><option value="Defender">D</option><option value="Goalkeeper">GK</option></select>
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
      home_result: parseInt(document.getElementById(`m${n}-home-result`)?.value) || null,
      away_result: parseInt(document.getElementById(`m${n}-away-result`)?.value) || null,
    });
  }
  if (!matches.length) { showToast('Please add at least one match.'); return; }
  await upsertContent({ matches });
  showToast('Fixtures saved!');
  updateContentStatus();
}

// ── DECODE THIS ───────────────────────────────────────────
async function saveDecode() {
  const riddle = document.getElementById('decode-riddle')?.value?.trim();
  const answer = document.getElementById('decode-answer')?.value?.trim();
  const accepted = document.getElementById('decode-accepted')?.value?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const hint = document.getElementById('decode-hint')?.value?.trim() || '';
  if (!riddle || !answer || !accepted?.length) { showToast('Please fill in the riddle, answer, and accepted variations.'); return; }
  await upsertContent({ riddle: { riddle, answer, accepted, hint } });
  showToast('Riddle saved!');
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
  await upsertContent({ wc_hero: heroSelectedPlayer });
  showToast('WC Hero saved!');
  updateContentStatus();
}

// ── SUPABASE HELPERS ──────────────────────────────────────
async function upsertContent(updates) {
  setSaveStatus('Saving...');
  try {
    const { data: existing } = await sb.from('daily_content').select('*').eq('date', currentDate).single();
    const payload = { ...(existing || {}), ...updates, date: currentDate };
    const { error } = await sb.from('daily_content').upsert(payload, { onConflict: 'date' });
    if (error) throw error;
    setSaveStatus('Saved ✓');
    setTimeout(() => setSaveStatus(''), 3000);
  } catch (e) {
    setSaveStatus('Save failed');
    showToast('Error saving: ' + e.message);
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
