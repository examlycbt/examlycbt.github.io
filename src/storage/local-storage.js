import { toast } from '../ui/toast.js';

export function lsGet(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e){ return fallback; }
}
export function lsSet(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ toast('Storage error: ' + e.message); }
}
