// ─── QUIZ ──────────────────────────────────────────────────
// Free-text answers. Assist reveals a hint for the current question.
// Correct without Assist → earn 1 Assist token.
// Using an Assist costs 5 pts and no Assist is earned even if correct.

const SAMPLE_QUESTIONS = [
  { question:"Which country has won the most FIFA World Cup titles?", answer:"Brazil", accepted:["brazil"], hint:"They wear yellow and have won it 5 times", difficulty:"easy", explanation:"Brazil have won 5 World Cups — 1958, 1962, 1970, 1994 and 2002." },
  { question:"Who scored the 'Hand of God' goal in 1986?", answer:"Maradona", accepted:["maradona","diego maradona"], hint:"Argentine legend, widely considered one of the greatest ever", difficulty:"easy", explanation:"Diego Maradona scored with his hand against England in the 1986 quarter-final." },
  { question:"Which stadium hosted the 2022 World Cup final?", answer:"Lusail Stadium", accepted:["lusail","lusail stadium","lusail iconic stadium"], hint:"Located in Qatar, capacity over 80,000", difficulty:"medium", explanation:"Lusail Iconic Stadium in Qatar hosted the 2022 final." },
  { question:"How many FIFA World Cups has Germany won?", answer:"4", accepted:["4","four"], hint:"They won their last one in Brazil in 2014", difficulty:"medium", explanation:"Germany have won 4 World Cups — 1954, 1974, 1990 and 2014." },
  { question:"Who is the all-time leading scorer at the FIFA World Cup?", answer:"Miroslav Klose", accepted:["klose","miroslav klose"], hint:"German striker who played in 4 World Cups", difficulty:"hard", explanation:"Miroslav Klose scored 16 goals across 4 World Cups (2002–2014)." },
];

let qData=[], qIdx=0, qScore=0, qAssists=0, qAssistUsed=false, qAnswered=false;

async function initQuiz() {
  const state = getState();
  qAssists = state.assists || 0;
  updateAssistDisplay();
  if (state.quiz_done) { showQuizDone(state.score_quiz || 0); return; }
  try {
    const { data } = await sb.from('daily_content').select('quiz_questions').eq('date', CONFIG.today).maybeSingle();
    qData = data?.quiz_questions?.length ? data.quiz_questions : SAMPLE_QUESTIONS;
  } catch { qData = SAMPLE_QUESTIONS; }
  renderQuestion();
}

function renderQuestion() {
  if (qIdx >= qData.length) { finishQuiz(); return; }
  const q = qData[qIdx];
  document.getElementById('q-num').textContent = qIdx + 1;
  document.getElementById('q-prog').style.width = ((qIdx+1)/qData.length*100) + '%';
  document.getElementById('q-diff').textContent = q.difficulty[0].toUpperCase()+q.difficulty.slice(1);
  document.getElementById('q-diff').className = 'diff-badge '+q.difficulty;
  document.getElementById('q-text').textContent = q.question;
  document.getElementById('assist-used-note').style.display = 'none';
  const hr = document.getElementById('q-hint-row'); if (hr) hr.style.display = 'none';
  const inp = document.getElementById('q-answer-inp');
  if (inp) { inp.value=''; inp.disabled=false; inp.focus(); }
  const sb2 = document.getElementById('q-submit-btn');
  if (sb2) { sb2.disabled=false; sb2.textContent='Submit answer'; }
  document.getElementById('q-feedback').style.display = 'none';
  document.getElementById('q-next').style.display = 'none';
  qAssistUsed=false; qAnswered=false;
  updateAssistDisplay();
}

function updateAssistDisplay() {
  document.getElementById('assist-count').textContent = qAssists;
  document.getElementById('sc-assists').textContent = qAssists;
  const btn = document.getElementById('assist-btn');
  if (btn) btn.disabled = qAssists===0 || qAnswered || qAssistUsed;
}

function useAssist() {
  if (qAssists<=0||qAssistUsed||qAnswered) return;
  qAssists--; qAssistUsed=true;
  qScore = Math.max(0, qScore - SCORING.quiz.assistCost);
  const q = qData[qIdx];
  const hr = document.getElementById('q-hint-row');
  const ht = document.getElementById('q-hint-text');
  if (hr && ht) { ht.textContent = q.hint || 'No hint available.'; hr.style.display='block'; }
  document.getElementById('assist-used-note').style.display = 'block';
  updateAssistDisplay(); updateScoreDisplay();
  saveState({ assists: qAssists });
}

function submitAnswer() {
  if (qAnswered) return;
  const inp = document.getElementById('q-answer-inp');
  const userAns = (inp?.value||'').trim().toLowerCase();
  if (!userAns) { inp?.focus(); return; }
  qAnswered=true; inp.disabled=true;
  document.getElementById('q-submit-btn').disabled=true;
  const q = qData[qIdx];
  const accepted = (q.accepted||[q.answer.toLowerCase()]).map(a=>a.toLowerCase());
  const correct = accepted.some(a => userAns===a || userAns.includes(a) || a.includes(userAns));
  if (correct) { qScore += SCORING.quiz.perQuestion; if (!qAssistUsed) qAssists++; }
  const fb = document.getElementById('q-feedback');
  fb.className = 'q-feedback '+(correct?'ok':'bad');
  fb.innerHTML = correct
    ? `✓ Correct! ${qAssistUsed?'No Assist earned (Assist was used).':'Assist earned! 🎯'}<br><small>${q.explanation}</small>`
    : `✗ Not quite. The answer is <strong>${q.answer}</strong>.<br><small>${q.explanation}</small>`;
  fb.style.display='block';
  document.getElementById('q-next').style.display='block';
  document.getElementById('sc-quiz').textContent = qScore+'pts';
  updateAssistDisplay(); updateScoreDisplay();
  saveState({ assists: qAssists });
}

function nextQ() { qIdx++; if (qIdx>=qData.length) finishQuiz(); else renderQuestion(); }

function finishQuiz() {
  saveState({ quiz_done:true, score_quiz:qScore, assists:qAssists });
  saveScoreToDb('quiz', qScore);
  updateScoreDisplay();
  showQuizDone(qScore);
}

function showQuizDone(score) {
  document.getElementById('quiz-play').style.display = 'none';
  document.getElementById('quiz-done').style.display = 'block';
  document.getElementById('quiz-score').textContent = score+' pts';
  document.getElementById('quiz-score-sub').textContent = 'Quiz complete! Assists remaining: '+qAssists;
}
