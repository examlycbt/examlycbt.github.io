export function questionMarks(q, cfg){
  const pos = cfg.markMode === 'flat' ? cfg.flatMarks : q.marks;
  let neg = 0;
  if(cfg.negMode === 'flat') neg = cfg.negFlat;
  else if(cfg.negMode === 'diff') neg = cfg.negByDiff[q.difficulty] || 0;
  return {pos, neg};
}
