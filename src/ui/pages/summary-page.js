import { STATE } from '../../state/store.js';
import { showPage } from '../router.js';
import { escapeHtml } from '../../parsing/formatter.js';
import { questionMarks } from '../../domain/marking-scheme.js';

export function renderSummaryPage(){
  const a = STATE.attempt;
  const bySubj = {};
  a.questions.forEach(q=>{
    const r = a.responses[q.qid];
    const s = bySubj[q.subject] = bySubj[q.subject] || {attempted:0,correct:0,wrong:0,unattempted:0,obtained:0,max:0,total:0};
    const {pos, neg} = questionMarks(q, a.config);
    s.total++; s.max += pos;
    if(r.status==='correct'){ s.correct++; s.attempted++; s.obtained += pos; }
    else if(r.status==='wrong'){ s.wrong++; s.attempted++; s.obtained -= neg; }
    else s.unattempted++;
  });
  const rows = Object.entries(bySubj).map(([subj,s])=>{
    const acc = s.attempted>0 ? Math.round(s.correct/s.attempted*100) : 0;
    return `<tr>
      <td><b>${escapeHtml(subj)}</b><div class="empty-note" style="padding:0;">${s.total} questions</div></td>
      <td>${s.correct}</td><td>${s.wrong}</td><td>${s.unattempted}</td>
      <td>${Math.round(s.obtained*100)/100} / ${s.max}</td>
      <td style="width:120px;"><div class="bar-track"><div class="bar-fill" style="width:${acc}%;"></div></div>
        <div class="empty-note" style="padding:2px 0 0;">${acc}% accuracy</div></td>
    </tr>`;
  }).join('');
  document.getElementById('summaryTable').innerHTML = `
    <tr><th>Topic</th><th>Correct</th><th>Wrong</th><th>Unattempted</th><th>Marks</th><th>Accuracy</th></tr>
    ${rows}`;
}

export function initSummaryPage(){
  document.getElementById('goToScoreBtn').addEventListener('click', ()=> showPage('page-score'));
}
