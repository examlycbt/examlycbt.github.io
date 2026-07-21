import { STATE } from '../state/store.js';
import { lsSet } from '../storage/local-storage.js';
import { LS_UIPREFS } from '../storage/keys.js';

export function isMobileLayout(){ return window.innerWidth <= 1050; }

export function applyUiPrefs(){
  const qs = document.getElementById('qstrip');
  const side = document.getElementById('testSide');
  const body = document.getElementById('testBody');
  const backdrop = document.getElementById('sideBackdrop');
  const qBtn = document.getElementById('qstripToggleBtn');
  const pBtn = document.getElementById('panelToggleBtn');
  if(!qs || !side || !body) return;
  qs.classList.toggle('hidden', !STATE.uiPrefs.qstripOpen);
  if(qBtn) qBtn.classList.toggle('active', STATE.uiPrefs.qstripOpen);

  if(isMobileLayout()){
    side.classList.remove('hidden');
    body.classList.remove('wide');
    side.classList.toggle('drawer-open', STATE.mobilePanelOpen);
    if(backdrop) backdrop.classList.toggle('show', STATE.mobilePanelOpen);
    if(pBtn) pBtn.classList.toggle('active', STATE.mobilePanelOpen);
  } else {
    side.classList.remove('drawer-open');
    if(backdrop) backdrop.classList.remove('show');
    side.classList.toggle('hidden', !STATE.uiPrefs.sideOpen);
    body.classList.toggle('wide', !STATE.uiPrefs.sideOpen);
    if(pBtn) pBtn.classList.toggle('active', STATE.uiPrefs.sideOpen);
  }
}

export function toggleQstrip(){
  STATE.uiPrefs.qstripOpen = !STATE.uiPrefs.qstripOpen;
  lsSet(LS_UIPREFS, STATE.uiPrefs);
  applyUiPrefs();
}

export function toggleSidePanel(){
  if(isMobileLayout()){
    STATE.mobilePanelOpen = !STATE.mobilePanelOpen;
  } else {
    STATE.uiPrefs.sideOpen = !STATE.uiPrefs.sideOpen;
    lsSet(LS_UIPREFS, STATE.uiPrefs);
  }
  applyUiPrefs();
}

export function closeMobilePanel(){
  STATE.mobilePanelOpen = false;
  applyUiPrefs();
}

window.addEventListener('resize', ()=>{ if(STATE.attempt) applyUiPrefs(); });
