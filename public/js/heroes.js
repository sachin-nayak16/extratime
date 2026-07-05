// ─── WC HEROES ─────────────────────────────────────────────
// ALL_PLAYERS loaded from heroes_db.js (2587 players, 1934-2022)

// Default fallback — overridden by Supabase content
let HEROES_TODAY = {
  name:'Miroslav Klose', firstName:'Miroslav Klose',
  confederation:'UEFA', country:'Germany', position:'Forward',
  debutWC:2002, editions:4, goals:16, appearances:24, born:1978, wcWinner:'Yes'
};

const HEROES_CATS = ['Confed.','Country','Position','Debut WC','Editions','Goals','Apps','WC Winner'];
const HEROES_KEYS = ['confederation','country','position','debutWC','editions','goals','appearances','wcWinner'];

let heroGuesses=0, heroSelected=null, heroDone=false, heroRevealing=false;
const heroGuessed = new Set();
let heroFiltered=[], heroHlIdx=-1;

function buildHeroStats(state) {
  const el = document.getElementById('heroes-stats');
  if (!el) return;
  el.style.display = 'flex';
  const played = state.heroes_played || 0;
  const won = state.heroes_won || 0;
  document.getElementById('hs-played').textContent = played;
  document.getElementById('hs-win').textContent = played ? Math.round(won/played*100)+'%' : '0%';
  document.getElementById('hs-streak').textContent = state.heroes_streak || 0;
  document.getElementById('hs-best').textContent = state.heroes_best || 0;
}

async function initHeroes() {
  const state = getState();
  buildHeroStats(state);

  // Load today's WC Hero from Supabase
  try {
    const { data } = await sb.from('daily_content').select('wc_hero').eq('date', CONFIG.today).maybeSingle();
    if (data?.wc_hero) {
      HEROES_TODAY = data.wc_hero;
      // Normalise historical country names to modern equivalents
      if (HEROES_TODAY.country === 'West Germany') HEROES_TODAY.country = 'Germany';
      // Build display string if not set
      if (!HEROES_TODAY.display) {
        HEROES_TODAY.display = `${HEROES_TODAY.firstName || HEROES_TODAY.name} — ${HEROES_TODAY.country}`;
      }
    }
  } catch { /* use fallback */ }

  // Build header row
  const header = document.getElementById('guess-header');
  header.innerHTML = `<th class="col-header player-col">Player</th>` +
    HEROES_CATS.map(c => `<th class="col-header">${c}</th>`).join('');

  // Check if already solved today
  if (state.heroes_done) {
    heroDone = true;
    heroGuesses = state.heroes_guesses || 0;
    const fb = document.getElementById('heroes-fb');
    fb.className = 'fb ok';
    const pts = SCORING.heroes.formula(heroGuesses);
    fb.innerHTML = `🏆 Already solved! Today's WC Hero is <strong>${state.heroes_player||''}</strong>. Score: <strong>${pts} pts</strong>`;
    fb.style.display = 'block';
    document.getElementById('legend-inp').disabled = true;
    document.getElementById('heroes-submit').disabled = true;
    document.getElementById('guess-count').textContent = `Solved in ${heroGuesses} guess${heroGuesses===1?'':'es'}`;
  }

  // Set up search
  const inp = document.getElementById('legend-inp');
  const btn = document.getElementById('heroes-submit');
  inp.addEventListener('input', heroFilter);
  btn.addEventListener('click', submitHeroGuess);
  inp.addEventListener('keydown', e => {
    const dd = document.getElementById('legend-dd');
    if (e.key==='ArrowDown') { e.preventDefault(); heroHlIdx=Math.min(heroHlIdx+1,heroFiltered.length-1); heroUpdateHL(); }
    else if (e.key==='ArrowUp') { e.preventDefault(); heroHlIdx=Math.max(heroHlIdx-1,0); heroUpdateHL(); }
    else if (e.key==='Enter') {
      e.preventDefault();
      if (dd.style.display==='block' && heroHlIdx>=0 && heroFiltered[heroHlIdx]) heroPickPlayer(heroFiltered[heroHlIdx]);
      else if (dd.style.display==='block' && heroFiltered.length===1) heroPickPlayer(heroFiltered[0]);
      else if (heroSelected && !btn.disabled && !heroRevealing) submitHeroGuess();
    }
    else if (e.key==='Escape') { dd.style.display='none'; heroHlIdx=-1; }
  });
}

function heroUpdateHL() {
  document.getElementById('legend-dd').querySelectorAll('.legend-opt').forEach((o,i) => o.classList.toggle('hl', i===heroHlIdx));
}

function normalise(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function heroFilter() {
  heroHlIdx=-1; heroSelected=null;
  document.getElementById('heroes-submit').disabled=true;
  const val = normalise(document.getElementById('legend-inp').value.trim());
  const dd = document.getElementById('legend-dd');
  dd.innerHTML='';
  if (!val || val.length < 2) { dd.style.display='none'; return; }
  const unifyCountry = c => c.replace('West Germany', 'Germany');
  heroFiltered = ALL_PLAYERS.filter(p =>
    !heroGuessed.has(p.name) &&
    (normalise(p.name).includes(val) || normalise(p.firstName).includes(val) || normalise(unifyCountry(p.country)).includes(unifyCountry(val)))
  ).slice(0, 20);
  if (!heroFiltered.length) { dd.style.display='none'; return; }
  dd.style.cssText = 'display:block;max-height:280px;overflow-y:auto;';
  heroFiltered.forEach(p => {
    const div = document.createElement('div');
    div.className = 'legend-opt';
    const same = p.firstName.toLowerCase() === p.name.toLowerCase();
    div.innerHTML = `<div style="font-weight:500">${p.firstName}${same?'':` <span style="color:var(--text-3);font-weight:400">(${p.name})</span>`}</div><div class="legend-opt-sub">${p.country==='West Germany'?'Germany':p.country} · ${p.position} · ${p.born}</div>`;
    div.addEventListener('mousedown', e => { e.preventDefault(); heroPickPlayer(p); });
    dd.appendChild(div);
  });
}

function heroPickPlayer(p) {
  heroSelected = p;
  const same = p.firstName.toLowerCase() === p.name.toLowerCase();
  document.getElementById('legend-inp').value = p.firstName + (same ? '' : ` (${p.name})`);
  document.getElementById('legend-dd').style.display = 'none';
  heroHlIdx = -1;
  document.getElementById('heroes-submit').disabled = false;
}

function heroGetClass(key, gv, tv) {
  if (gv===tv) return 'ok';
  // Treat West Germany and Germany as equivalent for country comparisons
  if (key==='country') {
    const unify = c => (c==='West Germany' || c==='Germany') ? 'Germany' : c;
    if (unify(gv)===unify(tv)) return 'ok';
  }
  if (typeof gv==='number' && typeof tv==='number' && Math.abs(gv-tv)<=2) return 'close';
  if (key==='appearances' && typeof gv==='number' && typeof tv==='number' && Math.abs(gv-tv)<=3) return 'close';
  return 'no';
}
function heroGetArrow(key, gv, tv) {
  if (typeof gv!=='number' || typeof tv!=='number' || gv===tv) return '';
  return gv < tv ? ' ▲' : ' ▼';
}

function heroRevealCells(cells, classes, values, onDone) {
  let i=0;
  function next() {
    if (i>=cells.length) { if(onDone) onDone(); return; }
    const cell=cells[i], cls=classes[i], val=values[i];
    cell.classList.add('flipping');
    setTimeout(() => {
      cell.classList.add(cls);
      cell.querySelector('.cat-val').textContent = val;
      cell.classList.remove('flipping');
      i++;
      setTimeout(next, 220);
    }, 250);
  }
  next();
}

function submitHeroGuess() {
  if (!heroSelected || heroDone || heroRevealing) return;
  heroRevealing = true;
  heroGuesses++;
  heroGuessed.add(heroSelected.name);
  const guess = heroSelected;
  const state = getState();

  // Track played on first guess
  if (heroGuesses === 1 && !state.heroes_played_today) {
    saveState({ heroes_played: (state.heroes_played||0) + 1, heroes_played_today: true });
    buildHeroStats(getState());
  }

  const tbody = document.getElementById('guess-body');
  const tr = document.createElement('tr');
  const nameTd = document.createElement('td');
  const same = guess.firstName.toLowerCase() === guess.name.toLowerCase();
  nameTd.innerHTML = `<div class="player-cell">${guess.firstName}<div class="player-cell-sub">${same?'':guess.name+' · '}${guess.country==='West Germany'?'Germany':guess.country}</div></div>`;
  tr.appendChild(nameTd);

  const catTds = [];
  HEROES_KEYS.forEach((key, i) => {
    const td = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'cat-cell';
    div.innerHTML = `<div class="cat-name">${HEROES_CATS[i]}</div><div class="cat-val">—</div>`;
    td.appendChild(div); tr.appendChild(td); catTds.push(div);
  });
  tbody.insertBefore(tr, tbody.firstChild);

  document.getElementById('heroes-submit').disabled = true;
  document.getElementById('legend-inp').disabled = true;
  document.getElementById('legend-inp').value = '';
  heroSelected = null;

  const classes = HEROES_KEYS.map(k => heroGetClass(k, guess[k], HEROES_TODAY[k]));
  const values = HEROES_KEYS.map((k, i) => {
    const arrow = (classes[i]==='close' || classes[i]==='no') ? heroGetArrow(k, guess[k], HEROES_TODAY[k]) : '';
    const raw = guess[k];
    const display = (k === 'country' && raw === 'West Germany') ? 'Germany' : raw;
    return display + arrow;
  });

  heroRevealCells(catTds, classes, values, () => {
    heroRevealing = false;
    document.getElementById('guess-count').textContent = `Guesses: ${heroGuesses}`;

    const win = guess.name === HEROES_TODAY.name;

    if (win) {
      heroDone = true;
      const pts = SCORING.heroes.formula(heroGuesses);
      const curState = getState();
      const played = curState.heroes_played || 1; // already incremented on first guess
      const won = (curState.heroes_won||0) + 1;
      const streak = getPrevStreak('heroes_streak') + 1;
      const best = Math.max(curState.heroes_best||0, streak);
      saveState({ heroes_done:true, heroes_guesses:heroGuesses, heroes_player:HEROES_TODAY.display, score_heroes:pts, heroes_played:played, heroes_won:won, heroes_streak:streak, heroes_best:best });
      buildHeroStats(getState());
      saveScoreToDb('heroes', pts);
      document.getElementById('sc-heroes').textContent = pts + 'pts';
      updateScoreDisplay();
      const fb = document.getElementById('heroes-fb');
      fb.className = 'fb ok';
      fb.innerHTML = `🏆 Correct! Today's WC Hero is <strong>${HEROES_TODAY.display}</strong>.<br>Solved in <strong>${heroGuesses}</strong> guess${heroGuesses===1?'':'es'} → <strong>${pts} pts</strong>`;
      fb.style.display = 'block';
      document.getElementById('legend-inp').disabled = true;
      document.getElementById('guess-count').textContent = `Solved in ${heroGuesses} guess${heroGuesses===1?'':'es'} · ${pts} pts`;
      setTimeout(() => maybeShowNudge('heroes'), 1500);
    } else {
      document.getElementById('legend-inp').disabled = false;
      document.getElementById('legend-inp').value = '';

      // "So close" popup — if 5+ categories are green
      const okCount = classes.filter(c => c === 'ok').length;
      if (okCount >= 5) showSoClosePopup();
    }
  });
}

function showSoClosePopup() {
  if (document.getElementById('so-close-popup')) return;
  const overlay = document.createElement('div');
  overlay.id = 'so-close-popup';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:#13131a;border:1px solid #2a2a3d;border-radius:16px;padding:32px 24px;max-width:340px;width:100%;text-align:center">
      <div style="font-size:44px;margin-bottom:12px">🔥</div>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:10px;letter-spacing:-.3px">So close — almost there!</div>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:24px;line-height:1.6">That's not today's player, but you're very warm. Most of the categories match — keep going!</div>
      <button onclick="document.getElementById('so-close-popup').remove()" style="width:100%;padding:12px;font-size:13px;font-weight:700;color:#052e16;background:#22c55e;border:none;border-radius:8px;cursor:pointer">Got it — keep guessing</button>
    </div>
  `;
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
