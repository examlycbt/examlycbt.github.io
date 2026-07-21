export function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Convert a raw MD math string into safe HTML with proper <sup>/<sub> */
export function convertMath(raw){
  if(raw == null) return '';
  let t = escapeHtml(String(raw));
  t = t.replace(/(?<![\w.])([\u2212-])?(\d+|\u03c0)\/(\d+|\u03c0)(?![\w.\d])/g,
    (m,sign,num,den)=> `${sign||''}<sup>${num}</sup>&frasl;<sub>${den}</sub>`);
  t = t.replace(/\^\(([^)]+)\)/g, (m,g)=>`<sup>${g}</sup>`);
  t = t.replace(/\^([A-Za-z0-9]+)/g, (m,g)=>`<sup>${g}</sup>`);
  const supMap = {'\u2070':'0','\u00b9':'1','\u00b2':'2','\u00b3':'3','\u2074':'4','\u2075':'5','\u2076':'6',
    '\u2077':'7','\u2078':'8','\u2079':'9','\u207b':'\u2212','\u207a':'+','\u02e3':'x','\u207f':'n'};
  t = t.replace(/[\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207b\u207a\u02e3\u207f]+/g,
    m => '<sup>' + [...m].map(c=>supMap[c]||c).join('') + '</sup>');
  const subMap = {'\u2080':'0','\u2081':'1','\u2082':'2','\u2083':'3','\u2084':'4','\u2085':'5','\u2086':'6',
    '\u2087':'7','\u2088':'8','\u2089':'9'};
  t = t.replace(/[\u2080-\u2089]+/g, m => '<sub>' + [...m].map(c=>subMap[c]||c).join('') + '</sub>');
  t = t.replace(/\n/g, '<br>');
  return t;
}
