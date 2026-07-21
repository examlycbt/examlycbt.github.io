export const FIELD_LABELS = ["QID:","Question No:","Question Type:","Topic:","Difficulty:","Suggested Exam:",
  "Marks:","Negative Marks:","Formatting:","Question:","Options:","Correct Answer:","Solution:"];

export function parseMD(text){
  const lines = text.split(/\r?\n/);
  const records = [];
  let cur = null, curPart = null, curSection = null, curLabel = null, buf = [];

  function flush(){
    if(cur && curLabel){ cur[curLabel] = buf.join('\n').trim(); }
    buf = [];
  }
  for(const raw of lines){
    const s = raw.trim();
    if(s.startsWith('# PART')){ curPart = s.replace(/^#+\s*/,''); continue; }
    if(s.startsWith('## Section')){ curSection = s.replace(/^#+\s*/,''); continue; }
    if(FIELD_LABELS.includes(s)){
      flush();
      if(s === 'QID:'){
        if(cur) records.push(cur);
        cur = { part: curPart, section: curSection };
      }
      curLabel = s; buf = [];
      continue;
    }
    if(s.startsWith('---')) continue;
    buf.push(raw);
  }
  flush();
  if(cur) records.push(cur);
  return records;
}

export function parseOptions(raw){
  if(!raw) return [];
  return raw.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
    const m = l.match(/^([A-D])\.\s*(.*)$/);
    return m ? {letter:m[1], text:m[2]} : {letter:'?', text:l};
  });
}
export function parseCorrectLetter(raw){
  if(!raw) return null;
  const m = raw.match(/([A-D])\b/);
  return m ? m[1] : null;
}
