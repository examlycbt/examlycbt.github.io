import { STATE } from '../state/store.js';
import { lsSet } from '../storage/local-storage.js';
import { LS_ACTIVE } from '../storage/keys.js';
import { stopTimers } from '../domain/timers.js';
import { renderLanding } from './pages/landing-page.js';

export function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

export function goLanding(){
  stopTimers();
  renderLanding();
  showPage('page-landing');
}

export function exitTest(){
  if(confirm('Leave the test? Your progress is saved and you can resume it later from the home page.')){
    lsSet(LS_ACTIVE, STATE.attempt);
    stopTimers();
    goLanding();
  }
}
