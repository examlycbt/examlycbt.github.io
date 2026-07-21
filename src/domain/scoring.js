import { questionMarks } from './marking-scheme.js';

export function numericMatches(input, correct){
  const a = parseFloat(input), b = parseFloat(correct);
  if(!isNaN(a) && !isNaN(b)) return Math.abs(a-b) < 1e-2;
  return String(input).trim().toLowerCase() === String(correct).trim().toLowerCase();
}

export function computeScore(a){
  let obtained = 0, max = 0, correct=0, wrong=0, unattempted=0;
  a.questions.forEach(q=>{
    const r = a.responses[q.qid];
    const {pos, neg} = questionMarks(q, a.config);
    max += pos;
    let finalStatus = r.status;
    if(!r.checked && finalStatus !== 'skipped' && (r.selected != null && r.selected !== '')){
      const isCorrect = q.kind === 'mcq' ? (r.selected === q.correctLetter) : numericMatches(r.selected, q.correctNumeric);
      finalStatus = isCorrect ? 'correct' : 'wrong';
      r.status = finalStatus; r.checked = true;
    }
    if(finalStatus === 'correct'){ obtained += pos; correct++; }
    else if(finalStatus === 'wrong'){ obtained -= neg; wrong++; }
    else { unattempted++; }
  });
  return { obtained: Math.round(obtained*100)/100, max, correct, wrong, unattempted,
    total: a.questions.length, accuracy: (correct+wrong)>0 ? Math.round(correct/(correct+wrong)*1000)/10 : 0 };
}
