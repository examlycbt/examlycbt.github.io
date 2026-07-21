import { STATE } from '../state/store.js';
import { lsSet } from '../storage/local-storage.js';
import { LS_BANKS } from '../storage/keys.js';

export function saveBank(name, questions, raw){
  STATE.banks[name] = { savedAt: Date.now(), count: questions.length, questions, raw: raw || '' };
  lsSet(LS_BANKS, STATE.banks);
}

export function deleteBank(name){
  delete STATE.banks[name];
  lsSet(LS_BANKS, STATE.banks);
}

export function getBank(name){
  return STATE.banks[name];
}

export function listBankNames(){
  return Object.keys(STATE.banks);
}
