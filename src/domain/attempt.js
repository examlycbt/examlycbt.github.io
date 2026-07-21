import { uid } from '../state/store.js';

export function createInitialResponseState(){
  return {
    status: 'notseen',
    selected: null,
    numericInput: '',
    checked: false,
    review: false,
    timeSpentSec: 0,
    firstSeenAt: null,
    lastSeenAt: null,
    answeredAt: null
  };
}

export function createResponses(questions){
  const responses = {};
  questions.forEach(q=>{
    responses[q.qid] = createInitialResponseState();
  });
  return responses;
}

export function createAttempt({ bankName, questions, config }){
  return {
    id: uid(),
    bankName,
    config,
    questions,
    responses: createResponses(questions),
    currentIndex: 0,
    startedAt: Date.now(),
    finishedAt: null,
    totalSecondsRemaining: config.timerEnabled ? Math.round(config.timerMinutes*60) : null,
    score: null
  };
}

/* Standard 5-state exam palette status, independent of correctness (correctness is only
   revealed via Check/Show Answer in practice mode, or after submission). */
export function paletteState(r){
  const answered = !!(r.selected != null && r.selected !== '');
  const seen = r.status !== 'notseen';
  if(!seen) return 'notvisited';
  if(r.review && answered) return 'answeredmarked';
  if(r.review) return 'marked';
  if(answered) return 'answered';
  return 'visited';
}
