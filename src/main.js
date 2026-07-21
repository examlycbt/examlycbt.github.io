import { STATE } from './state/store.js';
import { lsGet } from './storage/local-storage.js';
import { LS_BANKS, LS_HISTORY, LS_THEME, LS_UIPREFS, LS_REPORTS, LS_ACTIVE } from './storage/keys.js';
import { toast } from './ui/toast.js';
import { applyTheme } from './ui/theme.js';
import { showPage } from './ui/router.js';
import { initLandingPage, renderLanding } from './ui/pages/landing-page.js';
import { initConfigPage } from './ui/pages/config-page.js';
import { initTestPage, renderTestPage } from './ui/pages/test-page.js';
import { initSummaryPage } from './ui/pages/summary-page.js';
import { initScorePage } from './ui/pages/score-page.js';
import { initReportModal } from './ui/components/report-modal.js';

function init(){
  STATE.banks = lsGet(LS_BANKS, {});
  STATE.history = lsGet(LS_HISTORY, []);
  STATE.theme = lsGet(LS_THEME, 'dark');
  STATE.uiPrefs = lsGet(LS_UIPREFS, { qstripOpen: true, sideOpen: true });
  STATE.reports = lsGet(LS_REPORTS, []);
  applyTheme();
  const active = lsGet(LS_ACTIVE, null);
  renderLanding();

  initLandingPage();
  initConfigPage();
  initTestPage();
  initSummaryPage();
  initScorePage();
  initReportModal();

  if(active && active.questions && active.questions.length){
    toast('Resuming your in-progress test&hellip;');
    STATE.attempt = active;
    STATE.currentBankName = active.bankName;
    STATE.currentBankQuestions = (STATE.banks[active.bankName] || {}).questions || [];
    renderTestPage();
    showPage('page-test');
  }
}

init();
