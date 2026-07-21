import { parseOptions, parseCorrectLetter } from './md-parser.js';

/* Filter to only auto-gradable questions: MCQ (with options+answer) or Numeric (answer, no options) */
export function extractUsableQuestions(records){
  const out = [];
  for(const r of records){
    const type = (r['Question Type:'] || '').trim();
    const hasOptions = !!(r['Options:'] && r['Options:'].trim());
    const correctRaw = r['Correct Answer:'];
    const hasAnswer = !!(correctRaw && correctRaw.trim() && !/to be filled/i.test(correctRaw));
    if(!hasAnswer) continue;
    const kind = hasOptions ? 'mcq' : 'numeric';
    if(kind === 'mcq' && type !== 'MCQ') continue;
    const partName = (r.part || '').replace(/^PART\s*\d+\s*[\u2014-]\s*/,'').trim();
    out.push({
      qid: r['QID:'],
      subject: partName || 'General',
      topic: r['Topic:'] || '',
      difficulty: r['Difficulty:'] || 'Medium',
      marks: parseFloat(r['Marks:']) || 1,
      negMarksDb: parseFloat(r['Negative Marks:']) || 0,
      question: r['Question:'] || '',
      kind: kind,
      options: kind === 'mcq' ? parseOptions(r['Options:']) : [],
      correctLetter: kind === 'mcq' ? parseCorrectLetter(correctRaw) : null,
      correctNumeric: kind === 'numeric' ? (correctRaw||'').trim() : null,
      solution: r['Solution:'] || ''
    });
  }
  return out;
}
