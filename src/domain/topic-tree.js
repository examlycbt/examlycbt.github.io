import { STATE } from '../state/store.js';

export function topicKey(subject, topic){ return subject + '|||' + topic; }

export function groupBySubjectAndTopic(questions){
  const bySubjTopic = {};
  questions.forEach(q=>{
    bySubjTopic[q.subject] = bySubjTopic[q.subject] || {};
    bySubjTopic[q.subject][q.topic] = (bySubjTopic[q.subject][q.topic]||0) + 1;
  });
  return bySubjTopic;
}

export function getSelectedQuestions(selectedKeys){
  const checked = new Set(selectedKeys);
  return STATE.currentBankQuestions.filter(q=> checked.has(topicKey(q.subject, q.topic)));
}

export function ensureTopicOrderInit(allKeys){
  if(!STATE.topicOrder || !STATE.topicOrder.length){
    STATE.topicOrder = allKeys.slice();
  } else {
    const allSet = new Set(allKeys);
    STATE.topicOrder = STATE.topicOrder.filter(k=> allSet.has(k));
    const known = new Set(STATE.topicOrder);
    allKeys.forEach(k=>{ if(!known.has(k)) STATE.topicOrder.push(k); });
  }
}

export function getCheckedKeysInOrder(selectedKeys){
  const checked = new Set(selectedKeys);
  return (STATE.topicOrder||[]).filter(k=> checked.has(k));
}

export function reorderTopic(key, newPos, selectedKeys){
  let activeOrdered = getCheckedKeysInOrder(selectedKeys);
  const oldIdx = activeOrdered.indexOf(key);
  if(oldIdx === -1) return;
  activeOrdered.splice(oldIdx,1);
  activeOrdered.splice(newPos-1,0,key);
  const inactive = (STATE.topicOrder||[]).filter(k=> !activeOrdered.includes(k));
  STATE.topicOrder = activeOrdered.concat(inactive);
}
