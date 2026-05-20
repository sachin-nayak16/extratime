// ─── DECODE THIS ───────────────────────────────────────────

const SAMPLE_RIDDLE = {
  riddle: "I am worn by heroes, feared by rivals, and kissed when dreams come true. I have never kicked a ball, yet I win every World Cup. What am I?",
  answer: "FIFA World Cup Trophy",
  accepted: ["trophy","world cup trophy","the trophy","fifa trophy","world cup","the world cup trophy","fifa world cup trophy"],
};

async function initDecode(todayContent) {
  const state = getState();
  buildDecodeStats(state);

  if (state.decode_done) {
    const fb = document.getElementById('decode-fb');
    fb.className = 'fb ok';
    fb.textContent = `Already solved today! The answer was: ${state.decode_answer}`;
    fb.style.display = 'block';
    document.getElementById('decode-ans').disabled = true;
    return;
  }

  // Use content passed from app.js (already loaded) or fallback to sample
  const riddle = todayContent?.riddle || SAMPLE_RIDDLE;
  document.getElementById('riddle-text').textContent = `"${riddle.riddle}"`;
  document.getElementById('decode-ans').dataset.accepted = JSON.stringify(riddle.accepted || [riddle.answer?.toLowerCase()]);
  document.getElementById('decode-ans').dataset.answer = riddle.answer;

  // Allow Enter key to submit
  const inp = document.getElementById('decode-ans');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') checkDecode(); });
}

function buildDecodeStats(state) {
  const played = state.decode_played || 0;
  const won = state.decode_won || 0;
  const winPct = played > 0 ? Math.round((won / played) * 100) : 0;
  const streak = state.decode_streak || 0;
  const best = state.decode_best || 0;
  document.getElementById('decode-stats').innerHTML = `
    <div class="stat"><div class="stat-v">${played}</div><div class="stat-l">Played</div></div>
    <div class="stat"><div class="stat-v">${winPct}%</div><div class="stat-l">Win %</div></div>
    <div class="stat"><div class="stat-v">${streak}</div><div class="stat-l">Streak</div></div>
    <div class="stat"><div class="stat-v">${best}</div><div class="stat-l">Best</div></div>
  `;
}

function checkDecode() {
  const inp = document.getElementById('decode-ans');
  const ans = inp.value.trim().toLowerCase();
  const accepted = JSON.parse(inp.dataset.accepted || '[]');
  const answer = inp.dataset.answer || SAMPLE_RIDDLE.answer;
  const fb = document.getElementById('decode-fb');

  const correct = accepted.some(a => ans.includes(a.toLowerCase()));

  if (correct) {
    fb.className = 'fb ok';
    fb.textContent = `Correct! The answer is: ${answer}`;
    fb.style.display = 'block';
    inp.disabled = true;

    const state = getState();
    const played = (state.decode_played||0) + 1;
    const won = (state.decode_won||0) + 1;
    const streak = (state.decode_streak||0) + 1;
    const best = Math.max(state.decode_best||0, streak);
    saveState({ decode_done:true, decode_answer:answer, decode_solved:true, decode_played:played, decode_won:won, decode_streak:streak, decode_best:best });
    buildDecodeStats(getState());
    saveScoreToDb('decode', 'solved');
  } else {
    fb.className = 'fb warn';
    fb.textContent = 'Not quite. Keep trying!';
    fb.style.display = 'block';
    inp.select();
  }
}
