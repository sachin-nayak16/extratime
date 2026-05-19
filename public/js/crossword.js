// ─── CROSSWORD ─────────────────────────────────────────────
// Grid verified by Python solver — all hard constraints met:
// No adjacent across rows (gaps: 3, 4 rows)
// METLIFE col(9) strictly outside MANDZUKIC cols(0-8)
// All 4 intersections verified with no letter conflicts

const CW_DATA = {
  across: {
    1: { r:7, cs:[0,1,2,3,4,5,6,7,8],    ans:'MANDZUKIC', display:'(9)',   label:'Goal-scorer in the 2018 WC Final' },
    2: { r:0, cs:[2,3,4,5,6,7,8,9,10,11], ans:'JULESRIMET',display:'(5,5)', label:'Old FIFA WC Trophy named after him' },
    3: { r:3, cs:[8,9,10,11,12],           ans:'KLOSE',     display:'(5)',   label:'All-time leading WC goal scorer' },
  },
  down: {
    4: { c:9, rs:[0,1,2,3,4,5,6],          ans:'METLIFE',  display:'(7)',   label:'Venue of the 2026 WC Final' },
    5: { c:3, rs:[5,6,7,8,9,10,11,12,13],  ans:'RODRIGUEZ',display:'(9)',   label:'FIFA Golden Boot winner in 2014' },
    6: { c:1, rs:[6,7,8,9,10,11,12,13],    ans:'MARACANA', display:'(8)',   label:'Iconic stadium — 2014 WC Final' },
  }
};

const CW_NUMS = {};
function _addNum(r,c,n){ CW_NUMS[`${r},${c}`] = n; }
_addNum(7,0,1); _addNum(0,2,2); _addNum(3,8,3);
_addNum(0,9,4); _addNum(5,3,5); _addNum(6,1,6);

const CW_WHITE = new Set();
Object.values(CW_DATA.across).forEach(({r,cs}) => cs.forEach(c => CW_WHITE.add(`${r},${c}`)));
Object.values(CW_DATA.down).forEach(({c,rs}) => rs.forEach(r => CW_WHITE.add(`${r},${c}`)));

const CW_ROWS=14, CW_COLS=13, CW_SZ=30;
const CW_CELLS={}, CW_VALS={};
let cwDir='A', cwNum=2, cwFocus=null;

function initCrossword(todayContent) {
  const state = getState();
  buildCWStats(state);
  buildCWGrid(); // builds cells first
  buildCWClues();

  // Restore typed letters AFTER grid is built
  if (state.cw_vals && !state.cw_solved) {
    Object.entries(state.cw_vals).forEach(([k,v]) => {
      if (CW_CELLS[k] && v) {
        CW_VALS[k] = v;
        const el = document.getElementById(`cw-ltr-${k}`);
        if (el) el.textContent = v;
      }
    });
  }

  // Restore solved state
  if (state.cw_solved) {
    // Fill in correct letters
    Object.entries(CW_DATA.across).forEach(([,{r,cs,ans}]) =>
      cs.forEach((c,i) => {
        const k=`${r},${c}`;
        CW_VALS[k]=ans[i];
        const el=document.getElementById(`cw-ltr-${k}`);
        if(el) el.textContent=ans[i];
        CW_CELLS[k]?.classList.add('ok');
      })
    );
    Object.entries(CW_DATA.down).forEach(([,{c,rs,ans}]) =>
      rs.forEach((r,i) => {
        const k=`${r},${c}`;
        CW_VALS[k]=ans[i];
        const el=document.getElementById(`cw-ltr-${k}`);
        if(el) el.textContent=ans[i];
        CW_CELLS[k]?.classList.add('ok');
      })
    );
    showCWFb('ok', '🏆 Already solved today! Counted in your win streak.');
  }
}

function buildCWStats(state) {
  const played = state.cw_played || 0;
  const won = state.cw_won || 0;
  const winPct = played > 0 ? Math.round((won / played) * 100) : 0;
  const streak = state.cw_streak || 0;
  const best = state.cw_best || 0;
  document.getElementById('cw-stats').innerHTML = `
    <div class="stat"><div class="stat-v">${played}</div><div class="stat-l">Played</div></div>
    <div class="stat"><div class="stat-v">${winPct}%</div><div class="stat-l">Win %</div></div>
    <div class="stat"><div class="stat-v">${streak}</div><div class="stat-l">Streak</div></div>
    <div class="stat"><div class="stat-v">${best}</div><div class="stat-l">Best</div></div>
  `;
}

function buildCWGrid() {
  const g = document.getElementById('cw-grid');
  g.style.gridTemplateColumns = `repeat(${CW_COLS},${CW_SZ}px)`;
  g.style.gridTemplateRows = `repeat(${CW_ROWS},${CW_SZ}px)`;
  g.style.width = (CW_COLS * (CW_SZ + 3)) + 'px';
  g.innerHTML = '';
  for (let r=0; r<CW_ROWS; r++) {
    for (let c=0; c<CW_COLS; c++) {
      const k = `${r},${c}`, div = document.createElement('div');
      if (!CW_WHITE.has(k)) {
        div.className = 'cw-blank';
        div.style.width = div.style.height = CW_SZ + 'px';
      } else {
        div.className = 'cw-cell';
        div.style.width = div.style.height = CW_SZ + 'px';
        if (CW_NUMS[k]) {
          const n = document.createElement('span');
          n.className = 'cw-num';
          n.textContent = CW_NUMS[k];
          div.appendChild(n);
        }
        const ltr = document.createElement('span');
        ltr.className = 'cw-letter';
        ltr.id = `cw-ltr-${k}`;
        div.appendChild(ltr);
        div.addEventListener('click', () => cwCellClick(r, c));
        CW_CELLS[k] = div;
        CW_VALS[k] = '';
      }
      g.appendChild(div);
    }
  }
  // Hook keyboard input
  const inp = document.getElementById('hidden-inp');
  inp.removeEventListener('keydown', onCWKey);
  inp.removeEventListener('input', onCWInput);
  inp.addEventListener('keydown', onCWKey);
  inp.addEventListener('input', onCWInput);
  cwSelClue('A', 2);
}

function buildCWClues() {
  const container = document.getElementById('clue-cols');
  let acrossHTML = `<div><div class="clue-head">Across</div>`;
  Object.entries(CW_DATA.across).forEach(([n, {label, display}]) => {
    acrossHTML += `<div class="clue-row" id="cl-A-${n}" onclick="cwSelClue('A',${n})">
      <span class="clue-n">${n}</span>
      <span class="clue-t">${label} <span class="clue-len">${display}</span></span>
    </div>`;
  });
  acrossHTML += '</div>';
  let downHTML = `<div><div class="clue-head">Down</div>`;
  Object.entries(CW_DATA.down).forEach(([n, {label, display}]) => {
    downHTML += `<div class="clue-row" id="cl-D-${n}" onclick="cwSelClue('D',${n})">
      <span class="clue-n">${n}</span>
      <span class="clue-t">${label} <span class="clue-len">${display}</span></span>
    </div>`;
  });
  downHTML += '</div>';
  container.innerHTML = acrossHTML + downHTML;
}

function cwCellClick(r, c) {
  const hasA = Object.values(CW_DATA.across).some(({r:ar,cs}) => ar===r && cs.includes(c));
  const hasD = Object.values(CW_DATA.down).some(({c:dc,rs}) => dc===c && rs.includes(r));
  const k = `${r},${c}`;
  if (hasA && hasD && cwFocus === k) cwDir = cwDir==='A' ? 'D' : 'A';
  else if (cwDir==='A' && !hasA && hasD) cwDir = 'D';
  else if (cwDir==='D' && !hasD && hasA) cwDir = 'A';
  cwFocus = k;
  cwHighlight(r, c);
  document.getElementById('hidden-inp').focus();
}

function cwHighlight(fr, fc) {
  if (cwDir==='A') {
    const e = Object.entries(CW_DATA.across).find(([,{r,cs}]) => r===fr && cs.includes(fc));
    if (e) { cwNum = +e[0]; } else {
      const d = Object.entries(CW_DATA.down).find(([,{c,rs}]) => c===fc && rs.includes(fr));
      if (d) { cwDir='D'; cwNum=+d[0]; }
    }
  } else {
    const e = Object.entries(CW_DATA.down).find(([,{c,rs}]) => c===fc && rs.includes(fr));
    if (e) { cwNum = +e[0]; } else {
      const a = Object.entries(CW_DATA.across).find(([,{r,cs}]) => r===fr && cs.includes(fc));
      if (a) { cwDir='A'; cwNum=+a[0]; }
    }
  }
  cwApplyHL(fr, fc);
}

function cwApplyHL(fr, fc) {
  Object.values(CW_CELLS).forEach(el => el.classList.remove('hl','focused'));
  document.querySelectorAll('.clue-row').forEach(r => r.classList.remove('hlc'));
  if (cwDir==='A') {
    const {r,cs} = CW_DATA.across[cwNum]||{};
    if (cs) cs.forEach(c => { const el=CW_CELLS[`${r},${c}`]; if(el) el.classList.add('hl'); });
  } else {
    const {c,rs} = CW_DATA.down[cwNum]||{};
    if (rs) rs.forEach(r => { const el=CW_CELLS[`${r},${c}`]; if(el) el.classList.add('hl'); });
  }
  if (fr !== undefined) {
    const fel = CW_CELLS[`${fr},${fc}`];
    if (fel) { fel.classList.remove('hl'); fel.classList.add('focused'); }
    cwFocus = `${fr},${fc}`;
  }
  const cl = document.getElementById(`cl-${cwDir}-${cwNum}`);
  if (cl) {
    cl.classList.add('hlc');
    const entry = cwDir==='A' ? CW_DATA.across[cwNum] : CW_DATA.down[cwNum];
    document.getElementById('active-bar').textContent = `${cwNum} ${cwDir==='A'?'Across':'Down'}: ${entry.label} ${entry.display}`;
  }
}

function cwSelClue(dir, n) {
  cwDir = dir; cwNum = n;
  let cells = [];
  if (dir==='A') { const {r,cs}=CW_DATA.across[n]||{}; if(cs) cells=cs.map(c=>({r,c})); }
  else { const {c,rs}=CW_DATA.down[n]||{}; if(rs) cells=rs.map(r=>({r,c})); }
  const t = cells.find(({r,c}) => !CW_VALS[`${r},${c}`]) || cells[0];
  if (t) { cwFocus=`${t.r},${t.c}`; cwApplyHL(t.r,t.c); }
  document.getElementById('hidden-inp').focus();
}

function onCWInput() {
  const inp = document.getElementById('hidden-inp');
  const v = inp.value.replace(/[^a-zA-Z]/g,''); inp.value='';
  if (!v || !cwFocus) return;
  const ltr = v.slice(-1).toUpperCase();
  const el = CW_CELLS[cwFocus]; if (!el) return;
  CW_VALS[cwFocus] = ltr;
  document.getElementById(`cw-ltr-${cwFocus}`).textContent = ltr;
  el.classList.remove('ok','bad');
  cwSaveVals();
  cwAdvance();
}

function onCWKey(e) {
  if (!cwFocus) return;
  const [r,c] = [+cwFocus.split(',')[0], +cwFocus.split(',')[1]];
  if (e.key==='Backspace') {
    e.preventDefault();
    if (CW_VALS[cwFocus]) {
      CW_VALS[cwFocus]='';
      document.getElementById(`cw-ltr-${cwFocus}`).textContent='';
      CW_CELLS[cwFocus].classList.remove('ok','bad');
      cwSaveVals();
    } else cwRetreat(r,c);
  }
  else if (e.key==='ArrowRight') { e.preventDefault(); cwMove(r,c+1); }
  else if (e.key==='ArrowLeft')  { e.preventDefault(); cwMove(r,c-1); }
  else if (e.key==='ArrowDown')  { e.preventDefault(); cwMove(r+1,c); }
  else if (e.key==='ArrowUp')    { e.preventDefault(); cwMove(r-1,c); }
  else if (e.key==='Tab') {
    e.preventDefault();
    const clues = [['A',1],['A',2],['A',3],['D',4],['D',5],['D',6]];
    const ci = clues.findIndex(([d,n]) => d===cwDir && n===cwNum);
    cwSelClue(...clues[(ci + (e.shiftKey?-1:1) + clues.length) % clues.length]);
  }
}

function cwMove(r,c) { const k=`${r},${c}`; if(!CW_CELLS[k]) return; cwFocus=k; cwHighlight(r,c); }

function cwAdvance() {
  if (!cwFocus) return;
  const [r,c] = [+cwFocus.split(',')[0], +cwFocus.split(',')[1]];
  if (cwDir==='A') {
    const e = Object.values(CW_DATA.across).find(({r:ar,cs}) => ar===r && cs.includes(c));
    if (e) { const i=e.cs.indexOf(c); if(i<e.cs.length-1){const nk=`${r},${e.cs[i+1]}`; cwFocus=nk; cwApplyHL(r,e.cs[i+1]);}}
  } else {
    const e = Object.values(CW_DATA.down).find(({c:dc,rs}) => dc===c && rs.includes(r));
    if (e) { const i=e.rs.indexOf(r); if(i<e.rs.length-1){const nk=`${e.rs[i+1]},${c}`; cwFocus=nk; cwApplyHL(e.rs[i+1],c);}}
  }
}

function cwRetreat(r,c) {
  if (cwDir==='A') {
    const e = Object.values(CW_DATA.across).find(({r:ar,cs}) => ar===r && cs.includes(c));
    if (e) { const i=e.cs.indexOf(c); if(i>0){const pk=`${r},${e.cs[i-1]}`; CW_VALS[pk]=''; document.getElementById(`cw-ltr-${pk}`).textContent=''; CW_CELLS[pk].classList.remove('ok','bad'); cwFocus=pk; cwApplyHL(r,e.cs[i-1]); cwSaveVals();}}
  } else {
    const e = Object.values(CW_DATA.down).find(({c:dc,rs}) => dc===c && rs.includes(r));
    if (e) { const i=e.rs.indexOf(r); if(i>0){const pk=`${e.rs[i-1]},${c}`; CW_VALS[pk]=''; document.getElementById(`cw-ltr-${pk}`).textContent=''; CW_CELLS[pk].classList.remove('ok','bad'); cwFocus=pk; cwApplyHL(e.rs[i-1],c); cwSaveVals();}}
  }
}

function cwSaveVals() {
  saveState({ cw_vals: {...CW_VALS} });
}

function checkCW() {
  let correct=0, total=0;
  function chk(cells, ans) {
    let ok=true;
    cells.forEach(({k,i}) => {
      const el = CW_CELLS[k]; if(!el) return;
      el.classList.remove('ok','bad');
      if (CW_VALS[k]) { const r=CW_VALS[k]===ans[i]; el.classList.add(r?'ok':'bad'); if(!r) ok=false; }
      else ok=false;
    });
    return ok;
  }
  Object.entries(CW_DATA.across).forEach(([,{r,cs,ans}]) => { if(chk(cs.map((c,i)=>({k:`${r},${c}`,i})),ans)) correct++; total++; });
  Object.entries(CW_DATA.down).forEach(([,{c,rs,ans}]) => { if(chk(rs.map((r,i)=>({k:`${r},${c}`,i})),ans)) correct++; total++; });
  const win = correct === total;
  if (win) {
    const state = getState();
    const played = (state.cw_played||0)+1;
    const won = (state.cw_won||0)+1;
    const streak = (state.cw_streak||0)+1;
    const best = Math.max(state.cw_best||0, streak);
    saveState({ cw_solved:true, cw_played:played, cw_won:won, cw_streak:streak, cw_best:best });
    buildCWStats(getState());
    saveScoreToDb('crossword', 'solved');
  }
  showCWFb(win?'ok':'warn', win ? '🏆 Solved! Added to your win streak.' : `You got ${correct} of ${total} words. Keep going!`);
}

function revealCW() {
  Object.entries(CW_DATA.across).forEach(([,{r,cs,ans}]) => {
    cs.forEach((c,i) => { const k=`${r},${c}`; CW_VALS[k]=ans[i]; document.getElementById(`cw-ltr-${k}`).textContent=ans[i]; CW_CELLS[k].classList.remove('bad'); CW_CELLS[k].classList.add('ok'); });
  });
  Object.entries(CW_DATA.down).forEach(([,{c,rs,ans}]) => {
    rs.forEach((r,i) => { const k=`${r},${c}`; CW_VALS[k]=ans[i]; document.getElementById(`cw-ltr-${k}`).textContent=ans[i]; CW_CELLS[k].classList.remove('bad'); CW_CELLS[k].classList.add('ok'); });
  });
  showCWFb('info', '<strong>Across:</strong> MANDZUKIC · JULES RIMET (5,5) · KLOSE &nbsp;&nbsp; <strong>Down:</strong> METLIFE · RODRIGUEZ · MARACANA');
}

function clearCW() {
  Object.keys(CW_CELLS).forEach(k => { CW_VALS[k]=''; document.getElementById(`cw-ltr-${k}`).textContent=''; CW_CELLS[k].classList.remove('ok','bad'); });
  saveState({ cw_vals:{} });
  document.getElementById('cw-fb').style.display='none';
  cwSelClue('A',2);
}

function showCWFb(type, html) {
  const fb = document.getElementById('cw-fb');
  fb.className = `fb ${type}`;
  fb.innerHTML = html;
  fb.style.display = 'block';
}
