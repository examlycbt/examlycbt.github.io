import { STATE } from '../../state/store.js';
import { toast } from '../toast.js';
import { showPage, exitTest } from '../router.js';
import { applyTheme, toggleTheme } from '../theme.js';
import { applyUiPrefs, toggleQstrip, toggleSidePanel, closeMobilePanel } from '../ui-prefs.js';
import { lsSet } from '../../storage/local-storage.js';
import { LS_ACTIVE, LS_HISTORY } from '../../storage/keys.js';
import { escapeHtml, convertMath } from '../../parsing/formatter.js';
import { questionMarks } from '../../domain/marking-scheme.js';
import { numericMatches, computeScore } from '../../domain/scoring.js';
import { paletteState } from '../../domain/attempt.js';
import { formatTime, startTimers, stopTimers, commitElapsed, beginQuestionTimer } from '../../domain/timers.js';
import { openReportModal } from '../components/report-modal.js';
import { renderSummaryPage } from './summary-page.js';
import { renderScorePage } from './score-page.js';

function saveActive(){ lsSet(LS_ACTIVE, STATE.attempt); }

function statusClass(r){
  const st = paletteState(r);
  return st === 'notvisited' ? '' : 'status-' + st;
}

export function renderTestPage(){
  const a = STATE.attempt;
  const mode = a.config.mode || 'practice';
  document.getElementById('testTitle').textContent = a.bankName;
  const tagEl = document.getElementById('testTag');
  tagEl.textContent = mode === 'test' ? 'TEST' : 'PRACTICE';
  tagEl.classList.toggle('mode-test', mode === 'test');

  applyTheme();
  applyUiPrefs();
  renderQStrip();
  renderPalette();
  renderLegend();
  renderQuestion(a.currentIndex);
  startTimers({
    onTotalTick: updateTotalTimerBox,
    onExpire: () => submitTest(true),
    onQuestionTick: (liveSec)=>{
      const lbl = document.getElementById('qtimerLabel');
      if(lbl) lbl.textContent = formatTime(liveSec);
    }
  });
}

function renderQStrip(){
  const a = STATE.attempt;
  const strip = document.getElementById('qstripTrack');
  strip.innerHTML = a.questions.map((q,i)=>{
    const r = a.responses[q.qid];
    const cls = statusClass(r);
    return `<div class="qn ${cls} ${i===a.currentIndex?'active':''}" data-action="goto" data-index="${i}">${i+1}</div>`;
  }).join('');
  const activeEl = strip.querySelector('.qn.active');
  if(activeEl) activeEl.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
}

function scrollQstrip(dir){
  const track = document.getElementById('qstripTrack');
  if(track) track.scrollBy({left: dir * 220, behavior: 'smooth'});
}

function renderPalette(){
  const a = STATE.attempt;
  const bySubj = {};
  a.questions.forEach((q,i)=>{ (bySubj[q.subject] = bySubj[q.subject]||[]).push(i); });
  const wrap = document.getElementById('paletteWrap');
  wrap.innerHTML = Object.entries(bySubj).map(([subj, idxs])=>`
    <div class="subject-block">
      <h4>${escapeHtml(subj)} &middot; ${idxs.length}</h4>
      <div class="palette-grid">
        ${idxs.map(i=>{
          const r = a.responses[a.questions[i].qid];
          return `<div class="pn ${statusClass(r)} ${i===a.currentIndex?'active':''}"
            data-action="goto" data-index="${i}">${i+1}</div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

function renderLegend(){
  const a = STATE.attempt;
  const counts = {notvisited:0, visited:0, answered:0, marked:0, answeredmarked:0};
  Object.values(a.responses).forEach(r=> counts[paletteState(r)]++);
  document.getElementById('legend').innerHTML = `
    <div class="li"><span class="dot dot-green"></span>Attempted<span class="n">${counts.answered}</span></div>
    <div class="li"><span class="dot dot-purple-dot"></span>Attempted &amp; Marked<span class="n">${counts.answeredmarked}</span></div>
    <div class="li"><span class="dot dot-purple"></span>Marked<span class="n">${counts.marked}</span></div>
    <div class="li"><span class="dot dot-red"></span>Seen<span class="n">${counts.visited}</span></div>
    <div class="li"><span class="dot dot-grey"></span>Not Seen<span class="n">${counts.notvisited}</span></div>`;
}

function renderQuestion(idx){
  const a = STATE.attempt;
  commitElapsed();
  a.currentIndex = idx;
  const q = a.questions[idx];
  const r = a.responses[q.qid];
  if(!r.firstSeenAt) r.firstSeenAt = Date.now();
  r.lastSeenAt = Date.now();
  if(r.status === 'notseen') r.status = 'seen';
  beginQuestionTimer();

  const {pos, neg} = questionMarks(q, a.config);
  const card = document.getElementById('qcard');

  let optHtml = '';
  if(q.kind === 'mcq'){
    optHtml = `<div class="opt-list">` + q.options.map(o=>{
      let cls = 'opt';
      if(r.checked || r.status==='skipped'){
        cls += ' locked';
        if(o.letter === q.correctLetter) cls += ' correct';
        else if(o.letter === r.selected) cls += ' wrong';
      } else if(o.letter === r.selected){
        cls += ' selected';
      }
      return `<div class="${cls}" data-action="select-option" data-letter="${o.letter}">
        <div class="badge">${o.letter}</div><div class="otext">${convertMath(o.text)}</div></div>`;
    }).join('') + `</div>`;
  } else {
    const locked = r.checked || r.status==='skipped';
    optHtml = `<div class="numeric-input-row">
      <input type="text" id="numInput" placeholder="Enter numeric answer" value="${r.numericInput||''}"
        ${locked?'disabled':''}>
      ${locked ? `<span class="pill ${r.status==='correct'?'pill-green':'pill-red'}">Correct: ${escapeHtml(q.correctNumeric)}</span>` : ''}
    </div>`;
  }

  let solutionHtml = '';
  if(r.checked || r.status==='skipped'){
    solutionHtml = `<div class="solution-box"><h4>Solution</h4><p>${convertMath(q.solution || 'Not available.')}</p></div>`;
  }

  const isPractice = (a.config.mode || 'practice') !== 'test';
  const midActions = isPractice ? `
      <button class="btn btn-green btn-sm" data-action="check" ${r.checked||r.status==='skipped'?'disabled':''}>Check Answer</button>
      <button class="btn btn-sm" data-action="clear" ${r.checked||r.status==='skipped'?'disabled':''}>Clear Response</button>
      <div class="spacer"></div>
      <div class="showans-toggle">Show Answer
        <div class="switch ${r.status==='skipped'?'on':''}" data-action="toggle-show-answer"><div class="knob"></div></div>
      </div>` : `
      <button class="btn btn-sm" data-action="clear">Clear Response</button>
      <div class="spacer"></div>`;

  card.innerHTML = `
    <div class="qcard-top">
      <div class="qnum-cell">
        <div class="qnum-badge">${idx+1}</div>
        <div class="qtimer" id="qtimerLabel">00:00</div>
      </div>
      <div class="marks-tag"><span class="pos">+${pos}</span>${neg>0?`<span class="neg">&minus;${neg}</span>`:''}</div>
      <span class="diff-tag diff-${q.difficulty}">${q.difficulty}</span>
      <span class="qtype-tag">${q.kind==='mcq'?'MCQ':'Numerical'}</span>
      <div class="topic-full">${escapeHtml(q.topic)}</div>
      <div class="header-actions">
        <button class="review-star ${r.review?'active':''}" data-action="toggle-review" title="${r.review?'Unmark review':'Mark for review'}">${r.review?'&#9733;':'&#9734;'}</button>
        <button class="report-btn" data-action="report" title="Report an issue with this question">&#9873;</button>
      </div>
    </div>
    <div class="qtext">${convertMath(q.question)}</div>
    ${optHtml}
    ${solutionHtml}
    <div class="actions-bar">${midActions}</div>
    <div class="actions-bar">
      <button class="btn" data-action="prev" ${idx===0?'disabled':''}>&larr; Previous</button>
      <div class="spacer"></div>
      <button class="btn btn-primary" data-action="next" ${idx===a.questions.length-1?'disabled':''}>Next &rarr;</button>
    </div>`;

  renderQStrip(); renderPalette(); renderLegend();
  saveActive();
}

function onNumericInput(val){
  const a = STATE.attempt; const q = a.questions[a.currentIndex]; const r = a.responses[q.qid];
  r.numericInput = val;
  r.selected = val;
  r.status = val.trim() ? 'attempted' : 'seen';
  r.answeredAt = Date.now();
  renderQStrip(); renderPalette(); renderLegend(); saveActive();
}

function selectOption(letter){
  const a = STATE.attempt; const q = a.questions[a.currentIndex]; const r = a.responses[q.qid];
  if(r.checked || r.status==='skipped') return;
  r.selected = letter;
  r.status = 'attempted';
  r.answeredAt = Date.now();
  renderQuestion(a.currentIndex);
}

function checkAnswer(){
  const a = STATE.attempt; const q = a.questions[a.currentIndex]; const r = a.responses[q.qid];
  if(r.selected == null || r.selected === ''){ toast('Select or enter an answer first'); return; }
  let isCorrect;
  if(q.kind === 'mcq') isCorrect = (r.selected === q.correctLetter);
  else isCorrect = numericMatches(r.selected, q.correctNumeric);
  r.checked = true;
  r.status = isCorrect ? 'correct' : 'wrong';
  renderQuestion(a.currentIndex);
}

function clearResponse(){
  const a = STATE.attempt; const q = a.questions[a.currentIndex]; const r = a.responses[q.qid];
  if(r.checked || r.status==='skipped') return;
  r.selected = null; r.numericInput=''; r.status = 'seen'; r.answeredAt = null;
  renderQuestion(a.currentIndex);
}

function toggleReview(){
  const a = STATE.attempt; const q = a.questions[a.currentIndex]; const r = a.responses[q.qid];
  r.review = !r.review;
  renderQuestion(a.currentIndex);
}

function toggleShowAnswer(){
  const a = STATE.attempt; const q = a.questions[a.currentIndex]; const r = a.responses[q.qid];
  if(r.checked) return;
  r.status = (r.status === 'skipped') ? (r.selected ? 'attempted' : 'seen') : 'skipped';
  renderQuestion(a.currentIndex);
}

function goTo(i){
  const a = STATE.attempt;
  if(i < 0 || i >= a.questions.length) return;
  renderQuestion(i);
}

function updateTotalTimerBox(remaining, enabled){
  const box = document.getElementById('totalTimerBox');
  if(!enabled){ box.innerHTML = '&#9200; Untimed'; box.classList.remove('low'); return; }
  box.innerHTML = '&#9200; ' + formatTime(remaining);
  box.classList.toggle('low', remaining <= 120);
}

function confirmSubmit(){
  if(confirm('Submit the test now? You cannot change answers after submitting.')) submitTest(false);
}

function submitTest(auto){
  commitElapsed();
  stopTimers();
  const a = STATE.attempt;
  a.finishedAt = Date.now();
  a.score = computeScore(a);
  STATE.history.push(a);
  lsSet(LS_HISTORY, STATE.history);
  localStorage.removeItem(LS_ACTIVE);
  if(auto) toast('Time up! Test auto-submitted.');
  renderSummaryPage();
  renderScorePage();
  showPage('page-summary');
}

export function initTestPage(){
  document.getElementById('backBtn').addEventListener('click', exitTest);
  document.getElementById('qstripToggleBtn').addEventListener('click', toggleQstrip);
  document.getElementById('panelToggleBtn').addEventListener('click', toggleSidePanel);
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
  document.getElementById('submitTestBtn').addEventListener('click', confirmSubmit);
  document.getElementById('sideBackdrop').addEventListener('click', closeMobilePanel);
  document.getElementById('qstripLeftArrow').addEventListener('click', ()=> scrollQstrip(-1));
  document.getElementById('qstripRightArrow').addEventListener('click', ()=> scrollQstrip(1));

  document.getElementById('qstripTrack').addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action="goto"]');
    if(!el) return;
    goTo(parseInt(el.dataset.index,10));
  });

  document.getElementById('paletteWrap').addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action="goto"]');
    if(!el) return;
    goTo(parseInt(el.dataset.index,10));
  });

  const qcard = document.getElementById('qcard');
  qcard.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const action = el.dataset.action;
    if(action === 'select-option') selectOption(el.dataset.letter);
    else if(action === 'check') checkAnswer();
    else if(action === 'clear') clearResponse();
    else if(action === 'toggle-show-answer') toggleShowAnswer();
    else if(action === 'toggle-review') toggleReview();
    else if(action === 'report') openReportModal();
    else if(action === 'prev') goTo(STATE.attempt.currentIndex - 1);
    else if(action === 'next') goTo(STATE.attempt.currentIndex + 1);
  });
  qcard.addEventListener('input', (e)=>{
    if(e.target && e.target.id === 'numInput') onNumericInput(e.target.value);
  });
}
