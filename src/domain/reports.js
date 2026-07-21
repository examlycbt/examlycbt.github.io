import { STATE } from '../state/store.js';
import { lsSet } from '../storage/local-storage.js';
import { LS_REPORTS, LS_BANKS } from '../storage/keys.js';

export const REPORT_CATEGORIES = [
  {id:'typo', icon:'&#9999;', title:'Typo Error', desc:'If question has error or spelling mistake or misprint etc.'},
  {id:'answer', icon:'&#10060;', title:'Answer Error', desc:"If question's answer is wrong."},
  {id:'classification', icon:'&#128218;', title:'Classification Error', desc:'If question in wrong chapter, wrong topic or wrong difficulty level.'},
  {id:'translation', icon:'&#127760;', title:'Translation Error', desc:"If question's translation is wrong or has error."},
  {id:'other', icon:'&#9888;', title:'Other Error', desc:"Error which can't be categorized in above those."}
];

export function buildReport({ bankName, qid, questionNo, topic, category, categoryLabel, details }){
  const id = 'ERR-' + Date.now().toString(36).toUpperCase();
  return {
    id, bankName, qid, questionNo, topic,
    category, categoryLabel,
    details, createdAt: Date.now()
  };
}

export function saveReport(report){
  STATE.reports = STATE.reports || [];
  STATE.reports.push(report);
  lsSet(LS_REPORTS, STATE.reports);
}

export function appendReportToBankMd(report){
  const bank = STATE.banks[report.bankName];
  if(!bank) return;
  if(typeof bank.raw !== 'string') bank.raw = '';
  bank.raw += `\n\n---\n## Error Report [${report.id}]\n` +
    `QID: ${report.qid}\nQuestion No: ${report.questionNo}\nTopic: ${report.topic}\n` +
    `Error Type: ${report.categoryLabel}\nReported At: ${new Date(report.createdAt).toLocaleString()}\n` +
    `Details: ${report.details || '(none provided)'}\n`;
  lsSet(LS_BANKS, STATE.banks);
}
