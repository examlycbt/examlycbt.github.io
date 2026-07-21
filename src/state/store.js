export const STATE = {
  banks: {},
  history: [],
  currentBankName: null,
  currentBankQuestions: [],
  attempt: null,
  timerHandle: null,
  qTimerHandle: null,
  theme: 'dark',
  uiPrefs: { qstripOpen: true, sideOpen: true },
  mobilePanelOpen: false,
  topicOrder: [],
  reports: []
};

export function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
