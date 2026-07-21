import { STATE } from '../state/store.js';
import { lsSet } from '../storage/local-storage.js';
import { LS_THEME } from '../storage/keys.js';

export function applyTheme(){
  document.body.classList.toggle('light-theme', STATE.theme === 'light');
  const btn = document.getElementById('themeToggleBtn');
  if(btn) btn.innerHTML = STATE.theme === 'light' ? '&#127769;' : '&#9788;';
}

export function toggleTheme(){
  STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
  lsSet(LS_THEME, STATE.theme);
  applyTheme();
}
