import { STATE } from '../../state/store.js';
import { toast } from '../toast.js';
import { goLanding } from '../router.js';
import { escapeHtml, convertMath } from '../../parsing/formatter.js';
import { formatTime } from '../../domain/timers.js';
import { openConfigFor } from './config-page.js';

export function renderScorePage(){
  const a = STATE.attempt;
  const s = a.score;
  const pct = s.max > 0 ? Math.max(0, Math.min(1, s.obtained / s.max)) : 0;
  const circ = 2 * Math.PI * 72;
  const arc = document.getElementById('scoreArc');
  arc.setAttribute('stroke-dasharray', `${circ}`);
  arc.setAttribute('stroke-dashoffset', `${circ * (1-pct)}`);
  arc.setAttribute('stroke', pct >= 0.6 ? '#1fae5c' : pct >= 0.35 ? '#c99a2e' : '#e14b4b');
  document.getElementById('scoreBig').textContent = s.obtained;
  document.getElementById('scoreSmall').textContent = `/ ${s.max} marks`;

  const totalTimeSec = (a.finishedAt - a.startedAt)/1000;
  const allotted = a.config.timerEnabled ? a.config.timerMinutes*60 : null;
  document.getElementById('scoreStatGrid').innerHTML = `
    <div class="box"><div class="v">${s.correct}</div><div class="k">Correct</div></div>
    <div class="box"><div class="v">${s.wrong}</div><div class="k">Wrong</div></div>
    <div class="box"><div class="v">${s.unattempted}</div><div class="k">Unattempted</div></div>
    <div class="box"><div class="v">${s.accuracy}%</div><div class="k">Accuracy</div></div>
    <div class="box"><div class="v">${formatTime(totalTimeSec)}</div><div class="k">Time Taken${allotted?(' / '+formatTime(allotted)):''}</div></div>
    <div class="box"><div class="v">${formatTime(totalTimeSec/Math.max(1,s.total))}</div><div class="k">Avg / Question</div></div>`;

  document.getElementById('reviewList').innerHTML = a.questions.map((q,i)=>{
    const r = a.responses[q.qid];
    const icon = r.status==='correct' ? {c:'#1fae5c',t:'&#10003;'} : r.status==='wrong' ? {c:'#e14b4b',t:'&#10007;'} : {c:'#4c5674',t:'&mdash;'};
    let bodyOpts = '';
    if(q.kind === 'mcq'){
      bodyOpts = q.options.map(o=>{
        let cls='opt-mini';
        if(o.letter===q.correctLetter) cls+=' correct';
        else if(o.letter===r.selected) cls+=' wrong';
        return `<div class="${cls}"><b>${o.letter}.</b> ${convertMath(o.text)}</div>`;
      }).join('');
    } else {
      bodyOpts = `<div class="opt-mini ${r.status}">Your answer: <b>${escapeHtml(r.selected||'\u2014')}</b> &nbsp;|&nbsp; Correct: <b>${escapeHtml(q.correctNumeric)}</b></div>`;
    }
    return `<div class="review-item">
      <div class="review-head" data-action="toggle-review-body">
        <div class="st-icon" style="background:${icon.c};">${icon.t}</div>
        <div class="qn">Q${i+1}. ${escapeHtml(q.topic)}</div>
        <div class="t">${formatTime(r.timeSpentSec)}</div>
      </div>
      <div class="review-body">
        <div style="margin-bottom:10px;">${convertMath(q.question)}</div>
        ${bodyOpts}
        <div class="solution-box"><h4>Solution</h4><p>${convertMath(q.solution||'Not available.')}</p></div>
      </div>
    </div>`;
  }).join('');
}

function downloadReport(){
  const a = STATE.attempt; const s = a.score;
  const lines = [];
  lines.push(`# CBT Practice Report`);
  lines.push('');
  lines.push(`**Bank:** ${a.bankName}`);
  lines.push(`**Started:** ${new Date(a.startedAt).toLocaleString()}`);
  lines.push(`**Finished:** ${new Date(a.finishedAt).toLocaleString()}`);
  lines.push(`**Total Time:** ${formatTime((a.finishedAt-a.startedAt)/1000)}`);
  lines.push(`**Marking:** ${a.config.markMode==='flat' ? 'Flat '+a.config.flatMarks+' each' : 'Database marks'}; Negative: ${a.config.negMode}`);
  lines.push('');
  lines.push(`## Score: ${s.obtained} / ${s.max}  (Accuracy ${s.accuracy}%)`);
  lines.push(`- Correct: ${s.correct}`);
  lines.push(`- Wrong: ${s.wrong}`);
  lines.push(`- Unattempted: ${s.unattempted}`);
  lines.push('');
  lines.push(`## Question Log`);
  a.questions.forEach((q,i)=>{
    const r = a.responses[q.qid];
    lines.push(`${i+1}. [${q.qid}] ${q.topic} (${q.difficulty}) - status: ${r.status} - time: ${formatTime(r.timeSpentSec)}`);
    lines.push(`   Q: ${q.question.replace(/\n/g,' ')}`);
    if(q.kind==='mcq'){
      lines.push(`   Your answer: ${r.selected||'-'} | Correct: ${q.correctLetter}`);
    } else {
      lines.push(`   Your answer: ${r.selected||'-'} | Correct: ${q.correctNumeric}`);
    }
    lines.push(`   Seen at: ${r.firstSeenAt?new Date(r.firstSeenAt).toLocaleTimeString():'-'} | Answered at: ${r.answeredAt?new Date(r.answeredAt).toLocaleTimeString():'-'}`);
    lines.push('');
  });
  const blob = new Blob([lines.join('\n')], {type:'text/markdown'});
  const url = URL.createObjectURL(blob);
  const fname = `CBT_Report_${a.bankName.replace(/\s+/g,'_')}_${new Date(a.finishedAt).toISOString().slice(0,16).replace(/[:T]/g,'-')}.md`;
  const link = document.createElement('a');
  link.href = url; link.download = fname; document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
  toast('Report downloaded to your device');
}

function retakeSame(){
  openConfigFor(STATE.attempt.bankName);
}

export function initScorePage(){
  document.getElementById('downloadReportBtn').addEventListener('click', downloadReport);
  document.getElementById('retakeSameBtn').addEventListener('click', retakeSame);
  document.getElementById('scoreGoLandingBtn').addEventListener('click', goLanding);

  document.getElementById('reviewList').addEventListener('click', (e)=>{
    const head = e.target.closest('[data-action="toggle-review-body"]');
    if(!head) return;
    head.nextElementSibling.classList.toggle('open');
  });
}
