// ─── QUIZ ──────────────────────────────────────────────────
// Questions loaded from Supabase daily_content table.
// Falls back to sample questions if not connected.

const SAMPLE_QUESTIONS = [
  { question:"Which country has won the most FIFA World Cup titles?", options:["Brazil","Germany","Argentina","Italy"], answer:0, difficulty:"easy", explanation:"Brazil have won 5 World Cups — 1958, 1962, 1970, 1994 and 2002." },
  { question:"Who scored the 'Hand of God' goal in 1986?", options:["Pelé","Ronaldo","Maradona","Zidane"], answer:2, difficulty:"easy", explanation:"Diego Maradona scored with his hand against England in the 1986 quarter-final." },
  { question:"Which stadium hosted the 2022 World Cup final?", options:["Lusail Stadium","Al Bayt","Khalifa","Education City"], answer:0, difficulty:"medium", explanation:"Lusail Iconic Stadium in Qatar hosted the 2022 final." },
  { question:"How many times has the World Cup been held in Africa?", options:["Never","Once","Twice","Three times"], answer:1, difficulty:"medium", explanation:"South Africa 2010 is the only time the World Cup has been held in Africa." },
  { question:"Who has appeared in the most World Cup matches ever?", options:["Messi","Lothar Matthäus","Ronaldo","Klose"], answer:1, difficulty:"hard", explanation:"Lothar Matthäus played 25 World Cup matches across five tournaments." },
];

let qData = [], qIdx=0, qScore=0, qAssists=0, qAssistUsed=false, qAnswered=false;

async function initQuiz() {
  const state = getState();
  // Restore assists from state
  qAssists = state.assists || 0;
  updateAssistDisplay();

  // Check if already completed today
  if (state.quiz_done) {
    showQuizDone(state.score_quiz || 0);
    return;
  }

  // Try to load questions from Supabase
  try {
    const { data } = await sb
      .from('daily_content')
      .select('quiz_questions')
      .eq('date', CONFIG.today)
      .single();
    qData = data?.quiz_questions || SAMPLE_QUESTIONS;
  } catch {
    qData = SAMPLE_QUESTIONS;
  }

  renderQuestion();
}

function renderQuestion() {
  if (qIdx >= qData.length) { finishQuiz(); return; }
  const q = qData[qIdx];
  document.getElementById('q-num').textContent = qIdx + 1;
  document.getElementById('q-prog').style.width = ((qIdx+1) / qData.length * 100) + '%';
  document.getElementById('q-diff').textContent = q.difficulty[0].toUpperCase() + q.difficulty.slice(1);
  document.getElementById('q-diff').className = `diff-badge ${q.difficulty}`;
  document.getElementById('q-text').textContent = q.question;
  document.getElementById('assist-used-note').style.display = 'none';
  const opts = document.getElementById('q-opts');
  opts.innerHTML = '';
  q.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = opt;
    b.onclick = () => answerQuestion(b, i === q.answer);
    opts.appendChild(b);
  });
  document.getElementById('q-feedback').style.display = 'none';
  document.getElementById('q-next').style.display = 'none';
  qAssistUsed = false;
  qAnswered = false;
  updateAssistDisplay();
}

function updateAssistDisplay() {
  document.getElementById('assist-count').textContent = qAssists;
  document.getElementById('sc-assists').textContent = qAssists;
  const btn = document.getElementById('assist-btn');
  btn.disabled = qAssists === 0 || qAnswered || qAssistUsed;
}

function useAssist() {
  if (qAssists <= 0 || qAssistUsed || qAnswered) return;
  qAssists--;
  qAssistUsed = true;
  qScore = Math.max(0, qScore - SCORING.quiz.assistCost);
  // Eliminate one wrong answer
  const q = qData[qIdx];
  const wrongBtns = Array.from(document.querySelectorAll('.opt'))
    .filter((_, i) => i !== q.answer && !_.disabled);
  if (wrongBtns.length > 0) {
    wrongBtns[0].disabled = true;
    wrongBtns[0].style.opacity = '0.3';
  }
  document.getElementById('assist-used-note').style.display = 'block';
  updateAssistDisplay();
  updateScoreDisplay();
  saveState({ assists: qAssists });
}

function answerQuestion(btn, correct) {
  if (qAnswered) return;
  qAnswered = true;
  const q = qData[qIdx];
  document.querySelectorAll('.opt').forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add('ok');
  });
  if (!correct) btn.classList.add('bad');
  if (correct) {
    qScore += SCORING.quiz.perQuestion;
    if (!qAssistUsed) qAssists++;
  }
  const fb = document.getElementById('q-feedback');
  fb.className = `q-feedback ${correct?'ok':'bad'}`;
  fb.textContent = (correct ? `Correct! ${qAssistUsed?'No Assist earned (Assist was used).':'Assist earned! 🎯'} ` : 'Wrong. ') + q.explanation;
  fb.style.display = 'block';
  document.getElementById('q-next').style.display = 'block';
  document.getElementById('sc-quiz').textContent = qScore + 'pts';
  updateAssistDisplay();
  updateScoreDisplay();
  saveState({ assists: qAssists });
}

function nextQ() {
  qIdx++;
  if (qIdx >= qData.length) finishQuiz();
  else renderQuestion();
}

function finishQuiz() {
  saveState({ quiz_done:true, score_quiz:qScore, assists:qAssists });
  saveScoreToDb('quiz', qScore);
  updateScoreDisplay();
  showQuizDone(qScore);
}

function showQuizDone(score) {
  document.getElementById('quiz-play').style.display = 'none';
  document.getElementById('quiz-done').style.display = 'block';
  document.getElementById('quiz-score').textContent = score + ' pts';
  document.getElementById('quiz-score-sub').textContent = `Quiz complete! Assists: ${qAssists}`;
}
