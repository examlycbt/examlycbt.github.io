import { STATE } from '../../state/store.js';
import { toast } from '../toast.js';
import { showPage, goLanding } from '../router.js';
import { lsSet } from '../../storage/local-storage.js';
import { LS_ACTIVE } from '../../storage/keys.js';
import { escapeHtml } from '../../parsing/formatter.js';
import { getBank } from '../../domain/bank-manager.js';
import {
  topicKey, groupBySubjectAndTopic, getSelectedQuestions,
  ensureTopicOrderInit, getCheckedKeysInOrder, reorderTopic
} from '../../domain/topic-tree.js';
import { createAttempt } from '../../domain/attempt.js';
import { renderTestPage } from './test-page.js';

function shuffleArr(arr){
  for(let i=arr.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
}

function getAllTopicKeysFromDom(){
  const keys = [];
  document.querySelectorAll('.topic-chk').forEach(cb=> keys.push(topicKey(cb.dataset.subject, cb.dataset.topic)));
  return keys;
}
function getCheckedTopicKeysFromDom(){
  const keys = [];
  document.querySelectorAll('.topic-chk:checked').forEach(cb=> keys.push(topicKey(cb.dataset.subject, cb.dataset.topic)));
  return keys;
}
function getSelectedQuestionsFromDom(){
  return getSelectedQuestions(getCheckedTopicKeysFromDom());
}

export function openConfigFor(name){
  STATE.currentBankName = name;
  STATE.currentBankQuestions = getBank(name).questions;
  renderConfigPage();
  showPage('page-config');
}

function renderConfigPage(){
  const qs = STATE.currentBankQuestions;
  document.getElementById('cfgBankLabel').textContent =
    `${STATE.currentBankName} \u2014 ${qs.length} auto-gradable questions available`;

  const bySubjTopic = groupBySubjectAndTopic(qs);
  const tree = document.getElementById('topicTree');
  tree.innerHTML = Object.entries(bySubjTopic).map(([subj, topics], si)=>{
    const total = Object.values(topics).reduce((a,b)=>a+b,0);
    const rows = Object.entries(topics).map(([topic,count], ti)=>`
      <div class="topic-row">
        <label class="chk"><input type="checkbox" class="topic-chk" data-subject="${escapeHtml(subj)}" data-topic="${escapeHtml(topic)}" checked>
          ${escapeHtml(topic)}</label>
        <span class="count-badge">${count} q</span>
        <span class="order-label">Order</span>
        <select class="topic-order-sel" data-subject="${escapeHtml(subj)}" data-topic="${escapeHtml(topic)}"></select>
      </div>`).join('');
    return `<div class="topic-group">
      <div class="topic-group-head">
        <label class="chk"><input type="checkbox" class="subject-chk" data-subject="${escapeHtml(subj)}" checked> ${escapeHtml(subj)}</label>
        <span class="count-badge">${total} q</span>
      </div>
      <div class="topic-group-body">${rows}</div>
    </div>`;
  }).join('');

  ensureTopicOrderInit(getAllTopicKeysFromDom());
  refreshCfgStrip();
}

function toggleSubject(subjectCheckbox){
  const subj = subjectCheckbox.dataset.subject;
  document.querySelectorAll(`.topic-chk[data-subject="${CSS.escape(subj)}"]`).forEach(t=>t.checked = subjectCheckbox.checked);
  refreshCfgStrip();
}

function refreshCfgStrip(){
  const sel = getSelectedQuestionsFromDom();
  const strip = document.getElementById('cfgStatStrip');
  const byDiff = {Easy:0,Medium:0,Hard:0};
  sel.forEach(q=> byDiff[q.difficulty] = (byDiff[q.difficulty]||0)+1);
  strip.innerHTML = `
    <div class="stat-chip"><div class="n">${sel.length}</div><div class="l">Selected</div></div>
    <div class="stat-chip"><div class="n">${byDiff.Easy}</div><div class="l">Easy</div></div>
    <div class="stat-chip"><div class="n">${byDiff.Medium}</div><div class="l">Medium</div></div>
    <div class="stat-chip"><div class="n">${byDiff.Hard}</div><div class="l">Hard</div></div>`;
  const countInput = document.getElementById('qCountInput');
  if(parseInt(countInput.value,10) > sel.length) countInput.value = sel.length;
  countInput.max = sel.length;
  renderTopicOrderSelects();
}

function renderTopicOrderSelects(){
  const activeOrdered = getCheckedKeysInOrder(getCheckedTopicKeysFromDom());
  const n = activeOrdered.length;
  document.querySelectorAll('.topic-order-sel').forEach(sel=>{
    const key = topicKey(sel.dataset.subject, sel.dataset.topic);
    const cb = document.querySelector(`.topic-chk[data-subject="${CSS.escape(sel.dataset.subject)}"][data-topic="${CSS.escape(sel.dataset.topic)}"]`);
    if(!cb || !cb.checked){
      sel.innerHTML = '<option>&mdash;</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    const pos = activeOrdered.indexOf(key) + 1;
    sel.innerHTML = Array.from({length:n}, (_,i)=>`<option value="${i+1}" ${i+1===pos?'selected':''}>${i+1}</option>`).join('');
  });
}

function handleTopicOrderChange(sel){
  const key = topicKey(sel.dataset.subject, sel.dataset.topic);
  const newPos = parseInt(sel.value,10);
  reorderTopic(key, newPos, getCheckedTopicKeysFromDom());
  renderTopicOrderSelects();
}

function useMaxCount(){
  document.getElementById('qCountInput').value = getSelectedQuestionsFromDom().length;
}

function autoSuggestTimer(){
  const n = parseInt(document.getElementById('qCountInput').value,10) || getSelectedQuestionsFromDom().length;
  document.getElementById('timerMinutes').value = Math.max(5, Math.round(n * 1.2));
}

function startTest(){
  const selected = getSelectedQuestionsFromDom();
  const count = Math.min(parseInt(document.getElementById('qCountInput').value,10) || 0, selected.length);
  if(count < 1){ toast('Select at least one topic / question'); return; }

  let pool = selected.slice();
  const orderedKeys = getCheckedKeysInOrder(getCheckedTopicKeysFromDom());
  const orderIndex = {};
  orderedKeys.forEach((k,i)=> orderIndex[k]=i);
  pool.sort((a,b)=> (orderIndex[topicKey(a.subject,a.topic)] ?? 999999) - (orderIndex[topicKey(b.subject,b.topic)] ?? 999999));
  if(document.getElementById('shuffleQ').checked) shuffleArr(pool);
  pool = pool.slice(0, count);

  const mode = document.querySelector('input[name=testConfigMode]:checked').value;
  const shuffleO = document.getElementById('shuffleO').checked;
  const markMode = document.querySelector('input[name=markMode]:checked').value;
  const flatMarks = parseFloat(document.getElementById('flatMarksInput').value) || 4;
  const negMode = document.querySelector('input[name=negMode]:checked').value;
  const negFlat = parseFloat(document.getElementById('negFlatInput').value) || 0;
  const negByDiff = {
    Easy: parseFloat(document.getElementById('negEasyInput').value) || 0,
    Medium: parseFloat(document.getElementById('negMedInput').value) || 0,
    Hard: parseFloat(document.getElementById('negHardInput').value) || 0
  };
  const timerEnabled = document.getElementById('timerEnabled').checked;
  const timerMinutes = parseFloat(document.getElementById('timerMinutes').value) || 30;

  const questions = pool.map(q=>{
    let opts = q.options.map(o=>({...o}));
    if(shuffleO && opts.length) shuffleArr(opts);
    return {...q, options: opts};
  });

  const config = { mode, markMode, flatMarks, negMode, negFlat, negByDiff, timerEnabled, timerMinutes, shuffleO, shuffleQ: document.getElementById('shuffleQ').checked };

  STATE.attempt = createAttempt({ bankName: STATE.currentBankName, questions, config });
  lsSet(LS_ACTIVE, STATE.attempt);
  renderTestPage();
  showPage('page-test');
}

export function initConfigPage(){
  document.getElementById('configBackBtn').addEventListener('click', goLanding);
  document.getElementById('useMaxCountBtn').addEventListener('click', useMaxCount);
  document.getElementById('autoSuggestTimerBtn').addEventListener('click', autoSuggestTimer);
  document.getElementById('startTestBtn').addEventListener('click', startTest);

  document.getElementById('topicTree').addEventListener('change', (e)=>{
    const t = e.target;
    if(t.classList.contains('subject-chk')) toggleSubject(t);
    else if(t.classList.contains('topic-chk')) refreshCfgStrip();
    else if(t.classList.contains('topic-order-sel')) handleTopicOrderChange(t);
  });
}
