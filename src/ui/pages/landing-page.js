import { STATE } from '../../state/store.js';
import { toast } from '../toast.js';
import { showPage } from '../router.js';
import { escapeHtml } from '../../parsing/formatter.js';
import { parseMD } from '../../parsing/md-parser.js';
import { extractUsableQuestions } from '../../parsing/question-extractor.js';
import { saveBank, deleteBank as deleteBankRecord, getBank, listBankNames } from '../../domain/bank-manager.js';
import { openConfigFor } from './config-page.js';
import { renderSummaryPage } from './summary-page.js';
import { renderScorePage } from './score-page.js';

let _pendingParsed = null;
let _pendingRaw = null;

export function renderLanding(){
  const list = document.getElementById('savedBanksList');
  const names = listBankNames();
  if(names.length === 0){
    list.innerHTML = '<div class="empty-note">No banks saved yet &mdash; upload one above.</div>';
  } else {
    list.innerHTML = names.map(n=>{
      const b = getBank(n);
      const d = new Date(b.savedAt).toLocaleDateString();
      return `<div class="bank-row">
        <div><div class="name">${escapeHtml(n)}</div><div class="meta">${b.count} questions &middot; saved ${d}</div></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm btn-primary" data-action="configure" data-bank-name="${escapeHtml(n)}">Configure Test</button>
          <button class="btn btn-sm" data-action="delete" data-bank-name="${escapeHtml(n)}">Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  const hist = document.getElementById('historyList');
  if(STATE.history.length === 0){
    hist.innerHTML = '<div class="empty-note">No attempts yet. Your scores will appear here after you finish a test.</div>';
  } else {
    hist.innerHTML = STATE.history.slice().reverse().map(a=>{
      const d = new Date(a.finishedAt).toLocaleString();
      return `<div class="hist-row" data-action="view-history" data-attempt-id="${a.id}">
        <div><div style="font-weight:700;">${escapeHtml(a.bankName)}</div>
          <div class="meta">${d} &middot; ${a.questions.length} questions</div></div>
        <div class="hist-score">${a.score.obtained} / ${a.score.max}</div>
      </div>`;
    }).join('');
  }
}

function handleFile(file){
  const reader = new FileReader();
  reader.onload = e=>{
    const text = e.target.result;
    const records = parseMD(text);
    const usable = extractUsableQuestions(records);
    if(usable.length === 0){
      document.getElementById('parseSummary').innerHTML =
        '<span style="color:#ff9494;">No auto-gradable (MCQ / numeric) questions found in this file.</span>';
      return;
    }
    _pendingParsed = usable;
    _pendingRaw = text;
    const bySubject = {};
    usable.forEach(q=>{ bySubject[q.subject] = (bySubject[q.subject]||0)+1; });
    const parts = Object.entries(bySubject).map(([k,v])=>`${v} in <b>${k}</b>`).join(', ');
    document.getElementById('parseSummary').innerHTML =
      `&#9989; Parsed <b>${usable.length}</b> usable questions &mdash; ${parts}.`;
    document.getElementById('uploadRow').style.display = 'flex';
    const guess = file.name.replace(/\.(md|txt)$/i,'');
    document.getElementById('bankNameInput').value = guess;
  };
  reader.readAsText(file);
}

function saveParsedBank(){
  const name = document.getElementById('bankNameInput').value.trim();
  if(!name){ toast('Please enter a name for this bank'); return; }
  if(!_pendingParsed){ toast('Please choose a file first'); return; }
  saveBank(name, _pendingParsed, _pendingRaw || '');
  toast(`Saved "${name}" to this device`);
  openConfigFor(name);
}

function deleteBankUI(name){
  if(!confirm(`Delete saved bank "${name}"?`)) return;
  deleteBankRecord(name);
  renderLanding();
}

function viewHistoryAttempt(id){
  const a = STATE.history.find(x=>x.id===id);
  if(!a) return;
  STATE.attempt = a;
  STATE.currentBankQuestions = (STATE.banks[a.bankName]||{}).questions || [];
  renderSummaryPage();
  renderScorePage();
  showPage('page-score');
}

export function initLandingPage(){
  document.getElementById('fileInput').addEventListener('change', e=>{
    if(e.target.files[0]) handleFile(e.target.files[0]);
  });

  const drop = document.getElementById('fileDrop');
  drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', ()=> drop.classList.remove('drag'));
  drop.addEventListener('drop', e=>{
    e.preventDefault(); drop.classList.remove('drag');
    if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('saveBankBtn').addEventListener('click', saveParsedBank);

  document.getElementById('savedBanksList').addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const name = el.dataset.bankName;
    if(el.dataset.action === 'configure') openConfigFor(name);
    else if(el.dataset.action === 'delete') deleteBankUI(name);
  });

  document.getElementById('historyList').addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action="view-history"]');
    if(!el) return;
    viewHistoryAttempt(el.dataset.attemptId);
  });
}
