import { STATE } from '../state/store.js';

export function formatTime(sec){
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  const pad = n => String(n).padStart(2,'0');
  return h>0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

let _qTickStart = null;

export function beginQuestionTimer(){
  _qTickStart = Date.now();
}

export function commitElapsed(){
  if(_qTickStart == null) return;
  const a = STATE.attempt; if(!a) return;
  const q = a.questions[a.currentIndex]; if(!q) return;
  const r = a.responses[q.qid];
  r.timeSpentSec += (Date.now() - _qTickStart) / 1000;
  _qTickStart = null;
}

export function getLiveQuestionElapsedSec(){
  if(_qTickStart == null) return null;
  const a = STATE.attempt; if(!a) return null;
  const q = a.questions[a.currentIndex]; if(!q) return null;
  const r = a.responses[q.qid];
  return r.timeSpentSec + (Date.now() - _qTickStart) / 1000;
}

export function startTimers({ onTotalTick, onExpire, onQuestionTick } = {}){
  stopTimers();
  const a = STATE.attempt;

  const tickTotal = () => { if(onTotalTick) onTotalTick(a.totalSecondsRemaining, a.config.timerEnabled); };
  tickTotal();

  STATE.timerHandle = setInterval(()=>{
    if(a.config.timerEnabled){
      a.totalSecondsRemaining -= 1;
      if(a.totalSecondsRemaining <= 0){
        a.totalSecondsRemaining = 0;
        tickTotal();
        if(onExpire) onExpire();
        return;
      }
    }
    tickTotal();
  }, 1000);

  STATE.qTimerHandle = setInterval(()=>{
    if(_qTickStart == null) return;
    const live = getLiveQuestionElapsedSec();
    if(onQuestionTick) onQuestionTick(live);
  }, 500);
}

export function stopTimers(){
  if(STATE.timerHandle) clearInterval(STATE.timerHandle);
  if(STATE.qTimerHandle) clearInterval(STATE.qTimerHandle);
  STATE.timerHandle = null; STATE.qTimerHandle = null;
}
