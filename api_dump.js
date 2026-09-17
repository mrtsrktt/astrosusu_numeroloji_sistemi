const E = require('./astro_sushu_engine.js');
function shape(v, depth=0){
  if(depth>2) return typeof v;
  if(Array.isArray(v)) return v.length? 'Array<'+shape(v[0],depth+1)+'>' : 'Array<empty>';
  if(v && typeof v==='object') return '{'+Object.keys(v).map(k=>k+':'+shape(v[k],depth+1)).join(', ')+'}';
  return typeof v;
}
const name='MEHMET ALI', d=15,m=3,y=1990;
const calls = {
  expressionNumber:()=>E.expressionNumber(name),
  soulUrgeNumber:()=>E.soulUrgeNumber(name),
  personalityNumber:()=>E.personalityNumber(name),
  balanceNumber:()=>E.balanceNumber(name),
  cornerstone:()=>E.cornerstone(name),
  capstone:()=>E.capstone(name),
  firstVowelValue:()=>E.firstVowelValue(name),
  numberMatrix:()=>E.numberMatrix(name,false),
  letterGroups:()=>E.letterGroups(name),
  transitionCycles:()=>E.transitionCycles(name,y),
  expressionPlanes:()=>E.expressionPlanes(name),
  lifePath:()=>E.lifePath(d,m,y),
  birthdayNumber:()=>E.birthdayNumber(d),
  attitudeNumber:()=>E.attitudeNumber(d,m),
};
for(const [k,fn] of Object.entries(calls)){
  try{ console.log(k+' => '+shape(fn())); }
  catch(e){ console.log(k+' !! '+e.message); }
}
console.log('--- EXPORT KEYS ---');
console.log(Object.keys(E).join(', '));