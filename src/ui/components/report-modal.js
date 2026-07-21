import { STATE } from '../../state/store.js';
import { toast } from '../toast.js';
import { REPORT_CATEGORIES, buildReport, saveReport, appendReportToBankMd } from '../../domain/reports.js';

let REPORT_MODAL = { step:'category', category:null, categoryLabel:null };

function getModalEl(){ return document.getElementById('reportModal'); }
function getBackdropEl(){ return document.getElementById('reportModalBackdrop'); }

export function openReportModal(){
  REPORT_MODAL = { step:'category', category:null, categoryLabel:null };
  renderReportModal();
  getBackdropEl().classList.add('open');
}

export function closeReportModal(){
  getBackdropEl().classList.remove('open');
}

function pickReportCategory(id, title){
  REPORT_MODAL.category = id;
  REPORT_MODAL.categoryLabel = title;
  REPORT_MODAL.step = 'details';
  renderReportModal();
}

function backReportModal(){
  REPORT_MODAL.step = 'category';
  renderReportModal();
}

function updateReportCharCount(){
  const ta = document.getElementById('reportDetails');
  const el = document.getElementById('reportCharCount');
  if(ta && el) el.textContent = `${ta.value.length}/500`;
}

function submitReport(){
  const a = STATE.attempt;
  if(!a){ closeReportModal(); return; }
  const q = a.questions[a.currentIndex];
  const ta = document.getElementById('reportDetails');
  const details = ta ? ta.value.trim() : '';
  const report = buildReport({
    bankName: a.bankName,
    qid: q.qid,
    questionNo: a.currentIndex+1,
    topic: q.topic,
    category: REPORT_MODAL.category,
    categoryLabel: REPORT_MODAL.categoryLabel,
    details
  });
  saveReport(report);
  appendReportToBankMd(report);
  closeReportModal();
  toast(`Report ${report.id} submitted — thanks!`);
}

function renderReportModal(){
  const modal = getModalEl();
  if(REPORT_MODAL.step === 'category'){
    modal.innerHTML = `
      <div class="report-modal-head"><span>&#9873;</span> Report Question</div>
      <div class="report-modal-body">
        ${REPORT_CATEGORIES.map(c=>`
          <div class="report-cat ${REPORT_MODAL.category===c.id?'selected':''}" data-action="pick-category" data-cat-id="${c.id}" data-cat-title="${c.title}">
            <div class="icon">${c.icon}</div>
            <div class="txt"><b>${c.title}</b><span>${c.desc}</span></div>
            <div class="chev">&#8250;</div>
          </div>`).join('')}
      </div>
      <div class="report-modal-foot" style="justify-content:flex-start;">
        <button class="btn" style="border-color:var(--red);color:#ff9494;" data-action="cancel">&#10005; Cancel</button>
      </div>`;
  } else {
    modal.innerHTML = `
      <div class="report-modal-head"><span class="back" data-action="back">&larr;</span> &#9873; Report Question</div>
      <div class="report-modal-body">
        <div class="report-section-label">&#128203; Provide Additional Details</div>
        <textarea class="report-textarea" id="reportDetails" maxlength="500"
          placeholder="Please describe the issue in detail. The more information you provide, the better we can help resolve the problem."></textarea>
        <div class="report-charcount" id="reportCharCount">0/500</div>
        <div class="report-tip">&#128204; <span><b>Tip:</b> Include specific details like what you expected vs. what happened, any error messages, or steps to reproduce the issue.</span></div>
      </div>
      <div class="report-modal-foot">
        <button class="btn" style="border-color:var(--red);color:#ff9494;" data-action="cancel">&#10005; Cancel</button>
        <button class="btn btn-primary" data-action="submit">&#10148; Submit Report</button>
      </div>`;
  }
}

export function initReportModal(){
  const modal = getModalEl();
  const backdrop = getBackdropEl();

  modal.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const action = el.dataset.action;
    if(action === 'pick-category') pickReportCategory(el.dataset.catId, el.dataset.catTitle);
    else if(action === 'cancel') closeReportModal();
    else if(action === 'back') backReportModal();
    else if(action === 'submit') submitReport();
  });

  modal.addEventListener('input', (e)=>{
    if(e.target && e.target.id === 'reportDetails') updateReportCharCount();
  });

  backdrop.addEventListener('click', (e)=>{
    if(e.target === backdrop) closeReportModal();
  });
}
